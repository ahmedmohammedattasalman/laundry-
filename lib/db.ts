import { createClient } from './supabase/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  commercial_registration?: string;
  vat_number?: string;
  address?: string;
  whatsapp_number?: string;
  logo_url?: string;
  receipt_footer?: string;
  points_for_free_service: number;
  whatsapp_enabled: boolean;
  evolution_api_url?: string;
  evolution_api_token?: string;
  evolution_instance_name?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_name: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  started_at: string;
  expires_at: string;
  created_at: string;
  billing_cycle?: 'monthly' | 'annual';
  price_paid?: number;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  points: number;
  created_at: string;
}

export interface Employee {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: 'owner' | 'labor';
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string;
  invoice_number: string;
  service_type: string;
  pieces_count: number;
  amount: number;
  vat_amount: number;
  total_amount: number;
  notes?: string;
  status: 'received' | 'processing' | 'completed' | 'delivered';
  payment_method: 'cash' | 'package_subscriber' | 'points_redemption';
  created_at: string;
  created_by?: string;
}

export interface UserSession {
  id: string;
  email: string;
  role: 'owner' | 'labor' | 'super_admin';
  name: string;
  organization_id?: string;
}

export interface ServiceType {
  id: string;
  organization_id: string;
  name: string;
  points_awarded: number;
  points_to_redeem: number;
  created_at: string;
}

export interface StaffMember {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface Bundle {
  id: string;
  organization_id: string;
  customer_id: string;
  balance: number;
  total_balance: number;
  created_at: string;
  expires_at?: string;
}

const supabase = createClient();

// Stateless client for registering employee without changing cookies
const createAuthClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
};

class LocalDatabase {
  // Session management
  getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const sessionStr = localStorage.getItem('laundry_current_session');
    return sessionStr ? JSON.parse(sessionStr) : null;
  }

  setSession(session: UserSession | null) {
    if (typeof window === 'undefined') return;
    if (session) {
      localStorage.setItem('laundry_current_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('laundry_current_session');
      supabase.auth.signOut();
    }
  }

  async login(email: string, password?: string): Promise<UserSession> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: password || '12345678'
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('فشل تسجيل الدخول: المستخدم غير موجود.');

    // Fetch employee profile
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (empError || !employee) {
      throw new Error('لم يتم العثور على ملف تعريف الموظف لمستخدم النظام هذا.');
    }

    const session: UserSession = {
      id: employee.id,
      email: employee.email,
      role: employee.role as UserSession['role'],
      name: employee.name,
      organization_id: employee.organization_id
    };

    this.setSession(session);
    return session;
  }

  async loginAdmin(email: string, password?: string): Promise<UserSession> {
    const pass = password || '12345678';
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('فشل تسجيل الدخول: المستخدم غير موجود.');

    const role = (authData.user.app_metadata?.role || 'super_admin') as UserSession['role'];
    if (role !== 'super_admin') {
      throw new Error('عذراً، هذا الحساب لا يملك صلاحيات مدير النظام.');
    }

    const session: UserSession = {
      id: authData.user.id,
      email: authData.user.email || email,
      role: 'super_admin',
      name: authData.user.user_metadata?.name || 'مدير النظام'
    };

    this.setSession(session);
    return session;
  }

  async register(email: string, orgName: string, name: string, password?: string): Promise<UserSession> {
    const pass = password || '12345678';
    
    // 1. Sign up user in Supabase with metadata (trigger handles database record creation)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          org_name: orgName,
          full_name: name,
          role: 'owner'
        }
      }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('فشل إنشاء الحساب.');

    // If email confirmation is enabled, the session will be null
    if (!authData.session) {
      throw new Error('CONFIRM_EMAIL_REQUIRED');
    }

    const userId = authData.user.id;

    // 2. Fetch the created employee profile (created automatically by DB trigger)
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    if (empError || !employee) {
      throw new Error('فشل جلب بيانات الحساب المنشأ.');
    }

    const session: UserSession = {
      id: userId,
      email,
      role: 'owner',
      name: name,
      organization_id: employee.organization_id
    };

    this.setSession(session);
    return session;
  }

  // Tenant isolated getters
  async getOrganization(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    if (error) return null;
    return data;
  }

  async updateOrganization(orgId: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getSubscription(orgId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .single();
    if (error) return null;
    return data;
  }

  async updateSubscription(
    orgId: string, 
    status: Subscription['status'], 
    planName?: string,
    expiresAt?: string,
    billingCycle?: 'monthly' | 'annual',
    pricePaid?: number
  ): Promise<Subscription> {
    const current = await this.getSubscription(orgId);
    const defaultExpiry = status === 'active' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : (current?.expires_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());

    const fieldsToSet = {
      status,
      plan_name: planName || current?.plan_name || 'اشتراك المغسلة السحابي',
      expires_at: expiresAt || defaultExpiry,
      billing_cycle: billingCycle || current?.billing_cycle || 'monthly',
      price_paid: pricePaid !== undefined ? pricePaid : (current?.price_paid || 0)
    };

    if (!current) {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: orgId,
          ...fieldsToSet
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    } else {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(fieldsToSet)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async getCustomers(orgId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async createCustomer(orgId: string, name: string, phone: string): Promise<Customer> {
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', orgId)
      .eq('phone', phone)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        organization_id: orgId,
        name,
        phone,
        points: 10
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async addCustomerPoints(customerId: string, pointsToAdd: number) {
    const { data: cust } = await supabase
      .from('customers')
      .select('points')
      .eq('id', customerId)
      .single();
    if (!cust) return;

    await supabase
      .from('customers')
      .update({ points: cust.points + pointsToAdd })
      .eq('id', customerId);
  }

  async getInvoices(orgId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    if (error) return null;
    return data;
  }

  async createInvoice(orgId: string, invoiceData: Omit<Invoice, 'id' | 'organization_id' | 'invoice_number' | 'created_at'>): Promise<Invoice> {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    const nextSeq = (count || 0) + 1001;
    const invoiceNumber = `INV-${nextSeq}`;

    // 1. If points_redemption, validate and deduct customer points based on selected service type
    if (invoiceData.payment_method === 'points_redemption') {
      const { data: stData } = await supabase
        .from('service_types')
        .select('points_to_redeem')
        .eq('organization_id', orgId)
        .eq('name', invoiceData.service_type)
        .maybeSingle();

      const pointsToDeduct = stData?.points_to_redeem ?? 0;
      if (pointsToDeduct <= 0) {
        throw new Error('هذه الخدمة غير قابلة للاستبدال بالنقاط.');
      }
      
      const { data: cust } = await supabase
        .from('customers')
        .select('points')
        .eq('id', invoiceData.customer_id)
        .single();
      
      if (!cust || cust.points < pointsToDeduct) {
        throw new Error(`رصيد نقاط العميل غير كافٍ. النقاط المطلوبة: ${pointsToDeduct} نقطة.`);
      }
      
      // Deduct points
      const { error: deductError } = await supabase
        .from('customers')
        .update({ points: cust.points - pointsToDeduct })
        .eq('id', invoiceData.customer_id);
        
      if (deductError) throw new Error(deductError.message);
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        organization_id: orgId,
        invoice_number: invoiceNumber
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 2. Award points if it's not a points redemption
    if (invoiceData.payment_method !== 'points_redemption') {
      // Find the service type points
      const { data: stData } = await supabase
        .from('service_types')
        .select('points_awarded')
        .eq('organization_id', orgId)
        .eq('name', invoiceData.service_type)
        .maybeSingle();

      const pointsPerPiece = stData?.points_awarded ?? 1;
      const pointsAwarded = Number(invoiceData.pieces_count) * pointsPerPiece;
      
      if (pointsAwarded > 0) {
        await this.addCustomerPoints(invoiceData.customer_id, pointsAwarded);
      }
    }

    return data;
  }

  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getEmployees(orgId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId);
    if (error) return [];
    return data || [];
  }

  async createEmployee(orgId: string, name: string, email: string, password?: string): Promise<Employee> {
    const authClient = createAuthClient();
    const pass = password || '12345678';
    
    // Register user in Supabase Auth
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          role: 'labor',
          organization_id: orgId
        }
      }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('فشل تسجيل حساب العامل.');

    // Register user in public.employees
    const { data, error } = await supabase
      .from('employees')
      .insert({
        id: authData.user.id,
        organization_id: orgId,
        name,
        email,
        role: 'labor'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteEmployee(employeeId: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);
    if (error) throw new Error(error.message);
  }

  // Admin helpers
  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async getAllInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async createOrganizationAdmin(email: string, orgName: string, name: string, password?: string): Promise<Organization> {
    const authClient = createAuthClient();
    const pass = password || '12345678';
    
    // 1. Sign up user in Supabase
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password: pass,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('فشل إنشاء الحساب.');

    const userId = authData.user.id;

    // 2. Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        owner_id: userId,
        name: orgName,
      })
      .select()
      .single();

    if (orgError || !orgData) {
      throw new Error('فشل إنشاء المنشأة: ' + (orgError?.message || ''));
    }

    // 3. Create employee profile for the owner
    const { error: empError } = await supabase
      .from('employees')
      .insert({
        id: userId,
        organization_id: orgData.id,
        name: name,
        email: email,
        role: 'owner',
      });

    if (empError) {
      throw new Error('فشل إنشاء ملف الموظف للمالك: ' + empError.message);
    }

    // 4. Create default subscription
    await supabase
      .from('subscriptions')
      .insert({
        organization_id: orgData.id,
        plan_name: 'اشتراك المغسلة السحابي',
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    return orgData;
  }

  async deleteOrganization(orgId: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) throw new Error(error.message);
  }

  // Pricing Settings helpers
  async getPricingSettings(): Promise<{ [key: string]: number }> {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('*');
    if (error || !data) {
      return {
        monthly_price: 299,
        monthly_original_price: 499,
        annual_price: 3500,
        annual_original_price: 4999
      };
    }
    const settings: { [key: string]: number } = {};
    data.forEach(item => {
      settings[item.key] = Number(item.value);
    });
    return settings;
  }

  async updatePricingSetting(key: string, value: number): Promise<void> {
    const { error } = await supabase
      .from('pricing_settings')
      .upsert({ key, value });
    if (error) throw new Error(error.message);
  }

  // Promo Codes helpers
  async getPromoCodes(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async createPromoCode(code: string, type: 'trial' | 'discount_percent' | 'discount_amount', value: number): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({ code: code.toUpperCase().trim(), type, value })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deletePromoCode(id: string): Promise<void> {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async verifyPromoCode(code: string): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  // Service Types helpers
  async getServiceTypes(orgId: string): Promise<ServiceType[]> {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });
    
    if (error) return [];
    return data || [];
  }

  async createServiceType(orgId: string, name: string, pointsAwarded: number = 1, pointsToRedeem: number = 0): Promise<ServiceType> {
    const { data, error } = await supabase
      .from('service_types')
      .insert({
        organization_id: orgId,
        name: name.trim(),
        points_awarded: pointsAwarded,
        points_to_redeem: pointsToRedeem
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  }

  async updateServiceTypePoints(serviceId: string, points: number): Promise<void> {
    const { error } = await supabase
      .from('service_types')
      .update({ points_awarded: points })
      .eq('id', serviceId);
    
    if (error) throw new Error(error.message);
  }

  async updateServiceTypeRedeemPoints(serviceId: string, points: number): Promise<void> {
    const { error } = await supabase
      .from('service_types')
      .update({ points_to_redeem: points })
      .eq('id', serviceId);
    
    if (error) throw new Error(error.message);
  }

  async deleteServiceType(serviceId: string): Promise<void> {
    const { error } = await supabase
      .from('service_types')
      .delete()
      .eq('id', serviceId);
    
    if (error) throw new Error(error.message);
  }

  // Staff Members helpers
  async getStaffMembers(orgId: string): Promise<StaffMember[]> {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });
    
    if (error) return [];
    return data || [];
  }

  async createStaffMember(orgId: string, name: string): Promise<StaffMember> {
    const { data, error } = await supabase
      .from('staff_members')
      .insert({
        organization_id: orgId,
        name: name.trim()
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteStaffMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw new Error(error.message);
  }

  // Bundles helpers
  async getBundles(orgId: string): Promise<(Bundle & { customer_name?: string; customer_phone?: string })[]> {
    const { data, error } = await supabase
      .from('bundles')
      .select('*, customers(name, phone)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return (data || []).map((item: Bundle & { customers: { name: string; phone: string } | null }) => ({
      ...item,
      customer_name: item.customers?.name,
      customer_phone: item.customers?.phone
    }));
  }

  async getCustomerBundle(customerId: string): Promise<Bundle | null> {
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    if (error) return null;
    return data;
  }

  async createOrUpdateBundle(orgId: string, customerId: string, amount: number): Promise<Bundle> {
    const existing = await this.getCustomerBundle(customerId);
    if (existing) {
      const { data, error } = await supabase
        .from('bundles')
        .update({
          balance: Number(existing.balance) + Number(amount),
          total_balance: Number(existing.total_balance) + Number(amount)
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    } else {
      const { data, error } = await supabase
        .from('bundles')
        .insert({
          organization_id: orgId,
          customer_id: customerId,
          balance: Number(amount),
          total_balance: Number(amount)
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  async deductBundleBalance(customerId: string, amount: number): Promise<void> {
    const bundle = await this.getCustomerBundle(customerId);
    if (!bundle) throw new Error('لا توجد باقة مفعلة لهذا العميل.');
    if (Number(bundle.balance) < Number(amount)) {
      throw new Error(`رصيد الباقة غير كافٍ. الرصيد الحالي: ${bundle.balance} ر.س.`);
    }
    
    const { error } = await supabase
      .from('bundles')
      .update({
        balance: Number(bundle.balance) - Number(amount)
      })
      .eq('id', bundle.id);
    
    if (error) throw new Error(error.message);
  }
}

export const db = new LocalDatabase();
