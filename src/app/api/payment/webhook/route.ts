import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Dynamically initialize firebase-admin if credentials are provided in env
let adminDb: any = null;
let firebaseAdmin: any = null;

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'variantstream';

  if (privateKey && clientEmail) {
    firebaseAdmin = require('firebase-admin');
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    adminDb = firebaseAdmin.firestore();
    console.log('Firebase Admin SDK initialized successfully in Webhook handler.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin SDK in Webhook handler:', err);
}

function verifySignature(timestamp: string, rawBody: string, signature: string, secretKey: string) {
  const data = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(data)
    .digest("base64");

  return expectedSignature === signature;
}

export async function POST(request: Request) {
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!secretKey) {
    console.error('Webhook received but CASHFREE_SECRET_KEY is not configured.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = request.headers.get('x-webhook-signature');
  const timestamp = request.headers.get('x-webhook-timestamp');

  if (!signature || !timestamp) {
    console.error('Webhook missing signature or timestamp headers.');
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
  }

  try {
    const rawBody = await request.text();

    // Verify Cashfree Webhook Signature
    const isSignatureValid = verifySignature(timestamp, rawBody, signature, secretKey);
    if (!isSignatureValid) {
      console.warn('Webhook signature verification failed.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    console.log('Verified Webhook payload received:', payload.type, payload.data?.order?.order_id);

    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const order = payload.data?.order;
      const payment = payload.data?.payment;
      const customer = payload.data?.customer_details;

      const orderId = order?.order_id;
      const amount = order?.order_amount;
      const userId = customer?.customer_id; // Pass customer_id in customer details (stored as user.uid)

      if (!orderId || !userId) {
        console.warn('Webhook missing order_id or customer_id.');
        return NextResponse.json({ error: 'Missing order_id or customer_id' }, { status: 400 });
      }

      // Map amounts to plan durations (matching SubscriptionGate.tsx)
      let planId = 'pro';
      let durationDays = 30;
      let planName = 'Pro';

      if (amount >= 200) {
        planId = 'elite';
        durationDays = 30;
        planName = 'Elite';
      }

      // If Admin SDK is initialized, update Firestore immediately
      if (adminDb && firebaseAdmin) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Update User Profile
        await adminDb.collection('users').doc(userId).set({
          subscription: {
            plan: planId,
            startedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            transactionId: orderId,
          }
        }, { merge: true });

        // Update Payment Request Document
        const paymentRequests = adminDb.collection('payment_requests');
        const querySnapshot = await paymentRequests.where('transactionId', '==', orderId).get();

        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          await paymentRequests.doc(docId).set({
            status: 'approved',
            approvedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          // If no matching request was found, create it as approved
          await paymentRequests.add({
            userId,
            userName: customer?.customer_name || 'VariantFit User',
            plan: planId,
            planName: planName,
            amount: amount,
            duration: durationDays,
            transactionId: orderId,
            status: 'approved',
            createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            approvedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Add Notification
        await adminDb.collection('notifications').add({
          userId,
          type: 'subscription',
          message: `Your ${planName} subscription has been activated! 🎉`,
          link: '/diet',
          read: false,
          createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Successfully updated subscription for user ${userId} via Webhook.`);
      } else {
        console.log(`Webhook processed payment for user ${userId}. Client-side verification will reconcile this upon next reload.`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error handling Cashfree webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
