'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Organization, Employee, UserSession } from '@/lib/db';
import { 
  Building, 
  Users, 
  Trash2, 
  UserPlus, 
  ShieldCheck, 
  User as UserIcon, 
  Check, 
  Save,
  AlertTriangle,
  Mail
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Organization form states
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  
  // Employee state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');

  // Page feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [empSuccess, setEmpSuccess] = useState(false);
  const [error, setError] = useState('');

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
      const orgId = activeSession.organization_id!;
      const organization = await db.getOrganization(orgId);
      
      if (organization) {
        setOrg(organization);
        setName(organization.name || '');
        setCrNumber(organization.commercial_registration || '');
        setVatNumber(organization.vat_number || '');
        setAddress(organization.address || '');
        setWhatsappNumber(organization.whatsapp_number || '');
        setLogoUrl(organization.logo_url || '');
        setReceiptFooter(organization.receipt_footer || '');
      }

      const empList = await db.getEmployees(orgId);
      setEmployees(empList);
    };
    loadData();
  }, [router]);

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id) return;
    setError('');
    setSaveSuccess(false);

    try {
      await db.updateOrganization(session.organization_id, {
        name,
        commercial_registration: crNumber,
        vat_number: vatNumber,
        address,
        whatsapp_number: whatsappNumber,
        logo_url: logoUrl,
        receipt_footer: receiptFooter
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث إعدادات المنشأة.');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id) return;
    setEmpSuccess(false);

    if (!empName || !empEmail) return;

    try {
      await db.createEmployee(session.organization_id, empName, empEmail);
      const empList = await db.getEmployees(session.organization_id);
      setEmployees(empList);
      
      // Reset input fields
      setEmpName('');
      setEmpEmail('');
      setEmpSuccess(true);
      setTimeout(() => setEmpSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة حساب العامل.');
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (empId === session?.id) {
      alert('لا يمكنك إزالة حساب مالك المنشأة الخاص بك.');
      return;
    }
    
    if (confirm('هل أنت متأكد من رغبتك في إزالة هذا الموظف؟ سيفقد صلاحية الدخول للنظام فوراً.')) {
      try {
        await db.deleteEmployee(empId);
        if (session?.organization_id) {
          const empList = await db.getEmployees(session.organization_id);
          setEmployees(empList);
        }
      } catch (err: any) {
        alert('حدث خطأ أثناء محاولة حذف الموظف: ' + err.message);
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Columns (Span 2): Organization Settings */}
        <div className="lg:col-span-2 premium-card rounded-3xl p-8 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
            <Building className="w-5 h-5 text-brand-400" />
            تفاصيل المغسلة والامتثال الضريبي
          </h3>

          <form onSubmit={handleSaveOrganization} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">اسم المغسلة</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-4 py-3 text-xs premium-input text-right"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-355">رقم إشعارات الواتساب (مع رمز الدولة)</label>
                <input
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="block w-full px-4 py-3 text-xs premium-input font-mono text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">رقم السجل التجاري (CR)</label>
                <input
                  type="text"
                  required
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  className="block w-full px-4 py-3 text-xs premium-input font-mono text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-350">الرقم الضريبي (١٥ خانة)</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="block w-full px-4 py-3 text-xs premium-input font-mono text-right"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-350">العنوان الجغرافي</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="block w-full px-4 py-3 text-xs premium-input text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-350">رابط شعار المغسلة</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="block w-full px-4 py-3 text-xs premium-input text-right"
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-350">تذييل الإيصال (شروط وأحكام المغسلة للعميل)</label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="block w-full px-4 py-3 text-xs premium-input text-right"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-dark-border items-center gap-3">
              {saveSuccess && (
                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  تم حفظ الإعدادات بنجاح
                </span>
              )}
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white premium-btn-primary transition-all cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (Span 1): Employee Accounts Manager */}
        <div className="space-y-8">
          
          {/* Add Employee Form */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <UserPlus className="w-4 h-4 text-brand-400" />
              إضافة موظف جديد
            </h3>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  placeholder="الاسم الكامل"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="block w-full px-4 py-3 text-xs premium-input text-right"
                />
              </div>

              <div className="space-y-1">
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="block w-full px-4 py-3 text-xs premium-input text-right"
                />
              </div>



              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-sm cursor-pointer"
              >
                إضافة الموظف للفريق
              </button>
            </form>

            {empSuccess && (
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold text-center">
                تم إضافة حساب الموظف بنجاح!
              </div>
            )}
          </div>

          {/* Employees List */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Users className="w-4 h-4 text-brand-400" />
              طاقم العمل النشط
            </h3>

            <div className="space-y-2.5">
              {employees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex justify-between items-center bg-dark-bg/60 p-3.5 rounded-2xl border border-dark-border hover:border-slate-800 transition-all"
                >
                  <div className="min-w-0 flex-1 pl-2">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{employee.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{employee.email}</p>
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-brand-400 uppercase tracking-wider mt-2 bg-brand-500/5 px-2 py-0.5 rounded-md border border-brand-500/10">
                      <UserIcon className="w-3.5 h-3.5 text-brand-400" />
                      {employee.role === 'owner' ? 'مالك المغسلة' : 'موظف / عامل'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteEmployee(employee.id)}
                    disabled={employee.id === session?.id}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                    title="إزالة الموظف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
