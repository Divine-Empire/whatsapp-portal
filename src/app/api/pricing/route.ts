import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/pricing
 * Fetch all pricing categories for the current user.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to fetch user-specific pricing
    const { data: pricing, error: pricingErr } = await supabase
      .from('whatsapp_pricing')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('category', { ascending: true });

    if (pricingErr) throw pricingErr;

    // Filter to prioritize user-specific rows if duplicates exist
    const uniquePricing: Record<string, any> = {};
    const pricingList: any[] = pricing || [];
    pricingList.forEach((p: any) => {
      if (!uniquePricing[p.category] || p.user_id !== null) {
        uniquePricing[p.category] = p;
      }
    });

    return NextResponse.json({ 
      success: true, 
      pricing: Object.values(uniquePricing) 
    });

  } catch (err: any) {
    console.error('Fetch pricing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/pricing
 * Update/Upsert pricing categories for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid updates format' }, { status: 400 });
    }

    // Prepare upsert data
    const upsertData = updates.map(u => ({
      user_id: user.id,
      category: u.category,
      price_per_conversation: u.price
    }));

    const { error: upsertErr } = await supabase
      .from('whatsapp_pricing')
      .upsert(upsertData, { onConflict: 'user_id,category' });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Update pricing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
