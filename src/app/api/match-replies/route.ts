import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchWhatsAppTemplates, resolveTemplateInfo } from '@/lib/whatsapp';

/**
 * POST /api/match-replies
 * Reconciles conversations, matches replies to contacts, and fixes template placeholders.
 */
export async function POST() {
  try {
    const supabase = createAdminClient();

    // 1. Fetch all users who have whatsapp_configs to sync their data
    const { data: configs, error: configErr } = await supabase
      .from('whatsapp_portal_configs')
      .select('user_id, waba_id, access_token');

    if (configErr) throw configErr;

    let totalUpdatedMessages = 0;
    let totalUpdatedConversations = 0;

    const placeholderTexts = ['[Template/External Message]', '[Template Message]'];

    for (const config of (configs || [])) {
      const { user_id, waba_id, access_token } = config;

      // --- A. Template Backfill (Matching content) ---
      const { data: placeholders, error: pErr } = await supabase
        .from('whatsapp_portal_messages')
        .select('id, content')
        .eq('user_id', user_id)
        .eq('message_type', 'template')
        .in('content', placeholderTexts);

      if (pErr) {
        console.error(`Error fetching placeholders for user ${user_id}:`, pErr);
      } else if (placeholders && placeholders.length > 0) {
        const templates = await fetchWhatsAppTemplates({ wabaId: waba_id, accessToken: access_token });
        const resolvedContent = resolveTemplateInfo(templates).body;

        if (resolvedContent !== '[Template Message]') {
          const { count, error: uErr } = await supabase
            .from('whatsapp_portal_messages')
            .update({ content: resolvedContent }, { count: 'exact' })
            .in('id', placeholders.map((p: any) => p.id));
          
          if (uErr) {
            console.error(`Error updating placeholders for user ${user_id}:`, uErr);
          } else {
            totalUpdatedMessages += (count || 0);
          }
        }
      }

      // --- B. Conversation Threading Reconciliation ---
      const { data: conversations, error: cErr } = await supabase
        .from('whatsapp_portal_conversations')
        .select('id, contact_id')
        .eq('user_id', user_id);

      if (cErr) {
        console.error(`Error fetching conversations for user ${user_id}:`, cErr);
        continue;
      }

      for (const conv of (conversations || [])) {
        // Find latest message for this conversation
        const { data: latestMsg } = await supabase
          .from('whatsapp_portal_messages')
          .select('content, created_at, direction')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Count unread messages
        const { count: unreadCount } = await supabase
          .from('whatsapp_portal_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('direction', 'inbound')
          .neq('status', 'read');

        if (latestMsg) {
          const { error: convUpdateErr } = await supabase
            .from('whatsapp_portal_conversations')
            .update({
              last_message: latestMsg.content,
              last_message_at: latestMsg.created_at,
              unread_count: unreadCount || 0
            })
            .eq('id', conv.id);
          
          if (!convUpdateErr) {
            totalUpdatedConversations++;
          } else {
            console.error(`Error updating conversation ${conv.id}:`, convUpdateErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reconciliation complete',
      stats: {
        updatedMessages: totalUpdatedMessages,
        updatedConversations: totalUpdatedConversations
      }
    });

  } catch (err: any) {
    console.error('Match Replies Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
