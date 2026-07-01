'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      await db.resetPasswordForEmail(email, redirectTo);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور.');
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
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-600/10 border border-brand-500/30 text-brand-400 mb-4 shadow-float">
            <KeyRound className="h-8 w-8" />
          </div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            إعادة تعيين <span className="text-brand-400 font-normal">كلمة المرور</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            سنرسل لك رابط استعادة الحساب لإعادة تعيين كلمة المرور الخاصة بك.
          </p>
        </div>

        {/* Glassmorphic Panel */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-float">
          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="email-address" className="text-xs font-semibold text-slate-300">
                  البريد الإلكتروني المسجل
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
                    placeholder="name@laundry.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-500 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                {loading ? 'جاري إرسال الرابط…' : 'إرسال رابط الاستعادة'}
                <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium">
                تم إرسال بريد الاستعادة! يرجى التحقق من صندوق الوارد لإكمال تعيين كلمة المرور.
              </div>
              <p className="text-xs text-slate-400">
                لم يصلك البريد؟ تحقق من صندوق البريد العشوائي (Spam) أو أعد المحاولة بعد 60 ثانية.
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-900 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
