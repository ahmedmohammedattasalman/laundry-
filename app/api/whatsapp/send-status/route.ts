import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { invoiceId, event, newStatus } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId parameter' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Use newStatus override if provided
    const currentStatus = newStatus || invoice.status;

    // 2. Fetch customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single();

    if (customerError || !customer) {
      console.error('Error fetching customer:', customerError);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 3. Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', invoice.organization_id)
      .single();

    if (orgError || !org) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if automatic WhatsApp messaging is enabled
    if (org.whatsapp_enabled === false) {
      return NextResponse.json({ success: true, message: 'WhatsApp notifications are disabled for this organization' });
    }

    // 4. Resolve Evolution API credentials (tenant override or fallback to system environment variables)
    let apiUrl = (org.evolution_api_url || process.env.EVOLUTION_API_URL || '').trim();
    const apiToken = (org.evolution_api_token || process.env.EVOLUTION_API_TOKEN || '').trim();
    const instanceName = (org.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || '').trim();

    if (!apiUrl || !apiToken || !instanceName) {
      console.warn('WhatsApp Evolution API is not configured. Skipping notification.');
      return NextResponse.json({ error: 'WhatsApp Evolution API is not configured' }, { status: 400 });
    }

    // Clean and normalize API Base URL (strip trailing slash and '/manager' if it is present)
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (apiUrl.endsWith('/manager')) {
      apiUrl = apiUrl.substring(0, apiUrl.length - 8);
    }
    apiUrl = apiUrl.replace(/\/+$/, '');

    // 5. Clean customer phone number (convert local formats like '05xxxxxxxx' to '9665xxxxxxxx', '01xxxxxxxx' to '201xxxxxxxx')
    let formattedPhone = customer.phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
      formattedPhone = '20' + formattedPhone.substring(1); // Egyptian: 01017259756 -> 201017259756
    } else if (formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '20' + formattedPhone; // Egyptian: 1017259756 -> 201017259756
    } else if (formattedPhone.startsWith('05') && formattedPhone.length === 10) {
      formattedPhone = '966' + formattedPhone.substring(1); // Saudi: 055... -> 96655...
    } else if (formattedPhone.startsWith('5') && formattedPhone.length === 9) {
      formattedPhone = '966' + formattedPhone; // Saudi: 55... -> 96655...
    } else if (!formattedPhone.startsWith('966') && !formattedPhone.startsWith('20')) {
      if (formattedPhone.length === 9) {
        formattedPhone = '966' + formattedPhone;
      } else if (formattedPhone.length === 10 && formattedPhone.startsWith('0')) {
        formattedPhone = '966' + formattedPhone.substring(1);
      }
    }

    // 6. Compile the Arabic message template
    let message = '';
    if (event === 'created' || currentStatus === 'received') {
      const paymentMethodText = 
        invoice.payment_method === 'cash' ? 'نقدي' :
        invoice.payment_method === 'package_subscriber' ? 'باقة المشترك' : 'استبدال نقاط (مجاني)';

      message = `نشكركم على اختياركم ${org.name}\n\n` +
        `رقم الفاتورة: ${invoice.invoice_number}\n` +
        `نوع الخدمة: ${invoice.service_type}\n` +
        `عدد القطع: ${invoice.pieces_count}\n` +
        `المبلغ الإجمالي: ${Number(invoice.total_amount).toFixed(2)} ر.س (${paymentMethodText})\n` +
        (invoice.created_by ? `المستلم: ${invoice.created_by}\n` : '') +
        `حالة الطلب: تم الاستلام 📥\n\n` +
        `سنقوم بإشعاركم فور جاهزية الملابس للاستلام.`;
    } else {
      const statusLabels: Record<string, string> = {
        received: 'تم الاستلام 📥',
        processing: 'قيد المعالجة 🧼',
        completed: 'جاهز للتسليم! 🎉',
        delivered: 'تم التسليم 🚚'
      };
      const statusText = statusLabels[currentStatus] || currentStatus;

      message = `عزيزي/عزيزتي ${customer.name}،\n\n` +
        `حالة طلبك لدى ${org.name} هي الآن: *${statusText}*\n\n` +
        `رقم الفاتورة: ${invoice.invoice_number}\n` +
        `نوع الخدمة: ${invoice.service_type}\n` +
        `عدد القطع: ${invoice.pieces_count}\n` +
        `المبلغ الإجمالي: ${Number(invoice.total_amount).toFixed(2)} ر.س (شامل ضريبة القيمة المضافة ١٥٪)\n` +
        (invoice.created_by ? `المستلم: ${invoice.created_by}\n` : '') + '\n' +
        `نشكركم على اختياركم لنا!`;
    }

    // 7. Make API request to Evolution API
    const sendUrl = `${apiUrl}/message/sendText/${instanceName}`;
    console.log(`[WhatsApp Auto] Dispatching to ${sendUrl} for phone ${formattedPhone}...`);

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiToken
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
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
      console.error('[WhatsApp Auto] API Error:', responseData);
      return NextResponse.json({ error: 'Evolution API failed', details: responseData }, { status: response.status });
    }

    console.log(`[WhatsApp Auto] Successfully sent message to ${formattedPhone}`);
    return NextResponse.json({ success: true, response: responseData });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[WhatsApp Auto] Route Error:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
