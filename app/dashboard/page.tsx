'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Invoice, Customer, UserSession } from '@/lib/db';
import { 
  Users, 
  FileSpreadsheet, 
  DollarSign, 
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalInvoices: 0,
    todayRevenue: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    const loadData = async () => {
      const activeSession = db.getSession();
      if (!activeSession) {
        router.push('/login');
        return;
      }
      if (activeSession.role === 'labor') {
        router.push('/dashboard/new-order');
        return;
      }

      setSession(activeSession);
      const orgId = activeSession.organization_id;
      if (orgId) {
        const invList = await db.getInvoices(orgId);
        const custList = await db.getCustomers(orgId);
        
        setInvoices(invList);
        setCustomers(custList);

        // Calculations
        const today = new Date().toDateString();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        let todayRev = 0;
        let monthRev = 0;

        invList.forEach(inv => {
          const invDate = new Date(inv.created_at);
          if (invDate.toDateString() === today) {
            todayRev += Number(inv.total_amount);
          }
          if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
            monthRev += Number(inv.total_amount);
          }
        });

        setStats({
          totalCustomers: custList.length,
          totalInvoices: invList.length,
          todayRevenue: todayRev,
          monthlyRevenue: monthRev
        });
      }
    };
    loadData();
  }, [router]);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'received':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'processing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'delivered':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'received': return Clock;
      case 'processing': return TrendingUp;
      case 'completed': return CheckCircle;
      case 'delivered': return Truck;
    }
  };

  const statusLabels: Record<string, string> = {
    received: 'تم الاستلام',
    processing: 'قيد المعالجة',
    completed: 'جاهز للتسليم',
    delivered: 'تم التسليم'
  };

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statsItems = [
    {
      name: 'إجمالي العملاء المشتركين',
      value: stats.totalCustomers,
      change: '+١٢.٥٪ مقارنة بالأسبوع الماضي',
      isIncrease: true,
      icon: Users,
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/20 shadow-[0_0_20px_rgba(113,114,239,0.1)]'
    },
    {
      name: 'إجمالي الفواتير الصادرة',
      value: stats.totalInvoices,
      change: '+٨.٣٪ مقارنة بالأسبوع الماضي',
      isIncrease: true,
      icon: FileSpreadsheet,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
    },
    {
      name: 'صافي مبيعات اليوم',
      value: `${stats.todayRevenue.toFixed(2)} ر.س`,
      change: '+١٥.٢٪ مقارنة بالأمس',
      isIncrease: true,
      icon: DollarSign,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
    },
    {
      name: 'صافي مبيعات الشهر الحالي',
      value: `${stats.monthlyRevenue.toFixed(2)} ر.س`,
      change: '-٢.١٪ مقارنة بالمستهدف',
      isIncrease: false,
      icon: TrendingUp,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-brand-950/20 via-slate-900/40 to-slate-900/20 p-6 md:p-8 rounded-3xl border border-dark-border shadow-premium relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 start-0 w-44 h-44 rounded-full bg-brand-500/5 blur-[50px] pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl font-extrabold text-white font-heading">مرحباً بك مجدداً، {session?.name || 'مدير المغسلة'} 👋</h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">إليك نظرة سريعة على مؤشرات أداء المغسلة وحالات الفواتير والطلبات المسجلة اليوم.</p>
        </div>
        <Link 
          href="/dashboard/new-order"
          className="relative z-10 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-float hover:translate-y-[-1px] active:translate-y-[0] transition-all cursor-pointer text-center"
        >
          <Receipt className="w-4 h-4" />
          إنشاء فاتورة جديدة
        </Link>
      </div>

      {/* 2. Key Metrics Grid */}
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
                {item.isIncrease ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={`text-[10px] font-semibold ${item.isIncrease ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Recent Activity & Quick Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Invoices Table (Span 2) */}
        <div className="lg:col-span-2 premium-card rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-white font-heading">أحدث العمليات</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">قائمة بآخر 5 فواتير تم إنشاؤها عبر موظفي الاستقبال.</p>
              </div>
              <Link 
                href="/dashboard/invoices"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 transition-colors"
              >
                عرض السجل بالكامل
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold text-right">رقم الفاتورة</th>
                    <th className="pb-3 font-semibold text-right">بيانات العميل</th>
                    <th className="pb-3 font-semibold text-right">نوع الخدمة</th>
                    <th className="pb-3 font-semibold text-right">القيمة</th>
                    <th className="pb-3 font-semibold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-xs">
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((inv) => {
                      const customer = customers.find(c => c.id === inv.customer_id);
                      const StatusIcon = getStatusIcon(inv.status);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-900/10 transition-colors group">
                          <td className="py-3.5 font-bold text-slate-300 group-hover:text-white transition-colors">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-200">{customer?.name || 'عميل مباشر'}</p>
                              <p className="text-[10px] text-slate-500 font-semibold font-mono">{customer?.phone}</p>
                            </div>
                          </td>
                          <td className="py-3.5 text-slate-400">{inv.service_type}</td>
                          <td className="py-3.5 text-slate-300 font-bold font-mono">{Number(inv.total_amount).toFixed(2)} ر.س</td>
                          <td className="py-3.5">
                            <div className="flex justify-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${getStatusColor(inv.status)}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusLabels[inv.status] || inv.status}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        لا توجد طلبات مسجلة حالياً. ابدأ بإنشاء أول طلب للمغسلة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Operational Statistics Card (Span 1) */}
        <div className="premium-card rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1 font-heading">توزيع طلبات الخدمات</h3>
            <p className="text-[11px] text-slate-500 mb-6">تحليل بياني للخدمات التي يطلبها عملاؤك هذا الشهر.</p>

            {/* Custom SVG Distribution Chart */}
            <div className="relative flex items-center justify-center py-6">
              <svg className="w-40 h-40 transform -rotate-90">
                {/* Background Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth="12"
                />
                {/* Dry Cleaning: 55% */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="transparent"
                  stroke="#7172ef"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 64}`}
                  strokeDashoffset={`${2 * Math.PI * 64 * (1 - 0.55)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Wash & Fold: 30% */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="transparent"
                  stroke="#06b6d4"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 64}`}
                  strokeDashoffset={`${2 * Math.PI * 64 * (1 - 0.30)}`}
                  strokeLinecap="round"
                  transform="rotate(198, 80, 80)"
                  className="transition-all duration-1000"
                />
                {/* Ironing Only: 15% */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="transparent"
                  stroke="#8b5cf6"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 64}`}
                  strokeDashoffset={`${2 * Math.PI * 64 * (1 - 0.15)}`}
                  strokeLinecap="round"
                  transform="rotate(306, 80, 80)"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">تنظيف جاف</span>
                <span className="text-xl font-black text-white mt-0.5 font-heading">٥٥٪</span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-3 mt-4 border-t border-dark-border pt-4">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500 block" />
                  <span>تنظيف جاف وسريع</span>
                </div>
                <span className="text-slate-400 font-bold font-mono">٥٥٪</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 block" />
                  <span>غسيل وكي ملابس</span>
                </div>
                <span className="text-slate-400 font-bold font-mono">٣٠٪</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 block" />
                  <span>كي فقط بالبخار</span>
                </div>
                <span className="text-slate-400 font-bold font-mono">١٥٪</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
