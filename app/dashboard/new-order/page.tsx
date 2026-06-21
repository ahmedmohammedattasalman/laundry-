'use client';

import React, { useState, useEffect } from 'react';
import { db, Customer, Invoice, Organization, ServiceType, StaffMember, Bundle, UserSession } from '@/lib/db';
import { generateZatcaString } from '@/lib/zatca';
import { 
  User, 
  Phone, 
  Hash, 
  Layers, 
  BadgeCent, 
  FileText, 
  Coins, 
  Check, 
  Printer, 
  Share2, 
  Plus,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function NewOrderPage() {
  // Database refs
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);

  // Form states
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerBundle, setCustomerBundle] = useState<Bundle | null>(null);
  const [createdBy, setCreatedBy] = useState('');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [serviceType, setServiceType] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [piecesCount, setPiecesCount] = useState(1);
  const [amount, setAmount] = useState(10); // Base amount before VAT
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'package_subscriber' | 'points_redemption'>('cash');
  const [paperSize, setPaperSize] = useState<'58' | '80'>('80');

  // Operational states
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Autosuggest states
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const activeSession = db.getSession();
      if (activeSession && activeSession.organization_id) {
        setSession(activeSession);
        const orgId = activeSession.organization_id;
        const org = await db.getOrganization(orgId);
        const custs = await db.getCustomers(orgId);
        const services = await db.getServiceTypes(orgId);
        const staff = await db.getStaffMembers(orgId);
        setOrganization(org);
        setCustomers(custs);
        setServiceTypes(services);
        setStaffMembers(staff);
        if (services.length > 0) {
          setServiceType(services[0].name);
        }
        if (staff.length > 0) {
          setCreatedBy(staff[0].name);
        }
      }
    };
    loadData();
  }, [success]);

  // Reset points redemption if selected service required points are higher than customer's points
  useEffect(() => {
    if (paymentMethod === 'points_redemption') {
      const selected = serviceTypes.find(st => st.name === serviceType);
      const required = selected?.points_to_redeem ?? 0;
      const activeCust = customers.find(c => c.id === selectedCustomerId);
      
      if (!activeCust || required <= 0 || activeCust.points < required) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPaymentMethod('cash');
      }
    }
  }, [serviceType, selectedCustomerId, paymentMethod, serviceTypes, customers]);

  // Handle phone changes to trigger auto-suggest
  const handlePhoneChange = async (val: string) => {
    setPhone(val);
    setSelectedCustomerId(null);
    setCustomerBundle(null);
    setPaymentMethod('cash');
    if (val.length >= 3) {
      const filtered = customers.filter(c => c.phone.includes(val));
      setSuggestions(filtered);

      // If exact phone match exists, pre-select it
      const exactMatch = customers.find(c => c.phone === val);
      if (exactMatch) {
        setSelectedCustomerId(exactMatch.id);
        setName(exactMatch.name);
        setSuggestions([]);
        try {
          const bundle = await db.getCustomerBundle(exactMatch.id);
          setCustomerBundle(bundle);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      setSuggestions([]);
    }
  };

  // Select customer from suggestions
  const selectCustomer = async (cust: Customer) => {
    setName(cust.name);
    setPhone(cust.phone);
    setSelectedCustomerId(cust.id);
    setSuggestions([]);
    try {
      const bundle = await db.getCustomerBundle(cust.id);
      setCustomerBundle(bundle);
    } catch (err) {
      console.error(err);
      setCustomerBundle(null);
    }
  };

  // Calculations
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedService = serviceTypes.find(st => st.name === serviceType);
  const requiredPointsForFree = selectedService?.points_to_redeem ?? 0;
  const isRedeemingPoints = paymentMethod === 'points_redemption';
  const currentBaseAmount = isRedeemingPoints ? 0 : amount;
  const vatAmount = currentBaseAmount * 0.15;
  const totalAmount = currentBaseAmount + vatAmount;

  // Submit Handler
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id) return;
    setIsSubmitting(true);
    setSuccess(false);
    setError('');

    try {
      const orgId = session.organization_id;
      let customerId = selectedCustomerId;

      // 1. If subscriber package is selected, validate first before anything else
      if (paymentMethod === 'package_subscriber') {
        if (!customerId) {
          const existingCust = customers.find(c => c.phone === phone);
          if (existingCust) {
            customerId = existingCust.id;
          } else {
            setError('يجب اختيار عميل مسجل لديه باقة مشترك نشطة للدفع عن طريق الباقة.');
            setIsSubmitting(false);
            return;
          }
        }

        const bundle = await db.getCustomerBundle(customerId);
        if (!bundle) {
          setError('لا توجد باقة مفعلة لهذا العميل. يرجى تفعيل باقة وشحنها أولاً.');
          setIsSubmitting(false);
          return;
        }

        if (Number(bundle.balance) < Number(totalAmount)) {
          setError(`رصيد الباقة غير كافٍ. الرصيد الحالي: ${Number(bundle.balance).toFixed(2)} ر.س، والمبلغ المطلوب: ${Number(totalAmount).toFixed(2)} ر.س.`);
          setIsSubmitting(false);
          return;
        }

        // Deduct balance
        await db.deductBundleBalance(customerId, totalAmount);
        
        // Refresh customer bundle state
        const updatedBundle = await db.getCustomerBundle(customerId);
        setCustomerBundle(updatedBundle);
      }

      // 2. If points redemption is selected, validate points balance
      if (paymentMethod === 'points_redemption') {
        if (!customerId) {
          setError('يجب اختيار عميل مسجل ولديه نقاط كافية لطلب مجاني.');
          setIsSubmitting(false);
          return;
        }
        const activeCust = customers.find(c => c.id === customerId);
        const requiredPoints = requiredPointsForFree;
        if (requiredPoints <= 0) {
          setError('هذه الخدمة غير قابلة للاستبدال بالنقاط.');
          setIsSubmitting(false);
          return;
        }
        if (!activeCust || activeCust.points < requiredPoints) {
          setError(`نقاط العميل غير كافية لطلب مجاني. النقاط المطلوبة: ${requiredPoints} نقطة.`);
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Create customer if not existing
      if (!customerId) {
        const newCust = await db.createCustomer(orgId, name, phone);
        customerId = newCust.id;
        setCreatedCustomer(newCust);
      } else {
        const existingCust = customers.find(c => c.id === customerId);
        if (existingCust) setCreatedCustomer(existingCust);
      }

      // 4. Create invoice record
      const invoice = await db.createInvoice(orgId, {
        customer_id: customerId!,
        service_type: serviceType,
        pieces_count: Number(piecesCount),
        amount: Number(currentBaseAmount),
        vat_amount: Number(vatAmount),
        total_amount: Number(totalAmount),
        notes: notes || undefined,
        status: 'received',
        payment_method: paymentMethod,
        created_by: createdBy.trim() || undefined
      });

      setCreatedInvoice(invoice);
      setSuccess(true);

      // Trigger automatic WhatsApp message sending in the background
      fetch('/api/whatsapp/send-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          event: 'created'
        })
      }).catch(err => console.error('Failed to send automatic WhatsApp notification:', err));

      // Reset form
      setPhone('');
      setName('');
      setSelectedCustomerId(null);
      setCustomerBundle(null);
      setPiecesCount(1);
      setAmount(10);
      setNotes('');
      setPaymentMethod('cash');
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الفاتورة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ZATCA Base64 string for QR Code
  const getZatcaQRData = () => {
    if (!organization || !createdInvoice) return '';
    return generateZatcaString(
      organization.name,
      organization.vat_number || '300000000000003',
      createdInvoice.created_at,
      Number(createdInvoice.total_amount).toFixed(2),
      Number(createdInvoice.vat_amount).toFixed(2)
    );
  };

  // WhatsApp Alert Generator
  const getWhatsAppLink = () => {
    if (!organization || !createdInvoice || !createdCustomer) return '#';
    const paymentMethodText = 
      createdInvoice.payment_method === 'cash' ? 'نقدي' :
      createdInvoice.payment_method === 'package_subscriber' ? 'باقة المشترك' : 'استبدال نقاط (مجاني)';

    const message = `نشكركم على اختياركم ${organization.name}\n\n` +
      `رقم الفاتورة: ${createdInvoice.invoice_number}\n` +
      `نوع الخدمة: ${createdInvoice.service_type}\n` +
      `عدد القطع: ${createdInvoice.pieces_count}\n` +
      `المبلغ الإجمالي: ${Number(createdInvoice.total_amount).toFixed(2)} ر.س (${paymentMethodText})\n` +
      (createdInvoice.created_by ? `المستلم: ${createdInvoice.created_by}\n` : '') +
      `حالة الطلب: تم الاستلام 📥\n\n` +
      `سنقوم بإشعاركم فور جاهزية الملابس للاستلام.`;
    
    return `https://wa.me/${createdCustomer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
  };

  // Open native print dialog
  const triggerPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {error && (
        <div className="no-print bg-dark-card/90 border border-red-500/30 p-4.5 rounded-2xl flex items-center gap-3 shadow-premium text-red-400 text-xs font-semibold animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {success && createdInvoice && createdCustomer && (
        <div className="no-print bg-dark-card/90 border border-green-500/30 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-premium relative overflow-hidden">
          <div className="absolute top-0 start-0 w-24 h-24 rounded-full bg-green-500/5 blur-[30px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
              <Check className="w-5 h-5" />
              تم إنشاء الفاتورة بنجاح
            </div>
            <p className="text-xs text-slate-400 mt-1">
              تم حفظ الفاتورة رقم <strong className="text-slate-200">{createdInvoice.invoice_number}</strong> للعميل <strong className="text-slate-200">{createdCustomer.name}</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 relative z-10">
            <button
              onClick={triggerPrint}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              طباعة إيصال حراري
            </button>
            <button
              onClick={() => setSuccess(false)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950 border border-dark-border cursor-pointer transition-all"
            >
              تجاهل
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Card: Order Entry Form */}
        <div className="no-print premium-card rounded-3xl p-8 shadow-float text-right">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-heading">
            <Plus className="w-5 h-5 text-brand-400" />
            منشئ الفواتير السريع
          </h2>

          <form onSubmit={handleCreateOrder} className="space-y-5">
            
            {/* Customer Search & Suggestion */}
            <div className="space-y-1 relative">
              <label htmlFor="customer-phone" className="text-xs font-semibold text-slate-300">
                رقم جوال العميل
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="customer-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="block w-full pr-11 pl-3.5 py-3.5 text-sm premium-input text-right font-mono"
                  placeholder="مثال: 0501234567"
                />
              </div>

              {/* Autosuggest Box */}
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-dark-card border border-dark-border rounded-2xl shadow-premium divide-y divide-slate-800/40 max-h-48 overflow-y-auto text-right">
                  {suggestions.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => selectCustomer(cust)}
                      className="w-full text-right px-4 py-3 hover:bg-slate-900/40 flex justify-between items-center text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{cust.name}</p>
                        <p className="text-[10px] text-slate-550 font-semibold font-mono mt-0.5">{cust.phone}</p>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
                        {cust.points} نقطة
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Name */}
            <div className="space-y-1">
              <label htmlFor="customer-name" className="text-xs font-semibold text-slate-300">
                اسم العميل
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="customer-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (selectedCustomerId) {
                      setSelectedCustomerId(null);
                      setCustomerBundle(null);
                      setPaymentMethod('cash');
                    }
                  }}
                  className="block w-full ps-11 pe-3.5 py-3.5 text-sm premium-input text-right"
                  placeholder="مثال: محمد عثمان"
                />
              </div>
              {(customerBundle || activeCustomer) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeCustomer && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-450 bg-amber-550/10 border border-amber-550/20 px-3 py-1.5 rounded-xl">
                      <BadgeCent className="w-4 h-4 shrink-0 text-amber-400" />
                      <span className="text-amber-400">النقاط الحالية للعميل: {activeCustomer.points} نقطة</span>
                    </div>
                  )}
                  {customerBundle && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl">
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span>رصيد باقة المشترك الحالي: {Number(customerBundle.balance).toFixed(2)} ر.س</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Receiving Staff Name */}
            <div className="space-y-1">
              <label htmlFor="created-by" className="text-xs font-semibold text-slate-300">
                الموظف المستلم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                {staffMembers.length > 0 ? (
                  <select
                    id="created-by"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    className="block w-full ps-11 pe-3.5 py-3.5 text-sm premium-input appearance-none cursor-pointer text-right"
                  >
                    {staffMembers.map((sm) => (
                      <option key={sm.id} value={sm.name}>
                        {sm.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="created-by"
                    type="text"
                    required
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    placeholder="اسم موظف الاستقبال"
                    className="block w-full ps-11 pe-3.5 py-3.5 text-sm premium-input text-right"
                  />
                )}
              </div>
            </div>

            {/* Service & Pieces count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="service-type" className="text-xs font-semibold text-slate-300">
                  نوع الخدمة
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                    <Layers className="h-4 w-4" />
                  </div>
                  {serviceTypes.length > 0 ? (
                    <select
                      id="service-type"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="block w-full ps-11 pe-3.5 py-3.5 text-sm premium-input appearance-none cursor-pointer text-right"
                    >
                      {serviceTypes.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="block w-full ps-3 pe-3.5 py-3.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-right">
                      يرجى إضافة أنواع الخدمات أولاً من شاشة الإعدادات
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="pieces-count" className="text-xs font-semibold text-slate-300">
                  عدد القطع
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Hash className="h-4 w-4" />
                  </div>
                  <input
                    id="pieces-count"
                    type="number"
                    required
                    min={1}
                    value={piecesCount}
                    onChange={(e) => setPiecesCount(Math.max(1, Number(e.target.value)))}
                    className="block w-full pr-11 pl-3.5 py-3.5 text-sm premium-input text-right font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Base Amount */}
            <div className="space-y-1">
              <label htmlFor="base-amount" className="text-xs font-semibold text-slate-300">
                المبلغ الخاضع للضريبة (ر.س)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <BadgeCent className="h-4 w-4" />
                </div>
                <input
                  id="base-amount"
                  type="number"
                  required={!isRedeemingPoints}
                  min={0.1}
                  step={0.01}
                  disabled={isRedeemingPoints}
                  value={isRedeemingPoints ? 0 : amount}
                  onChange={(e) => setAmount(Math.max(0.1, Number(e.target.value)))}
                  className="block w-full pr-11 pl-3.5 py-3.5 text-sm premium-input font-mono text-right disabled:opacity-50"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label htmlFor="notes" className="text-xs font-semibold text-slate-300">
                تعليمات خاصة / ملاحظات
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3.5 pt-3.5 flex items-start pointer-events-none text-slate-500">
                  <FileText className="h-4 w-4" />
                </div>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full ps-11 pe-3.5 py-3.5 text-sm premium-input text-right"
                  placeholder="مثال: نشاء خفيف، إزالة بقعة زيت"
                />
              </div>
            </div>

            {/* Payment Method / Account Type */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-350">طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3 px-2 border rounded-2xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-slate-900 text-white border-brand-500 shadow-float'
                      : 'border-dark-border text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                  }`}
                >
                  <Coins className="w-4 h-4 text-emerald-400" />
                  دفع نقدي
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('package_subscriber')}
                  className={`py-3 px-2 border rounded-2xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === 'package_subscriber'
                      ? 'bg-slate-900 text-white border-brand-500 shadow-float'
                      : 'border-dark-border text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-purple-400" />
                  باقة المشترك
                </button>
                <button
                  type="button"
                  disabled={!activeCustomer || requiredPointsForFree <= 0 || activeCustomer.points < requiredPointsForFree}
                  onClick={() => setPaymentMethod('points_redemption')}
                  className={`py-3 px-2 border rounded-2xl text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                    paymentMethod === 'points_redemption'
                      ? 'bg-slate-900 text-white border-brand-500 shadow-float'
                      : 'border-dark-border text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                  }`}
                  title={
                    !activeCustomer ? 'يرجى اختيار عميل أولاً' :
                    requiredPointsForFree <= 0 ? 'هذه الخدمة غير قابلة للاستبدال بالنقاط' :
                    activeCustomer.points < requiredPointsForFree ? `رصيد النقاط غير كافٍ (المطلوب: ${requiredPointsForFree} نقطة)` : 'طلب مجاني بالنقاط'
                  }
                >
                  <BadgeCent className="w-4 h-4 text-amber-400" />
                  طلب مجاني بالنقاط
                </button>
              </div>
              {paymentMethod === 'package_subscriber' && (
                <div className="mt-2 text-right font-medium">
                  {!selectedCustomerId ? (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      يرجى اختيار عميل مسجل لديه باقة دفع مسبق.
                    </p>
                  ) : !customerBundle ? (
                    <p className="text-[10px] text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      هذا العميل ليس لديه باقة مشترك مفعلة.
                    </p>
                  ) : Number(customerBundle.balance) < Number(totalAmount) ? (
                    <p className="text-[10px] text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      رصيد الباقة الحالي ({Number(customerBundle.balance).toFixed(2)} ر.س) أقل من قيمة الفاتورة ({Number(totalAmount).toFixed(2)} ر.س).
                    </p>
                  ) : (
                    <p className="text-[10px] text-green-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      الرصيد كافٍ. سيتم خصم {Number(totalAmount).toFixed(2)} ر.س من رصيد الباقة.
                    </p>
                  )}
                </div>
              )}
              {paymentMethod === 'points_redemption' && (
                <div className="mt-2 text-right font-medium">
                  {activeCustomer && selectedService && (
                    <p className="text-[10px] text-green-400 flex items-center gap-1.5 font-semibold">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      سيتم خصم {requiredPointsForFree} نقطة من رصيد العميل ({activeCustomer.points} نقطة) للحصول على خدمة ({selectedService.name}) مجاناً.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || serviceTypes.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-sm font-semibold text-white premium-btn-primary shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'جاري إنشاء الفاتورة…' : 'إنشاء وحفظ الفاتورة'}
            </button>
          </form>
        </div>

        {/* Right Card: Live Receipt Preview */}
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">المعاينة المباشرة للإيصال</h3>
            <div className="flex bg-dark-card p-0.5 rounded-xl border border-dark-border">
              <button
                onClick={() => setPaperSize('58')}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === '58' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                ورق 58 مم
              </button>
              <button
                onClick={() => setPaperSize('80')}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === '80' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                ورق 80 مم
              </button>
            </div>
          </div>

          {/* Printable Receipt Paper Container */}
          <div className="flex justify-center bg-dark-bg border border-dark-border rounded-3xl p-6 relative overflow-hidden">
            {/* Paper shadow representation */}
            <div 
              id="printable-receipt-area"
              className={`thermal-receipt shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-gray-150 transition-all rounded-sm ${
                paperSize === '58' ? 'thermal-receipt-58' : 'thermal-receipt-80'
              }`}
            >
              
              {/* Receipt Header Logo / Meta */}
              <div className="text-center space-y-1 mb-4">
                {organization?.logo_url ? (
                  <img 
                    src={organization.logo_url} 
                    alt="Logo" 
                    className="h-10 w-10 mx-auto object-cover rounded-full mb-1" 
                  />
                ) : (
                  <div className="h-8 w-8 mx-auto rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-white mb-1">
                    LA
                  </div>
                )}
                <h2 className="font-extrabold text-sm uppercase tracking-wide leading-none">{organization?.name || 'برنامج المغسلة'}</h2>
                <p className="text-[10px] text-gray-500 uppercase">{organization?.address || 'عنوان الفرع'}</p>
                <div className="border-t border-dashed border-gray-400 my-2" />
              </div>

              {/* Company Compliance Information */}
              <div className="text-[10px] space-y-0.5 mb-3 font-mono text-right" dir="rtl">
                <div className="flex justify-between">
                  <span>السجل التجاري:</span>
                  <span className="font-bold">{organization?.commercial_registration || '١٠١٠XXXXXX'}</span>
                </div>
                <div className="flex justify-between">
                  <span>الرقم الضريبي:</span>
                  <span className="font-bold">{organization?.vat_number || '٣٠٠٠XXXXXXXX٠٠٣'}</span>
                </div>
                <div className="flex justify-between">
                  <span>رقم التواصل:</span>
                  <span className="font-bold">{organization?.whatsapp_number || '+96650000000'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Invoice Meta */}
              <div className="text-[10px] space-y-0.5 mb-3 font-mono text-right" dir="rtl">
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">{success && createdInvoice ? createdInvoice.invoice_number : 'INV-XXXX'}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span className="font-bold">
                    {success && createdInvoice 
                      ? new Date(createdInvoice.created_at).toLocaleString('ar-EG') 
                      : new Date().toLocaleString('ar-EG')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span className="font-bold truncate max-w-[150px]">{name || 'عميل مباشر'}</span>
                </div>
                <div className="flex justify-between">
                  <span>الجوال:</span>
                  <span className="font-bold">{phone || 'غير مسجل'}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span className="font-bold">
                    {paymentMethod === 'cash' ? 'نقدي' : 
                     paymentMethod === 'package_subscriber' ? 'باقة المشترك' : 'استبدال نقاط (مجاني)'}
                  </span>
                </div>
                {(success && createdInvoice?.created_by || createdBy) && (
                  <div className="flex justify-between">
                    <span>المستلم:</span>
                    <span className="font-bold">{success && createdInvoice ? createdInvoice.created_by : createdBy}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Items Table */}
              <div className="font-mono text-[10px] mb-4 text-right" dir="rtl">
                <div className="flex justify-between font-bold mb-1">
                  <span>الخدمة</span>
                  <span className="w-12 text-center">الكمية</span>
                  <span className="w-16 text-left">السعر</span>
                </div>
                <div className="border-b border-dashed border-gray-300 mb-1.5" />
                <div className="flex justify-between py-0.5">
                  <span className="truncate max-w-[120px]">{serviceType}</span>
                  <span className="w-12 text-center font-bold">{piecesCount}</span>
                  <span className="w-16 text-left font-mono">{Number(amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />

              {/* Invoice totals */}
              <div className="text-[10px] space-y-1.5 font-mono mb-4 text-right" dir="rtl">
                <div className="flex justify-between">
                  <span>المجموع الفرعي (غير شامل الضريبة):</span>
                  <span>{Number(amount).toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة (١٥٪):</span>
                  <span>{Number(vatAmount).toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-xs font-black border-t border-dashed border-gray-400 pt-1.5">
                  <span>الإجمالي (شامل الضريبة):</span>
                  <span>{Number(totalAmount).toFixed(2)} ر.س</span>
                </div>
              </div>

              {notes && (
                <div className="mb-4 text-[9px] font-mono bg-gray-100 p-1.5 rounded border border-gray-200 text-right">
                  <strong className="block text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">ملاحظات:</strong>
                  {notes}
                </div>
              )}

              {/* ZATCA Compliant QR Code */}
              <div className="flex flex-col items-center justify-center my-5">
                {success && createdInvoice ? (
                  <QRCodeSVG 
                    value={getZatcaQRData()} 
                    size={paperSize === '58' ? 80 : 100}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="border border-dashed border-gray-300 w-24 h-24 flex items-center justify-center text-[8px] text-gray-400 font-mono text-center px-2">
                    الرمز يتم توليده عند الحفظ
                  </div>
                )}
                <span className="text-[7px] text-gray-400 font-mono tracking-widest mt-1 uppercase text-center">خاضع لهيئة الزكاة والضريبة والجمارك</span>
              </div>

              {/* Footer */}
              <div className="text-center font-mono text-[8px] text-gray-500 leading-normal border-t border-dashed border-gray-400 pt-3">
                <p>{organization?.receipt_footer || 'نشكركم على ثقتكم بنا!'}</p>
                <p className="mt-1.5 text-[6px] tracking-wider uppercase">برمجيات LaundraSaaS</p>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
