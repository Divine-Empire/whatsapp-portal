import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the message associated with this mediaId to verify ownership/user context
    const { data: message } = await supabase
      .from('whatsapp_portal_messages')
      .select('user_id')
      .contains('media', [{ id: mediaId }])
      .limit(1)
      .maybeSingle();

    // Fallback: search by wa_message_id or media column if needed.
    // If not found in messages, we can fall back to checking if there is any active config in whatsapp_configs.
    let userId = message?.user_id;

    if (!userId) {
      // Find the first active config
      const { data: firstConfig } = await supabase
        .from('whatsapp_portal_configs')
        .select('user_id')
        .limit(1)
        .maybeSingle();
      
      userId = firstConfig?.user_id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User/Config context not found' }, { status: 404 });
    }

    const { data: config } = await supabase
      .from('whatsapp_portal_configs')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (!config || !config.access_token) {
      return NextResponse.json({ error: 'WhatsApp config not found' }, { status: 404 });
    }

    const accessToken = config.access_token;

    // 1. Retrieve the media URL from Meta
    const metaUrlResponse = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const downloadUrl = metaUrlResponse.data?.url;
    const mimeType = metaUrlResponse.data?.mime_type || 'application/octet-stream';

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Failed to retrieve media URL from Meta' }, { status: 404 });
    }

    // 2. Fetch the binary data from Meta download URL
    const binaryResponse = await axios.get(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'arraybuffer',
    });

    // 3. Return the binary response
    return new Response(binaryResponse.data, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('Media download proxy error:', err?.response?.data || err.message);
    return NextResponse.json(
      { error: err?.response?.data?.error?.message || err.message || 'Failed to download media' },
      { status: 500 }
    );
  }
}
