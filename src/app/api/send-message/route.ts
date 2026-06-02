import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const user = { id: '84c43f3b-dd3b-4762-8ed2-731cdeea4e8a' };

    const { to, message, conversationId, replyToMessageId, replyToMessagePreview } = await request.json();
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing "to" or "message" field' },
        { status: 400 }
      );
    }

    const { data: config } = await supabase
      .from('whatsapp_portal_configs')
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

    // // Check credits (temporarily disabled)
    // const { data: profile, error: profileErr } = await supabase
    //   .from('profiles')
    //   .select('credits')
    //   .eq('id', user.id)
    //   .single();
    //
    // if (profileErr || !profile || profile.credits <= 0) {
    //   return NextResponse.json(
    //     { error: 'Insufficient credits. Please top up your account.' },
    //     { status: 402 }
    //   );
    // }

    // Send via Meta API
    const { messageId: waMessageId } = await sendWhatsAppMessage({
      to,
      message,
      accessToken,
      phoneNumberId,
      contextMessageId: replyToMessageId,
    });

    // Save outbound message to Supabase
    const { data: savedMsg, error: msgError } = await supabase
      .from('whatsapp_portal_messages')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        wa_message_id: waMessageId,
        direction: 'outbound',
        content: message,
        message_type: 'text',
        status: 'sent',
        context_message_id: replyToMessageId || null,
        metadata: replyToMessagePreview ? { reply_to_message: replyToMessagePreview } : null,
      })
      .select('id')
      .single();

    if (msgError) {
      console.error('Failed to save message:', msgError);
    }

    // // Deduct credit (temporarily disabled)
    // await supabase.rpc('decrement_credits', { user_id_param: user.id });
    // await supabase
    //   .from('profiles')
    //   .update({ credits: profile.credits - 1 })
    //   .eq('id', user.id);

    // Update conversation
    if (conversationId) {
      await supabase
        .from('whatsapp_portal_conversations')
        .update({
          last_message: message,
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
    console.error('Send message error:', err);
    return NextResponse.json(
      { error: err?.response?.data?.error?.message || err.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
