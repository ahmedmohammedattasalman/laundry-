'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await db.loginAdmin(email, password);
      router.push('/admin');
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من هوية المدير.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark-bg px-4 py-12 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-red-500/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-amber-500/3 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4 shadow-float">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-heading">
            لوحة <span className="text-red-400 font-normal">الإدارة</span>
          </h2>
          <p className="mt-2 text-xs text-slate-450 max-w-xs leading-relaxed">
            لوحة تحكم مديري نظام لاندرساس — للإشراف على المغاسل والاشتراكات.
          </p>
        </div>

        <div className="premium-card rounded-3xl p-8 shadow-float border-red-500/10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="admin-email" className="text-xs font-semibold text-slate-350">
                البريد الإلكتروني للمدير
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  required
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 premium-input text-right text-xs"
                  placeholder="admin@laundrasaas.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-semibold text-slate-350">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 premium-input text-right text-xs font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-xs font-bold text-white bg-gradient-to-l from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group transition-all"
            >
              {loading ? 'جاري التحقق…' : 'دخول لوحة الإدارة'}
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-450">
            <Link
              href="/login"
              className="font-bold text-slate-400 hover:text-white transition-colors"
            >
              ← العودة لتسجيل دخول المغسلة
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
