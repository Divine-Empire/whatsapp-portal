import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppReaction } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, messageId, emoji } = await request.json();

    if (!to || !messageId) {
      return NextResponse.json(
        { error: 'Missing "to" or "messageId"' },
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

    await sendWhatsAppReaction({
      to,
      messageId,
      emoji: emoji || '',
      accessToken: config.access_token,
      phoneNumberId: config.phone_number_id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send reaction error:', err);
    return NextResponse.json(
      { error: err?.response?.data?.error?.message || err.message || 'Failed to send reaction' },
      { status: 500 }
    );
  }
}
