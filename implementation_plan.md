# Laundry SaaS MVP Implementation Plan

The objective is to build a multi-tenant Laundry SaaS Platform using Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, and Supabase. The application will allow laundry owners to register, configure their business info, subscribe, create invoices, print thermal receipts (58mm/80mm), and send pre-filled WhatsApp notifications to customers.

## User Review Required

Please review the proposed tech stack, database architecture, and security rules:
- **Supabase Integration**: Next.js App Router API routes/Server Actions will interface with Supabase Auth and Database. RLS policies will restrict data access by `organization_id`.
- **UI Design System**: A premium, weightless aesthetic inspired by Antigravity and Vercel design systems, using translucent glassmorphism overlays, soft drop shadows, dark/light balanced mode, and smooth transitions.
- **Dynamic QR Code**: Required for Saudi VAT. The QR code should encode: Laundry Name, VAT Number, Timestamp, Total Amount, and VAT Amount in TLV (Tag-Length-Value) format as per ZATCA (Zakat, Tax and Customs Authority) standards, or base64 ZATCA format.

## Open Questions

> [!IMPORTANT]
> 1. Do you already have a Supabase project and Stripe/Polar keys we should configure in `.env`, or should we write the code using placeholder configurations that read from `.env.local`?
> 2. For the Saudi VAT QR code, do you require the strict ZATCA TLV Base64 encoding structure (which is mandatory for official e-invoicing in Saudi Arabia), or is a standard URL/text QR code sufficient for this Phase 1 MVP? We recommend implementing the ZATCA-compliant TLV base64 encoder to be future-proof.

---

## Proposed Changes

### Component 1: Initial Setup

#### [NEW] [next.config.ts](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/next.config.ts)
Configuration for Next.js 15 App Router, including image domains for logo uploads.

#### [NEW] [package.json](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/package.json)
Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, Radix UI (Shadcn), and QR code libraries.

#### [NEW] [tailwind.config.ts](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/tailwind.config.ts)
Configures custom animations, HSL tailwind colors, backdrop blur utilities, and custom shadows.

---

### Component 2: Database Schema & RLS

#### [NEW] [schema.sql](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/supabase/schema.sql)
A SQL script that defines the tables, triggers, and Row Level Security (RLS) policies:
- `organizations`: Multi-tenant root.
- `subscriptions`: Links organization to pricing plan status.
- `customers`: Tracks phone numbers, names, points.
- `employees`: Assigns users (`auth.users`) to organizations with roles (`owner` or `receptionist`).
- `invoices`: Tracks customer orders, pieces count, amounts, VAT, payment status, payment method.
- **RLS Policies**: Restricts SELECT, INSERT, UPDATE on customer/invoice/employee tables to users whose `auth.uid()` is active in `employees` for the same `organization_id`.

---

### Component 3: Authentication & Onboarding

#### [NEW] [/app/login/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/login/page.tsx)
Premium, centered login page using standard credentials, with animated validation inputs and loading spinner.

#### [NEW] [/app/register/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/register/page.tsx)
Register page redirecting user to Subscription selection.

#### [NEW] [/app/setup/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/setup/page.tsx)
Multi-step Setup Wizard: Laundry Name, CR Number, VAT Number, Address, WhatsApp Number, Receipt Footer, and Logo upload placeholder.

---

### Component 4: Dashboard & Navigation Layout

#### [NEW] [/app/dashboard/layout.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/layout.tsx)
Responsive dashboard Shell. Custom sidebar with glassmorphic elements, user profile badge, and smooth desktop/mobile layout transitions.

#### [NEW] [/app/dashboard/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/page.tsx)
Overview dashboard with high-end key performance indicator (KPI) cards: Total Customers, Total Invoices, Today's Revenue, and Monthly Revenue. Includes recent invoice charts.

---

### Component 5: Orders & Invoicing

#### [NEW] [/app/dashboard/new-order/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/new-order/page.tsx)
Fast Order Entry Form optimized for reception employees. Autosuggests existing customers based on phone number search. Includes order line summary, automatic VAT calculations (15% Saudi rate), payment methods (Cash, Subscriber Package), and a dynamic preview of the thermal receipt.

#### [NEW] [/app/dashboard/invoices/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/invoices/page.tsx)
Invoice listing page with status filter (`received`, `processing`, `completed`, `delivered`), search, and detailed drawer preview.

#### [NEW] [/app/dashboard/customers/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/customers/page.tsx)
Customer management list showing phone numbers, points, order count, and revenue, with clickable drawer showing customer invoice history.

#### [NEW] [/app/dashboard/settings/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/settings/page.tsx)
Manage organization details (CR Number, VAT Number, WhatsApp number, footer message) and employees role management.

#### [NEW] [/app/dashboard/subscription/page.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/app/dashboard/subscription/page.tsx)
Subscription details page to subscribe/upgrade, displaying current billing logs.

---

### Component 6: Receipt & WhatsApp Share

#### [NEW] [/components/receipt-pdf.tsx](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/components/receipt-pdf.tsx)
Thermal receipt visual builder. Supports 58mm and 80mm widths using print-friendly CSS Media queries (`@media print` rules). Dynamically renders ZATCA-compliant Saudi VAT QR codes.

#### [NEW] [/lib/zatca.ts](file:///c:/Users/ah383/Desktop/clients/abdelmohsen/lib/zatca.ts)
Utility code to convert Laundry Name, VAT Number, Timestamp, Total Amount, and VAT Amount into ZATCA standard TLV (Tag-Length-Value) hex representation, then base64 encode it for scanning.

---

## Verification Plan

### Automated Tests
- Build verification: `npm run build`
- Linter checks: `npm run lint`

### Manual Verification
- Simulate Auth routes: login -> signup -> choose plan -> setup wizard -> redirect to dashboard.
- Create new order with new customer: verify customer record is created, point total updates, and invoice is listed.
- Verify thermal receipt preview: trigger native `window.print()` and verify layout adjustments for 58mm/80mm.
- Scan generated QR code: check if it displays metadata correctly.
- Click "Send via WhatsApp": verify it opens correct API link (`https://wa.me/...`) with correct text content.
