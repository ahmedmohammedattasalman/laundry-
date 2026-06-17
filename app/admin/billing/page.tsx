'use client';

import React, { useState, useEffect } from 'react';
import { db, Subscription, Invoice } from '@/lib/db';
import { 
  CreditCard, 
  DollarSign, 
  Users, 
  TrendingUp, 
  FileSpreadsheet
} from 'lucide-react';

export default function AdminBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [subs, invs] = await Promise.all([
        db.getAllSubscriptions(),
        db.getAllInvoices()
      ]);
      setSubscriptions(subs);
      setAllInvoices(invs);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحميل البيانات');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalSaaSRevenue = activeSubscriptions.length * 249; // 249 SAR per active sub

  return (
    <div className="space-y-8 animate-fade-in text-right">
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2 text-xs">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SaaS Revenue breakdown */}
        <div className="premium-card rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
            <DollarSign className="w-4 h-4 text-brand-400" />
            ملخص إيرادات السحابة (SaaS)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-bg/60 p-4 border border-dark-border rounded-2xl text-center space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">إيرادات SaaS الشهرية</span>
              <strong className="text-lg font-black text-white font-mono">{totalSaaSRevenue.toLocaleString('ar-EG')}</strong>
              <span className="text-[9px] text-slate-400 block font-semibold">ر.س</span>
            </div>
            <div className="bg-dark-bg/60 p-4 border border-dark-border rounded-2xl text-center space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">إجمالي مبيعات المغاسل</span>
              <strong className="text-lg font-black text-white font-mono">{totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</strong>
              <span className="text-[9px] text-slate-400 block font-semibold">ر.س</span>
            </div>
          </div>

          <div className="bg-dark-bg/30 p-4 border border-dark-border/40 rounded-2xl text-xs space-y-2 leading-relaxed text-slate-400 font-sans">
            <p>يتم احتساب إيرادات SaaS بناءً على عدد الاشتراكات النشطة:</p>
            <div className="flex justify-between items-center text-slate-300 font-mono">
              <span>{activeSubscriptions.length} اشتراكات نشطة</span>
              <span>× 249 ر.س / شهرياً</span>
            </div>
          </div>
        </div>

        {/* Subscriptions breakdown */}
        <div className="premium-card rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
            <Users className="w-4 h-4 text-brand-400" />
            أقسام وتوزيع الاشتراكات
          </h3>

          <div className="space-y-3 font-sans">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />
                <span>اشتراكات نشطة</span>
              </div>
              <span className="text-slate-200 font-bold font-mono">{activeSubscriptions.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span>غير نشطة</span>
              </div>
              <span className="text-slate-200 font-bold font-mono">{subscriptions.filter(s => s.status === 'inactive').length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                <span>منتهية أو ملغاة</span>
              </div>
              <span className="text-slate-200 font-bold font-mono">{subscriptions.filter(s => s.status === 'expired' || s.status === 'cancelled').length}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-dark-border">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>نسبة الاشتراكات المفعلة</span>
              <span>{subscriptions.length > 0 ? Math.round((activeSubscriptions.length / subscriptions.length) * 100) : 0}٪</span>
            </div>
            <div className="w-full h-2 rounded-full bg-dark-bg/60 border border-dark-border overflow-hidden">
              <div 
                className="h-full bg-gradient-to-l from-green-500 to-emerald-500"
                style={{ width: `${subscriptions.length > 0 ? (activeSubscriptions.length / subscriptions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
