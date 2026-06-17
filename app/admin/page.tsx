'use client';

import React, { useState, useEffect } from 'react';
import { db, Organization, Subscription, Invoice } from '@/lib/db';
import { 
  Building2, 
  CreditCard, 
  FileSpreadsheet, 
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [orgs, subs, invs] = await Promise.all([
        db.getAllOrganizations(),
        db.getAllSubscriptions(),
        db.getAllInvoices()
      ]);
      setOrganizations(orgs);
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

  const statsItems = [
    {
      name: 'إجمالي المغاسل المسجلة',
      value: organizations.length,
      change: 'جميع المنشآت المسجلة',
      icon: Building2,
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/20'
    },
    {
      name: 'الاشتراكات النشطة',
      value: activeSubscriptions.length,
      change: `من أصل ${subscriptions.length} اشتراك`,
      icon: CreditCard,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      name: 'إجمالي الفواتير في النظام',
      value: allInvoices.length,
      change: 'عبر جميع المغاسل',
      icon: FileSpreadsheet,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      name: 'إيرادات الاشتراكات الشهرية',
      value: `${totalSaaSRevenue.toLocaleString('ar-EG')} ر.س`,
      change: 'الإيرادات المتكررة (MRR)',
      icon: DollarSign,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
  ];

  const getSubStatus = (orgId: string) => {
    const sub = subscriptions.find(s => s.organization_id === orgId);
    if (!sub) return { label: 'لا يوجد', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
    if (sub.status === 'active') return { label: 'نشط', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    if (sub.status === 'expired') return { label: 'منتهي', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    return { label: 'غير نشط', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2 text-xs">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-red-950/20 via-slate-900/40 to-slate-900/20 p-6 md:p-8 rounded-3xl border border-dark-border shadow-premium relative overflow-hidden">
        <div className="absolute top-0 start-0 w-44 h-44 rounded-full bg-red-500/5 blur-[50px] pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl font-extrabold text-white font-heading">لوحة التحكم والملخص العام 🛡️</h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">أهلاً بك في نظام الإدارة العليا. فيما يلي ملخص عام لأنشطة المنصة وأداء المنشآت التشغيلية.</p>
        </div>

        <div className="relative z-10 flex items-center gap-2 bg-dark-bg/60 border border-dark-border px-4 py-2.5 rounded-2xl">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold text-slate-300">حالة النظام: <span className="text-emerald-400">يعمل بشكل طبيعي</span></span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              className="premium-card rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.name}</p>
                  <h3 className="text-2xl font-black text-white mt-1 font-heading tracking-tight">{item.value}</h3>
                </div>
                <div className={`p-2.5 rounded-2xl border ${item.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-5 justify-start">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500">
                  {item.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Latest Registered Laundries */}
        <div className="lg:col-span-2 premium-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-dark-border/40">
            <span className="text-[10px] font-bold text-slate-500 font-sans">آخر 5 منشآت تم تسجيلها</span>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Building2 className="w-4 h-4 text-brand-400" />
              أحدث المغاسل المسجلة
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-dark-border text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 text-right">اسم المغسلة</th>
                  <th className="pb-3 text-right">تاريخ التسجيل</th>
                  <th className="pb-3 text-center">حالة الاشتراك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border text-slate-300 font-sans">
                {organizations.slice(0, 5).map((org) => {
                  const subStatus = getSubStatus(org.id);
                  return (
                    <tr key={org.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3 font-bold text-slate-200">{org.name}</td>
                      <td className="py-3 font-mono text-slate-400">{new Date(org.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="py-3">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${subStatus.color}`}>
                            {subStatus.label}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">لا توجد مغاسل مسجلة حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cloud Status */}
        <div className="premium-card rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
            <Activity className="w-4 h-4 text-brand-400" />
            حالة الخدمات السحابية
          </h3>

          <div className="divide-y divide-dark-border/40 text-xs font-sans">
            <div className="py-3 flex justify-between items-center">
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md text-[9px]">مستقر</span>
              <p className="text-slate-300">الربط مع بوابة Supabase</p>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md text-[9px]">مستقر</span>
              <p className="text-slate-300">جداول الموظفين والـ Triggers</p>
            </div>
            <div className="py-3 flex justify-between items-center">
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md text-[9px]">نشط</span>
              <p className="text-slate-300">أمن الهوية وقواعد الوصول RLS</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
