import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizePhoneNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { contactId, phoneNumber, name } = await request.json();
    const supabase = createAdminClient();

    // 1. Resolve user_id from config
    const { data: config } = await supabase
      .from('whatsapp_portal_configs')
      .select('user_id')
      .eq('phone_number_id', process.env.WHATSAPP_PHONE_NUMBER_ID!)
      .single();

    const userId = config?.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'WhatsApp portal configuration missing user_id.' }, { status: 400 });
    }

    let resolvedContactId = contactId;
    let contactData: any = null;

    if (resolvedContactId) {
      const { data, error } = await supabase
        .from('whatsapp_portal_contacts')
        .select('*')
        .eq('id', resolvedContactId)
        .single();
      if (!error && data) {
        contactData = data;
      }
    }

    if (!contactData && phoneNumber) {
      const cleanPhone = normalizePhoneNumber(phoneNumber);
      const { data: existingContact } = await supabase
        .from('whatsapp_portal_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('phone_number', cleanPhone)
        .maybeSingle();

      if (existingContact) {
        contactData = existingContact;
        resolvedContactId = existingContact.id;
      } else {
        const { data: newContact, error: insertContactErr } = await supabase
          .from('whatsapp_portal_contacts')
          .insert({
            user_id: userId,
            phone_number: cleanPhone,
            name: name || cleanPhone,
            profile_name: name || cleanPhone,
          })
          .select('*')
          .single();

        if (insertContactErr || !newContact) {
          throw new Error(insertContactErr?.message || 'Failed to create contact');
        }
        contactData = newContact;
        resolvedContactId = newContact.id;
      }
    }

    if (!resolvedContactId || !contactData) {
      return NextResponse.json({ error: 'Contact not found or invalid phone number' }, { status: 400 });
    }

    // 2. Resolve or create conversation
    let { data: conversation } = await supabase
      .from('whatsapp_portal_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_id', resolvedContactId)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: convErr } = await supabase
        .from('whatsapp_portal_conversations')
        .insert({
          user_id: userId,
          contact_id: resolvedContactId,
          last_message: '',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
        .select('*')
        .single();

      if (convErr || !newConv) {
        throw new Error(convErr?.message || 'Failed to create conversation');
      }
      conversation = newConv;
    }

    const contactName = contactData.name || contactData.profile_name || contactData.phone_number || 'Unknown';

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        contact: {
          id: contactData.id,
          name: contactName,
          phone_number: contactData.phone_number || '',
        },
        last_message: conversation.last_message || '',
        last_message_at: conversation.last_message_at,
        unread_count: conversation.unread_count || 0,
      },
    });
  } catch (err: any) {
    console.error('get-or-create conversation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
