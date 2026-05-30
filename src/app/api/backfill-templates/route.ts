import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchWhatsAppTemplates, resolveTemplateInfo } from '@/lib/whatsapp';

/**
 * POST /api/backfill-templates
 * One-time endpoint to fix all existing "[Template/External Message]" records
 * by replacing them with the actual template body text from Meta's API.
 */
export async function POST() {
  try {
    const supabase = createAdminClient();

    // Get all placeholder messages
    const { data: placeholders, error: fetchErr } = await supabase
      .from('whatsapp_portal_messages')
      .select('id, user_id, content')
      .or('content.eq.[Template/External Message],content.eq.[Template Message]')
      .eq('message_type', 'template');

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!placeholders || placeholders.length === 0) {
      return NextResponse.json({ message: 'No placeholder messages found', updated: 0 });
    }

    // Group by user_id to minimize API calls
    const byUser: Record<string, string[]> = {};
    for (const p of placeholders) {
      if (!byUser[p.user_id]) byUser[p.user_id] = [];
      byUser[p.user_id].push(p.id);
    }

    let totalUpdated = 0;

    for (const [userId, msgIds] of Object.entries(byUser)) {
      // Fetch WhatsApp config for this user
      const { data: config } = await supabase
        .from('whatsapp_portal_configs')
        .select('waba_id, access_token')
        .eq('user_id', userId)
        .single();

      if (!config?.waba_id || !config?.access_token) {
        console.log(`⚠️ No config for user ${userId}, skipping ${msgIds.length} messages`);
        continue;
      }

      // Fetch templates from Meta
      const templates = await fetchWhatsAppTemplates({
        wabaId: config.waba_id,
        accessToken: config.access_token,
      });

      const resolvedContent = resolveTemplateInfo(templates).body;

      if (resolvedContent === '[Template Message]') {
        console.log(`⚠️ Could not resolve template for user ${userId}`);
        continue;
      }

      // Update all placeholder messages for this user
      const { error: updateErr, count } = await supabase
        .from('whatsapp_portal_messages')
        .update({ content: resolvedContent })
        .in('id', msgIds);

      if (updateErr) {
        console.error(`❌ Error updating messages for user ${userId}:`, updateErr);
      } else {
        totalUpdated += msgIds.length;
        console.log(`✅ Updated ${msgIds.length} messages for user ${userId}`);
      }

      // Also update conversation last_message if it's a placeholder
      await supabase
        .from('whatsapp_portal_conversations')
        .update({ last_message: resolvedContent })
        .eq('user_id', userId)
        .or('last_message.eq.[Template/External Message],last_message.eq.[Template Message]');
    }

    return NextResponse.json({
      message: `Backfill complete`,
      totalPlaceholders: placeholders.length,
      totalUpdated,
    });
  } catch (err: any) {
    console.error('Backfill error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
