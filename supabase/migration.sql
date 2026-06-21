-- 1. Create or replace signup trigger function
create or replace function public.handle_new_user_signup()
returns trigger security definer
set search_path = public, auth
as $$
declare
    new_org_id uuid;
    org_name text;
    full_name text;
    user_role text;
begin
    user_role := coalesce(new.raw_user_meta_data ->> 'role', 'owner');
    
    -- If the role is labor or super_admin, we do not create a new organization automatically.
    if user_role = 'labor' or user_role = 'super_admin' then
        return new;
    end if;

    -- Extract org_name and full_name from metadata
    org_name := coalesce(new.raw_user_meta_data ->> 'org_name', 'مغسلتي السحابية');
    full_name := coalesce(new.raw_user_meta_data ->> 'full_name', 'مالك المغسلة');

    -- Insert organization
    insert into public.organizations (owner_id, name)
    values (new.id, org_name)
    returning id into new_org_id;

    -- Insert employee profile for owner
    insert into public.employees (id, organization_id, name, email, role)
    values (new.id, new_org_id, full_name, new.email, 'owner');

    -- Insert default subscription
    insert into public.subscriptions (organization_id, plan_name, status, expires_at)
    values (new_org_id, 'اشتراك المغسلة السحابي', 'inactive', now() + interval '14 days');

    return new;
end;
$$ language plpgsql;

-- Bind the trigger
drop trigger if exists on_auth_user_signup on auth.users;
create trigger on_auth_user_signup
after insert on auth.users
for each row execute function public.handle_new_user_signup();


-- 2. Drop existing RLS policies
drop policy if exists "Owners can update their own organization" on public.organizations;
drop policy if exists "Owners can insert organizations" on public.organizations;
drop policy if exists "Users can view their own organization" on public.organizations;
drop policy if exists "Super admins can delete organizations" on public.organizations;

drop policy if exists "Employees can view co-workers" on public.employees;
drop policy if exists "Owners can manage employees of their organization" on public.employees;

drop policy if exists "Employees can view subscription status" on public.subscriptions;
drop policy if exists "Owners can manage subscriptions" on public.subscriptions;

drop policy if exists "Employees can perform all actions on invoices of their organiza" on public.invoices;


-- 3. Re-create RLS policies with super_admin bypass
create policy "Owners can update their own organization"
    on public.organizations for update
    using (owner_id = auth.uid() or (select public.get_user_role()) = 'super_admin');

create policy "Owners can insert organizations"
    on public.organizations for insert
    with check (owner_id = auth.uid() or (select public.get_user_role()) = 'super_admin');

create policy "Users can view their own organization"
    on public.organizations for select
    using (owner_id = auth.uid() or id = (select public.get_user_org_id()) or (select public.get_user_role()) = 'super_admin');

create policy "Super admins can delete organizations"
    on public.organizations for delete
    using ((select public.get_user_role()) = 'super_admin');

create policy "Employees can view co-workers"
    on public.employees for select
    using (id = auth.uid() or organization_id = (select public.get_user_org_id()) or (select public.get_user_role()) = 'super_admin');

create policy "Owners can manage employees of their organization"
    on public.employees for all
    using (organization_id = (select public.get_user_org_id()) and (select public.get_user_role()) = 'owner' or (select public.get_user_role()) = 'super_admin');

create policy "Employees can view subscription status"
    on public.subscriptions for select
    using (organization_id = (select public.get_user_org_id()) or (select public.get_user_role()) = 'super_admin');

create policy "Owners can manage subscriptions"
    on public.subscriptions for all
    using (organization_id = (select public.get_user_org_id()) and (select public.get_user_role()) = 'owner' or (select public.get_user_role()) = 'super_admin');

create policy "Employees can perform all actions on invoices of their organiza"
    on public.invoices for all
    using (organization_id = (select public.get_user_org_id()) or (select public.get_user_role()) = 'super_admin')
    with check (organization_id = (select public.get_user_org_id()) or (select public.get_user_role()) = 'super_admin');


-- 4. Create or update the super admin user
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  aud,
  role,
  is_anonymous,
  confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@laundrasaas.com',
  extensions.crypt('12345678', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "super_admin"}'::jsonb,
  '{"sub": "admin@laundrasaas.com", "email": "admin@laundrasaas.com", "email_verified": true}'::jsonb,
  false,
  now(),
  now(),
  'authenticated',
  'authenticated',
  false,
  now(),
  '',
  '',
  '',
  ''
)
on conflict (email) do update
set 
  raw_app_meta_data = jsonb_set(coalesce(auth.users.raw_app_meta_data, '{}'::jsonb), '{role}', '"super_admin"'),
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  confirmed_at = coalesce(auth.users.confirmed_at, now()),
  confirmation_token = coalesce(auth.users.confirmation_token, ''),
  recovery_token = coalesce(auth.users.recovery_token, ''),
  email_change_token_new = coalesce(auth.users.email_change_token_new, ''),
  email_change = coalesce(auth.users.email_change, '');
