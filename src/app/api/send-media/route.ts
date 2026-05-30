import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isCsvFile } from '@/lib/mediaSupport';
import { uploadWhatsAppMedia, sendWhatsAppMediaMessage } from '@/lib/whatsapp';

async function convertCsvToXlsx(file: File) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const csvText = await file.text();
  const workbook = XLSX.read(csvText, { type: 'string' });
  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  return new File([new Uint8Array(xlsxBuffer)], file.name.replace(/\.csv$/i, '.xlsx'), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: file.lastModified,
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const user = { id: '84c43f3b-dd3b-4762-8ed2-731cdeea4e8a' };

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const to = formData.get('to') as string | null;
    const caption = formData.get('caption') as string | null;
    const type = formData.get('type') as 'image' | 'video' | 'document' | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file || !to || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, to, or type' },
        { status: 400 }
      );
    }

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('access_token, phone_number_id')
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'WhatsApp credentials are not configured.' },
        { status: 400 }
      );
    }

    const accessToken = config.access_token;
    const phoneNumberId = config.phone_number_id;

    const uploadFile = isCsvFile(file) ? await convertCsvToXlsx(file) : file;

    // 1. Upload file to Meta WhatsApp media endpoint
    const mediaId = await uploadWhatsAppMedia({
      file: uploadFile,
      accessToken,
      phoneNumberId,
    });

    // 2. Send media message via Meta WhatsApp messages endpoint
    const { messageId: waMessageId } = await sendWhatsAppMediaMessage({
      to,
      mediaId,
      mediaType: type,
      caption: caption || undefined,
      fileName: uploadFile.name,
      accessToken,
      phoneNumberId,
    });

    // Construct media JSON object for Supabase
    const mediaObj = {
      type,
      id: mediaId,
      fileName: uploadFile.name,
      mime_type: uploadFile.type,
      file_size: uploadFile.size,
    };

    // 3. Save outbound message to Supabase
    const { data: savedMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        wa_message_id: waMessageId,
        direction: 'outbound',
        content: caption || `Sent ${type}: ${uploadFile.name}`,
        message_type: type,
        status: 'sent',
        file_name: uploadFile.name,
        mime_type: uploadFile.type,
        file_size: uploadFile.size,
        media: [mediaObj],
      })
      .select('id')
      .single();

    if (msgError) {
      console.error('Failed to save media message:', msgError);
    }

    // 4. Update conversation's last message info
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          last_message: caption || `📂 ${type.toUpperCase()}: ${uploadFile.name}`,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      success: true,
      messageId: savedMsg?.id,
      waMessageId,
    });
  } catch (err: any) {
    console.error('Send media message error:', err);
    return NextResponse.json(
      { error: err?.response?.data?.error?.message || err.message || 'Failed to send media message' },
      { status: 500 }
    );
  }
}
