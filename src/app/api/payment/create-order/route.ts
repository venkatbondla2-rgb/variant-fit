import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const env = process.env.NEXT_PUBLIC_CASHFREE_ENV || 'sandbox';

  if (!appId || !secretKey) {
    return NextResponse.json(
      { error: "Cashfree credentials are not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const { planId, amount, userId, userEmail, userName, phone } = await request.json();

    if (!planId || !amount || !userId || !phone) {
      return NextResponse.json(
        { error: "Missing required order parameters (planId, amount, userId, phone)." },
        { status: 400 }
      );
    }

    // Generate a unique order ID: order_<timestamp>_<4_random_chars>
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const orderId = `order_${Date.now()}_${randomSuffix}`;

    // Select the correct Cashfree endpoint based on the environment
    const cashfreeUrl = env === 'production'
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    const response = await fetch(cashfreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        order_amount: Number(amount),
        order_currency: 'INR',
        order_id: orderId,
        customer_details: {
          customer_id: userId,
          customer_phone: phone,
          customer_email: userEmail || 'no-email@variantfit.com',
          customer_name: userName || 'VariantFit User',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cashfree order creation failed:', errorText);
      return NextResponse.json(
        { error: `Cashfree API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const orderData = await response.json();

    return NextResponse.json({
      success: true,
      payment_session_id: orderData.payment_session_id,
      order_id: orderData.order_id,
    });
  } catch (error: any) {
    console.error('Error in create-order API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Cashfree order' },
      { status: 500 }
    );
  }
}
