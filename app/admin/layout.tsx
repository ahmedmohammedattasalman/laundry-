'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db, UserSession } from '@/lib/db';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  User,
  Megaphone
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [session, setSession] = useState<UserSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip auth check for admin login page
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    const activeSession = db.getSession();
    if (!activeSession || activeSession.role !== 'super_admin') {
      router.push('/admin/login');
      return;
    }

    setSession(activeSession);
    setLoading(false);
  }, [router, pathname]);

  // For login page, just render children without shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = () => {
    db.setSession(null);
    router.push('/admin/login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <div className="text-slate-400 text-xs font-semibold">جاري تحميل لوحة الإدارة…</div>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'نظرة عامة', href: '/admin', icon: LayoutDashboard },
    { name: 'إدارة المغاسل', href: '/admin/laundries', icon: Building2 },
    { name: 'الاشتراكات والمالية', href: '/admin/billing', icon: CreditCard },
    { name: 'التسويق والإعلانات', href: '/admin/marketing', icon: Megaphone },
    { name: 'إعدادات الحساب', href: '/admin/settings', icon: Settings },
  ];

  const isCurrent = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-dark-bg text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:start-0 bg-dark-card/60 backdrop-blur-xl border-e border-dark-border z-20 flex-shrink-0">
        
        {/* Admin Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-dark-border gap-3 bg-dark-card/20">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-md border border-red-400/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white truncate font-heading">لاندرساس</h2>
            <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">لوحة الإدارة العليا</p>
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
                    ? 'bg-red-500/10 text-red-300 border-s-2 border-red-500 shadow-[inset_4px_0_12px_rgba(239,68,68,0.06)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${current ? 'text-red-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Admin User Card */}
        <div className="p-4 border-t border-dark-border bg-dark-card/40 space-y-3">
          <div className="flex items-center gap-3 bg-dark-bg/60 p-3 rounded-2xl border border-dark-border">
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 truncate">{session.name}</h4>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-red-400 uppercase tracking-wider mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                مدير النظام
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

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ps-72">
        
        {/* Top Header */}
        <header className="h-20 border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl flex items-center justify-between px-6 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <h1 className="text-sm font-extrabold text-white hidden sm:block font-heading">
              {pathname === '/admin' && 'نظرة عامة على النظام'}
              {pathname === '/admin/laundries' && 'إدارة المغاسل والمنشآت'}
              {pathname === '/admin/billing' && 'الاشتراكات والمالية'}
              {pathname === '/admin/marketing' && 'الحملات التسويقية والإعلانات'}
              {pathname === '/admin/settings' && 'إعدادات الحساب الإداري'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-full font-extrabold tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              وضع الإدارة
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
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
              <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-heading">لاندرساس</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">لوحة الإدارة</p>
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
                        ? 'bg-red-600 text-white shadow-md' 
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
