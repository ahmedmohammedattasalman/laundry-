'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ArrowRight, 
  Printer, 
  Smartphone, 
  Zap, 
  Globe, 
  Heart,
  Scale
} from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 overflow-hidden text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Ambient backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            لاندر<span className="text-brand-400 font-normal">ساس</span>
          </h1>
        </div>

        <Link 
          href="/login" 
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
        >
          دخول المنصة
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center py-20 z-10 space-y-10">
        <div className="space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-brand-400" />
            متوافق مع الفاتورة الإلكترونية لـ هيئة الزكاة والضريبة والجمارك (ZATCA)
          </span>
          <h2 className="text-5xl sm:text-6xl font-black text-white leading-none tracking-tight font-heading">
            عمليات تشغيلية متطورة لـ <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">المغاسل الحديثة</span>
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            منصة سحابية آمنة متعددة المستأجرين لمساعدة سلاسل مغاسل الملابس في إدارة العمليات، وإصدار رموز QR للفواتير الضريبية المبسطة المتوافقة مع الزكاة، وإرسال تنبيهات واتساب للعملاء.
          </p>
        </div>

        {/* CTA Launch Button */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-sm font-bold shadow-float transition-all hover:translate-y-[-2px]"
          >
            تسجيل الدخول
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-2 px-8 py-4 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 rounded-2xl text-sm font-bold transition-all hover:translate-y-[-2px]"
          >
            إنشاء حساب مغسلة
          </Link>
        </div>

        {/* Features Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-16">
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 text-right space-y-3 glass-panel">
            <div className="h-10 w-10 bg-brand-600/10 border border-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">الامتثال للأنظمة الضريبية السعودية</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              توليد تلقائي لرموز الاستجابة السريعة (QR) بصيغة TLV Base64 للفواتير الضريبية المبسطة والامتثال الكامل لمتطلبات المرحلة الأولى لهيئة الزكاة والضريبة والجمارك.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 text-right space-y-3 glass-panel">
            <div className="h-10 w-10 bg-cyan-600/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">تهيئة الفواتير للطباعة الحرارية</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              تنسيقات طباعة حرارية ذكية مخصصة لورق قياس 58 مم و 80 مم لطباعة فواتير استلام وتسليم مثالية مباشرة من المتصفح.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 text-right space-y-3 glass-panel">
            <div className="h-10 w-10 bg-purple-600/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">التنبيهات الفورية عبر الواتساب</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              إرسال إيصالات الطلب، والمبالغ المستحقة، وتحديثات جاهزية الملابس للعميل تلقائياً بضغطة زر عبر روابط الواتساب wa.me المباشرة.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 z-10 shrink-0">
        <p className="flex justify-center items-center gap-1">
          تم التطوير لمنظومة إدارة المغاسل الذكية LaundraSaaS. تم بناء المنصة باستخدام Next.js 15 و Tailwind CSS و Supabase.
        </p>
      </footer>
    </div>
  );
}
