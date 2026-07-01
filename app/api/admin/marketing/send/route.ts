import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function formatPhone(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (formatted.startsWith('01') && formatted.length === 11) {
    formatted = '20' + formatted.substring(1);
  } else if (formatted.startsWith('1') && formatted.length === 10) {
    formatted = '20' + formatted;
  } else if (formatted.startsWith('05') && formatted.length === 10) {
    formatted = '966' + formatted.substring(1);
  } else if (formatted.startsWith('5') && formatted.length === 9) {
    formatted = '966' + formatted;
  } else if (!formatted.startsWith('966') && !formatted.startsWith('20')) {
    if (formatted.length === 9) {
      formatted = '966' + formatted;
    } else if (formatted.length === 10 && formatted.startsWith('0')) {
      formatted = '966' + formatted.substring(1);
    }
  }
  return formatted;
}

function compileTemplate(template: string, data: { laundryName: string; ownerName: string }) {
  return template
    .replace(/\{\{laundry_name\}\}/g, data.laundryName)
    .replace(/\{\{اسم_المغسلة\}\}/g, data.laundryName)
    .replace(/\{\{owner_name\}\}/g, data.ownerName)
    .replace(/\{\{اسم_المالك\}\}/g, data.ownerName);
}

export async function POST(request: Request) {
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

    const { message, isTest, testPhone, recipientIds } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'محتوى الرسالة مطلوب' }, { status: 400 });
    }

    // System configurations
    let apiUrl = (process.env.EVOLUTION_API_URL || '').trim();
    const apiToken = (process.env.EVOLUTION_API_TOKEN || '').trim();
    const instanceName = (process.env.EVOLUTION_INSTANCE_NAME || '').trim();

    if (!apiUrl || !apiToken || !instanceName) {
      return NextResponse.json({ error: 'لم يتم تكوين إعدادات Evolution API الخاصة بالنظام بعد في ملف البيئة .env' }, { status: 500 });
    }

    // Clean and normalize API Base URL
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (apiUrl.endsWith('/manager')) {
      apiUrl = apiUrl.substring(0, apiUrl.length - 8);
    }
    apiUrl = apiUrl.replace(/\/+$/, '');

    const sendUrl = `${apiUrl}/message/sendText/${instanceName}`;

    // Test send logic
    if (isTest) {
      if (!testPhone) {
        return NextResponse.json({ error: 'رقم هاتف التجربة مطلوب' }, { status: 400 });
      }
      
      const formattedTestPhone = formatPhone(testPhone);
      const compiledMessage = compileTemplate(message, {
        laundryName: 'مغسلة تجريبية',
        ownerName: 'مالك تجريبي'
      });

      console.log(`[Marketing Admin] Sending test message to ${formattedTestPhone}`);
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiToken
        },
        body: JSON.stringify({
          number: formattedTestPhone,
          text: compiledMessage
        })
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }

      if (!response.ok) {
        console.error('[Marketing Admin] Test API Error:', responseData);
        return NextResponse.json({ error: 'فشل إرسال الرسالة التجريبية عبر Evolution API', details: responseData }, { status: response.status });
      }

      return NextResponse.json({ success: true, message: 'تم إرسال الرسالة التجريبية بنجاح!' });
    }

    // Real send logic
    // 1. Fetch owners
    const { data: owners, error: ownersError } = await supabase
      .from('employees')
      .select('name, email, organization_id')
      .eq('role', 'owner');

    if (ownersError) {
      return NextResponse.json({ error: 'فشل جلب بيانات الملاك' }, { status: 500 });
    }

    // 2. Fetch target organizations
    let query = supabase.from('organizations').select('id, name, whatsapp_number');
    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      query = query.in('id', recipientIds);
    }
    const { data: organizations, error: orgsError } = await query;

    if (orgsError) {
      return NextResponse.json({ error: 'فشل جلب بيانات المغاسل' }, { status: 500 });
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ error: 'لا يوجد مستلمون للإرسال إليهم' }, { status: 400 });
    }

    const results = [];

    // Send messages in sequence
    for (const org of organizations) {
      const owner = owners.find(o => o.organization_id === org.id);
      const ownerName = owner ? owner.name : 'مالك المغسلة';
      
      if (!org.whatsapp_number) {
        results.push({
          id: org.id,
          laundry_name: org.name,
          status: 'failed',
          error: 'لا يوجد رقم واتساب مسجل للمنظمة'
        });
        continue;
      }

      const formattedPhone = formatPhone(org.whatsapp_number);
      const compiledMessage = compileTemplate(message, {
        laundryName: org.name,
        ownerName: ownerName
      });

      try {
        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiToken
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: compiledMessage
          })
        });

        if (!response.ok) {
          const textErr = await response.text();
          results.push({
            id: org.id,
            laundry_name: org.name,
            status: 'failed',
            error: `فشل استدعاء API: ${response.status} - ${textErr}`
          });
        } else {
          results.push({
            id: org.id,
            laundry_name: org.name,
            status: 'success'
          });
        }
      } catch (err: any) {
        results.push({
          id: org.id,
          laundry_name: org.name,
          status: 'failed',
          error: err.message || 'خطأ غير متوقع في خادم الاتصال'
        });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('[Marketing Send API Error]:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ داخلي' }, { status: 500 });
  }
}
