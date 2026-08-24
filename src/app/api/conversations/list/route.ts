import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const cursor = searchParams.get('cursor'); // timestamp string for pagination
    const filter = searchParams.get('filter'); // 'all' | 'unseen' | 'seen'

    const supabase = createAdminClient();

    let query = supabase
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
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('last_message_at', cursor);
    }

    if (filter === 'unseen') {
      query = query.gt('unread_count', 0);
    } else if (filter === 'seen') {
      query = query.eq('unread_count', 0);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows = data || [];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const conversations = items.map((row: any) => {
      const contact = row.whatsapp_portal_contacts;
      return {
        id: row.id,
        contact: {
          id: contact?.id,
          name: contact?.name || contact?.profile_name || contact?.phone_number || 'Unknown',
          phone_number: contact?.phone_number || '',
        },
        last_message: row.last_message || '',
        last_message_at: row.last_message_at,
        unread_count: row.unread_count || 0,
      };
    });

    return NextResponse.json({
      success: true,
      conversations,
      hasMore,
      nextCursor: conversations.length > 0 ? conversations[conversations.length - 1].last_message_at : null,
    });
  } catch (err: any) {
    console.error('List conversations error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
