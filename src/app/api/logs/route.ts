import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // We can fetch from the `whatsapp_portal_messages` table joined with conversations > contacts
    const { data, error } = await supabase
      .from('whatsapp_portal_messages')
      .select(`
        id, content, status, direction, message_type, created_at,
        conversation:whatsapp_portal_conversations(
          contact:whatsapp_portal_contacts(name, phone_number)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200); // Fetch latest 200 logs

    if (error) throw error;

    // Format for the UI
    const logs = data.map((m: any) => {
      const contactInfo = Array.isArray(m.conversation) 
        ? m.conversation[0]?.contact 
        : m.conversation?.contact;

      return {
        id: m.id,
        timestamp: m.created_at,
        contactName: contactInfo?.name || contactInfo?.phone_number || 'Unknown',
        contactPhone: contactInfo?.phone_number || '',
        templateName: m.message_type === 'template' ? 'Template Message' : 'Direct Message',
        status: m.status,
        cost: 1.0, // Assuming 1 credit/rupee per message
        type: m.message_type || 'text'
      };
    });

    return NextResponse.json({ success: true, logs });

  } catch (err: any) {
    console.error('Logs fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
