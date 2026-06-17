'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Customer, Invoice } from '@/lib/db';
import { 
  Search, 
  Users, 
  Coins, 
  ChevronRight, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  X, 
  CheckCircle, 
  Eye,
  FileSpreadsheet
} from 'lucide-react';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  
  // Detail drawer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const session = db.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      if (session.role === 'labor') {
        router.push('/dashboard/new-order');
        return;
      }

      if (session.organization_id) {
        const orgId = session.organization_id;
        const [custList, invList] = await Promise.all([
          db.getCustomers(orgId),
          db.getInvoices(orgId)
        ]);
        setCustomers(custList);
        setInvoices(invList);
      }
    };
    loadData();
  }, [router]);

  // Compute metrics per customer
  const getCustomerMetrics = (custId: string) => {
    const custInvoices = invoices.filter(inv => inv.customer_id === custId);
    const totalOrders = custInvoices.length;
    const totalRevenue = custInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    return { totalOrders, totalRevenue, history: custInvoices };
  };

  // Filter customers list
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'received': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'processing': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
  };

  const statusLabels: Record<string, string> = {
    received: 'تم الاستلام',
    processing: 'قيد المعالجة',
    completed: 'جاهز للتسليم',
    delivered: 'تم التسليم'
  };

  return (
    <div className="space-y-6 animate-fade-in relative text-right">
      
      {/* 1. Filtering Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-dark-card/40 p-5 rounded-3xl border border-dark-border shadow-premium">
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full ps-11 pe-3.5 py-3.5 text-xs premium-input text-right"
            placeholder="ابحث باسم العميل أو رقم الجوال..."
          />
        </div>
        
        <span className="text-xs bg-dark-bg border border-dark-border px-4 py-2.5 rounded-2xl text-slate-400 font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          إجمالي الشريحة: {filteredCustomers.length} عملاء
        </span>
      </div>

      {/* 2. Customer Ledger Table */}
      <div className="premium-card rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-dark-border text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold text-right">اسم العميل</th>
                <th className="pb-3 font-semibold text-right">رقم الجوال</th>
                <th className="pb-3 font-semibold text-center">نقاط الولاء</th>
                <th className="pb-3 font-semibold text-center">إجمالي الطلبات</th>
                <th className="pb-3 font-semibold text-right">إجمالي المدفوعات</th>
                <th className="pb-3 font-semibold text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-xs">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => {
                  const metrics = getCustomerMetrics(cust.id);
                  return (
                    <tr key={cust.id} className="hover:bg-slate-900/10 transition-colors group">
                      <td className="py-4 font-bold text-slate-200 group-hover:text-white transition-colors">
                        {cust.name}
                      </td>
                      <td className="py-4 text-slate-400 font-mono">
                        {cust.phone}
                      </td>
                      <td className="py-4">
                        <div className="flex justify-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                            <Coins className="w-3.5 h-3.5" />
                            {cust.points} نقطة
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold text-slate-300 font-mono">
                        {metrics.totalOrders}
                      </td>
                      <td className="py-4 font-bold font-mono text-slate-200">
                        {metrics.totalRevenue.toFixed(2)} ر.س
                      </td>
                      <td className="py-4 text-left">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-[10px] font-bold text-slate-350 hover:text-white bg-slate-950 border border-dark-border hover:bg-slate-900/40 transition-all cursor-pointer shadow-sm"
                        >
                          عرض السجل
                          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 font-medium">
                    لم يتم العثور على أي عملاء مسجلين. ابدأ بإنشاء أول طلب لتسجيل العملاء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Detail Drawer for Customer Profile & Invoice History */}
      {selectedCustomer && (() => {
        const metrics = getCustomerMetrics(selectedCustomer.id);
        return (
          <div className="fixed inset-0 z-45 flex justify-end">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedCustomer(null)}
            />

            <div className="relative w-full max-w-xl bg-dark-card border-s border-dark-border h-full flex flex-col justify-between shadow-2xl z-50 animate-slide-in">
              
              {/* Header */}
              <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-card/25 backdrop-blur-md">
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">ملف العميل</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">تم التسجيل في {new Date(selectedCustomer.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-dark-border cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-dark-bg/60 border border-dark-border p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">إجمالي المشتريات</span>
                    <strong className="text-sm font-black text-white font-mono">{metrics.totalRevenue.toFixed(2)}</strong>
                    <span className="text-[8px] text-slate-400 block font-semibold">ر.س</span>
                  </div>
                  <div className="bg-dark-bg/60 border border-dark-border p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">الطلبات المسجلة</span>
                    <strong className="text-sm font-black text-white font-mono">{metrics.totalOrders}</strong>
                    <span className="text-[8px] text-slate-400 block font-semibold">طلب</span>
                  </div>
                  <div className="bg-dark-bg/60 border border-dark-border p-4 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">رصيد النقاط</span>
                    <strong className="text-sm font-black text-amber-400 font-mono">{selectedCustomer.points}</strong>
                    <span className="text-[8px] text-slate-400 block font-semibold">نقطة</span>
                  </div>
                </div>

                {/* Customer Contact Card */}
                <div className="bg-dark-bg/40 border border-dark-border p-4 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">اسم العميل:</span>
                    <span className="font-bold text-slate-200">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">رقم الجوال:</span>
                    <span className="font-bold text-slate-200 font-mono">{selectedCustomer.phone}</span>
                  </div>
                </div>

                {/* Invoice History List */}
                <div className="space-y-4 text-right">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-brand-400" />
                    سجل الفواتير والعمليات
                  </h4>
                  
                  <div className="space-y-2">
                    {metrics.history.length > 0 ? (
                      [...metrics.history]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((inv) => (
                          <div 
                            key={inv.id}
                            className="bg-dark-bg/40 border border-dark-border rounded-2xl p-4 flex justify-between items-center hover:border-slate-800 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">{inv.invoice_number}</span>
                                <span className="text-[10px] text-slate-400">({inv.service_type})</span>
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {new Date(inv.created_at).toLocaleDateString('ar-EG')} في {new Date(inv.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-200 font-mono">
                                {Number(inv.total_amount).toFixed(2)} ر.س
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold border ${getStatusColor(inv.status)}`}>
                                {statusLabels[inv.status]}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">لا توجد أي فواتير مسجلة لهذا العميل حالياً.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-dark-border bg-dark-card shrink-0">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-dark-border transition-all cursor-pointer text-center"
                >
                  إغلاق سجل العمليات
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
