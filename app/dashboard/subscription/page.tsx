'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Subscription, UserSession } from '@/lib/db';
import { 
  CreditCard, 
  Check, 
  Calendar, 
  FileText, 
  ArrowRight,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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
    };
    loadData();
  }, [router]);

  const handleRenew = async () => {
    if (!session?.organization_id) return;
    setIsRenewing(true);
    setSuccessMsg('');

    // Simulate Stripe payment
    setTimeout(async () => {
      try {
        const sub = await db.updateSubscription(session.organization_id!, 'active', 'اشتراك المغسلة السحابي');
        setSubscription(sub);
        setSuccessMsg('تم تجديد الاشتراك بنجاح! شكراً لثقتك.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsRenewing(false);
      }
    }, 1500);
  };

  if (!session) return null;

  const daysRemaining = subscription?.expires_at 
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const planFeatures = [
    'فواتير وعملاء غير محدودين',
    'قوالب إيصالات ٥٨ مم و ٨٠ مم',
    'رمز الاستجابة السريعة (QR) متوافق مع هيئة الزكاة والجمارك',
    'عدد موظفين غير محدود',
    'تنبيهات إلكترونية مباشرة عبر الواتساب',
    'لوحات تحكم موحدة للفروع المتعددة',
    'سجلات تدقيق ورقابة إدارية صارمة',
    'دعم فني ذو أولوية فائقة SLA',
  ];

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-2 justify-start">
          <Check className="w-4 h-4 text-green-400" />
          {successMsg}
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
              <h2 className="text-xl font-bold text-white leading-none font-heading">اشتراك المغسلة السحابي</h2>
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
              <strong className="text-2xl font-black text-white font-heading font-mono block">٢٤٩</strong>
              <span className="text-[9px] text-slate-400 block font-semibold">ر.س / شهرياً</span>
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
            <h4 className="text-sm font-bold text-white font-heading">تجديد الاشتراك</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              قم بتجديد اشتراكك الشهري للاستمرار بالوصول الكامل لجميع مزايا نظام لاندرساس السحابي.
            </p>

            <div className="flex items-baseline gap-1 pt-2">
              <span className="text-3xl font-black text-white font-heading font-mono">٢٤٩</span>
              <span className="text-xs text-slate-500 font-semibold">ر.س / شهرياً</span>
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
                جاري معالجة الدفع…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                تجديد الاشتراك الآن
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
          <div className="flex justify-between py-4 text-slate-200">
            <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
            <span>تجديد اشتراك المغسلة السحابي</span>
            <span className="font-mono">٢٤٩.٠٠ ر.س</span>
            <span className="text-green-400 font-bold uppercase tracking-wider text-[10px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">مدفوعة</span>
          </div>
        </div>
      </div>

    </div>
  );
}
