import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { api_url, api_token, instance_name, test_phone } = await request.json();

    if (!api_url || !api_token || !instance_name || !test_phone) {
      return NextResponse.json({ error: 'الرجاء إدخال جميع الحقول المطلوبة لرسالة التجربة.' }, { status: 400 });
    }

    // Clean and normalize API URL (strip trailing slash and '/manager' if it is present)
    let apiUrl = api_url.trim();
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (apiUrl.endsWith('/manager')) {
      apiUrl = apiUrl.substring(0, apiUrl.length - 8);
    }
    apiUrl = apiUrl.replace(/\/+$/, '');

    // Format phone number
    let formattedPhone = test_phone.replace(/\D/g, '');
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

    const testMessage = `هذه رسالة تجريبية من منصة لاندرساس لتأكيد نجاح الاتصال وربط الحساب عبر Evolution API بنجاح! 🚀`;

    const sendUrl = `${apiUrl}/message/sendText/${instance_name.trim()}`;
    console.log(`[WhatsApp Test] Sending test to: ${sendUrl} for number: ${formattedPhone}`);

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': api_token.trim()
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: testMessage
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
      console.error('[WhatsApp Test] API Error:', responseData);
      return NextResponse.json({ error: 'فشل الاتصال بـ Evolution API', details: responseData }, { status: response.status });
    }

    return NextResponse.json({ success: true, details: responseData });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'حدث خطأ غير متوقع في الخادم';
    console.error('[WhatsApp Test] Route Error:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
