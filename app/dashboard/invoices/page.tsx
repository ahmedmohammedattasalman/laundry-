'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Invoice, Customer, Organization } from '@/lib/db';
import { generateZatcaString } from '@/lib/zatca';
import { 
  Search, 
  Filter, 
  Printer, 
  Share2, 
  Eye, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Truck, 
  X, 
  Coins, 
  Hash, 
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Drawer / Detail states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paperSize, setPaperSize] = useState<'58' | '80'>('80');

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
        const [invList, custList, orgData] = await Promise.all([
          db.getInvoices(orgId),
          db.getCustomers(orgId),
          db.getOrganization(orgId)
        ]);
        setInvoices(invList);
        setCustomers(custList);
        setOrganization(orgData);
      }
    };
    loadData();
  }, [router]);

  const refreshInvoices = async () => {
    const session = db.getSession();
    if (session && session.organization_id) {
      const invList = await db.getInvoices(session.organization_id);
      setInvoices(invList);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      const updated = await db.updateInvoiceStatus(invoiceId, newStatus);
      await refreshInvoices();
      
      // Keep details drawer updated
      setSelectedInvoice(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'received': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'processing': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/20';
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
    all: 'الكل',
    received: 'تم الاستلام',
    processing: 'قيد المعالجة',
    completed: 'جاهز للتسليم',
    delivered: 'تم التسليم'
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const customer = customers.find(c => c.id === inv.customer_id);
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      customer?.phone.includes(search);
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ZATCA Base64 string for QR Code
  const getZatcaQRData = (inv: Invoice) => {
    if (!organization) return '';
    return generateZatcaString(
      organization.name,
      organization.vat_number || '300000000000003',
      inv.created_at,
      Number(inv.total_amount).toFixed(2),
      Number(inv.vat_amount).toFixed(2)
    );
  };

  // WhatsApp Alert Generator
  const getWhatsAppLink = (inv: Invoice) => {
    if (!organization) return '#';
    const customer = customers.find(c => c.id === inv.customer_id);
    if (!customer) return '#';
    
    const statusText = 
      inv.status === 'received' ? 'تم الاستلام 📥' :
      inv.status === 'processing' ? 'قيد المعالجة 🧼' :
      inv.status === 'completed' ? 'جاهز للتسليم! 🎉' : 'تم التسليم 🚚';

    const message = `عزيزي/عزيزتي ${customer.name}،\n\n` +
      `حالة طلبك لدى ${organization.name} هي الآن: *${statusText}*\n\n` +
      `رقم الفاتورة: ${inv.invoice_number}\n` +
      `نوع الخدمة: ${inv.service_type}\n` +
      `عدد القطع: ${inv.pieces_count}\n` +
      `المبلغ الإجمالي: ${Number(inv.total_amount).toFixed(2)} ر.س (شامل ضريبة القيمة المضافة ١٥٪)\n\n` +
      `نشكركم على اختياركم لنا!`;
    
    return `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const triggerPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative text-right">
      
      {/* 1. Filtering & Search Header */}
      <div className="no-print flex flex-col md:flex-row gap-4 items-center justify-between bg-dark-card/40 p-5 rounded-3xl border border-dark-border shadow-premium">
        
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full ps-11 pe-3.5 py-3.5 text-xs premium-input text-right"
            placeholder="ابحث برقم الفاتورة، اسم العميل أو الجوال..."
          />
        </div>

        {/* Filter status buttons */}
        <div className="flex gap-1.5 bg-dark-bg p-1 rounded-2xl border border-dark-border overflow-x-auto w-full md:w-auto">
          {['all', 'received', 'processing', 'completed', 'delivered'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 text-[10px] font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {statusLabels[status] || status}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Invoices List Table */}
      <div className="no-print premium-card rounded-3xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-dark-border text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold text-right">رقم الفاتورة</th>
                <th className="pb-3 font-semibold text-right">بيانات العميل</th>
                <th className="pb-3 font-semibold text-right">نوع الخدمة</th>
                <th className="pb-3 font-semibold text-right">القطع</th>
                <th className="pb-3 font-semibold text-right">المبلغ (شامل الضريبة)</th>
                <th className="pb-3 font-semibold text-center">الحالة</th>
                <th className="pb-3 font-semibold text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border text-xs">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const customer = customers.find(c => c.id === inv.customer_id);
                  const StatusIcon = getStatusIcon(inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-900/10 transition-colors group">
                      <td className="py-4 font-bold text-slate-200 group-hover:text-white transition-colors">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="font-bold text-slate-200">{customer?.name || 'عميل مباشر'}</p>
                          <p className="text-[10px] text-slate-500 font-semibold font-mono mt-0.5">{customer?.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 text-slate-450">{inv.service_type}</td>
                      <td className="py-4 text-slate-300 font-bold font-mono">{inv.pieces_count}</td>
                      <td className="py-4 font-bold font-mono text-slate-200">
                        {Number(inv.total_amount).toFixed(2)} ر.س
                      </td>
                      <td className="py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(inv.status)}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusLabels[inv.status]}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-left">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-[10px] font-bold text-slate-350 hover:text-white bg-slate-950 border border-dark-border hover:bg-slate-900/40 transition-all cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 font-medium">
                    لا توجد فواتير تطابق معايير البحث الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Side Sheet / Drawer for Details */}
      {selectedInvoice && (() => {
        const customer = customers.find(c => c.id === selectedInvoice.customer_id);
        return (
          <div className="fixed inset-0 z-45 flex justify-end">
            {/* Backdrop */}
            <div 
              className="no-print absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedInvoice(null)}
            />

            {/* Drawer Area */}
            <div className="relative w-full max-w-xl bg-dark-card border-s border-dark-border h-full flex flex-col justify-between shadow-2xl z-50 animate-slide-in">
              
              {/* Header */}
              <div className="no-print p-6 border-b border-dark-border flex justify-between items-center bg-dark-card/25 backdrop-blur-md">
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">تفاصيل الفاتورة</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">الرقم المرجعي: {selectedInvoice.id}</p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-dark-border cursor-pointer transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Scrolling Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                
                {/* Status Modifier Box */}
                <div className="no-print bg-dark-bg/60 border border-dark-border p-5 rounded-3xl space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">تحديث حالة الطلب</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['received', 'processing', 'completed', 'delivered'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedInvoice.id, status)}
                        className={`py-2.5 px-1 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          selectedInvoice.status === status
                            ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                            : 'bg-slate-950 border-dark-border text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Print Layout Toggle */}
                <div className="no-print flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">معاينة الإيصال الحراري</h4>
                  <div className="flex bg-dark-bg p-0.5 rounded-xl border border-dark-border">
                    <button
                      onClick={() => setPaperSize('58')}
                      className={`px-4 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                        paperSize === '58' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      ٥٨ مم
                    </button>
                    <button
                      onClick={() => setPaperSize('80')}
                      className={`px-4 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                        paperSize === '80' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      ٨٠ مم
                    </button>
                  </div>
                </div>

                {/* Real-time Rendered Paper Receipt */}
                <div className="flex justify-center bg-dark-bg p-4 border border-dark-border rounded-3xl">
                  <div 
                    id="printable-receipt-area"
                    className={`thermal-receipt shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-gray-150 rounded-sm ${
                      paperSize === '58' ? 'thermal-receipt-58' : 'thermal-receipt-80'
                    }`}
                  >
                    
                    {/* Header */}
                    <div className="text-center space-y-1 mb-3">
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
                      <p className="text-[9px] text-gray-500">{organization?.address || 'عنوان الفرع'}</p>
                      <div className="border-t border-dashed border-gray-400 my-1.5" />
                    </div>

                    {/* Meta Info */}
                    <div className="text-[9px] space-y-0.5 font-mono mb-2 text-right" dir="rtl">
                      <div className="flex justify-between">
                        <span>السجل التجاري:</span>
                        <span className="font-bold">{organization?.commercial_registration || '١٠١٠XXXXXX'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الرقم الضريبي:</span>
                        <span className="font-bold">{organization?.vat_number || '٣٠٠٠XXXXXXXX٠٠٣'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>رقم الفاتورة:</span>
                        <span className="font-bold">{selectedInvoice.invoice_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>التاريخ والوقت:</span>
                        <span className="font-bold">{new Date(selectedInvoice.created_at).toLocaleString('ar-EG')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>العميل:</span>
                        <span className="font-bold truncate max-w-[120px]">{customer?.name || 'عميل مباشر'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الجوال:</span>
                        <span className="font-bold">{customer?.phone || 'غير مسجل'}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-gray-400 my-1.5" />

                    {/* Table */}
                    <div className="font-mono text-[9px] mb-2 text-right" dir="rtl">
                      <div className="flex justify-between font-bold mb-1">
                        <span>الخدمة</span>
                        <span className="w-12 text-center">الكمية</span>
                        <span className="w-16 text-left">السعر</span>
                      </div>
                      <div className="border-b border-dashed border-gray-300 mb-1" />
                      <div className="flex justify-between py-0.5">
                        <span className="truncate max-w-[120px]">{selectedInvoice.service_type}</span>
                        <span className="w-12 text-center font-bold">{selectedInvoice.pieces_count}</span>
                        <span className="w-16 text-left font-mono">{Number(selectedInvoice.amount).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-gray-400 my-1.5" />

                    {/* Subtotals */}
                    <div className="text-[9px] space-y-1 font-mono mb-3 text-right" dir="rtl">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي (غير شامل الضريبة):</span>
                        <span>{Number(selectedInvoice.amount).toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ضريبة القيمة المضافة (١٥٪):</span>
                        <span>{Number(selectedInvoice.vat_amount).toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between text-xs font-black border-t border-dashed border-gray-400 pt-1">
                        <span>الإجمالي (شامل الضريبة):</span>
                        <span>{Number(selectedInvoice.total_amount).toFixed(2)} ر.س</span>
                      </div>
                    </div>

                    {selectedInvoice.notes && (
                      <div className="mb-3 text-[8px] font-mono bg-gray-100 p-1 rounded text-right">
                        <strong>ملاحظات:</strong> {selectedInvoice.notes}
                      </div>
                    )}

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center my-4">
                      <QRCodeSVG 
                        value={getZatcaQRData(selectedInvoice)} 
                        size={80}
                        level="M"
                      />
                      <span className="text-[6px] text-gray-400 font-mono tracking-wider mt-1 text-center">خاضع لهيئة الزكاة والضريبة والجمارك</span>
                    </div>

                    <div className="text-center font-mono text-[8px] text-gray-500 leading-normal border-t border-dashed border-gray-400 pt-2">
                      <p>{organization?.receipt_footer}</p>
                    </div>

                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="no-print p-6 border-t border-dark-border bg-dark-card flex gap-4 shrink-0">
                <button
                  onClick={triggerPrint}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-white premium-btn-primary transition-all cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الإيصال
                </button>
                <a
                  href={getWhatsAppLink(selectedInvoice)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-slate-300 hover:text-white premium-btn-secondary border border-dark-border transition-all cursor-pointer text-center"
                >
                  <Share2 className="w-4 h-4 text-brand-400" />
                  تنبيه واتساب
                </a>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
