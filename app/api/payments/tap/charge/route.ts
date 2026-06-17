import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { org_id, billing_cycle, promo_code } = await request.json();

    if (!org_id || !billing_cycle) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch pricing settings
    const { data: pricingData, error: pricingError } = await supabase
      .from('pricing_settings')
      .select('*');

    if (pricingError || !pricingData) {
      throw new Error('Failed to load pricing settings');
    }

    const prices: { [key: string]: number } = {};
    pricingData.forEach(item => {
      prices[item.key] = Number(item.value);
    });

    let baseAmount = billing_cycle === 'annual' ? (prices.annual_price || 3500) : (prices.monthly_price || 299);
    let finalAmount = baseAmount;
    let promoDetails: any = null;

    // 2. Validate promo code if provided
    if (promo_code) {
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promo_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (!promoError && promo) {
        promoDetails = promo;
        if (promo.type === 'trial') {
          // Immediately activate trial (no charge needed)
          const days = Number(promo.value) || 7;
          const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

          // Update subscription
          const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
              organization_id: org_id,
              status: 'active',
              plan_name: 'اشتراك المغسلة السحابي (تجريبي)',
              expires_at: expiresAt,
              billing_cycle: 'monthly',
              price_paid: 0
            }, { onConflict: 'organization_id' });

          if (subError) throw new Error(subError.message);

          return NextResponse.json({ status: 'trial_activated', expires_at: expiresAt });
        } else if (promo.type === 'discount_percent') {
          finalAmount = Math.max(0, baseAmount - (baseAmount * (Number(promo.value) / 100)));
        } else if (promo.type === 'discount_amount') {
          finalAmount = Math.max(0, baseAmount - Number(promo.value));
        }
      } else {
        return NextResponse.json({ error: 'كود الخصم غير صلاح أو منتهي الصلاحية' }, { status: 400 });
      }
    }

    // 3. If final amount is 0, activate immediately
    if (finalAmount === 0) {
      const durationDays = billing_cycle === 'annual' ? 365 : 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          organization_id: org_id,
          status: 'active',
          plan_name: 'اشتراك المغسلة السحابي',
          expires_at: expiresAt,
          billing_cycle,
          price_paid: 0
        }, { onConflict: 'organization_id' });

      if (subError) throw new Error(subError.message);

      return NextResponse.json({ status: 'free_activated', expires_at: expiresAt });
    }

    // 4. Fetch organization and owner email for Tap Checkout
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    // Get owner email
    const { data: owner, error: ownerError } = await supabase
      .from('employees')
      .select('name, email')
      .eq('organization_id', org_id)
      .eq('role', 'owner')
      .maybeSingle();

    const customerEmail = owner?.email || 'customer@laundrysas.com';
    const customerName = owner?.name || org.name || 'عميل لاندرساس';
    
    // Tap requires clean phone number formatting
    let cleanPhone = '500000000';
    if (org.whatsapp_number) {
      cleanPhone = org.whatsapp_number.replace(/\D/g, '');
      if (cleanPhone.startsWith('966')) {
        cleanPhone = cleanPhone.substring(3);
      }
    }

    // 5. Call Tap Payments API
    const tapSecretKey = process.env.TAP_SECRET_KEY || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUrl = `${protocol}://${host}/api/payments/tap/callback`;

    const tapBody = {
      amount: finalAmount,
      currency: 'SAR',
      threeDSecure: true,
      save_card: false,
      description: `Subscription renewal (${billing_cycle})`,
      statement_descriptor: 'LAUNDRYSAS',
      metadata: {
        organization_id: org_id,
        billing_cycle,
        promo_code: promo_code || '',
        price_paid: finalAmount.toString()
      },
      customer: {
        first_name: customerName,
        email: customerEmail,
        phone: {
          country_code: '966',
          number: cleanPhone
        }
      },
      source: { id: 'src_all' },
      redirect: { url: redirectUrl }
    };

    const tapResponse = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tapSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tapBody)
    });

    const tapData = await tapResponse.json();

    if (!tapResponse.ok || !tapData.transaction?.url) {
      console.error('Tap API Error:', tapData);
      return NextResponse.json({ error: tapData.errors?.[0]?.description || 'فشلت عملية تهيئة الدفع عبر تاف' }, { status: 500 });
    }

    return NextResponse.json({ status: 'payment_required', redirect_url: tapData.transaction.url });
  } catch (error: any) {
    console.error('Charge route error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
