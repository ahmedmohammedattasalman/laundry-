'use client';

import React, { useState, useEffect } from 'react';
import { db, Organization, Subscription, Invoice, Employee } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { 
  Building2, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ShieldAlert, 
  X, 
  Phone, 
  MapPin, 
  AlertCircle
} from 'lucide-react';

const supabase = createClient();

export default function AdminLaundriesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Selected laundry for edit/sub/delete/details
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Add form fields
  const [addName, setAddName] = useState('');
  const [addCR, setAddCR] = useState('');
  const [addVAT, setAddVAT] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addWhatsApp, setAddWhatsApp] = useState('');
  const [addOwnerName, setAddOwnerName] = useState('');
  const [addOwnerEmail, setAddOwnerEmail] = useState('');
  const [addOwnerPassword, setAddOwnerPassword] = useState('12345678');

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editCR, setEditCR] = useState('');
  const [editVAT, setEditVAT] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWhatsApp, setEditWhatsApp] = useState('');

  // Subscription management fields
  const [subStatus, setSubStatus] = useState<Subscription['status']>('active');
  const [subPlanName, setSubPlanName] = useState('اشتراك المغسلة السحابي');
  const [subExpiresAt, setSubExpiresAt] = useState('');

  // Loading/saving state
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Loaded details for selected laundry
  const [detailsEmployees, setDetailsEmployees] = useState<Employee[]>([]);
  const [detailsInvoices, setDetailsInvoices] = useState<Invoice[]>([]);

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

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  const getSubStatus = (orgId: string) => {
    const sub = subscriptions.find(s => s.organization_id === orgId);
    if (!sub) return { label: 'لا يوجد', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
    if (sub.status === 'active') return { label: 'نشط', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    if (sub.status === 'expired') return { label: 'منتهي', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    return { label: 'غير نشط', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  };

  const handleAddLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (!addName || !addOwnerName || !addOwnerEmail) {
        throw new Error('الرجاء إدخال اسم المغسلة واسم المالك والبريد الإلكتروني');
      }
      const newOrg = await db.createOrganizationAdmin(
        addOwnerEmail,
        addName,
        addOwnerName,
        addOwnerPassword
      );
      
      if (addCR || addVAT || addAddress || addWhatsApp) {
        await db.updateOrganization(newOrg.id, {
          commercial_registration: addCR,
          vat_number: addVAT,
          address: addAddress,
          whatsapp_number: addWhatsApp
        });
      }

      setSuccessMsg('تمت إضافة المغسلة وتفعيل اشتراكها بنجاح!');
      setIsAddOpen(false);
      
      setAddName('');
      setAddCR('');
      setAddVAT('');
      setAddAddress('');
      setAddWhatsApp('');
      setAddOwnerName('');
      setAddOwnerEmail('');
      setAddOwnerPassword('12345678');
      
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إضافة المغسلة');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (org: Organization) => {
    setSelectedOrg(org);
    setEditName(org.name);
    setEditCR(org.commercial_registration || '');
    setEditVAT(org.vat_number || '');
    setEditAddress(org.address || '');
    setEditWhatsApp(org.whatsapp_number || '');
    setIsEditOpen(true);
  };

  const handleEditLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.updateOrganization(selectedOrg.id, {
        name: editName,
        commercial_registration: editCR,
        vat_number: editVAT,
        address: editAddress,
        whatsapp_number: editWhatsApp
      });
      setSuccessMsg('تم تحديث بيانات المغسلة بنجاح!');
      setIsEditOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث البيانات');
    } finally {
      setActionLoading(false);
    }
  };

  const openSubModal = (org: Organization) => {
    setSelectedOrg(org);
    const sub = subscriptions.find(s => s.organization_id === org.id);
    if (sub) {
      setSubStatus(sub.status);
      setSubPlanName(sub.plan_name);
      setSubExpiresAt(sub.expires_at ? sub.expires_at.split('T')[0] : '');
    } else {
      setSubStatus('inactive');
      setSubPlanName('اشتراك المغسلة السحابي');
      setSubExpiresAt(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    }
    setIsSubOpen(true);
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const expiryISO = new Date(subExpiresAt).toISOString();
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: subStatus,
          plan_name: subPlanName,
          expires_at: expiryISO
        })
        .eq('organization_id', selectedOrg.id);

      if (error) throw new Error(error.message);

      setSuccessMsg('تم تحديث الاشتراك بنجاح!');
      setIsSubOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث الاشتراك');
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (org: Organization) => {
    setSelectedOrg(org);
    setIsDeleteOpen(true);
  };

  const handleDeleteLaundry = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await db.deleteOrganization(selectedOrg.id);
      setSuccessMsg('تم حذف المغسلة وجميع بياناتها بنجاح!');
      setIsDeleteOpen(false);
      setSelectedOrg(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حذف المنشأة');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailsModal = async (org: Organization) => {
    setSelectedOrg(org);
    setDetailsEmployees([]);
    setDetailsInvoices([]);
    setIsDetailsOpen(true);
    setActionLoading(true);
    try {
      const [empList, invList] = await Promise.all([
        db.getEmployees(org.id),
        db.getInvoices(org.id)
      ]);
      setDetailsEmployees(empList);
      setDetailsInvoices(invList);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحميل التفاصيل');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const q = searchTerm.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      (org.commercial_registration && org.commercial_registration.includes(q)) ||
      (org.vat_number && org.vat_number.includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-right">
      
      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 text-xs justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-xs justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Table Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-card/30 p-5 rounded-3xl border border-dark-border">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، السجل، أو الرقم الضريبي..."
              className="w-full text-xs text-slate-200 bg-dark-bg/65 border border-dark-border rounded-xl py-2.5 ps-10 pe-4 focus:outline-none focus:border-red-500/40"
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-dark-bg/60 border border-dark-border px-3.5 py-2.5 rounded-xl shrink-0 font-mono">
            {filteredOrgs.length} منشأة
          </span>
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs px-5 py-3 rounded-2xl cursor-pointer shadow-md hover:scale-[1.01] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مغسلة جديدة</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="premium-card rounded-3xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-dark-border text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3.5 font-semibold text-right">اسم المغسلة</th>
                <th className="pb-3.5 font-semibold text-right">السجل التجاري</th>
                <th className="pb-3.5 font-semibold text-right">الرقم الضريبي</th>
                <th className="pb-3.5 font-semibold text-right">تاريخ التسجيل</th>
                <th className="pb-3.5 font-semibold text-center">حالة الاشتراك</th>
                <th className="pb-3.5 font-semibold text-center">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-xs">
              {filteredOrgs.length > 0 ? (
                filteredOrgs.map((org) => {
                  const subStatus = getSubStatus(org.id);
                  const orgInvoices = allInvoices.filter(i => i.organization_id === org.id);
                  return (
                    <tr key={org.id} className="hover:bg-slate-900/10 transition-colors group">
                      <td className="py-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{org.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{orgInvoices.length} فاتورة</p>
                        </div>
                      </td>
                      <td className="py-4 text-slate-400 font-mono">{org.commercial_registration || '—'}</td>
                      <td className="py-4 text-slate-400 font-mono">{org.vat_number || '—'}</td>
                      <td className="py-4 text-slate-400 font-mono">{new Date(org.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${subStatus.color}`}>
                            {subStatus.label === 'نشط' ? <CheckCircle className="w-3 h-3" /> : subStatus.label === 'منتهي' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {subStatus.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetailsModal(org)}
                            title="عرض التفاصيل والملخص"
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(org)}
                            title="تعديل تفاصيل المغسلة"
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openSubModal(org)}
                            title="إدارة الباقة والاشتراك"
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(org)}
                            title="حذف المغسلة بالكامل"
                            className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-900/30 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    لا توجد منشآت مطابقة أو مسجلة في النظام حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add New Laundry */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-zoom-in text-right">
            <div className="flex justify-between items-center pb-4 border-b border-dark-border">
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-extrabold text-white font-heading">إضافة منشأة جديدة للمنصة</h3>
            </div>

            <form onSubmit={handleAddLaundry} className="space-y-4">
              <div className="space-y-3.5 font-sans">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-dark-border pb-1">معلومات المنشأة</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">اسم المغسلة *</label>
                    <input
                      type="text"
                      required
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="مثال: مغسلة الفجر السريعة"
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">رقم الواتساب</label>
                    <input
                      type="text"
                      value={addWhatsApp}
                      onChange={(e) => setAddWhatsApp(e.target.value)}
                      placeholder="9665xxxxxxxx"
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">السجل التجاري</label>
                    <input
                      type="text"
                      value={addCR}
                      onChange={(e) => setAddCR(e.target.value)}
                      placeholder="1010xxxxxx"
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">الرقم الضريبي (15 رقم)</label>
                    <input
                      type="text"
                      value={addVAT}
                      onChange={(e) => setAddVAT(e.target.value)}
                      placeholder="3000xxxxxxxxxxx"
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">العنوان الجغرافي</label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="الرياض، حي الملقا، طريق أنس بن مالك"
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                  />
                </div>
              </div>

              <div className="space-y-3.5 pt-2 font-sans">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-dark-border pb-1">معلومات حساب المالك (تسجيل الدخول)</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">اسم مالك المغسلة *</label>
                  <input
                    type="text"
                    required
                    value={addOwnerName}
                    onChange={(e) => setAddOwnerName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">البريد الإلكتروني للمالك *</label>
                    <input
                      type="email"
                      required
                      value={addOwnerEmail}
                      onChange={(e) => setAddOwnerEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">كلمة المرور المؤقتة *</label>
                    <input
                      type="password"
                      required
                      value={addOwnerPassword}
                      onChange={(e) => setAddOwnerPassword(e.target.value)}
                      placeholder="حد أدنى 6 خانات"
                      className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border font-sans">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-650 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all text-center flex justify-center items-center gap-2"
                >
                  {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>حفظ المنشأة وإضافتها</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Laundry */}
      {isEditOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 animate-zoom-in text-right">
            <div className="flex justify-between items-center pb-4 border-b border-dark-border">
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-extrabold text-white font-heading">تعديل بيانات المنشأة ✏️</h3>
            </div>

            <form onSubmit={handleEditLaundry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">اسم المغسلة *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">رقم الواتساب</label>
                  <input
                    type="text"
                    value={editWhatsApp}
                    onChange={(e) => setEditWhatsApp(e.target.value)}
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">السجل التجاري</label>
                  <input
                    type="text"
                    value={editCR}
                    onChange={(e) => setEditCR(e.target.value)}
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">الرقم الضريبي</label>
                  <input
                    type="text"
                    value={editVAT}
                    onChange={(e) => setEditVAT(e.target.value)}
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 font-mono text-left"
                  />
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-bold text-slate-400">العنوان</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border font-sans">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-650 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all text-center flex justify-center items-center gap-2"
                >
                  {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manage Subscription */}
      {isSubOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsSubOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-zoom-in text-right">
            <div className="flex justify-between items-center pb-4 border-b border-dark-border">
              <button onClick={() => setIsSubOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              <h3 className="text-sm font-extrabold text-white font-heading">إدارة باقة الاشتراك والفوترة 💳</h3>
            </div>

            <form onSubmit={handleUpdateSubscription} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">تحديث باقة وصلاحيات الفوترة لـ <strong className="text-slate-100">{selectedOrg.name}</strong>.</p>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-bold text-slate-400">اسم باقة الاشتراك</label>
                <input
                  type="text"
                  required
                  value={subPlanName}
                  onChange={(e) => setSubPlanName(e.target.value)}
                  className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">حالة الاشتراك</label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value as any)}
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="inactive">غير نشط (Inactive)</option>
                    <option value="expired">منتهي (Expired)</option>
                    <option value="cancelled">ملغى (Cancelled)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    required
                    value={subExpiresAt}
                    onChange={(e) => setSubExpiresAt(e.target.value)}
                    className="w-full text-xs text-slate-200 bg-dark-bg/85 border border-dark-border rounded-xl p-3 focus:outline-none focus:border-red-500/40 text-left font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-border font-sans">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-650 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all text-center flex justify-center items-center gap-2"
                >
                  {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>تحديث الباقة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubOpen(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {isDeleteOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 animate-zoom-in text-right">
            
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="w-10 h-10 shrink-0" />
              <div>
                <h3 className="text-base font-extrabold font-heading text-white">هل أنت متأكد من حذف المنشأة؟</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">عملية مسح البيانات لا يمكن الرجوع عنها!</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl text-xs space-y-2 leading-relaxed text-slate-400 font-sans">
              <p>سيتم حذف <strong className="text-red-400">{selectedOrg.name}</strong> وكل ما يخصها من خوادم النظام:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>الفواتير والإيصالات المتوافقة مع ZATCA</li>
                <li>حسابات الموظفين والعمال</li>
                <li>نقاط الولاء وتفاصيل العملاء</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2 font-sans">
              <button
                onClick={handleDeleteLaundry}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-650 hover:bg-red-650 hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-all text-center flex justify-center items-center gap-2"
              >
                {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>نعم، حذف المغسلة نهائياً</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW DRAWER */}
      {isDetailsOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative bg-slate-900 border-s border-slate-800 w-full max-w-2xl h-full p-6 shadow-2xl flex flex-col justify-between animate-slide-in text-right">
            
            <div className="space-y-6 flex-1 overflow-y-auto">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-start pb-4 border-b border-dark-border">
                <button onClick={() => setIsDetailsOpen(false)} className="p-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
                <div>
                  <h3 className="text-base font-extrabold text-white font-heading">{selectedOrg.name}</h3>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-0.5 block">{selectedOrg.id}</span>
                </div>
              </div>

              {/* Quick Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-dark-bg/60 p-4 border border-dark-border rounded-2xl space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 justify-end font-heading">
                    <span>بيانات الاتصال</span>
                    <Phone className="w-3.5 h-3.5 text-brand-400" />
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-mono text-left">{selectedOrg.whatsapp_number || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span>{selectedOrg.address || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-bg/60 p-4 border border-dark-border rounded-2xl space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 justify-end font-heading">
                    <span>بيانات الضريبة</span>
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">الرقم الضريبي:</span>
                      <span>{selectedOrg.vat_number || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">السجل التجاري:</span>
                      <span>{selectedOrg.commercial_registration || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-dark-bg/40 p-3 border border-dark-border rounded-xl text-center">
                  <span className="text-[8px] font-bold text-slate-500 block">إجمالي الموظفين</span>
                  <strong className="text-sm font-black text-white font-mono mt-1 block">{detailsEmployees.length}</strong>
                </div>
                <div className="bg-dark-bg/40 p-3 border border-dark-border rounded-xl text-center">
                  <span className="text-[8px] font-bold text-slate-500 block">إجمالي المبيعات</span>
                  <strong className="text-sm font-black text-white font-mono mt-1 block">
                    {detailsInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}
                  </strong>
                </div>
                <div className="bg-dark-bg/40 p-3 border border-dark-border rounded-xl text-center">
                  <span className="text-[8px] font-bold text-slate-500 block">إجمالي الفواتير</span>
                  <strong className="text-sm font-black text-white font-mono mt-1 block">{detailsInvoices.length}</strong>
                </div>
              </div>

              {/* Employee list */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-dark-border pb-1.5">حسابات الموظفين والمالك ({detailsEmployees.length})</h4>
                <div className="space-y-2 font-sans">
                  {detailsEmployees.length > 0 ? (
                    detailsEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-3 bg-dark-bg/40 border border-dark-border/60 rounded-xl text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          emp.role === 'owner' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-700/10 border-slate-700/20 text-slate-400'
                        }`}>
                          {emp.role === 'owner' ? 'المالك' : 'موظف'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500 text-center py-4">لا يوجد موظفون مسجلون للمغسلة حالياً.</p>
                  )}
                </div>
              </div>

              {/* Invoices overview */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-dark-border pb-1.5">آخر الفواتير الصادرة ({detailsInvoices.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-dark-border text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="pb-2 text-right">رقم الفاتورة</th>
                        <th className="pb-2 text-right">المجموع</th>
                        <th className="pb-2 text-right">الحالة</th>
                        <th className="pb-2 text-left">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/40 font-mono text-slate-300">
                      {detailsInvoices.length > 0 ? (
                        detailsInvoices.slice(0, 5).map(inv => (
                          <tr key={inv.id}>
                            <td className="py-2.5 font-bold text-slate-200">{inv.invoice_number}</td>
                            <td className="py-2.5">{Number(inv.total_amount).toFixed(2)} ر.س</td>
                            <td className="py-2.5 font-sans">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                inv.status === 'delivered' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {inv.status === 'delivered' ? 'مستلم' : 'قيد المعالجة'}
                              </span>
                            </td>
                            <td className="py-2.5 text-left text-slate-500">{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500 font-sans">لا توجد فواتير صادرة لهذه المغسلة.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-dark-border font-sans">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق التفاصيل
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
