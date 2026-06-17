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
  payment_method: 'cash' | 'package_subscriber';
  created_at: string;
}

export interface UserSession {
  id: string;
  email: string;
  role: 'owner' | 'labor' | 'super_admin';
  name: string;
  organization_id?: string;
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
      role: employee.role as any,
      name: employee.name,
      organization_id: employee.organization_id
    };

    this.setSession(session);
    return session;
  }

  async loginAdmin(email: string): Promise<UserSession> {
    // Super admin login can be handled via Supabase auth or fallback mock
    const session: UserSession = {
      id: 'user-super-admin-01',
      email,
      role: 'super_admin',
      name: 'مدير النظام',
    };
    this.setSession(session);
    return session;
  }

  async register(email: string, orgName: string, name: string, password?: string): Promise<UserSession> {
    const pass = password || '12345678';
    
    // 1. Sign up user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
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
        status: 'inactive',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

    const session: UserSession = {
      id: userId,
      email,
      role: 'owner',
      name: name,
      organization_id: orgData.id
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

    const pointsAwarded = Math.floor(invoiceData.total_amount / 10);
    if (pointsAwarded > 0) {
      await this.addCustomerPoints(invoiceData.customer_id, pointsAwarded);
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

  async createEmployee(orgId: string, name: string, email: string): Promise<Employee> {
    const authClient = createAuthClient();
    const pass = '12345678';
    
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
  async getPromoCodes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async createPromoCode(code: string, type: 'trial' | 'discount_percent' | 'discount_amount', value: number): Promise<any> {
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

  async verifyPromoCode(code: string): Promise<any> {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
}

export const db = new LocalDatabase();
