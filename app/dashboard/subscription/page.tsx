'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Subscription, UserSession } from '@/lib/db';
import { 
  CreditCard, 
  Check, 
  Calendar, 
  FileText, 
  Zap,
  Shield,
  RefreshCw,
  Gift,
  AlertCircle
} from 'lucide-react';

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Pricing state
  const [prices, setPrices] = useState({
    monthly_price: 299,
    monthly_original_price: 499,
    annual_price: 3500,
    annual_original_price: 4999
  });

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [validPromo, setValidPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const activeSession = db.getSession();
      if (!activeSession) {
        router.push('/login');
        return;
      }
      if (activeSession.role === 'labor') {
        router.push('/dashboard/new-order');
        return;
      }

      setSession(activeSession);
      const orgId = activeSession.organization_id!;
      const sub = await db.getSubscription(orgId);
      setSubscription(sub);
      
      if (sub?.billing_cycle) {
        setBillingCycle(sub.billing_cycle);
      }

      try {
        const dbPrices = await db.getPricingSettings();
        setPrices(dbPrices as any);
      } catch (err) {
        console.error('Failed to load pricing:', err);
      }
    };
    loadData();
  }, [router]);

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
        setTimeout(() => setSuccessMsg(''), 4500);
      } else {
        setPromoError('كود الخصم هذا غير صالح أو منتهي الصلاحية');
      }
    } catch (err: any) {
      setPromoError(err.message || 'فشل التحقق من كود الخصم');
    } finally {
      setVerifyingPromo(false);
    }
  };

  const handleRenew = async () => {
    if (!session?.organization_id) return;
    setIsRenewing(true);
    setErrorMsg('');
    setSuccessMsg('');

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
        throw new Error(data.error || 'فشلت معالجة عملية التجديد');
      }

      if (data.status === 'trial_activated' || data.status === 'free_activated') {
        const sub = await db.getSubscription(session.organization_id);
        setSubscription(sub);
        setSuccessMsg('تم تفعيل التجديد المجاني/التجريبي بنجاح!');
        setValidPromo(null);
        setPromoCode('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else if (data.status === 'payment_required' && data.redirect_url) {
        // Redirect to Tap checkout url
        window.location.href = data.redirect_url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة عملية التجديد.');
    } finally {
      setIsRenewing(false);
    }
  };

  if (!session) return null;

  const daysRemaining = subscription?.expires_at 
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

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
    'فواتير وعملاء غير محدودين',
    'قوالب إيصالات ٥٨ مم و ٨٠ مم',
    'رمز الاستجابة السريعة (QR) متوافق مع هيئة الزكاة والجمارك',
    'عدد موظفين وحسابات استقبال غير محدود',
    'تنبيهات إلكترونية مباشرة ومجانية عبر الواتساب',
    'لوحات تحكم موحدة للفروع المتعددة والمبيعات',
    'سجلات تدقيق ورقابة إدارية صارمة للملاك',
    'دعم فني ذو أولوية فائقة SLA على مدار الساعة 24/7',
  ];

  return (
    <div className="space-y-8 animate-fade-in text-right font-sans">
      
      {successMsg && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-2 justify-start">
          <Check className="w-4 h-4 text-green-400" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2 justify-start">
          <AlertCircle className="w-4 h-4 text-red-400" />
          {errorMsg}
        </div>
      )}

      {/* 1. Subscription Status Banner */}
      <div className="premium-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 start-0 w-40 h-40 rounded-full bg-brand-500/5 blur-[50px] pointer-events-none" />
        <div className="absolute bottom-0 end-0 w-32 h-32 rounded-full bg-cyan-500/5 blur-[40px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">باقة الاشتراك الحالية</span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white leading-none font-heading">
                {subscription?.plan_name || 'اشتراك المغسلة السحابي'}
              </h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border ${
                subscription?.status === 'active' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {subscription?.status === 'active' ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              تاريخ التجديد: {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('ar-EG') : 'غير متوفر'}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Days remaining */}
            <div className="bg-dark-bg/60 p-5 border border-dark-border rounded-2xl text-center space-y-1 min-w-[130px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">الأيام المتبقية</span>
              <strong className="text-2xl font-black text-white font-heading font-mono block">{daysRemaining}</strong>
              <span className="text-[9px] text-slate-400 block font-semibold">يوم</span>
            </div>

            {/* Price */}
            <div className="bg-dark-bg/60 p-5 border border-dark-border rounded-2xl text-center space-y-1 min-w-[130px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">قيمة الاشتراك</span>
              <strong className="text-2xl font-black text-white font-heading font-mono block">
                {subscription?.billing_cycle === 'annual' ? prices.annual_price : prices.monthly_price}
              </strong>
              <span className="text-[9px] text-slate-400 block font-semibold">
                ر.س / {subscription?.billing_cycle === 'annual' ? 'سنوياً' : 'شهرياً'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Plan Features + Renew */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Features List */}
        <div className="lg:col-span-2 premium-card rounded-3xl p-8">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2 font-heading">
            <Zap className="w-4 h-4 text-brand-400" />
            مزايا الاشتراك الكاملة
          </h3>
          <p className="text-[11px] text-slate-500 mb-6">جميع المزايا متاحة لك ولفريق عملك بدون قيود.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {planFeatures.map((feat, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[11px] text-slate-300 bg-dark-bg/40 p-3.5 rounded-xl border border-dark-border">
                <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Renew Card */}
        <div className="premium-card rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Shield className="w-6 h-6" />
            </div>
            
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white font-heading">تجديد أو ترقية الاشتراك</h4>
              
              {/* Billing Cycle Toggle */}
              <div className="bg-dark-bg/60 p-0.5 rounded-lg border border-dark-border flex">
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${
                    billingCycle === 'annual' ? 'bg-brand-600 text-white' : 'text-slate-450'
                  }`}
                >
                  سنوي
                </button>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold transition-all ${
                    billingCycle === 'monthly' ? 'bg-brand-600 text-white' : 'text-slate-450'
                  }`}
                >
                  شهري
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              قم بتجديد اشتراكك الشهري أو السنوي للاستمرار بالوصول الكامل لجميع مزايا نظام لاندرساس السحابي.
            </p>

            <div className="bg-dark-bg/40 p-3.5 rounded-xl border border-dark-border">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-heading font-mono">{finalPrice}</span>
                <span className="text-xs text-slate-400 font-semibold">ر.س / {billingCycle === 'annual' ? 'سنوياً' : 'شهرياً'}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px]">
                <span className="text-slate-500 line-through font-mono">{originalPrice} ر.س</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">وفر {savingsPercent}٪</span>
              </div>
              
              {validPromo && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-bold text-brand-400 justify-center bg-brand-950/20 p-1.5 rounded-lg border border-brand-500/25">
                  <Gift className="w-3 h-3 text-brand-400" />
                  <span>تم تطبيق {discountDisplay}</span>
                </div>
              )}
            </div>

            {/* Promo Code Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400">كود الخصم</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="أدخل الكود"
                  className="flex-1 bg-dark-bg/65 border border-dark-border rounded-xl px-3 py-2 text-xs font-mono text-slate-200 uppercase text-center focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={verifyingPromo || !promoCode.trim()}
                  className="px-3 py-2 bg-dark-bg border border-dark-border text-slate-200 rounded-xl text-[10px] font-bold cursor-pointer"
                >
                  {verifyingPromo ? '…' : 'تطبيق'}
                </button>
              </div>
              {promoError && (
                <p className="text-[9px] text-red-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {promoError}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleRenew}
            disabled={isRenewing}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRenewing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جاري تهيئة الدفع…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                تفعيل الدفع الآمن عبر Tap
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Billing History */}
      <div className="premium-card rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
          <FileText className="w-4 h-4 text-brand-400" />
          فواتير اشتراك النظام (SaaS)
        </h3>

        <div className="divide-y divide-dark-border text-xs">
          <div className="flex justify-between py-3.5 text-slate-400">
            <span>التاريخ</span>
            <span>تفاصيل العملية</span>
            <span>القيمة</span>
            <span>الحالة</span>
          </div>
          {subscription && subscription.price_paid !== undefined ? (
            <div className="flex justify-between py-4 text-slate-200">
              <span className="font-mono">{new Date(subscription.started_at || subscription.created_at).toLocaleDateString('ar-EG')}</span>
              <span>
                {subscription.plan_name} ({subscription.billing_cycle === 'annual' ? 'دورة سنوية' : 'دورة شهرية'})
              </span>
              <span className="font-mono">{subscription.price_paid || 0}.٠٠ ر.س</span>
              <span className={`font-bold uppercase tracking-wider text-[10px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md ${
                subscription.status === 'active' ? 'text-green-400' : 'text-red-400 bg-red-500/10 border-red-500/20'
              }`}>
                {subscription.status === 'active' ? 'نشطة / مدفوعة' : 'منتهية'}
              </span>
            </div>
          ) : (
            <div className="flex justify-between py-4 text-slate-200">
              <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
              <span>تجديد اشتراك المغسلة السحابي (شهري)</span>
              <span className="font-mono">٢٩٩.٠٠ ر.س</span>
              <span className="text-green-400 font-bold uppercase tracking-wider text-[10px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">مدفوعة</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
