'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, UserSession } from '@/lib/db';
import { Check, ShieldCheck, LogOut, ArrowRight, Zap, Gift, AlertCircle, Sparkles } from 'lucide-react';

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pricing settings state
  const [prices, setPrices] = useState({
    monthly_price: 299,
    monthly_original_price: 499,
    annual_price: 3500,
    annual_original_price: 4999
  });
  const [pricingLoading, setPricingLoading] = useState(true);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [validPromo, setValidPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  useEffect(() => {
    const activeSession = db.getSession();
    if (!activeSession) {
      router.push('/login');
    } else {
      setSession(activeSession);
    }
  }, [router]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const dbPrices = await db.getPricingSettings();
        setPrices(dbPrices as any);
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    if (paymentStatus === 'error') {
      setErrorMsg('فشلت عملية الدفع أو تم إلغاؤها. يرجى المحاولة مرة أخرى.');
    }
  }, [paymentStatus]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setVerifyingPromo(true);
    setPromoError('');
    setValidPromo(null);
    try {
      const promo = await db.verifyPromoCode(promoCode);
      if (promo) {
        setValidPromo(promo);
        setSuccessMsg(
          promo.type === 'trial'
            ? `تم تطبيق كود الفترة التجريبية بنجاح: ${promo.value} أيام مجاناً!`
            : promo.type === 'discount_percent'
            ? `تم تطبيق خصم بقيمة ${promo.value}٪!`
            : `تم تطبيق خصم بقيمة ${promo.value} ر.س!`
        );
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setPromoError('كود الخصم هذا غير صالح أو منتهي الصلاحية');
      }
    } catch (err: any) {
      setPromoError(err.message || 'فشل التحقق من كود الخصم');
    } finally {
      setVerifyingPromo(false);
    }
  };

  const handleSubscribe = async () => {
    if (!session?.organization_id) return;
    setLoadingPlan('active');
    setErrorMsg('');

    try {
      const res = await fetch('/api/payments/tap/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          org_id: session.organization_id,
          billing_cycle: billingCycle,
          promo_code: validPromo ? promoCode : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت معالجة الطلب');
      }

      if (data.status === 'trial_activated' || data.status === 'free_activated') {
        // Direct activation
        router.push('/setup');
      } else if (data.status === 'payment_required' && data.redirect_url) {
        // Redirect to Tap checkout url
        window.location.href = data.redirect_url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة عملية الدفع.');
      setLoadingPlan(null);
    }
  };

  const handleLogout = () => {
    db.setSession(null);
    router.push('/login');
  };

  if (!session || pricingLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm font-sans">جاري تحميل الجلسة والأسعار…</div>
      </div>
    );
  }

  // Price calculations
  const basePrice = billingCycle === 'annual' ? prices.annual_price : prices.monthly_price;
  const originalPrice = billingCycle === 'annual' ? prices.annual_original_price : prices.monthly_original_price;
  
  let finalPrice = basePrice;
  let discountDisplay = '';

  if (validPromo) {
    if (validPromo.type === 'trial') {
      discountDisplay = `فترة تجريبية (${validPromo.value} أيام)`;
      finalPrice = 0;
    } else if (validPromo.type === 'discount_percent') {
      finalPrice = Math.max(0, basePrice - (basePrice * (Number(validPromo.value) / 100)));
      discountDisplay = `خصم ${validPromo.value}٪`;
    } else if (validPromo.type === 'discount_amount') {
      finalPrice = Math.max(0, basePrice - Number(validPromo.value));
      discountDisplay = `خصم ${validPromo.value} ر.س`;
    }
  }

  // Calculate dynamic savings percentage relative to original slashed prices
  const savingsPercent = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);

  const planFeatures = [
    'فواتير وعملاء غير محدودين دون أي رسوم إضافية',
    'جميع مقاسات ورق الطباعة الحرارية (٥٨ مم و ٨٠ مم)',
    'رمز استجابة سريع (QR) متوافق تماماً مع متطلبات هيئة الزكاة والجمارك (ZATCA)',
    'حسابات موظفي استقبال وعمال غير محدودة مع إدارة الصلاحيات',
    'لوحة تحكم ذكية وإحصائيات مباشرة للأداء والمبيعات',
    'ربط مباشر لإرسال فواتير وإشعارات جاهزة للعملاء عبر الواتساب',
    'دعم فني متكامل متوفر على مدار الساعة 24/7 لحل المشكلات',
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans text-right">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      {/* Floating Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-900 text-slate-400 px-3 py-1.5 rounded-full border border-slate-800 font-medium">
            مسجل الدخول باسم: <strong className="text-slate-200">{session.email}</strong>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-990 border border-slate-850 px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          تسجيل الخروج
        </button>
      </div>

      {/* Hero Head */}
      <div className="relative z-10 max-w-3xl mx-auto text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-normal">
          نشّط اشتراك مغسلتك في <span className="text-brand-400">لاندرساس</span>
        </h1>
        <p className="mt-3 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          اختر دورة الفوترة الأنسب لك، وفعل اشتراكك لبدء إصدار الفواتير وطباعة الإيصالات بشكل فوري.
        </p>
      </div>

      {/* Main Single Card Checkout Container */}
      <div className="relative z-10 max-w-md mx-auto">
        
        {/* Toggle billing option */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900/80 p-1 rounded-2xl border border-slate-800 flex gap-1 items-center">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              سنوي (وفّر أكثر) 🌟
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              شهري
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2.5 text-xs justify-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-start gap-2.5 text-xs justify-start">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* The Card */}
        <div className="premium-card rounded-3xl border-brand-500/20 p-8 shadow-float relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 start-0 w-24 h-24 rounded-full bg-brand-500/10 blur-[30px] pointer-events-none" />

          {/* Card Head */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5 font-heading">
                  <Zap className="w-5 h-5 text-brand-400" />
                  اشتراك المغسلة السحابي
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">الباقة الاحترافية لإدارة مغسلتك بالكامل</p>
              </div>
              <span className="bg-brand-500/10 text-brand-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-brand-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                شامل
              </span>
            </div>

            {/* Price section */}
            <div className="mb-6 bg-slate-950/50 p-5 rounded-2xl border border-slate-900">
              <div className="flex items-baseline justify-start gap-2">
                <span className="text-4xl font-extrabold text-white font-heading font-mono">
                  {finalPrice}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  ر.س / {billingCycle === 'annual' ? 'سنوياً' : 'شهرياً'}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <span className="text-slate-500 line-through font-mono">
                  {originalPrice} ر.س
                </span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">
                  خصم {savingsPercent}٪
                </span>
              </div>

              {validPromo && (
                <div className="mt-3.5 flex items-center gap-1.5 text-[10px] font-bold text-brand-400 bg-brand-950/20 border border-brand-500/30 p-2 rounded-xl justify-center">
                  <Gift className="w-3.5 h-3.5 text-brand-400" />
                  <span>تم تفعيل {discountDisplay}</span>
                </div>
              )}
            </div>

            {/* Features Checklist */}
            <div className="space-y-4 mb-8">
              {planFeatures.map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-350">
                  <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="border-t border-slate-900 pt-6 mb-6">
              <label className="text-[10px] font-bold text-slate-400 block mb-2">هل لديك كود خصم؟</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="مثال: TRIAL7"
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 uppercase text-center focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={verifyingPromo || !promoCode.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl text-xs font-bold border border-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {verifyingPromo ? 'جاري التحقق…' : 'تطبيق'}
                </button>
              </div>
              {promoError && (
                <p className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {promoError}
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleSubscribe}
              disabled={!!loadingPlan}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-xs font-bold text-white bg-gradient-to-l from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {loadingPlan ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري تهيئة الدفع السحابي…
                </>
              ) : (
                <>
                  <span>تفعيل الاشتراك الآمن عبر Tap Payments</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm font-sans">جاري تحميل الجلسة والأسعار…</div>
      </div>
    }>
      <SubscriptionPageContent />
    </Suspense>
  );
}
