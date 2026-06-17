'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
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
      const session = await db.login(email, password);
      
      // Check subscription status
      const orgId = session.organization_id;
      if (orgId) {
        const sub = await db.getSubscription(orgId);
        const org = await db.getOrganization(orgId);
        
        // If subscription is inactive or expired, redirect to subscription gate
        if (!sub || sub.status !== 'active') {
          router.push('/subscription');
        } else if (!org || !org.commercial_registration) {
          // If no setup completed, redirect to wizard
          router.push('/setup');
        } else {
          // Redirect labor users to new order, owners to overview dashboard
          if (session.role === 'labor') {
            router.push('/dashboard/new-order');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        router.push('/subscription');
      }
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من الهوية. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark-bg px-4 py-12 sm:px-6 lg:px-8">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Logo" className="h-24 w-auto mb-4" />
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-heading">
            لاندر<span className="text-brand-400 font-normal">ساس</span>
          </h2>
          <p className="mt-2 text-xs text-slate-450 max-w-xs leading-relaxed">
            أدر عمليات مغسلتك بدقة تشغيلية متناهية.
          </p>
        </div>

        {/* Premium Form Panel */}
        <div className="premium-card rounded-3xl p-8 shadow-float">
          {/* Header badge */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-blue-400">لوحة تحكم المغسلة</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email-address" className="text-xs font-semibold text-slate-350">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 premium-input text-right text-xs"
                  placeholder="name@laundry.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-semibold text-slate-350">
                  كلمة المرور
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  هل نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
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
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              {loading ? 'جاري التحقق…' : 'تسجيل الدخول'}
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-450">
            أعميل مغسلة جديد؟{' '}
            <Link
              href="/register"
              className="font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              أنشئ حساب منشأة جديد
            </Link>
          </p>
        </div>

        {/* Admin login link */}
        <div className="text-center">
          <Link
            href="/admin/login"
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors font-semibold"
          >
            تسجيل دخول المدير ←
          </Link>
        </div>
      </div>
    </div>
  );
}
