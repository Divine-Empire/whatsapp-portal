import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Messages for one conversation, oldest-first (ready to render as a thread).
 *
 * Exists because this portal's own inbox reads whatsapp_portal_messages
 * straight from Supabase using the signed-in operator's session, and
 * /api/logs is auth-gated — so neither is reachable server-to-server. The
 * sales-agent backend proxies this endpoint to power the CRM dashboard's
 * WhatsApp tab, which never touches this project's database directly.
 *
 * Read-only by design: it returns what the thread contains and nothing else.
 * Sending stays on /api/send-message.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 300);

    const supabase = createAdminClient();

    // Contact identity first — the caller needs a name/number for the header,
    // and it also confirms the conversation exists before returning [].
    const { data: conversation, error: convErr } = await supabase
      .from('whatsapp_portal_conversations')
      .select(
        `
        id,
        last_message_at,
        unread_count,
        whatsapp_portal_contacts ( id, name, phone_number, profile_name )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (convErr) {
      console.error('Fetch conversation error:', convErr);
      return NextResponse.json({ success: false, error: convErr.message }, { status: 500 });
    }
    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // Newest-first with a limit so the index is used and a long thread cannot
    // blow up the response, then reversed — a reader wants oldest at the top.
    const { data, error } = await supabase
      .from('whatsapp_portal_messages')
      .select(
        `
        id, wa_message_id, direction, content, message_type, status,
        created_at, delivered_at, seen_at, template_name, interactive_title,
        media, media_url, mime_type, file_name, interest_status, source, metadata
      `,
      )
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fetch messages error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const contact = (conversation as Record<string, any>).whatsapp_portal_contacts;
    const messages = (data || []).reverse().map((m: Record<string, any>) => ({
      id: m.id,
      wa_message_id: m.wa_message_id,
      direction: m.direction,
      content: m.content || '',
      message_type: m.message_type || 'text',
      status: m.status,
      created_at: m.created_at,
      delivered_at: m.delivered_at,
      seen_at: m.seen_at,
      template_name: m.template_name,
      interactive_title: m.interactive_title,
      media_url: m.media_url,
      mime_type: m.mime_type,
      file_name: m.file_name,
      interest_status: m.interest_status,
      // 'internal' = written by this portal's own webhook/send routes.
      source: m.source,
      error_code: m.metadata?.error_code ?? null,
      error_message: m.metadata?.error_message ?? null,
    }));

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        last_message_at: conversation.last_message_at,
        unread_count: conversation.unread_count || 0,
        contact: {
          id: contact?.id ?? null,
          name:
            contact?.name || contact?.profile_name || contact?.phone_number || 'Unknown',
          phone_number: contact?.phone_number || '',
        },
      },
      count: messages.length,
      messages,
    });
  } catch (err: unknown) {
    console.error('Conversation messages error:', err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || 'Failed to fetch messages' },
      { status: 500 },
    );
  }
}
