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
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing required verification parameter (orderId)." },
        { status: 400 }
      );
    }

    // Select the correct Cashfree endpoint based on the environment
    const cashfreeUrl = env === 'production'
      ? `https://api.cashfree.com/pg/orders/${orderId}`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    const response = await fetch(cashfreeUrl, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cashfree order status retrieval failed:', errorText);
      return NextResponse.json(
        { error: `Cashfree API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const orderData = await response.json();

    const isPaid = orderData.order_status === 'PAID';

    return NextResponse.json({
      success: isPaid,
      status: orderData.order_status,
      amount: orderData.order_amount,
    });
  } catch (error: any) {
    console.error('Error in verify-order API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify Cashfree order' },
      { status: 500 }
    );
  }
}
