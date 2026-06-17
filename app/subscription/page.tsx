'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, UserSession } from '@/lib/db';
import { Check, ShieldCheck, Building2, Flame, LogOut, ArrowRight } from 'lucide-react';

export default function SubscriptionPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const activeSession = db.getSession();
    if (!activeSession) {
      router.push('/login');
    } else {
      setSession(activeSession);
    }
  }, [router]);

  const handleSubscribe = (planName: string) => {
    if (!session?.organization_id) return;
    setLoadingPlan(planName);

    // Simulate payment process delay
    setTimeout(() => {
      try {
        db.updateSubscription(session.organization_id!, 'active', planName);
        
        // Redirect to setup wizard
        router.push('/setup');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPlan(null);
      }
    }, 1500);
  };

  const handleLogout = () => {
    db.setSession(null);
    router.push('/login');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm">جاري تحميل الجلسة…</div>
      </div>
    );
  }

  const plans = [
    {
      name: 'Trial Plan',
      price: 'مجاناً',
      period: 'تجربة 14 يوماً',
      description: 'اختبر كافة ميزات النظام بدون أي التزامات مالية.',
      icon: Building2,
      features: [
        'حتى 50 فاتورة نشطة',
        'الطباعة الحرارية القياسية (80 مم)',
        'مولد رموز QR أساسي',
        'حساب موظف استقبال واحد',
        'تنبيهات جاهزة مسبقاً للواتساب',
      ],
      buttonText: 'بدء الفترة التجريبية',
      color: 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700',
    },
    {
      name: 'Pro Growth Plan',
      price: '249 ر.س',
      period: '/ شهرياً',
      description: 'مثالية للمغاسل التي تسعى للنمو والتشغيل العالي.',
      icon: Flame,
      features: [
        'فواتير وعملاء غير محدودين',
        'جميع مقاسات ورق الطباعة (58 مم و 80 مم)',
        'رمز استجابة سريع (QR) متوافق مع هيئة الزكاة والجمارك',
        'حتى 5 حسابات موظفي استقبال',
        'لوحة تحكم متقدمة بالأداء والإيرادات',
        'دعم فني ذو أولوية للمالك والموظفين',
        'ربط مباشر لإرسال إشعارات الواتساب للعملاء',
      ],
      buttonText: 'الاشتراك في باقة المحترفين',
      color: 'border-brand-500/50 bg-brand-950/20 text-white hover:border-brand-500 shadow-float',
      recommended: true,
    },
    {
      name: 'Enterprise Plan',
      price: '499 ر.س',
      period: '/ شهرياً',
      description: 'إعدادات مخصصة للفروع المتعددة والعلامات التجارية الكبرى.',
      icon: ShieldCheck,
      features: [
        'فواتير وعملاء غير محدودين',
        'عرض موحد لإدارة وتحليل الفروع المتعددة',
        'سجل تدقيق أمني مشدد للأدوار والموظفين',
        'موظفين وحسابات استقبال غير محدودين',
        'دعم تعديل تصميم الفواتير وإضافة الشعار المخصص',
        'جاهزية للربط المباشر مع واجهة برمجة الواتساب API',
        'دعم هاتفي متواصل على مدار الساعة 24/7',
      ],
      buttonText: 'الاشتراك في باقة المنشآت',
      color: 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700',
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      {/* Floating Logout Button */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-900 text-slate-400 px-3 py-1.5 rounded-full border border-slate-800 font-medium">
            مسجل الدخول باسم: <strong className="text-slate-200">{session.email}</strong>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          تسجيل الخروج
        </button>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          نشّط اشتراكك في <span className="text-brand-400">المنصة</span>
        </h1>
        <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto">
          اختر القدرة التشغيلية المناسبة لأعمال مغسلتك. يتيح لك تفعيل الاشتراك إصدار الفواتير وطباعة الإيصالات وتتبع العملاء.
        </p>
      </div>

      {/* Grid of pricing cards */}
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const PlanIcon = plan.icon;
          const isSubscribing = loadingPlan === plan.name;
          return (
            <div
              key={plan.name}
              className={`flex flex-col justify-between p-8 rounded-3xl border transition-all duration-300 relative ${
                plan.recommended ? 'scale-105 md:translate-y-[-8px]' : ''
              } ${plan.color}`}
            >
              {plan.recommended && (
                <span className="absolute top-0 right-8 -translate-y-1/2 bg-brand-500 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-md">
                  موصى بها
                </span>
              )}
              
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name === 'Trial Plan' ? 'الباقة التجريبية' : plan.name === 'Pro Growth Plan' ? 'باقة المحترفين' : 'باقة المنشآت'}</h3>
                    <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${plan.recommended ? 'bg-brand-500/10 text-brand-400' : 'bg-slate-900 text-slate-400'}`}>
                    <PlanIcon className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-baseline mb-8">
                  <span className="text-4xl font-extrabold text-white font-heading">{plan.price}</span>
                  <span className="text-sm font-semibold text-slate-400 mr-1">{plan.period}</span>
                </div>

                <div className="space-y-4 border-t border-slate-900 pt-6">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6">
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={!!loadingPlan}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                    plan.recommended
                      ? 'bg-brand-600 hover:bg-brand-500 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                  } disabled:opacity-50`}
                >
                  {isSubscribing ? 'جاري إعداد الدفع…' : plan.buttonText}
                  {!isSubscribing && <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
