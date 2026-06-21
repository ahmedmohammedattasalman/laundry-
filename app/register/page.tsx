'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Mail, ArrowRight, Building2, User, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !name || !orgName || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      setLoading(false);
      return;
    }

    try {
      // Create owner account & organization
      await db.register(email, orgName, name, password);

      // Redirect user to subscription page
      router.push('/subscription');
    } catch (err: any) {
      if (err?.message === 'CONFIRM_EMAIL_REQUIRED') {
        setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل وتفعيل حسابك قبل تسجيل الدخول.');
      } else {
        setError(err?.message || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Logo" className="h-24 w-auto mb-4" />
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            تسجيل <span className="text-brand-400 font-normal">مغسلة جديدة</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            ابدأ تشغيل بوابة مغسلتك السحابية في أقل من دقيقة.
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-float">
          {success ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white font-heading">تفقد بريدك الإلكتروني ✉️</h3>
              <p className="text-sm text-slate-300 leading-relaxed text-right">
                {success}
              </p>
              <div className="pt-4 border-t border-slate-800">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-all cursor-pointer w-full group"
                >
                  الذهاب لصفحة تسجيل الدخول
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="owner-name" className="text-xs font-semibold text-slate-300">
                    اسم المالك
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="owner-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                      placeholder="مثال: أحمد محمد"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="org-name" className="text-xs font-semibold text-slate-300">
                    اسم المغسلة
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <input
                      id="org-name"
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                      placeholder="مثال: مغسلة النجم اللامع"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email-address" className="text-xs font-semibold text-slate-300">
                    البريد الإلكتروني للمالك
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email-address"
                      type="email"
                      required
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                      placeholder="owner@laundry.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                      <span className="text-xs">🔑</span>
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-500 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                >
                  {loading ? 'جاري إنشاء الحساب…' : 'المتابعة لاختيار الباقة'}
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-400">
                لديك حساب بالفعل؟{' '}
                <Link
                  href="/login"
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  سجل الدخول بدلاً من ذلك
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
