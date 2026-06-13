"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sparkles, Crown, Zap, Star, Check, Copy, CreditCard, Loader2, Lock, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionGateProps {
  aiChatsUsed: number;
  onClose?: () => void;
}

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: "₹99",
    period: "/month",
    duration: 30,
    amount: 99,
    color: "from-brand/20 to-brand/5",
    borderColor: "border-brand/40",
    iconColor: "text-brand",
    icon: Crown,
    features: [
      "Workout Tracking: Unlimited",
      "Feed/Vites: Unlimited",
      "AI Dietitian: 30/month",
      "Food Scans: 50/month",
      "Exercise Alternatives: 30/month",
      "Progress Reports: 4/month",
      "Advanced Analytics: Yes",
    ],
    popular: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "₹299",
    period: "/month",
    duration: 30,
    amount: 299,
    color: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/40",
    iconColor: "text-purple-400",
    icon: Star,
    features: [
      "Workout Tracking: Unlimited",
      "Feed/Vites: Unlimited",
      "AI Dietitian: Unlimited",
      "Food Scans: Unlimited",
      "Exercise Alternatives: Unlimited",
      "Progress Reports: Unlimited",
      "Advanced Analytics: Yes",
      "Premium Challenges: Yes",
      "Elite Badge: 👑",
    ],
    popular: false,
  },
];

export function SubscriptionGate({ aiChatsUsed, onClose }: SubscriptionGateProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Cashfree integration states
  const [paymentMethod, setPaymentMethod] = useState<"cashfree" | "manual">("cashfree");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [cashfreeLoading, setCashfreeLoading] = useState(false);
  const [cashfreeError, setCashfreeError] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);

  // Fetch admin payment info
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payments"));
        if (snap.exists()) setPaymentInfo(snap.data());
      } catch (err) {
        console.error(err);
      }
    };
    fetchPaymentInfo();
  }, []);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setFullName(user.displayName || "");
    }
  }, [user]);

  // Check for existing pending request & reconcile Cashfree payments
  useEffect(() => {
    if (!user) return;
    const checkPending = async () => {
      try {
        const q = query(
          collection(db, "payment_requests"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        // 1. Check for manual pending requests
        const manualPending = snap.docs.find(d => d.data().status === "pending");
        if (manualPending) {
          setPendingRequest({ id: manualPending.id, ...manualPending.data() });
          return;
        }

        // 2. Check for pending Cashfree requests and reconcile them
        const cashfreePending = snap.docs.find(d => d.data().status === "pending_cashfree");
        if (cashfreePending) {
          const reqData = cashfreePending.data();
          const orderId = reqData.transactionId;

          const verifyRes = await fetch("/api/payment/verify-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId }),
          });

          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // Automatically activate subscription!
              const plan = PLANS.find(p => p.id === reqData.plan);
              if (plan) {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);

                await setDoc(doc(db, "users", user.uid), {
                  subscription: {
                    plan: plan.id,
                    startedAt: now,
                    expiresAt: expiresAt,
                    transactionId: orderId,
                  }
                }, { merge: true });

                await setDoc(doc(db, "payment_requests", cashfreePending.id), {
                  status: "approved",
                  approvedAt: serverTimestamp(),
                }, { merge: true });

                // Add notification
                await addDoc(collection(db, "notifications"), {
                  userId: user.uid,
                  type: "subscription",
                  message: `Your ${plan.name} subscription has been activated! 🎉`,
                  link: "/diet",
                  read: false,
                  createdAt: serverTimestamp(),
                });

                window.location.reload();
              }
            }
          }
        }
      } catch (err) {
        console.error("Error reconciling pending payment requests:", err);
      }
    };
    checkPending();
  }, [user]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCashfreePayment = async () => {
    if (!user || !selectedPlan || !phone.trim()) {
      setCashfreeError("Please fill in all required fields.");
      return;
    }
    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    setCashfreeLoading(true);
    setCashfreeError("");

    try {
      // 1. Create order on backend API
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.amount,
          userId: user.uid,
          userEmail: user.email,
          userName: fullName || user.displayName || user.email || "User",
          phone: phone.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create Cashfree order");
      }

      const { payment_session_id, order_id } = await res.json();

      // 2. Add pending cashfree record to payment_requests collection
      await addDoc(collection(db, "payment_requests"), {
        userId: user.uid,
        userName: fullName || user.displayName || user.email || "User",
        plan: plan.id,
        planName: plan.name,
        amount: plan.amount,
        duration: plan.duration,
        transactionId: order_id,
        status: "pending_cashfree",
        createdAt: serverTimestamp(),
      });

      // 3. Load Cashfree SDK dynamically and open Checkout Modal
      const { getCashfreeInstance } = await import("@/lib/cashfree");
      const cashfree = await getCashfreeInstance();

      cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result: any) => {
        console.log("Cashfree checkout complete. Result:", result);

        // Verification phase
        setCashfreeLoading(true);
        setCashfreeError("");

        try {
          const verifyRes = await fetch("/api/payment/verify-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId: order_id }),
          });

          if (!verifyRes.ok) {
            throw new Error("Failed to verify transaction status with server.");
          }

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            // 4. Update user's subscription in Firestore
            const now = new Date();
            const expiresAt = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);

            await setDoc(doc(db, "users", user.uid), {
              subscription: {
                plan: plan.id,
                startedAt: now,
                expiresAt: expiresAt,
                transactionId: order_id,
              }
            }, { merge: true });

            // 5. Update payment request status to approved
            const q = query(
              collection(db, "payment_requests"),
              where("transactionId", "==", order_id)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              await setDoc(doc(db, "payment_requests", snap.docs[0].id), {
                status: "approved",
                approvedAt: serverTimestamp(),
              }, { merge: true });
            }

            // 6. Notify user
            await addDoc(collection(db, "notifications"), {
              userId: user.uid,
              type: "subscription",
              message: `Your ${plan.name} subscription has been activated! 🎉`,
              link: "/diet",
              read: false,
              createdAt: serverTimestamp(),
            });

            setPaymentVerified(true);
            setTimeout(() => {
              if (onClose) onClose();
              window.location.reload();
            }, 3000);

          } else {
            setCashfreeError(`Payment not completed. Status: ${verifyData.status || "UNKNOWN"}. If you paid, please contact support.`);
          }
        } catch (verifyErr: any) {
          console.error("Verification error:", verifyErr);
          setCashfreeError("Verification error: " + (verifyErr.message || "Please contact admin to manually verify order ID: " + order_id));
        } finally {
          setCashfreeLoading(false);
        }
      });

    } catch (err: any) {
      console.error("Checkout initiation error:", err);
      setCashfreeError(err.message || "Failed to initiate Cashfree checkout.");
      setCashfreeLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!user || !selectedPlan || !transactionId.trim()) return;
    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "payment_requests"), {
        userId: user.uid,
        userName: user.displayName || user.email || "User",
        plan: plan.id,
        planName: plan.name,
        amount: plan.amount,
        duration: plan.duration,
        transactionId: transactionId.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit payment request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Payment successful view
  if (paymentVerified) {
    const plan = PLANS.find((p) => p.id === selectedPlan)!;
    return (
      <div className="bg-surface rounded-2xl border border-green-500/30 p-8 text-center" style={{ animation: "scale-fade-in 0.3s ease-out" }}>
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
          Your payment for the <strong className="text-brand">{plan.name}</strong> plan has been verified. 
          Your subscription is now <strong className="text-green-400">active</strong>.
        </p>
        <p className="text-xs text-zinc-500">Refreshing page to unlock your benefits...</p>
      </div>
    );
  }

  // Already submitted or has pending request
  if (pendingRequest || submitted) {
    return (
      <div className="bg-surface rounded-2xl border border-brand/20 p-8 text-center" style={{ animation: "scale-fade-in 0.3s ease-out" }}>
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
        <h3 className="text-xl font-bold mb-2">Payment Under Review</h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
          Your payment for the <strong className="text-brand">{pendingRequest?.planName || selectedPlan}</strong> plan is being reviewed by our team. 
          You&apos;ll get access once approved.
        </p>
        <div className="glass-card rounded-xl p-4 inline-block">
          <p className="text-xs text-zinc-500">Transaction ID</p>
          <p className="font-mono font-bold text-brand">{pendingRequest?.transactionId || transactionId}</p>
        </div>
      </div>
    );
  }

  // Payment form after selecting a plan
  if (selectedPlan) {
    const plan = PLANS.find((p) => p.id === selectedPlan)!;
    return (
      <div className="bg-surface rounded-2xl border border-border p-6" style={{ animation: "scale-fade-in 0.3s ease-out" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand" /> Complete Payment
          </h3>
          <button onClick={() => { setSelectedPlan(null); setCashfreeError(""); }} className="text-xs text-zinc-400 hover:text-white">
            ← Back to plans
          </button>
        </div>

        {/* Selected plan summary */}
        <div className={`rounded-xl p-4 border ${plan.borderColor} bg-gradient-to-br ${plan.color} mb-6 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
            <div>
              <p className="font-bold">{plan.name} Plan</p>
              <p className="text-xs text-zinc-400">{plan.price}{plan.period}</p>
            </div>
          </div>
          <p className="text-2xl font-black text-brand">{plan.price}</p>
        </div>

        {/* Payment tabs */}
        {paymentInfo && (
          <div className="flex border border-border rounded-xl p-1 bg-background mb-6">
            <button
              onClick={() => { setPaymentMethod("cashfree"); setCashfreeError(""); }}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === "cashfree"
                  ? "bg-brand text-black font-extrabold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Instant Checkout (Cards/UPI)
            </button>
            <button
              onClick={() => { setPaymentMethod("manual"); setCashfreeError(""); }}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === "manual"
                  ? "bg-brand text-black font-extrabold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Manual Pay (UPI/QR)
            </button>
          </div>
        )}

        {/* Cashfree automated pay */}
        {(paymentMethod === "cashfree" || !paymentInfo) && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
              Secure automated checkout via Cashfree
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand font-medium text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">Mobile Number (Required)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand font-mono text-white"
                  />
                </div>
              </div>

              {cashfreeError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 font-medium">
                  {cashfreeError}
                </div>
              )}

              <Button
                onClick={handleCashfreePayment}
                disabled={cashfreeLoading || !phone.trim()}
                className="w-full bg-brand text-black font-extrabold h-12 rounded-xl hover:brightness-110 flex items-center justify-center gap-2 mt-2"
              >
                {cashfreeLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...</>
                ) : (
                  <>Pay {plan.price} Securely</>
                )}
              </Button>
              <p className="text-[10px] text-zinc-500 text-center">
                🔒 Secured by Cashfree Payments. All major cards, UPI and Netbanking accepted.
              </p>
            </div>
          </div>
        )}

        {/* Manual Pay */}
        {paymentMethod === "manual" && paymentInfo && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Pay using any method below</p>

            <div className="flex flex-col gap-4">
              {paymentInfo.upiId && (
                <div className="bg-background rounded-xl p-4 border border-border flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">UPI ID</p>
                    <p className="font-mono font-bold text-white text-sm">{paymentInfo.upiId}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentInfo.upiId, "upi")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      copiedField === "upi"
                        ? "bg-brand text-black"
                        : "bg-surface border border-border text-zinc-400 hover:text-brand hover:border-brand/40"
                    }`}
                  >
                    {copiedField === "upi" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              )}

              {paymentInfo.phoneNumber && (
                <div className="bg-background rounded-xl p-4 border border-border flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Phone Number</p>
                    <p className="font-mono font-bold text-white text-sm">{paymentInfo.phoneNumber}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentInfo.phoneNumber, "phone")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      copiedField === "phone"
                        ? "bg-brand text-black"
                        : "bg-surface border border-border text-zinc-400 hover:text-brand hover:border-brand/40"
                    }`}
                  >
                    {copiedField === "phone" ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              )}

              {paymentInfo.qrCodeUrl && (
                <div className="bg-background rounded-xl p-4 border border-border text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Scan QR Code</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={paymentInfo.qrCodeUrl} alt="Payment QR Code" className="w-48 h-48 mx-auto rounded-xl bg-white p-2 object-contain" />
                </div>
              )}

              {/* Transaction ID input */}
              <div className="flex flex-col gap-3 pt-2">
                <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                  Enter your Transaction / UTR ID after payment
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. UTR1234567890 or Transaction ID"
                  className="bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand font-mono text-white"
                />
                <Button
                  onClick={handleSubmitPayment}
                  disabled={submitting || !transactionId.trim()}
                  className="w-full bg-brand text-black font-bold h-12 rounded-xl hover:brightness-110"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                  ) : (
                    <>Submit Payment for Verification</>
                  )}
                </Button>
                <p className="text-[10px] text-zinc-600 text-center">
                  Your subscription will be activated once the admin verifies your payment.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main paywall screen with plans
  return (
    <div className="flex flex-col gap-6" style={{ animation: "fade-in-up 0.4s ease-out" }}>
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4" style={{ animation: "pulse-glow 3s ease-in-out infinite" }}>
          <Lock className="w-8 h-8 text-brand" />
        </div>
        <h3 className="text-2xl font-black mb-2">Upgrade Your Diet Game</h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          You&apos;ve used all <strong className="text-white">{aiChatsUsed}/2 free AI diet plans</strong> this month.
          Unlock unlimited AI-powered diet plans with a subscription.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan, idx) => (
          <div
            key={plan.id}
            className={`relative bg-surface rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300 cursor-pointer group
              feature-card-3d ${plan.borderColor}
              ${plan.popular ? "ring-2 ring-brand/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]" : "hover:border-zinc-600"}
            `}
            style={{ animationDelay: `${idx * 100}ms` }}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-black text-[10px] uppercase font-black px-3 py-1 rounded-full tracking-wider">
                Most Popular
              </div>
            )}

            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} border ${plan.borderColor} flex items-center justify-center`}>
              <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
            </div>

            <div>
              <h4 className="font-bold text-lg">{plan.name}</h4>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                <span className="text-sm text-zinc-500 mb-1">{plan.period}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className={`w-4 h-4 ${plan.iconColor} flex-shrink-0`} />
                  {f}
                </div>
              ))}
            </div>

            <Button
              className={`w-full font-bold rounded-xl ${
                plan.popular ? "bg-brand text-black hover:brightness-110" : "bg-background border border-border hover:border-brand/40 hover:text-brand"
              }`}
            >
              Choose {plan.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
