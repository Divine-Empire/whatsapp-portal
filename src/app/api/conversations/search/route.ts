import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const cleanQ = query.trim();

    if (!cleanQ) {
      return NextResponse.json({ success: true, results: [] });
    }

    const supabase = createAdminClient();
    const digitsOnly = cleanQ.replace(/\D/g, '');

    // 1. Search contacts table
    let contactFilter = `name.ilike.%${cleanQ}%,profile_name.ilike.%${cleanQ}%,phone_number.ilike.%${cleanQ}%`;
    if (digitsOnly && digitsOnly.length >= 3 && digitsOnly !== cleanQ) {
      contactFilter += `,phone_number.ilike.%${digitsOnly}%`;
    }

    const { data: contactsData, error: contactsErr } = await supabase
      .from('whatsapp_portal_contacts')
      .select(`
        id,
        user_id,
        name,
        phone_number,
        profile_name,
        created_at,
        whatsapp_portal_conversations (
          id,
          last_message,
          last_message_at,
          unread_count
        )
      `)
      .or(contactFilter)
      .limit(50);

    if (contactsErr) {
      console.error('Error searching contacts:', contactsErr);
    }

    // 2. Search conversations by last_message
    const { data: convsData, error: convsErr } = await supabase
      .from('whatsapp_portal_conversations')
      .select(`
        id,
        last_message,
        last_message_at,
        unread_count,
        whatsapp_portal_contacts (
          id,
          name,
          phone_number,
          profile_name
        )
      `)
      .ilike('last_message', `%${cleanQ}%`)
      .order('last_message_at', { ascending: false })
      .limit(30);

    if (convsErr) {
      console.error('Error searching conversations by message:', convsErr);
    }

    // 3. Map & deduplicate results
    const resultsMap = new Map<string, any>();

    // Add conversation matches first
    (convsData || []).forEach((conv: any) => {
      const contact = conv.whatsapp_portal_contacts;
      const contactName = contact?.name || contact?.profile_name || contact?.phone_number || 'Unknown';
      const key = conv.id;
      resultsMap.set(key, {
        id: conv.id,
        contact_id: contact?.id || null,
        contact: {
          id: contact?.id,
          name: contactName,
          phone_number: contact?.phone_number || '',
          profile_name: contact?.profile_name || ''
        },
        last_message: conv.last_message || '',
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count || 0,
        has_conversation: true,
      });
    });

    // Add contact matches
    (contactsData || []).forEach((contact: any) => {
      const contactName = contact.name || contact.profile_name || contact.phone_number || 'Unknown';
      const existingConvs = contact.whatsapp_portal_conversations;
      const conv = Array.isArray(existingConvs) ? existingConvs[0] : existingConvs;

      if (conv?.id) {
        if (!resultsMap.has(conv.id)) {
          resultsMap.set(conv.id, {
            id: conv.id,
            contact_id: contact.id,
            contact: {
              id: contact.id,
              name: contactName,
              phone_number: contact.phone_number || '',
              profile_name: contact.profile_name || ''
            },
            last_message: conv.last_message || '',
            last_message_at: conv.last_message_at,
            unread_count: conv.unread_count || 0,
            has_conversation: true,
          });
        }
      } else {
        // Contact without an active conversation row yet
        const key = `contact-${contact.id}`;
        if (!resultsMap.has(key)) {
          resultsMap.set(key, {
            id: key,
            contact_id: contact.id,
            contact: {
              id: contact.id,
              name: contactName,
              phone_number: contact.phone_number || '',
              profile_name: contact.profile_name || ''
            },
            last_message: '',
            last_message_at: contact.created_at || null,
            unread_count: 0,
            has_conversation: false,
          });
        }
      }
    });

    const results = Array.from(resultsMap.values()).sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('Conversation search error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
