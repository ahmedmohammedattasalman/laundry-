'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, UserSession } from '@/lib/db';
import { Building2, Landmark, Phone, FileText, CheckCircle, ArrowRight, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function SetupWizardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Form states
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const activeSession = db.getSession();
      if (!activeSession) {
        router.push('/login');
        return;
      }

      setSession(activeSession);
      
      // Check if organization has existing details
      if (activeSession.organization_id) {
        const org = await db.getOrganization(activeSession.organization_id);
        if (org) {
          setName(org.name || '');
          setCrNumber(org.commercial_registration || '');
          setVatNumber(org.vat_number || '');
          setAddress(org.address || '');
          setWhatsappNumber(org.whatsapp_number || '');
          setLogoUrl(org.logo_url || '');
          setReceiptFooter(org.receipt_footer || '');
        }
      }
    };
    loadData();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    if (!session?.organization_id) return;
    setLoading(true);

    try {
      await db.updateOrganization(session.organization_id, {
        name,
        commercial_registration: crNumber,
        vat_number: vatNumber,
        address,
        whatsapp_number: whatsappNumber,
        logo_url: logoUrl || '/logo.png',
        receipt_footer: receiptFooter || 'شكراً لتعاملكم معنا!',
      });

      // Show completion screen/redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ الإعدادات. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm">جاري تحميل الجلسة…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl space-y-8 z-10">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Logo" className="h-24 w-auto mb-4" />
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            تهيئة تفاصيل المغسلة
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            الخطوة {step} من 3 — إعداد البيانات الأساسية والامتثال الضريبي.
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex justify-between items-center max-w-sm mx-auto mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 1 ? 'bg-brand-600 text-white shadow-float' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>1</div>
          <div className={`h-1 flex-1 mx-2 transition-all ${step >= 2 ? 'bg-brand-600' : 'bg-slate-900'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 2 ? 'bg-brand-600 text-white shadow-float' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>2</div>
          <div className={`h-1 flex-1 mx-2 transition-all ${step >= 3 ? 'bg-brand-600' : 'bg-slate-900'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 3 ? 'bg-brand-600 text-white shadow-float' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>3</div>
        </div>

        {/* Wizard Form Wrapper */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-float">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* STEP 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-400" />
                  بيانات المتجر الأساسية
                </h3>
                
                <div className="space-y-1">
                  <label htmlFor="laundry-name" className="text-xs font-semibold text-slate-300">
                    اسم المغسلة *
                  </label>
                  <input
                    id="laundry-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                    placeholder="مثال: مغسلة النظافة والكي"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="laundry-address" className="text-xs font-semibold text-slate-300">
                    العنوان الفعلي للمغسلة *
                  </label>
                  <textarea
                    id="laundry-address"
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                    placeholder="مثال: طريق الملك فهد، حي المروج، الرياض"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Compliance Details (Saudi VAT) */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-brand-400" />
                  الامتثال الحكومي وضريبة القيمة المضافة
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="cr-number" className="text-xs font-semibold text-slate-300">
                      السجل التجاري (CR) *
                    </label>
                    <input
                      id="cr-number"
                      type="text"
                      required
                      value={crNumber}
                      onChange={(e) => setCrNumber(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right font-mono"
                      placeholder="مثال: 1010XXXXXX"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="vat-number" className="text-xs font-semibold text-slate-300">
                      الرقم الضريبي للمنشأة (15 خانة) *
                    </label>
                    <input
                      id="vat-number"
                      type="text"
                      required
                      maxLength={15}
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right font-mono"
                      placeholder="مثال: 3000XXXXXXXX003"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="whatsapp-number" className="text-xs font-semibold text-slate-300">
                    رقم الواتساب لإشعارات العملاء *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      id="whatsapp-number"
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right font-mono"
                      placeholder="مثال: +966501234567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Receipt Template Configuration */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-400" />
                  إعدادات الإيصال والشعار
                </h3>

                <div className="space-y-1">
                  <label htmlFor="logo-url" className="text-xs font-semibold text-slate-300">
                    رابط صورة شعار المغسلة
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <input
                      id="logo-url"
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="block w-full ps-10 pe-3 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">اتركه فارغاً للاستمرار بالشعار الافتراضي المنسق للمنصة.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="receipt-footer" className="text-xs font-semibold text-slate-300">
                    سياسة أو ملاحظة أسفل الإيصال
                  </label>
                  <textarea
                    id="receipt-footer"
                    rows={3}
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm text-right"
                    placeholder="مثال: الملابس التي لا تستلم خلال 30 يوماً سيتم التبرع بها للجمعيات الخيرية."
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-900">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  رجوع
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md transition-all cursor-pointer"
              >
                {loading ? (
                  'جاري حفظ الإعدادات…'
                ) : step === 3 ? (
                  <span className="flex items-center gap-1.5">
                    إنهاء وفتح لوحة التحكم
                    <CheckCircle className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    الخطوة التالية
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
