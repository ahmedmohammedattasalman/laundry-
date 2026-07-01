'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, UserSession } from '@/lib/db';
import { Lock, Mail, Save, ShieldAlert, Check } from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const activeSession = db.getSession();
    if (!activeSession || activeSession.role !== 'super_admin') {
      router.push('/admin/login');
      return;
    }
    setSession(activeSession);
    setEmail(activeSession.email);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('البريد الإلكتروني مطلوب.');
      return;
    }
    if (password && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (password && password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await db.updateAdminLoginInfo(email, password || undefined);
      
      // Update session locally
      await db.syncSession();
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث بيانات الدخول.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8 animate-fade-in text-right">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="max-w-xl">
        <div className="premium-card rounded-3xl p-8 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            تعديل بيانات دخول مدير النظام
          </h3>

          <p className="text-xs text-slate-405 leading-relaxed">
            من هنا يمكنك تعديل البريد الإلكتروني وكلمة المرور الخاصة بحساب الإدارة العليا للنظام.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input text-right font-mono"
                  placeholder="admin@laundry.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-semibold text-slate-350">
                كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="admin-confirm-password" className="text-xs font-semibold text-slate-350">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-dark-border items-center gap-3">
              {success && (
                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  تم التحديث بنجاح
                </span>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-red-650 hover:bg-red-500 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
