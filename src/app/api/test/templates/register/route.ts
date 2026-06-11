import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, wamid, phone, template_name, parameters } = body;

    // Validate required fields
    if (!user_id || !wamid || !phone || !template_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, wamid, phone, or template_name' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Resolve Contact (Find or Create)
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_portal_contacts')
      .upsert(
        { 
          user_id, 
          phone_number: phone, 
          name: phone, 
          profile_name: phone 
        },
        { onConflict: 'user_id,phone_number' }
      )
      .select('id')
      .single();

    if (contactError || !contact) {
      console.error('Error resolving contact:', contactError);
      return NextResponse.json(
        { success: false, error: contactError?.message || 'Failed to resolve contact' },
        { status: 500 }
      );
    }

    // 2. Resolve Conversation (Find or Create)
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_portal_conversations')
      .upsert(
        {
          user_id,
          contact_id: contact.id,
          last_message: `[Template: ${template_name}]`,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,contact_id' }
      )
      .select('id')
      .single();

    if (convError || !conversation) {
      console.error('Error resolving conversation:', convError);
      return NextResponse.json(
        { success: false, error: convError?.message || 'Failed to resolve conversation' },
        { status: 500 }
      );
    }

    // 3. Upsert Message
    // In PostgREST/Supabase, columns not passed in the payload will keep their existing values on conflict.
    // If the webhook status update arrived first, its status (e.g. 'delivered' or 'read') will not be modified.
    const metadata = { parameters: parameters || [] };
    const { data: message, error: msgError } = await supabase
      .from('whatsapp_portal_messages')
      .upsert(
        {
          user_id,
          conversation_id: conversation.id,
          wa_message_id: wamid,
          direction: 'outbound',
          message_type: 'template',
          template_name,
          metadata,
          source: 'sheet',
          content: `[Template: ${template_name}]`,
        },
        { onConflict: 'wa_message_id' }
      )
      .select('*')
      .single();

    if (msgError) {
      console.error('Error upserting message:', msgError);
      return NextResponse.json(
        { success: false, error: msgError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error('Register template error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Support preflight OPTIONS requests for CORS (if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
