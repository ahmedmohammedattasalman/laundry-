'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Bundle, Customer, UserSession } from '@/lib/db';
import { 
  Wallet, 
  Search, 
  Plus, 
  User, 
  Phone, 
  Coins, 
  Check, 
  AlertTriangle
} from 'lucide-react';

export default function BundlesPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [bundles, setBundles] = useState<(Bundle & { customer_name?: string; customer_phone?: string })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Top-up Form states
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Autosuggest states
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  // Page feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async (orgId: string) => {
    const [bundleList, custList] = await Promise.all([
      db.getBundles(orgId),
      db.getCustomers(orgId)
    ]);
    setBundles(bundleList);
    setCustomers(custList);
  };

  useEffect(() => {
    const activeSession = db.getSession();
    if (!activeSession) {
      router.push('/login');
      return;
    }
    if (activeSession.role === 'labor') {
      router.push('/dashboard/new-order');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(activeSession);
    loadData(activeSession.organization_id!);
  }, [router]);

  // Handle phone changes to trigger auto-suggest
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setSelectedCustomerId(null);
    setName('');
    
    if (val.length >= 3) {
      const filtered = customers.filter(c => c.phone.includes(val));
      setSuggestions(filtered);
      
      // If exact phone match exists, pre-select it
      const exactMatch = customers.find(c => c.phone === val);
      if (exactMatch) {
        setSelectedCustomerId(exactMatch.id);
        setName(exactMatch.name);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  // Select customer from suggestions
  const selectCustomer = (cust: Customer) => {
    setName(cust.name);
    setPhone(cust.phone);
    setSelectedCustomerId(cust.id);
    setSuggestions([]);
  };

  const handleActivateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id) return;
    if (!phone || !name || amount <= 0) {
      setError('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const orgId = session.organization_id;
      let customerId = selectedCustomerId;

      // 1. Create customer if not existing
      if (!customerId) {
        const newCust = await db.createCustomer(orgId, name, phone);
        customerId = newCust.id;
      }

      // 2. Create or Top-up Bundle
      await db.createOrUpdateBundle(orgId, customerId, amount);

      setSuccessMessage(`تم شحن باقة العميل ${name} بقيمة ${amount.toFixed(2)} ر.س بنجاح!`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);

      // Reset form
      setPhone('');
      setName('');
      setAmount(100);
      setSelectedCustomerId(null);

      // Reload list
      await loadData(orgId);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err?.message || 'حدث خطأ أثناء تفعيل الباقة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBundles = bundles.filter(b => {
    const q = searchQuery.toLowerCase();
    return (
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_phone?.includes(q)
    );
  });

  if (!session) return null;

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {success && (
        <div className="bg-dark-card/90 border border-green-500/30 p-4.5 rounded-2xl flex items-center gap-3 shadow-premium text-green-400 text-xs font-semibold animate-pulse">
          <Check className="w-5 h-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-dark-card/90 border border-red-500/30 p-4.5 rounded-2xl flex items-center gap-3 shadow-premium text-red-400 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Columns (Span 2): Active Bundles Registry */}
        <div className="lg:col-span-2 premium-card rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white font-heading">سجل باقات المشتركين مسبقة الدفع</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">قائمة بجميع المشتركين النشطين وأرصدتهم المتبقية.</p>
              </div>
              
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-2.5 text-xs premium-input text-right"
                  placeholder="ابحث باسم العميل أو رقم الجوال..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold text-right">المشترك</th>
                    <th className="pb-3 font-semibold text-right">رقم الجوال</th>
                    <th className="pb-3 font-semibold text-right">الرصيد المشحون</th>
                    <th className="pb-3 font-semibold text-right">الرصيد المتبقي</th>
                    <th className="pb-3 font-semibold text-center">حالة الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-xs">
                  {filteredBundles.length > 0 ? (
                    filteredBundles.map((b) => {
                      const balanceRatio = Number(b.balance) / Number(b.total_balance);
                      let balanceBadgeColor = 'bg-green-500/10 text-green-400 border-green-500/20';
                      let balanceLabel = 'رصيد كافٍ';
                      if (balanceRatio === 0) {
                        balanceBadgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                        balanceLabel = 'منتهية';
                      } else if (balanceRatio < 0.2) {
                        balanceBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        balanceLabel = 'رصيد منخفض';
                      }
                      
                      return (
                        <tr key={b.id} className="hover:bg-slate-900/10 transition-colors group">
                          <td className="py-3.5 font-bold text-slate-200 group-hover:text-white transition-colors">
                            {b.customer_name || 'عميل مباشر'}
                          </td>
                          <td className="py-3.5 text-slate-450 font-mono">
                            {b.customer_phone}
                          </td>
                          <td className="py-3.5 text-slate-400 font-bold font-mono">
                            {Number(b.total_balance).toFixed(2)} ر.س
                          </td>
                          <td className="py-3.5 text-slate-200 font-black font-mono">
                            {Number(b.balance).toFixed(2)} ر.س
                          </td>
                          <td className="py-3.5">
                            <div className="flex justify-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${balanceBadgeColor}`}>
                                <Wallet className="w-3 h-3" />
                                {balanceLabel}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold">
                        لا توجد باقات مفعلة تطابق البحث. ابدأ بتفعيل أول باقة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Span 1): Recharge / Create Package Form */}
        <div className="premium-card rounded-3xl p-6 space-y-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
            <Coins className="w-4 h-4 text-brand-400" />
            شحن وتفعيل باقة جديدة
          </h3>

          <form onSubmit={handleActivateBundle} className="space-y-4">
            
            {/* Phone Lookup & Autosuggest */}
            <div className="space-y-1 relative">
              <label htmlFor="lookup-phone" className="text-xs font-semibold text-slate-350">
                رقم جوال المشترك
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="lookup-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input text-right font-mono"
                  placeholder="مثال: 0501234567"
                />
              </div>

              {/* Autosuggest Box */}
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-xl shadow-premium divide-y divide-slate-800/40 max-h-40 overflow-y-auto text-right">
                  {suggestions.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => selectCustomer(cust)}
                      className="w-full text-right px-3.5 py-2.5 hover:bg-slate-900/40 flex justify-between items-center text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{cust.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold font-mono mt-0.5">{cust.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subscriber Name */}
            <div className="space-y-1">
              <label htmlFor="lookup-name" className="text-xs font-semibold text-slate-350">
                اسم المشترك
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="lookup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input text-right"
                  placeholder="اسم المشترك الكامل"
                />
              </div>
            </div>

            {/* Recharge Amount */}
            <div className="space-y-1">
              <label htmlFor="bundle-amount" className="text-xs font-semibold text-slate-350">
                قيمة شحن الرصيد (ر.س)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <Coins className="h-4 w-4" />
                </div>
                <input
                  id="bundle-amount"
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0.01, Number(e.target.value)))}
                  className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">سيتم إضافة هذا المبلغ إلى رصيد باقة العميل المسبقة الدفع الحالية أو إنشاء باقة جديدة له.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'جاري شحن الباقة…' : 'تفعيل وشحن الباقة'}
            </button>

          </form>
        </div>

      </div>

    </div>
  );
}
