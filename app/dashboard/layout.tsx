'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db, UserSession, Organization } from '@/lib/db';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileSpreadsheet, 
  Users, 
  Settings, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  User, 
  ShieldCheck,
  Building
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [session, setSession] = useState<UserSession | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeSession = db.getSession();
    if (!activeSession) {
      router.push('/login');
      return;
    }

    setSession(activeSession);
    
    // Redirect labor users if they try to access other paths
    if (activeSession.role === 'labor' && pathname !== '/dashboard/new-order') {
      router.push('/dashboard/new-order');
      return;
    }
    
    if (activeSession.organization_id) {
      const loadOrgAndSub = async () => {
        // Validate subscription status
        const sub = await db.getSubscription(activeSession.organization_id!);
        if (!sub || sub.status !== 'active') {
          router.push('/subscription');
          return;
        }

        const org = await db.getOrganization(activeSession.organization_id!);
        if (!org || !org.commercial_registration) {
          router.push('/setup');
          return;
        }
        setOrganization(org);
        setLoading(false);
      };
      loadOrgAndSub();
    } else {
      setLoading(false);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    db.setSession(null);
    router.push('/login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <div className="text-slate-400 text-xs font-semibold">جاري تحميل لوحة التحكم…</div>
        </div>
      </div>
    );
  }

  // Define sidebar links — dynamically filtered by role
  const navigation = session?.role === 'labor'
    ? [
        { name: 'طلب جديد', href: '/dashboard/new-order', icon: PlusCircle },
      ]
    : [
        { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
        { name: 'طلب جديد', href: '/dashboard/new-order', icon: PlusCircle },
        { name: 'الفواتير', href: '/dashboard/invoices', icon: FileSpreadsheet },
        { name: 'العملاء', href: '/dashboard/customers', icon: Users },
        { name: 'الإعدادات', href: '/dashboard/settings', icon: Settings },
        { name: 'باقة الاشتراك', href: '/dashboard/subscription', icon: CreditCard },
      ];

  const isCurrent = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-dark-bg text-slate-100 font-sans">
      {/* 1. Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:start-0 bg-dark-card/60 backdrop-blur-xl border-e border-dark-border z-20 flex-shrink-0">
        
        {/* Organization Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-dark-border gap-3 bg-dark-card/20">
          <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
            <img 
              src={organization?.logo_url || '/logo.png'} 
              alt="الشعار" 
              className="h-full w-auto max-h-full object-contain" 
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white truncate font-heading">{organization?.name || 'برنامج المغسلة'}</h2>
            <p className="text-[9px] text-brand-400 font-bold uppercase tracking-wider">بوابة المنشأة</p>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const current = isCurrent(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  current 
                    ? 'bg-brand-500/10 text-brand-300 border-s-2 border-brand-500 shadow-[inset_4px_0_12px_rgba(113,114,239,0.06)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${current ? 'text-brand-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Session Profile Card */}
        <div className="p-4 border-t border-dark-border bg-dark-card/40 space-y-3">
          <div className="flex items-center gap-3 bg-dark-bg/60 p-3 rounded-2xl border border-dark-border">
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 truncate">{session.name}</h4>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-brand-400 uppercase tracking-wider mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                {session.role === 'owner' ? 'مدير المغسلة' : 'موظف المغسلة'}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-900 hover:bg-slate-900/50 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* 2. Main Area (Shifted right for desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:ps-72">
        
        {/* Top Header Navigation */}
        <header className="no-print h-20 border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <h1 className="text-sm font-extrabold text-white hidden sm:block font-heading">
              {pathname === '/dashboard' && 'نظرة عامة على الأداء'}
              {pathname === '/dashboard/new-order' && 'إنشاء طلب وفاتورة ضريبية مبسطة'}
              {pathname.startsWith('/dashboard/invoices') && 'سجل وفواتير المبيعات'}
              {pathname.startsWith('/dashboard/customers') && 'قاعدة بيانات العملاء والولاء'}
              {pathname.startsWith('/dashboard/settings') && 'إعدادات المتجر والصلاحيات'}
              {pathname.startsWith('/dashboard/subscription') && 'اشتراك مغسلتك السحابي'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full font-extrabold tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              سحابة النظام نشطة
            </span>
          </div>
        </header>

        {/* Page Content viewport */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 3. Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-30 lg:hidden flex">
          
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative flex flex-col w-72 bg-dark-card border-e border-dark-border h-full max-h-full">
            <div className="absolute top-5 end-5">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-850 cursor-pointer"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-20 flex items-center px-6 border-b border-dark-border gap-3 shrink-0 bg-dark-card/20">
              <div className="h-9 w-9 flex items-center justify-center overflow-hidden">
                <img 
                  src={organization?.logo_url || '/logo.png'} 
                  alt="الشعار" 
                  className="h-full w-auto max-h-full object-contain" 
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-heading">{organization?.name || 'برنامج المغسلة'}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">قائمة خيارات الجوال</p>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const current = isCurrent(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                      current 
                        ? 'bg-brand-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-dark-border bg-dark-card/40 shrink-0">
              <div className="flex items-center gap-3 bg-dark-bg p-3 rounded-2xl border border-dark-border mb-3">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{session.name}</h4>
                  <span className="text-[9px] font-semibold text-brand-400 uppercase tracking-widest">{session.role === 'owner' ? 'مدير المغسلة' : 'موظف المغسلة'}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-900 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
