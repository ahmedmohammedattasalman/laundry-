'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Lock, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const session = await db.syncSession();
        if (session) {
          setHasSession(true);
        } else {
          setError('رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.');
        }
      } catch (err: any) {
        setError('حدث خطأ أثناء التحقق من صحة الرابط. يرجى المحاولة مرة أخرى.');
      } finally {
        setVerifying(false);
      }
    };
    verifySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await db.updatePassword(password);
      await db.syncSession(); // ensure local storage session is updated
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.');
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
          <h2 className="text-4xl font-extrabold text-white tracking-tight font-heading">
            إعداد كلمة <span className="text-brand-400 font-normal">المرور الجديدة</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            قم بإنشاء كلمة مرور جديدة قوية وآمنة لحسابك.
          </p>
        </div>

        {/* Glassmorphic Panel */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-float">
          {verifying ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              جاري التحقق من صحة الرابط...
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center text-green-400 mb-2">
                <CheckCircle2 className="w-12 h-12 animate-bounce" />
              </div>
              <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium">
                تم تغيير كلمة المرور بنجاح! جاري تحويلك إلى لوحة التحكم...
              </div>
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-6 py-4">
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {error}
              </div>
              <Link
                href="/forgot-password"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors shadow-md"
              >
                طلب رابط إعادة تعيين جديد
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium text-right">
                  {error}
                </div>
              )}

              <div className="space-y-1 text-right">
                <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-xs font-mono text-right"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1 text-right">
                <label htmlFor="confirm-password" className="text-xs font-semibold text-slate-300">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-xs font-mono text-right"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-500 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                {loading ? 'جاري الحفظ…' : 'حفظ كلمة المرور'}
                <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-900 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
