-- Supabase Database Schema for Laundry SaaS MVP

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Organizations
create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null, -- References auth.users
    name text not null,
    commercial_registration text,
    vat_number text,
    address text,
    whatsapp_number text,
    logo_url text,
    receipt_footer text,
    points_for_free_service integer not null default 100,
    whatsapp_enabled boolean not null default true,
    evolution_api_url text,
    evolution_api_token text,
    evolution_instance_name text,
    created_at timestamptz not null default now()
);

-- Enable RLS for organizations
alter table public.organizations enable row level security;

-- 2. Employees (maps auth.users to organizations)
create table public.employees (
    id uuid primary key, -- References auth.users(id)
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    email text not null,
    role text not null check (role in ('owner', 'labor')),
    created_at timestamptz not null default now()
);

-- Enable RLS for employees
alter table public.employees enable row level security;

-- Helper function to get the current user's organization_id (recursion-safe)
create or replace function public.get_user_org_id()
returns uuid security definer
set search_path = public
as $$
declare
    org_id uuid;
begin
    -- Try to get from JWT first
    org_id := (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid;
    if org_id is not null then
        return org_id;
    end if;
    
    -- Fall back to auth.users query (recursion-safe)
    select (raw_app_meta_data ->> 'organization_id')::uuid into org_id
    from auth.users
    where id = auth.uid();
    
    return org_id;
end;
$$ language plpgsql;

-- Helper function to get the current user's role (recursion-safe)
create or replace function public.get_user_role()
returns text security definer
set search_path = public
as $$
declare
    user_role text;
begin
    -- Try to get from JWT first
    user_role := auth.jwt() -> 'app_metadata' ->> 'role';
    if user_role is not null then
        return user_role;
    end if;
    
    -- Fall back to auth.users query (recursion-safe)
    select raw_app_meta_data ->> 'role' into user_role
    from auth.users
    where id = auth.uid();
    
    return user_role;
end;
$$ language plpgsql;

-- Trigger to sync employees info with auth.users app_metadata
create or replace function public.sync_employee_metadata()
returns trigger security definer
set search_path = public, auth
as $$
declare
    current_metadata jsonb;
begin
    if TG_OP = 'DELETE' then
        select raw_app_meta_data into current_metadata
        from auth.users
        where id = old.id;
        
        if current_metadata is not null then
            current_metadata := current_metadata - 'organization_id' - 'role';
            update auth.users
            set raw_app_meta_data = current_metadata
            where id = old.id;
        end if;
        
        return old;
    else
        select raw_app_meta_data into current_metadata
        from auth.users
        where id = new.id;
        
        current_metadata := coalesce(current_metadata, '{}'::jsonb);
        current_metadata := jsonb_set(current_metadata, '{organization_id}', to_jsonb(new.organization_id::text));
        current_metadata := jsonb_set(current_metadata, '{role}', to_jsonb(new.role::text));
        
        update auth.users
        set raw_app_meta_data = current_metadata
        where id = new.id;
        
        return new;
    end if;
end;
$$ language plpgsql;

drop trigger if exists sync_employee_metadata_trigger on public.employees;
create trigger sync_employee_metadata_trigger
after insert or update or delete on public.employees
for each row execute function public.sync_employee_metadata();

-- RLS policies for organizations
create policy "Users can view their own organization"
    on public.organizations for select
    using (owner_id = auth.uid() or id = (select public.get_user_org_id()));

create policy "Owners can update their own organization"
    on public.organizations for update
    using (owner_id = auth.uid());

create policy "System can insert organizations"
    on public.organizations for insert
    with check (auth.uid() = owner_id);

-- RLS policies for employees
create policy "Employees can view co-workers"
    on public.employees for select
    using (id = auth.uid() or organization_id = (select public.get_user_org_id()));

create policy "Owners can manage employees of their organization"
    on public.employees for all
    using (organization_id = (select public.get_user_org_id()) and (select public.get_user_role()) = 'owner');

create policy "Owners can insert their own employee record"
    on public.employees for insert
    with check (
        id = auth.uid() 
        and exists (
            select 1 
            from public.organizations 
            where id = organization_id and owner_id = auth.uid()
        )
    );

-- 3. Subscriptions
create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade unique,
    plan_name text not null,
    status text not null check (status in ('active', 'inactive', 'cancelled', 'expired')),
    started_at timestamptz not null default now(),
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    billing_cycle text check (billing_cycle in ('monthly', 'annual')),
    price_paid numeric(10, 2)
);

-- Enable RLS for subscriptions
alter table public.subscriptions enable row level security;

create policy "Employees can view subscription status"
    on public.subscriptions for select
    using (organization_id = (select public.get_user_org_id()));

create policy "Owners can manage subscriptions"
    on public.subscriptions for all
    using (organization_id = (select public.get_user_org_id()) and (select public.get_user_role()) = 'owner');

-- 4. Customers
create table public.customers (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    phone text not null,
    points integer not null default 0,
    created_at timestamptz not null default now(),
    unique (organization_id, phone) -- Phone number unique per organization
);

-- Enable RLS for customers
alter table public.customers enable row level security;

create policy "Employees can perform all actions on customers of their organization"
    on public.customers for all
    using (organization_id = (select public.get_user_org_id()))
    with check (organization_id = (select public.get_user_org_id()));

-- 5. Invoices
create table public.invoices (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete restrict,
    invoice_number text not null,
    service_type text not null,
    pieces_count integer not null check (pieces_count >= 0),
    amount numeric(10, 2) not null check (amount >= 0),
    vat_amount numeric(10, 2) not null check (vat_amount >= 0),
    total_amount numeric(10, 2) not null check (total_amount >= 0),
    notes text,
    status text not null check (status in ('received', 'processing', 'completed', 'delivered')),
    payment_method text not null check (payment_method in ('cash', 'package_subscriber', 'points_redemption')),
    created_at timestamptz not null default now(),
    created_by text,
    unique (organization_id, invoice_number) -- Invoice number unique per organization
);

-- Enable RLS for invoices
alter table public.invoices enable row level security;

create policy "Employees can perform all actions on invoices of their organization"
    on public.invoices for all
    using (organization_id = (select public.get_user_org_id()))
    with check (organization_id = (select public.get_user_org_id()));

-- 6. Service Types
create table public.service_types (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    points_awarded integer not null default 1,
    points_to_redeem integer not null default 0,
    created_at timestamptz not null default now(),
    unique (organization_id, name)
);

-- Enable RLS for service_types
alter table public.service_types enable row level security;

create policy "Employees can perform all actions on service_types of their organization"
    on public.service_types for all
    using (organization_id = (select public.get_user_org_id()))
    with check (organization_id = (select public.get_user_org_id()));

-- 7. Staff Members
create table public.staff_members (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now(),
    unique (organization_id, name)
);

-- Enable RLS for staff_members
alter table public.staff_members enable row level security;

create policy "Employees can perform all actions on staff_members of their organization"
    on public.staff_members for all
    using (organization_id = (select public.get_user_org_id()))
    with check (organization_id = (select public.get_user_org_id()));

-- 8. Customer Prepaid Bundles
create table public.bundles (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade unique,
    balance numeric(10, 2) not null check (balance >= 0),
    total_balance numeric(10, 2) not null check (total_balance >= 0),
    created_at timestamptz not null default now(),
    expires_at timestamptz
);

-- Enable RLS for bundles
alter table public.bundles enable row level security;

create policy "Employees can perform all actions on bundles of their organization"
    on public.bundles for all
    using (organization_id = (select public.get_user_org_id()))
    with check (organization_id = (select public.get_user_org_id()));
