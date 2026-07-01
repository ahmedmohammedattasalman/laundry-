'use client';

import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  AlertCircle, 
  Loader2, 
  Smartphone,
  CheckSquare,
  Square,
  FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Recipient {
  id: string;
  laundry_name: string;
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  owner_name: string;
  owner_email: string;
}

export default function AdminMarketingPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Composer states
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Test send states
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  
  // Broadcast states
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState<any[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Pre-configured templates in Arabic
  const templates = [
    {
      title: 'إعلان صيانة دورية',
      text: 'عزيزي المالك {{owner_name}}،\n\nنود إحاطتكم علماً بأن هناك صيانة دورية مجدولة لخوادم منصة لاندرساس يوم الجمعة القادم من الساعة 2 صباحاً وحتى 4 صباحاً. قد تواجهون انقطاعاً مؤقتاً في الخدمة خلال هذه الفترة.\n\nنشكر لكم تفهمكم,\nإدارة المنصة 🛠️'
    },
    {
      title: 'تجديد اشتراكات المنصة',
      text: 'أهلاً بك مالك {{owner_name}} لمغسلة {{laundry_name}}،\n\nتذكير لطيف بقرب انتهاء فترة اشتراككم في النظام. لتجنب توقف لوحة الكاشير وإصدار الفواتير، يرجى مراجعة صفحة الاشتراكات وتجديد الاشتراك.\n\nإذا كان لديكم أي استفسار، يسعدنا تواصلكم معنا,\nقسم الفوترة والدعم الفني 💳'
    },
    {
      title: 'عرض ترويجي / باقات جديدة',
      text: 'شريكنا العزيز {{owner_name}}،\n\nيسرنا إطلاق الباقة السنوية المحدثة لمنصة لاندرساس مع خصم خاص يصل إلى 20% عند التجديد قبل نهاية الشهر الحالي.\n\nاحصل على كافة الميزات اللامحدودة ووفر أكثر!\nتواصل معنا عبر الدعم الفني لمزيد من التفاصيل'
    }
  ];

  const loadRecipients = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/admin/marketing/recipients', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      if (!res.ok) {
        throw new Error('فشل جلب قائمة المستلمين');
      }
      const data = await res.json();
      setRecipients(data.recipients || []);
      // Select all by default
      setSelectedIds((data.recipients || []).map((r: Recipient) => r.id));
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients();
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRecipients.length) {
      // Deselect all filtered
      const filteredIds = filteredRecipients.map(r => r.id);
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      const filteredIds = filteredRecipients.map(r => r.id);
      const newSelected = Array.from(new Set([...selectedIds, ...filteredIds]));
      setSelectedIds(newSelected);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const insertVariable = (variable: string) => {
    setMessage(prev => prev + variable);
  };

  const handleTestSend = async () => {
    if (!message.trim()) {
      setErrorMsg('الرجاء كتابة نص الرسالة أولاً');
      return;
    }
    if (!testPhone.trim()) {
      setErrorMsg('الرجاء إدخال رقم هاتف التجربة');
      return;
    }

    setTestLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/marketing/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          isTest: true,
          testPhone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال الرسالة التجريبية');
      }

      setSuccessMsg('تم إرسال الرسالة التجريبية بنجاح إلى الرقم المحدد عبر واتساب!');
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال الرسالة التجريبية');
    } finally {
      setTestLoading(false);
    }
  };

  const handleBroadcastSend = () => {
    if (!message.trim()) {
      setErrorMsg('الرجاء كتابة نص الرسالة أولاً');
      return;
    }

    const targets = recipients.filter(r => selectedIds.includes(r.id));
    if (targets.length === 0) {
      setErrorMsg('الرجاء اختيار مستلم واحد على الأقل للحملة');
      return;
    }

    setShowConfirmModal(true);
  };

  const executeBroadcastSend = async () => {
    setShowConfirmModal(false);
    setBroadcastLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setBroadcastResults([]);
    setShowResultsModal(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/marketing/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          isTest: false,
          recipientIds: selectedIds
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال الحملة الإعلانية');
      }

      setBroadcastResults(data.results || []);
      const successes = (data.results || []).filter((r: any) => r.status === 'success').length;
      setSuccessMsg(`اكتملت الحملة بنجاح! تم إرسال ${successes} رسالة بنجاح من أصل ${data.results.length}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال الحملة الإعلانية');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const filteredRecipients = recipients.filter(r => {
    const q = searchTerm.toLowerCase();
    return (
      r.laundry_name.toLowerCase().includes(q) ||
      r.owner_name.toLowerCase().includes(q) ||
      r.whatsapp_number.includes(q) ||
      r.owner_email.toLowerCase().includes(q)
    );
  });

  const reachableCount = recipients.filter(r => r.whatsapp_number).length;

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 text-xs justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="cursor-pointer">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-xs justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="cursor-pointer">×</button>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-red-950/20 via-slate-900/40 to-slate-900/20 p-6 md:p-8 rounded-3xl border border-dark-border shadow-premium relative overflow-hidden">
        <div className="absolute top-0 start-0 w-44 h-44 rounded-full bg-red-500/5 blur-[50px] pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md">
              <Megaphone className="h-5.5 w-5.5" />
            </div>
            <h2 className="text-xl font-extrabold text-white font-heading">الحملات التسويقية والإعلانات 📢</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-2">
            قم بإرسال رسائل تسويقية وتنبيهات جماعية لكافة أصحاب المغاسل المسجلين في منصتك بضغطة زر واحدة عبر تطبيق واتساب. يمكنك تخصيص الرسالة لكل مغسلة.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 bg-dark-bg/60 border border-dark-border px-4 py-2.5 rounded-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-bold text-slate-300">واجهة الإرسال: <span className="text-emerald-400">جاهزة ومتصلة</span></span>
        </div>
      </div>

      {/* Statistics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="premium-card rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">إجمالي أصحاب المغاسل</p>
            <h3 className="text-2xl font-black text-white font-heading tracking-tight">
              {loading ? '...' : recipients.length}
            </h3>
          </div>
          <div className="p-3 rounded-2xl border border-dark-border bg-dark-bg/40 text-slate-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="premium-card rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">أرقام هواتف مسجلة للواتساب</p>
            <h3 className="text-2xl font-black text-white font-heading tracking-tight">
              {loading ? '...' : reachableCount}
            </h3>
          </div>
          <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="premium-card rounded-3xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">المستهدفون المحددون حالياً</p>
            <h3 className="text-2xl font-black text-white font-heading tracking-tight">
              {loading ? '...' : selectedIds.length}
            </h3>
          </div>
          <div className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Composer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Hand: Message Form Composer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card rounded-3xl p-6 space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading pb-2 border-b border-dark-border/40">
              <FileText className="w-4 h-4 text-red-400" />
              محرر الحملة الإعلانية
            </h3>

            {/* Template Selector Quick buttons */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400">اختر قالباً جاهزاً لبدء الكتابة السريعة:</label>
              <div className="flex flex-wrap gap-2.5">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMessage(tpl.text)}
                    className="text-[10px] px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-red-500/35 rounded-xl text-slate-300 hover:text-white cursor-pointer transition-all duration-300"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable insertion toolbar */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-slate-400">اضغط لإدراج متغير مخصص ديناميكياً لكل مستلم:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => insertVariable('{{owner_name}}')}
                  className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-red-400 border border-red-950/40 rounded-lg cursor-pointer"
                  title="اسم مالك المغسلة"
                >
                  + اسم المالك (Owner Name)
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{laundry_name}}')}
                  className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-red-400 border border-red-950/40 rounded-lg cursor-pointer"
                  title="اسم المغسلة"
                >
                  + اسم المغسلة (Laundry Name)
                </button>
              </div>
            </div>

            {/* Main Message Textarea */}
            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-slate-500">
                  {message.length} حرف | {message.split(/\s+/).filter(Boolean).length} كلمة
                </span>
                <label className="text-[10px] font-bold text-slate-400">محتوى الرسالة الإعلانية *</label>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب هنا محتوى الرسالة... يمكنك استخدام متغيرات مثل {{owner_name}} أو {{laundry_name}} لتخصيص محتوى الرسالة لكل مستلم تلقائياً."
                rows={8}
                dir="rtl"
                className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-2xl p-4 focus:outline-none focus:border-red-500/40 leading-relaxed"
              />
            </div>

            {/* Test Send Area */}
            <div className="bg-slate-950/60 p-4 border border-dark-border rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 text-slate-300">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <h4 className="text-[11px] font-bold">تجربة الإرسال (تأكيد التنسيق)</h4>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal">
                نوصي بشدة بإرسال رسالة تجريبية إلى رقم هاتفك أولاً للتأكد من تنسيق المتغيرات وظهور الرسالة بشكل صحيح قبل الإرسال العام.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={testLoading || !message.trim()}
                  onClick={handleTestSend}
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {testLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                  <span>إرسال تجربة 🧪</span>
                </button>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="9665xxxxxxxx (رقم الهاتف للتجربة)"
                  className="flex-1 text-xs text-slate-300 bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-left font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Broadcast Send Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={broadcastLoading || !message.trim() || selectedIds.length === 0}
                onClick={handleBroadcastSend}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-650 to-rose-650 hover:brightness-110 text-white font-bold text-xs py-3.5 px-6 rounded-2xl cursor-pointer disabled:opacity-40 hover:scale-[1.005] transition-all shadow-lg"
              >
                {broadcastLoading ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <Send className="w-4.5 h-4.5" />
                )}
                <span>إرسال الحملة الإعلانية الآن ({selectedIds.length} مستلم)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Hand: Recipient Picker */}
        <div className="space-y-6">
          <div className="premium-card rounded-3xl p-6 space-y-4 max-h-[720px] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-dark-border/40 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 font-sans">اختر المستهدفين بالحملة</span>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
                <Users className="w-4 h-4 text-red-400" />
                المستلمون
              </h3>
            </div>

            {/* Mini Search */}
            <div className="relative shrink-0">
              <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم المالك أو المغسلة..."
                className="w-full text-xs text-slate-200 bg-dark-bg/60 border border-dark-border rounded-xl py-2 ps-9 pe-3 focus:outline-none"
              />
            </div>

            {/* Select/Deselect All bar */}
            <div className="flex justify-between items-center bg-dark-bg/40 px-3 py-2 rounded-xl border border-dark-border/50 shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold font-sans">
                تم اختيار {selectedIds.length} من أصل {filteredRecipients.length}
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
              >
                {selectedIds.length === filteredRecipients.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>

            {/* Recipient Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none font-sans">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                  <span>جاري تحميل المستلمين…</span>
                </div>
              ) : filteredRecipients.length > 0 ? (
                filteredRecipients.map((recipient) => {
                  const isSelected = selectedIds.includes(recipient.id);
                  
                  return (
                    <div 
                      key={recipient.id}
                      onClick={() => handleToggleSelect(recipient.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-right ${
                        isSelected 
                          ? 'bg-red-500/5 border-red-500/20' 
                          : 'bg-slate-950/20 border-dark-border/50 hover:bg-slate-900/10'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-bold text-slate-200 truncate">{recipient.laundry_name}</p>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          <span>المالك: {recipient.owner_name}</span>
                          <span>•</span>
                          <span className="font-mono">{recipient.whatsapp_number || 'بدون رقم'}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-red-500" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-slate-600" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  لا يوجد مستلمون مطابقون للبحث.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Custom Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-zoom-in text-right">
            
            <div className="flex items-center gap-3.5 text-amber-500">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5.5 h-5.5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white font-heading">تأكيد إرسال الحملة الإعلانية 📣</h3>
                <p className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">يرجى تأكيد إرسال الرسالة الجماعية</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 border border-dark-border rounded-2xl text-xs space-y-2.5 leading-relaxed text-slate-300 font-sans">
              <p>
                أنت على وشك بدء إرسال رسالة تسويقية جماعية إلى <strong className="text-red-400 font-extrabold">{recipients.filter(r => selectedIds.includes(r.id)).length}</strong> مغسلة مسجلة في المنصة.
              </p>
              <div className="p-3 bg-dark-bg/60 rounded-xl border border-dark-border/40 text-[10px] text-slate-400 italic break-words line-clamp-4 leading-normal">
                "{message.length > 150 ? `${message.substring(0, 150)}...` : message}"
              </div>
            </div>

            <div className="flex gap-3 pt-2 font-sans">
              <button
                type="button"
                onClick={executeBroadcastSend}
                className="flex-1 py-3 bg-gradient-to-r from-red-650 to-rose-650 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer transition-all text-center"
              >
                بدء الإرسال الآن
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Broadcast Status Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-hidden flex flex-col text-right animate-zoom-in">
            
            <div className="flex justify-between items-center pb-4 border-b border-dark-border shrink-0">
              {!broadcastLoading && (
                <button 
                  onClick={() => setShowResultsModal(false)} 
                  className="text-slate-400 hover:text-white cursor-pointer text-sm font-semibold"
                >
                  إغلاق ✕
                </button>
              )}
              <h3 className="text-sm font-extrabold text-white font-heading">
                {broadcastLoading ? 'جاري إرسال الحملة الإعلانية…' : 'تقرير نتائج إرسال الحملة 📊'}
              </h3>
            </div>

            {/* Progress status bar */}
            {broadcastLoading && (
              <div className="space-y-2 shrink-0">
                <div className="flex justify-between items-center text-xs text-slate-400 font-sans">
                  <span>تم إرسال {broadcastResults.length} من {selectedIds.length} جهة اتصال</span>
                  <span className="font-bold text-red-400">
                    {Math.round((broadcastResults.length / selectedIds.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-dark-border">
                  <div 
                    className="h-full bg-gradient-to-r from-red-650 to-rose-500 transition-all duration-300"
                    style={{ width: `${(broadcastResults.length / selectedIds.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scrollable console terminal output */}
            <div className="flex-1 overflow-y-auto bg-slate-950 rounded-2xl p-4 border border-dark-border font-mono text-[10px] space-y-2 select-text">
              {broadcastResults.map((res, index) => (
                <div 
                  key={index}
                  className={`flex justify-between items-start py-1 border-b border-slate-900 last:border-0 ${
                    res.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span className="text-left font-sans text-[9px] text-slate-500 shrink-0 max-w-[50%] truncate">
                    {res.status === 'success' ? 'تم الإرسال بنجاح ✓' : res.error}
                  </span>
                  <span className="text-right font-semibold">
                    [{res.laundry_name}]
                  </span>
                </div>
              ))}

              {broadcastLoading && (
                <div className="flex items-center gap-2 text-slate-400 italic py-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري المعالجة وإرسال الرسائل المتبقية…</span>
                </div>
              )}

              {!broadcastLoading && broadcastResults.length === 0 && (
                <div className="text-slate-500 text-center py-6">
                  لا توجد نتائج لعرضها.
                </div>
              )}
            </div>

            {/* Summary counters in footer */}
            {!broadcastLoading && (
              <div className="bg-slate-950 p-4 border border-dark-border/60 rounded-2xl shrink-0 flex justify-around text-center text-xs font-sans">
                <div>
                  <p className="text-[10px] text-slate-500">نجح الإرسال</p>
                  <p className="text-lg font-black text-emerald-400">
                    {broadcastResults.filter(r => r.status === 'success').length}
                  </p>
                </div>
                <div className="border-r border-dark-border" />
                <div>
                  <p className="text-[10px] text-slate-500">فشل الإرسال</p>
                  <p className="text-lg font-black text-rose-500">
                    {broadcastResults.filter(r => r.status === 'failed').length}
                  </p>
                </div>
                <div className="border-r border-dark-border" />
                <div>
                  <p className="text-[10px] text-slate-500">إجمالي المستهدفين</p>
                  <p className="text-lg font-black text-slate-300">
                    {broadcastResults.length}
                  </p>
                </div>
              </div>
            )}

            {!broadcastLoading && (
              <button
                type="button"
                onClick={() => setShowResultsModal(false)}
                className="w-full py-3 bg-red-650 hover:bg-red-650 hover:brightness-110 text-white font-bold text-xs rounded-xl cursor-pointer text-center font-sans mt-2"
              >
                إغلاق التقرير وحفظ التغييرات
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
