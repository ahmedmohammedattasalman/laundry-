import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tapId = searchParams.get('tap_id');

  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  const errorRedirect = `${protocol}://${host}/subscription?payment=error`;
  const successRedirect = `${protocol}://${host}/dashboard?payment=success`;

  if (!tapId) {
    return NextResponse.redirect(errorRedirect);
  }

  try {
    // 1. Fetch charge details from Tap API to verify status
    const tapSecretKey = process.env.TAP_SECRET_KEY || '';
    const tapResponse = await fetch(`https://api.tap.company/v2/charges/${tapId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tapSecretKey}`
      }
    });

    const charge = await tapResponse.json();

    if (!tapResponse.ok || charge.status !== 'CAPTURED') {
      console.error('Payment not captured:', charge);
      return NextResponse.redirect(errorRedirect);
    }

    // 2. Extract metadata
    const { organization_id, billing_cycle, price_paid } = charge.metadata || {};

    if (!organization_id || !billing_cycle) {
      console.error('Missing metadata in charge response:', charge.metadata);
      return NextResponse.redirect(errorRedirect);
    }

    const supabase = await createClient();

    // 3. Get current subscription to calculate new expiry date
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organization_id)
      .maybeSingle();

    const durationDays = billing_cycle === 'annual' ? 365 : 30;
    
    // If current subscription is still active and has future expiry, extend from it. Otherwise, extend from now.
    let baseDate = Date.now();
    if (currentSub && currentSub.status === 'active' && new Date(currentSub.expires_at).getTime() > Date.now()) {
      baseDate = new Date(currentSub.expires_at).getTime();
    }

    const newExpiry = new Date(baseDate + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 4. Update the subscription in Supabase
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        organization_id,
        status: 'active',
        plan_name: 'اشتراك المغسلة السحابي',
        expires_at: newExpiry,
        billing_cycle,
        price_paid: Number(price_paid) || 0
      }, { onConflict: 'organization_id' });

    if (subError) {
      console.error('Failed to update subscription in DB:', subError);
      return NextResponse.redirect(errorRedirect);
    }

    return NextResponse.redirect(successRedirect);
  } catch (error) {
    console.error('Tap callback processing error:', error);
    return NextResponse.redirect(errorRedirect);
  }
}
