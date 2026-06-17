import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "لاندروساس - نظام متطور لإدارة مغاسل الملابس",
  description: "قم بتهيئة تفاصيل نشاطك التجاري، وإدارة الموظفين، وتتبع ولاء العملاء، وطباعة إيصالات حرارية متوافقة مع هيئة الزكاة والضريبة والجمارك، وإرسال تنبيهات واتساب فورية.",
  applicationName: "LaundraSaaS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full scroll-smooth antialiased dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100 selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

