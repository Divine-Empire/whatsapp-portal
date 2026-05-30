import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const user = { id: '84c43f3b-dd3b-4762-8ed2-731cdeea4e8a' };

    // Messages Stats
    const { data: messages, error: messagesErr } = await supabase
      .from('messages')
      .select('status, direction')
      .eq('user_id', user.id);

    if (messagesErr) throw messagesErr;

    // Profiles 
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    const msgs: { status: string; direction: string }[] = (messages as any) || [];
    const outbound = msgs.filter(m => m.direction === 'outbound');
    
    // Using simplistic derivation of 'replies' by counting inbound messages
    const repliesCount = msgs.filter(m => m.direction === 'inbound').length;

    const stats = {
      sent: outbound.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length,
      delivered: outbound.filter(m => ['delivered', 'read'].includes(m.status)).length,
      read: outbound.filter(m => m.status === 'read').length,
      failed: outbound.filter(m => m.status === 'failed').length,
      queue: outbound.filter(m => m.status === 'queue').length, // assuming sending/queue
      replies: repliesCount,
      total: msgs.length,
    };

    // Calculate hourly data for charts 
    // Usually via a DB group by context, but we can return mock structured or approximate for now
    // In a prod app, we'd query by date trunc. Let's do simple 24 hours.
    const hourly = [];
    for (let i = 0; i < 24; i++) {
        hourly.push({ hour: `${i}:00`, sent: 0, delivered: 0, read: 0 });
    }
    
    // Calculate simple dummy or basic metrics for recent messages
    const recentMessages: any[] = []; // Or fetch from a joined table if we want them for the overview

    return NextResponse.json({
        stats,
        credits: {
          remaining: profile?.credits || 0,
          used: 10000 - (profile?.credits || 10000), // assumption
          limit: 10000 
        },
        hourly,
        messages: recentMessages
    });

  } catch (err: any) {
    console.error('Stats fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
