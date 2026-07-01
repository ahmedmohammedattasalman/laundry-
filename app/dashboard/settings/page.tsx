'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Employee, UserSession, ServiceType, StaffMember } from '@/lib/db';
import { 
  Building, 
  Users, 
  Trash2, 
  UserPlus, 
  User as UserIcon, 
  Check, 
  Save,
  Layers,
  Plus,
  Lock,
  Mail,
  MessageSquare,
  Send,
  Smartphone
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Organization form states
  const [name, setName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  
  // WhatsApp & Evolution API states
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionApiToken, setEvolutionApiToken] = useState('');
  const [evolutionInstanceName, setEvolutionInstanceName] = useState('');
  
  // Test connection states
  const [testPhone, setTestPhone] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState('');
  
  // Shared Employee Account state
  const [laborAccount, setLaborAccount] = useState<Employee | null>(null);
  const [laborEmail, setLaborEmail] = useState('');
  const [laborPassword, setLaborPassword] = useState('');

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Staff Members (Names) states
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [staffSuccess, setStaffSuccess] = useState(false);

  // Service Types states
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePoints, setNewServicePoints] = useState<number>(1);
  const [newServiceRedeemPoints, setNewServiceRedeemPoints] = useState<number>(15);
  const [serviceSuccess, setServiceSuccess] = useState(false);

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
        setName(organization.name || '');
        setCrNumber(organization.commercial_registration || '');
        setVatNumber(organization.vat_number || '');
        setAddress(organization.address || '');
        setWhatsappNumber(organization.whatsapp_number || '');
        setLogoUrl(organization.logo_url || '');
        setReceiptFooter(organization.receipt_footer || '');
        setWhatsappEnabled(organization.whatsapp_enabled !== false);
        setEvolutionApiUrl(organization.evolution_api_url || '');
        setEvolutionApiToken(organization.evolution_api_token || '');
        setEvolutionInstanceName(organization.evolution_instance_name || '');
      }

      const empList = await db.getEmployees(orgId);
      const labor = empList.find(e => e.role === 'labor');
      setLaborAccount(labor || null);
      if (labor) {
        setLaborEmail(labor.email);
      }

      const staff = await db.getStaffMembers(orgId);
      setStaffMembers(staff);

      const services = await db.getServiceTypes(orgId);
      setServiceTypes(services);
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
        receipt_footer: receiptFooter,
        whatsapp_enabled: whatsappEnabled,
        evolution_api_url: evolutionApiUrl,
        evolution_api_token: evolutionApiToken,
        evolution_instance_name: evolutionInstanceName
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث إعدادات المنشأة.';
      setError(errorMsg);
    }
  };

  const handleTestConnection = async () => {
    if (!evolutionApiUrl || !evolutionApiToken || !evolutionInstanceName || !testPhone) {
      setTestError('الرجاء تعبئة بيانات Evolution API ورقم الجوال للتجربة أولاً.');
      return;
    }
    setTestingConnection(true);
    setTestSuccess(false);
    setTestError('');
    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_url: evolutionApiUrl,
          api_token: evolutionApiToken,
          instance_name: evolutionInstanceName,
          test_phone: testPhone
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشلت عملية إرسال رسالة التجربة.');
      }
      setTestSuccess(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالخادم.';
      setTestError(errMsg);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordError('الرجاء تعبئة جميع الحقول.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      await db.updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err?.message || 'فشل تغيير كلمة المرور. يرجى المحاولة مرة أخرى.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateLaborAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id || !laborEmail || !laborPassword) return;
    setError('');
    setEmpSuccess(false);

    try {
      const newLabor = await db.createEmployee(
        session.organization_id, 
        'حساب الاستقبال المشترك', 
        laborEmail.trim(), 
        laborPassword
      );
      setLaborAccount(newLabor);
      setLaborPassword('');
      setEmpSuccess(true);
      setTimeout(() => setEmpSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إنشاء حساب الاستقبال المشترك.';
      setError(errorMsg);
    }
  };

  const handleDeleteLaborAccount = async (empId: string) => {
    if (confirm('هل أنت متأكد من حذف حساب الاستقبال المشترك؟ سيفقد جميع الموظفين صلاحية تسجيل الدخول فوراً.')) {
      try {
        await db.deleteEmployee(empId);
        setLaborAccount(null);
        setLaborEmail('');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير معروف.';
        alert('حدث خطأ أثناء محاولة حذف الحساب: ' + errorMsg);
      }
    }
  };

  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id || !newStaffName.trim()) return;
    setStaffSuccess(false);
    setError('');

    try {
      await db.createStaffMember(session.organization_id, newStaffName.trim());
      const staff = await db.getStaffMembers(session.organization_id);
      setStaffMembers(staff);
      setNewStaffName('');
      setStaffSuccess(true);
      setTimeout(() => setStaffSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إضافة اسم الموظف.';
      setError(errorMsg);
    }
  };

  const handleDeleteStaffMember = async (memberId: string) => {
    if (confirm('هل أنت متأكد من إزالة هذا الموظف؟')) {
      try {
        await db.deleteStaffMember(memberId);
        if (session?.organization_id) {
          const staff = await db.getStaffMembers(session.organization_id);
          setStaffMembers(staff);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير معروف.';
        alert('حدث خطأ أثناء محاولة حذف اسم الموظف: ' + errorMsg);
      }
    }
  };

  const handleAddServiceType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.organization_id || !newServiceName.trim()) return;
    setServiceSuccess(false);
    setError('');

    try {
      await db.createServiceType(
        session.organization_id, 
        newServiceName.trim(), 
        Number(newServicePoints),
        Number(newServiceRedeemPoints)
      );
      const services = await db.getServiceTypes(session.organization_id);
      setServiceTypes(services);
      setNewServiceName('');
      setNewServicePoints(1);
      setNewServiceRedeemPoints(15);
      setServiceSuccess(true);
      setTimeout(() => setServiceSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إضافة نوع الخدمة الجديد.';
      setError(errorMsg);
    }
  };

  const handleUpdateServicePoints = async (serviceId: string, points: number) => {
    try {
      await db.updateServiceTypePoints(serviceId, points);
      setServiceTypes(prev => prev.map(st => st.id === serviceId ? { ...st, points_awarded: points } : st));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث نقاط الخدمة.';
      setError(errorMsg);
    }
  };

  const handleUpdateServiceRedeemPoints = async (serviceId: string, points: number) => {
    try {
      await db.updateServiceTypeRedeemPoints(serviceId, points);
      setServiceTypes(prev => prev.map(st => st.id === serviceId ? { ...st, points_to_redeem: points } : st));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث نقاط استبدال الخدمة.';
      setError(errorMsg);
    }
  };

  const handleDeleteServiceType = async (serviceId: string) => {
    if (confirm('هل أنت متأكد من حذف نوع الخدمة هذا؟ لن يؤثر الحذف على الفواتير السابقة ولكنه سيمنع اختيارها للفواتير الجديدة.')) {
      try {
        await db.deleteServiceType(serviceId);
        if (session?.organization_id) {
          const services = await db.getServiceTypes(session.organization_id);
          setServiceTypes(services);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير معروف.';
        alert('حدث خطأ أثناء محاولة حذف نوع الخدمة: ' + errorMsg);
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
        <div className="lg:col-span-2 space-y-8">
          <div className="premium-card rounded-3xl p-8 space-y-6">
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

          {/* WhatsApp Integration settings card */}
          <div className="premium-card rounded-3xl p-8 space-y-6 text-right">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <MessageSquare className="w-5 h-5 text-brand-400" />
              إعدادات ربط الواتساب وإرسال الإشعارات التلقائية
            </h3>

            <div className="space-y-6">
              {/* Toggle switch for WhatsApp Enabled */}
              <div className="flex items-center justify-between p-4 bg-dark-bg/60 rounded-2xl border border-dark-border">
                <div className="text-right">
                  <span className="text-xs font-bold text-white block">تفعيل إشعارات الواتساب التلقائية</span>
                  <span className="text-[10px] text-slate-400">عند تفعيل هذا الخيار، سيقوم النظام تلقائياً بإرسال رسائل للعملاء عند إنشاء الفواتير وتحديث حالتها.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={whatsappEnabled} 
                    onChange={(e) => setWhatsappEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>

              {whatsappEnabled && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-[10px] text-amber-300 leading-relaxed text-right">
                    تنبيه: يمكنك استخدام الإعدادات الافتراضية للنظام أو إدخال إعدادات خادم Evolution API الخاص بك لتوجيه الرسائل من رقم الواتساب الخاص بمتجرك.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 text-right">
                      <label className="text-xs font-semibold text-slate-350">رابط خادم Evolution API URL</label>
                      <input
                        type="url"
                        placeholder="مثال: https://evo.shopmenia.cloud"
                        value={evolutionApiUrl}
                        onChange={(e) => setEvolutionApiUrl(e.target.value)}
                        className="block w-full px-4 py-3 text-xs premium-input font-mono text-left direction-ltr"
                      />
                      <span className="text-[9px] text-slate-500 block">إذا ترك فارغاً، سيتم استخدام خادم النظام الافتراضي</span>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-xs font-semibold text-slate-350">اسم المثيل (Instance Name)</label>
                      <input
                        type="text"
                        placeholder="مثال: Ahmed"
                        value={evolutionInstanceName}
                        onChange={(e) => setEvolutionInstanceName(e.target.value)}
                        className="block w-full px-4 py-3 text-xs premium-input font-mono text-left direction-ltr"
                      />
                      <span className="text-[9px] text-slate-500 block">اسم الـ Instance المعرف بالخادم</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-xs font-semibold text-slate-350">رمز الوصول (API Key / Token)</label>
                    <input
                      type="password"
                      placeholder="أدخل رمز الوصول الخاص بك..."
                      value={evolutionApiToken}
                      onChange={(e) => setEvolutionApiToken(e.target.value)}
                      className="block w-full px-4 py-3 text-xs premium-input font-mono text-left direction-ltr"
                    />
                    <span className="text-[9px] text-slate-500 block">رمز apikey للمصادقة على خادم الـ API</span>
                  </div>

                  {/* Test API connection section */}
                  <div className="p-5 bg-dark-bg/40 rounded-2xl border border-dark-border space-y-3 text-right">
                    <span className="text-xs font-bold text-slate-300 block">تجربة اتصال وإرسال رسالة واتساب</span>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={testingConnection}
                        onClick={handleTestConnection}
                        className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-900 border border-dark-border cursor-pointer transition-all disabled:opacity-50"
                      >
                        {testingConnection ? 'جاري الإرسال...' : 'إرسال تجربة'}
                        <Send className="w-3.5 h-3.5 animate-pulse-subtle" />
                      </button>
                      
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          placeholder="رقم جوال التجربة (مثال: 05xxxxxxxx)"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                        />
                      </div>
                    </div>

                    {testSuccess && (
                      <div className="text-[10px] text-green-400 font-semibold bg-green-500/10 border border-green-500/20 px-3.5 py-2 rounded-xl animate-fade-in text-right">
                        تم إرسال رسالة التجربة بنجاح! الرجاء التحقق من جوالك.
                      </div>
                    )}

                    {testError && (
                      <div className="text-[10px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl animate-fade-in text-right">
                        {testError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-dark-border items-center gap-3">
              {saveSuccess && (
                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  تم حفظ الإعدادات بنجاح
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveOrganization}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white premium-btn-primary transition-all cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                حفظ إعدادات الواتساب
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Span 1): Employee Accounts Manager */}
        <div className="space-y-8">
          
          {/* Change Password Card */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Lock className="w-4 h-4 text-brand-400" />
              تغيير كلمة المرور الشخصية
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {passwordError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold text-center animate-fade-in">
                  {passwordError}
                </div>
              )}

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="تأكيد كلمة المرور الجديدة"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-sm cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </button>
            </form>

            {passwordSuccess && (
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold text-center animate-fade-in">
                تم تحديث كلمة المرور بنجاح!
              </div>
            )}
          </div>

          {/* Shared Receptionist Account Card */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <UserPlus className="w-4 h-4 text-brand-400" />
              حساب الاستقبال المشترك
            </h3>

            {!laborAccount ? (
              <form onSubmit={handleCreateLaborAccount} className="space-y-3">
                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="البريد الإلكتروني المشترك"
                      value={laborEmail}
                      onChange={(e) => setLaborEmail(e.target.value)}
                      className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="كلمة المرور المشتركة"
                      value={laborPassword}
                      onChange={(e) => setLaborPassword(e.target.value)}
                      className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input font-mono text-right"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-sm cursor-pointer"
                >
                  إنشاء حساب الاستقبال
                </button>
              </form>
            ) : (
              <div className="bg-dark-bg/60 p-4 rounded-2xl border border-dark-border space-y-3 text-right">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-500">الحساب المشترك النشط</p>
                    <p className="text-xs font-bold text-slate-200 font-mono mt-0.5">{laborAccount.email}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
                    نشط
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleDeleteLaborAccount(laborAccount.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف الحساب المشترك
                </button>
              </div>
            )}

            {empSuccess && (
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold text-center">
                تم حفظ الحساب المشترك بنجاح!
              </div>
            )}
          </div>

          {/* Staff Members Names Card */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Users className="w-4 h-4 text-brand-400" />
              أعضاء فريق الاستقبال
            </h3>

            <form onSubmit={handleAddStaffMember} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="اسم الموظف المستلم الجديد"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="block w-full ps-11 pe-3.5 py-3 text-xs premium-input text-right"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-3 rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-sm cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {staffSuccess && (
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold text-center">
                تم إضافة اسم الموظف بنجاح!
              </div>
            )}

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {staffMembers.length > 0 ? (
                staffMembers.map((sm) => (
                  <div 
                    key={sm.id} 
                    className="flex justify-between items-center bg-dark-bg/60 p-3 py-2.5 rounded-2xl border border-dark-border hover:border-slate-800 transition-all"
                  >
                    <span className="text-xs font-bold text-slate-200">{sm.name}</span>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteStaffMember(sm.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="حذف اسم الموظف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-center text-slate-500 py-4">
                  لا توجد أسماء موظفين مسجلة. سيقوم الموظف بكتابة اسمه يدوياً عند إنشاء الطلب.
                </p>
              )}
            </div>
          </div>

          {/* Service Types Manager */}
          <div className="premium-card rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-heading">
              <Layers className="w-4 h-4 text-brand-400" />
              إدارة أنواع الخدمات
            </h3>

            {/* Add Service Form */}
            <form onSubmit={handleAddServiceType} className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  placeholder="اسم الخدمة"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="col-span-2 block w-full px-4 py-3 text-xs premium-input text-right"
                />
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="كسب"
                  value={newServicePoints}
                  onChange={(e) => setNewServicePoints(Math.max(0, Number(e.target.value)))}
                  className="block w-full px-2.5 py-3 text-xs premium-input font-mono text-center"
                  title="نقاط الكسب لكل قطعة"
                />
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="استبدال"
                  value={newServiceRedeemPoints}
                  onChange={(e) => setNewServiceRedeemPoints(Math.max(0, Number(e.target.value)))}
                  className="block w-full px-2.5 py-3 text-xs premium-input font-mono text-center"
                  title="نقاط استبدال الخدمة مجاناً"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-2xl text-xs font-bold text-white premium-btn-primary shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة نوع الخدمة
              </button>
            </form>

            {serviceSuccess && (
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold text-center">
                تم إضافة نوع الخدمة بنجاح!
              </div>
            )}

            {/* Service Types List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {serviceTypes.length > 0 ? (
                serviceTypes.map((st) => (
                  <div 
                    key={st.id} 
                    className="flex justify-between items-center bg-dark-bg/60 p-3 py-2 rounded-2xl border border-dark-border hover:border-slate-800 transition-all gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-200 block truncate">{st.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-slate-500 font-bold select-none">كسب:</span>
                      <input
                        type="number"
                        min={0}
                        value={st.points_awarded ?? 1}
                        onChange={(e) => handleUpdateServicePoints(st.id, Math.max(0, Number(e.target.value)))}
                        className="w-11 px-1.5 py-1 text-[10px] bg-slate-950 border border-dark-border rounded-lg text-center font-mono text-emerald-400 focus:border-brand-500 focus:outline-none"
                        title="نقاط الكسب لكل قطعة"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-slate-500 font-bold select-none">استبدال:</span>
                      <input
                        type="number"
                        min={0}
                        value={st.points_to_redeem ?? 0}
                        onChange={(e) => handleUpdateServiceRedeemPoints(st.id, Math.max(0, Number(e.target.value)))}
                        className="w-12 px-1.5 py-1 text-[10px] bg-slate-950 border border-dark-border rounded-lg text-center font-mono text-amber-400 focus:border-brand-500 focus:outline-none"
                        title="النقاط المطلوبة للاستبدال مجاناً"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteServiceType(st.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                      title="حذف الخدمة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-center text-slate-500 py-4">
                  لا توجد خدمات محددة حالياً. يرجى إضافة خدمة للبدء.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
