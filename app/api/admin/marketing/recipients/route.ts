import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate user (Try Authorization header token first, then fallback to cookies)
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    let user = null;
    if (token) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
      }
    }

    if (!user) {
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'غير مصرح بالوصول' }, { status: 401 });
    }
    
    if (user.app_metadata?.role !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح بالوصول: يتطلب صلاحية مدير النظام' }, { status: 403 });
    }
    
    // Fetch all employees with 'owner' role
    const { data: owners, error: ownersError } = await supabase
      .from('employees')
      .select('name, email, organization_id')
      .eq('role', 'owner');
      
    if (ownersError) {
      console.error('Error fetching owners:', ownersError);
      return NextResponse.json({ error: 'فشل جلب بيانات الملاك من قاعدة البيانات' }, { status: 500 });
    }
    
    // Fetch all organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, whatsapp_number, whatsapp_enabled');
      
    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json({ error: 'فشل جلب بيانات المغاسل من قاعدة البيانات' }, { status: 500 });
    }
    
    // Map owners and organizations in-memory
    const recipients = organizations.map(org => {
      const owner = owners.find(o => o.organization_id === org.id);
      return {
        id: org.id,
        laundry_name: org.name,
        whatsapp_number: org.whatsapp_number || '',
        whatsapp_enabled: org.whatsapp_enabled !== false,
        owner_name: owner ? owner.name : 'غير محدد',
        owner_email: owner ? owner.email : 'غير محدد'
      };
    });
    
    return NextResponse.json({ recipients });
  } catch (error: any) {
    console.error('[Recipients API Error]:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ داخلي' }, { status: 500 });
  }
}
