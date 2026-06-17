'use client';

import React, { useState, useEffect } from 'react';
import { db, Subscription, Invoice } from '@/lib/db';
import { 
  CreditCard, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Gift,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sliders,
  Settings
} from 'lucide-react';

export default function AdminBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'financials' | 'settings'>('financials');
  
  // Pricing state
  const [monthlyPrice, setMonthlyPrice] = useState(299);
  const [monthlyOriginalPrice, setMonthlyOriginalPrice] = useState(499);
  const [annualPrice, setAnnualPrice] = useState(3500);
  const [annualOriginalPrice, setAnnualOriginalPrice] = useState(4999);

  // Add Promo Code state
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'trial' | 'discount_percent' | 'discount_amount'>('trial');
  const [newValue, setNewValue] = useState(7);

  // Status/Messages state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [subs, invs, prices, promos] = await Promise.all([
        db.getAllSubscriptions(),
        db.getAllInvoices(),
        db.getPricingSettings(),
        db.getPromoCodes()
      ]);
      setSubscriptions(subs);
      setAllInvoices(invs);
      setPromoCodes(promos);

      if (prices) {
        setMonthlyPrice(prices.monthly_price || 299);
        setMonthlyOriginalPrice(prices.monthly_original_price || 499);
        setAnnualPrice(prices.annual_price || 3500);
        setAnnualOriginalPrice(prices.annual_original_price || 4999);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحميل البيانات');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await Promise.all([
        db.updatePricingSetting('monthly_price', monthlyPrice),
        db.updatePricingSetting('monthly_original_price', monthlyOriginalPrice),
        db.updatePricingSetting('annual_price', annualPrice),
        db.updatePricingSetting('annual_original_price', annualOriginalPrice)
      ]);
      setSuccessMsg('تم تحديث إعدادات الأسعار السحابية بنجاح!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث إعدادات الأسعار');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.createPromoCode(newCode, newType, newValue);
      setSuccessMsg('تم إنشاء كود الخصم بنجاح!');
      setNewCode('');
      setNewValue(newType === 'trial' ? 7 : 10);
      const promos = await db.getPromoCodes();
      setPromoCodes(promos);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء كود الخصم');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف كود الخصم هذا؟')) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.deletePromoCode(id);
      setSuccessMsg('تم حذف كود الخصم بنجاح!');
      const promos = await db.getPromoCodes();
      setPromoCodes(promos);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حذف كود الخصم');
    } finally {
      setLoading(false);
    }
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  
  // Calculate SaaS revenue from actual price paid in database
  const totalSaaSRevenue = subscriptions.reduce((sum, sub) => {
    if (sub.status === 'active') {
      return sum + Number(sub.price_paid || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-8 animate-fade-in text-right font-sans">
      
      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 text-xs justify-start">
          <CheckCircle className="w-4.5 h-4.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-2 text-xs justify-start">
          <AlertCircle className="w-4.5 h-4.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-dark-border gap-6">
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-4 text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
            activeTab === 'financials'
              ? 'text-red-500 border-b-2 border-red-500 font-bold'
              : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          المالية والاشتراكات
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'text-red-500 border-b-2 border-red-500 font-bold'
              : 'text-slate-450 hover:text-slate-300'
          }`}
        >
          إعدادات الأسعار وأكواد الخصم
        </button>
      </div>

      {activeTab === 'financials' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SaaS Revenue breakdown */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <DollarSign className="w-4 h-4 text-brand-400" />
              ملخص إيرادات السحابة (SaaS)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-bg/60 p-4 border border-dark-border rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">إجمالي مبيعات الاشتراكات</span>
                <strong className="text-lg font-black text-white font-mono">{totalSaaSRevenue.toLocaleString('ar-EG')}</strong>
                <span className="text-[9px] text-slate-400 block font-semibold">ر.س مدفوعة</span>
              </div>
              <div className="bg-dark-bg/60 p-4 border border-dark-border rounded-2xl text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">إجمالي مبيعات المغاسل</span>
                <strong className="text-lg font-black text-white font-mono">{totalRevenue.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</strong>
                <span className="text-[9px] text-slate-400 block font-semibold">ر.س</span>
              </div>
            </div>

            <div className="bg-dark-bg/30 p-4 border border-dark-border/40 rounded-2xl text-xs space-y-2 leading-relaxed text-slate-400 font-sans">
              <p>يتم احتساب إجمالي مبيعات الاشتراكات السحابية بناءً على المدفوعات الفعلية المسجلة لكل مغسلة نشطة.</p>
              <div className="flex justify-between items-center text-slate-300 font-mono">
                <span>{activeSubscriptions.length} اشتراكات نشطة حالياً</span>
                <span>متوسط دورة الفوترة: 299 ر.س / شهرياً</span>
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
                  <span>اشتراكات نشطة (مفعلة وتجريبية)</span>
                </div>
                <span className="text-slate-200 font-bold font-mono">{activeSubscriptions.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                  <span>غير نشطة (بانتظار الدفع)</span>
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pricing Config Form */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Sliders className="w-4 h-4 text-brand-400" />
              إعدادات أسعار الاشتراكات
            </h3>
            
            <form onSubmit={handleUpdatePrices} className="space-y-4 font-sans text-xs">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-dark-border pb-1">الاشتراك الشهري (Monthly)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500">السعر الفعلي (ر.س)</label>
                    <input
                      type="number"
                      required
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500">السعر قبل الخصم (ر.س)</label>
                    <input
                      type="number"
                      required
                      value={monthlyOriginalPrice}
                      onChange={(e) => setMonthlyOriginalPrice(Number(e.target.value))}
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-dark-border pb-1">الاشتراك السنوي (Annual)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500">السعر الفعلي (ر.س)</label>
                    <input
                      type="number"
                      required
                      value={annualPrice}
                      onChange={(e) => setAnnualPrice(Number(e.target.value))}
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500">السعر قبل الخصم (ر.س)</label>
                    <input
                      type="number"
                      required
                      value={annualOriginalPrice}
                      onChange={(e) => setAnnualOriginalPrice(Number(e.target.value))}
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-red-650 hover:bg-red-500 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all text-center flex justify-center items-center gap-2"
                >
                  <span>حفظ وتطبيق الأسعار الجديدة</span>
                </button>
              </div>
            </form>
          </div>

          {/* Promo Codes Manager */}
          <div className="lg:col-span-2 premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Gift className="w-4 h-4 text-brand-400" />
              إدارة أكواد الخصم والمدد التجريبية
            </h3>

            {/* Create promo form inline */}
            <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-dark-bg/40 border border-dark-border rounded-2xl text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-bold">كود الخصم *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: TRIAL7"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full text-xs text-slate-200 bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:outline-none uppercase text-center font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-bold">نوع الكود *</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setNewType(type);
                    setNewValue(type === 'trial' ? 7 : 10);
                  }}
                  className="w-full text-xs text-slate-200 bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:outline-none"
                >
                  <option value="trial">فترة تجريبية مجانية (أيام)</option>
                  <option value="discount_percent">نسبة خصم بالـ ٪</option>
                  <option value="discount_amount">قيمة خصم ثابتة (ر.س)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-bold">
                  {newType === 'trial' ? 'عدد الأيام التجريبية' : newType === 'discount_percent' ? 'نسبة الخصم (٪)' : 'قيمة الخصم (ر.س)'} *
                </label>
                <input
                  type="number"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(Number(e.target.value))}
                  className="w-full text-xs text-slate-200 bg-dark-bg border border-dark-border rounded-xl p-2.5 focus:outline-none text-center"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading || !newCode.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إنشاء الكود</span>
                </button>
              </div>
            </form>

            {/* List existing promos */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-[9px] font-bold text-slate-500 uppercase">
                    <th className="pb-2 text-right">كود الخصم</th>
                    <th className="pb-2 text-right">نوع الخصم</th>
                    <th className="pb-2 text-center">القيمة / الأيام</th>
                    <th className="pb-2 text-center">الحالة</th>
                    <th className="pb-2 text-center">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-xs">
                  {promoCodes.length > 0 ? (
                    promoCodes.map((promo) => (
                      <tr key={promo.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-200 uppercase">{promo.code}</td>
                        <td className="py-3 text-slate-400">
                          {promo.type === 'trial' ? 'فترة تجريبية مجانية' : promo.type === 'discount_percent' ? 'نسبة خصم' : 'خصم بمبلغ ثابت'}
                        </td>
                        <td className="py-3 text-center text-slate-200 font-mono">
                          {promo.value} {promo.type === 'trial' ? 'أيام' : promo.type === 'discount_percent' ? '٪' : 'ر.س'}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            promo.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {promo.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleDeletePromoCode(promo.id)}
                            className="p-1 rounded bg-red-950/20 border border-red-900/30 hover:bg-red-900/30 text-red-400 cursor-pointer transition-all"
                            title="حذف الكود"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        لا توجد أكواد خصم نشطة حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
