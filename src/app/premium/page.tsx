"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sparkles, Crown, Zap, Star, Check, Copy, CreditCard, Loader2, Lock, Phone, User, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function PremiumPage() {
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

  // User details / limits
  const [activePlan, setActivePlan] = useState<"free" | "pro" | "elite">("free");
  const [expiresAtDate, setExpiresAtDate] = useState<Date | null>(null);
  const [aiChatsUsed, setAiChatsUsed] = useState(0);
  const [foodScansUsed, setFoodScansUsed] = useState(0);
  const [alternativesUsed, setAlternativesUsed] = useState(0);
  const [progressPhotosUsed, setProgressPhotosUsed] = useState(0);

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

  // Pre-fill user data & fetch user subscription / limits info
  useEffect(() => {
    if (!user) return;
    setFullName(user.displayName || "");

    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          let plan: "free" | "pro" | "elite" = "free";
          if (data.subscription && data.subscription.expiresAt) {
            const expires = data.subscription.expiresAt.toDate ? data.subscription.expiresAt.toDate() : new Date(data.subscription.expiresAt);
            if (expires > new Date()) {
              plan = data.subscription.plan || "free";
              setExpiresAtDate(expires);
            }
          }
          setActivePlan(plan);

          const currentMonth = new Date().toISOString().slice(0, 7);
          if (data.aiChatCount && data.aiChatCount.month === currentMonth) {
            setAiChatsUsed(data.aiChatCount.count || 0);
          }
          if (data.foodScanCount && data.foodScanCount.month === currentMonth) {
            setFoodScansUsed(data.foodScanCount.count || 0);
          }
          if (data.exerciseAlternativeCount && data.exerciseAlternativeCount.month === currentMonth) {
            setAlternativesUsed(data.exerciseAlternativeCount.count || 0);
          }
        }

        // Fetch monthly progress photos
        const currentMonth = new Date().toISOString().slice(0, 7);
        const photosQ = query(
          collection(db, "progress_photos"),
          where("userId", "==", user.uid),
          where("monthKey", "==", currentMonth)
        );
        const photosSnap = await getDocs(photosQ);
        setProgressPhotosUsed(photosSnap.size);

      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
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

      const { getCashfreeInstance } = await import("@/lib/cashfree");
      const cashfree = await getCashfreeInstance();

      cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: "_modal",
      }).then(async (result: any) => {
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
              window.location.reload();
            }, 3000);

          } else {
            setCashfreeError(`Payment not completed. Status: ${verifyData.status || "UNKNOWN"}.`);
          }
        } catch (verifyErr: any) {
          console.error("Verification error:", verifyErr);
          setCashfreeError("Verification error: " + (verifyErr.message || "Please contact admin to manually verify."));
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

  // Helper limits values
  const getLimits = (plan: "free" | "pro" | "elite") => {
    if (plan === "elite") {
      return { ai: Infinity, scan: Infinity, alternative: Infinity, photo: Infinity };
    }
    if (plan === "pro") {
      return { ai: 30, scan: 50, alternative: 30, photo: 4 };
    }
    return { ai: 5, scan: 10, alternative: 5, photo: 1 };
  };

  const limits = getLimits(activePlan);

  // If user is not logged in
  if (!user) {
    return (
      <div className="pt-12 pb-24 px-4 max-w-4xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-brand" />
        </div>
        <h2 className="text-3xl font-black mb-3">Unlock Premium Features</h2>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
          Sign in or create an account to view and purchase our Premium Plans.
        </p>
        <Button onClick={() => window.location.href = "/login"} className="bg-brand text-black font-extrabold px-8 h-12 rounded-xl hover:brightness-110">
          Login to Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-24 px-4 max-w-5xl mx-auto flex flex-col gap-10">
      
      {/* Page Title */}
      <div className="text-center relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
          <Crown className="w-10 md:w-12 h-10 md:h-12 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-bounce" />
          VARIANT<span className="text-brand">FIT</span> PREMIUM
        </h1>
        <p className="text-zinc-400 mt-2 text-sm md:text-base max-w-xl mx-auto">
          Upgrade your fitness journey with advanced AI tools, scanning, unlimited tracking, and exclusive community challenges.
        </p>
      </div>

      {/* Active Subscription Status Banner */}
      <div className="bg-surface border border-border/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="absolute -right-16 -top-16 w-36 h-36 bg-brand/5 rounded-full blur-2xl" />
        <div>
          <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Your Current Plan</span>
          <h2 className="text-2xl font-black mt-1 flex items-center gap-2">
            {activePlan === "elite" && <><span className="text-purple-400">ELITE Plan</span> 👑</>}
            {activePlan === "pro" && <><span className="text-brand">PRO Plan</span> ⭐</>}
            {activePlan === "free" && <><span className="text-zinc-400">FREE Plan</span></>}
          </h2>
          {expiresAtDate && (
            <p className="text-xs text-zinc-400 mt-1">
              Active subscription expires on: <strong>{expiresAtDate.toLocaleDateString()}</strong>
            </p>
          )}
        </div>

        {/* Limit indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto flex-1 md:max-w-2xl">
          {/* AI Dietitian */}
          <div className="bg-background/50 border border-border/50 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">AI Dietitian</span>
            <div className="mt-2">
              <span className="text-sm font-black font-mono">
                {aiChatsUsed} / {limits.ai === Infinity ? "∞" : limits.ai}
              </span>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-brand h-full rounded-full transition-all duration-500" 
                  style={{ width: `${limits.ai === Infinity ? 0 : Math.min(100, (aiChatsUsed / limits.ai) * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Food Scans */}
          <div className="bg-background/50 border border-border/50 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Food Scans</span>
            <div className="mt-2">
              <span className="text-sm font-black font-mono">
                {foodScansUsed} / {limits.scan === Infinity ? "∞" : limits.scan}
              </span>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${limits.scan === Infinity ? 0 : Math.min(100, (foodScansUsed / limits.scan) * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Alternatives */}
          <div className="bg-background/50 border border-border/50 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Alternatives</span>
            <div className="mt-2">
              <span className="text-sm font-black font-mono">
                {alternativesUsed} / {limits.alternative === Infinity ? "∞" : limits.alternative}
              </span>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-yellow-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${limits.alternative === Infinity ? 0 : Math.min(100, (alternativesUsed / limits.alternative) * 100)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Progress Photos */}
          <div className="bg-background/50 border border-border/50 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Photos Log</span>
            <div className="mt-2">
              <span className="text-sm font-black font-mono">
                {progressPhotosUsed} / {limits.photo === Infinity ? "∞" : limits.photo}
              </span>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${limits.photo === Infinity ? 0 : Math.min(100, (progressPhotosUsed / limits.photo) * 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reconcile Payment notification if pending */}
      {pendingRequest && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Verification Pending</p>
              <p className="text-xs text-zinc-400">
                You have a pending subscription verification for the {pendingRequest.planName} plan (Transaction ID: {pendingRequest.transactionId}).
              </p>
            </div>
          </div>
          <span className="bg-amber-500/20 text-amber-400 text-[10px] uppercase font-black px-3 py-1 rounded-full border border-amber-500/20">
            Pending Admin Approve
          </span>
        </div>
      )}

      {/* Payment success screen */}
      {paymentVerified ? (
        <div className="bg-surface rounded-3xl border border-green-500/30 p-10 text-center max-w-lg mx-auto w-full shadow-lg">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-2xl font-black mb-3">Subscription Activated! 🎉</h3>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Thank you! Your payment has been processed and verified successfully. Enjoy full access to your plan benefits.
          </p>
          <p className="text-xs text-zinc-500 animate-pulse">Refreshing profile...</p>
        </div>
      ) : selectedPlan ? (
        /* Checkout Modal Content Embedded In Page */
        <div className="bg-surface rounded-3xl border border-border p-6 md:p-8 max-w-xl mx-auto w-full shadow-2xl relative" style={{ animation: "scale-fade-in 0.3s ease-out" }}>
          <button 
            onClick={() => { setSelectedPlan(null); setCashfreeError(""); }}
            className="absolute right-4 top-4 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-6 h-6 text-brand" />
            <h3 className="text-xl font-bold text-white">Complete Your Order</h3>
          </div>

          {/* Selected Plan Summary Card */}
          {(() => {
            const plan = PLANS.find(p => p.id === selectedPlan)!;
            return (
              <div className={`rounded-2xl p-5 border ${plan.borderColor} bg-gradient-to-br ${plan.color} mb-6 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <plan.icon className={`w-8 h-8 ${plan.iconColor}`} />
                  <div>
                    <h4 className="font-extrabold text-white text-lg">{plan.name} Package</h4>
                    <p className="text-xs text-zinc-300">Valid for {plan.duration} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-brand">{plan.price}</span>
                  <p className="text-[10px] text-zinc-400">One-time payment</p>
                </div>
              </div>
            );
          })()}

          {/* Payment Tabs */}
          {paymentInfo && (
            <div className="flex border border-border rounded-xl p-1 bg-background mb-6">
              <button
                onClick={() => { setPaymentMethod("cashfree"); setCashfreeError(""); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                  paymentMethod === "cashfree"
                    ? "bg-brand text-black font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Instant Pay (Cards/UPI)
              </button>
              <button
                onClick={() => { setPaymentMethod("manual"); setCashfreeError(""); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition-all ${
                  paymentMethod === "manual"
                    ? "bg-brand text-black font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Manual Transfer (UPI QR)
              </button>
            </div>
          )}

          {/* Cashfree automated checkout */}
          {(paymentMethod === "cashfree" || !paymentInfo) && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 block tracking-wider">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-brand font-medium text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-black mb-1.5 block tracking-wider">Mobile Number (Required)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-brand font-mono text-white animate-none"
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
                  <><Loader2 className="w-5 h-5 animate-spin" /> Starting Payment...</>
                ) : (
                  <>Proceed to Secure Payment</>
                )}
              </Button>
              <p className="text-[10px] text-zinc-500 text-center">
                🔒 Secured by Cashfree. Major Cards, UPI, Netbanking & Wallets supported.
              </p>
            </div>
          )}

          {/* Manual Pay */}
          {paymentMethod === "manual" && paymentInfo && (
            <div className="flex flex-col gap-4">
              {paymentInfo.upiId && (
                <div className="bg-background rounded-xl p-4 border border-border flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Pay to UPI ID</p>
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
                    {copiedField === "upi" ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}

              {paymentInfo.qrCodeUrl && (
                <div className="bg-background rounded-xl p-4 border border-border text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Or scan QR code to pay</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={paymentInfo.qrCodeUrl} alt="Payment QR Code" className="w-44 h-44 mx-auto rounded-xl bg-white p-2 object-contain" />
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                  Submit UTR / Transaction ID
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="UTR or UPI Transaction ID"
                  className="bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand font-mono text-white"
                />
                <Button
                  onClick={handleSubmitPayment}
                  disabled={submitting || !transactionId.trim()}
                  className="w-full bg-brand text-black font-extrabold h-12 rounded-xl hover:brightness-110"
                >
                  {submitting ? "Submitting..." : "Submit Transaction Code"}
                </Button>
                <p className="text-[10px] text-zinc-500 text-center">
                  Admin will manually reconcile and activate your pack in a few hours.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Comparison Cards & Grid */
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
            {PLANS.map((plan) => (
              <div 
                key={plan.id}
                className={`relative bg-surface rounded-3xl border p-8 flex flex-col justify-between transition-all duration-300 group ${
                  plan.popular ? "border-brand ring-1 ring-brand/30 shadow-[0_0_30px_rgba(234,255,102,0.06)]" : "border-border hover:border-zinc-700"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-black text-[10px] uppercase font-black px-4 py-1.5 rounded-full tracking-wider shadow-[0_0_15px_rgba(234,255,102,0.4)]">
                    RECOMMENDED
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-black text-white flex items-center gap-2">
                      <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
                      {plan.name}
                    </h3>
                  </div>

                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-zinc-500 mb-1">{plan.period}</span>
                  </div>

                  <ul className="flex flex-col gap-3.5 mb-8">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
                        <Check className={`w-4 h-4 ${plan.iconColor} flex-shrink-0 mt-0.5`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => setSelectedPlan(plan.id)}
                  disabled={activePlan === plan.id}
                  className={`w-full h-12 rounded-xl font-extrabold text-sm transition-all ${
                    activePlan === plan.id
                      ? "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
                      : plan.popular 
                        ? "bg-brand text-black hover:brightness-110 shadow-[0_4px_16px_rgba(234,255,102,0.25)]" 
                        : "bg-zinc-800 border border-border text-white hover:border-brand/40 hover:text-brand"
                  }`}
                >
                  {activePlan === plan.id ? "Already Active Plan" : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            ))}
          </div>

          {/* Detailed pricing matrix */}
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 overflow-x-auto shadow-xl">
            <h3 className="text-lg font-black mb-6 text-white uppercase tracking-wider">Features Comparison Table</h3>
            
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-black uppercase text-zinc-400 tracking-wider">
                  <th className="pb-4 w-1/4">Feature</th>
                  <th className="pb-4 text-center">Free</th>
                  <th className="pb-4 text-center text-brand">Pro (₹99)</th>
                  <th className="pb-4 text-center text-purple-400">Elite (₹299)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm text-zinc-300">
                <tr>
                  <td className="py-4 font-bold">Workout Tracking</td>
                  <td className="py-4 text-center text-zinc-400">Unlimited</td>
                  <td className="py-4 text-center font-bold text-white">Unlimited</td>
                  <td className="py-4 text-center font-bold text-white">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Feed/Vites</td>
                  <td className="py-4 text-center text-zinc-400">Unlimited</td>
                  <td className="py-4 text-center font-bold text-white">Unlimited</td>
                  <td className="py-4 text-center font-bold text-white">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">AI Dietitian</td>
                  <td className="py-4 text-center text-zinc-400">5 / month</td>
                  <td className="py-4 text-center font-bold text-white">30 / month</td>
                  <td className="py-4 text-center font-bold text-brand">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Food Scans</td>
                  <td className="py-4 text-center text-zinc-400">10 / month</td>
                  <td className="py-4 text-center font-bold text-white">50 / month</td>
                  <td className="py-4 text-center font-bold text-brand">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Exercise Alternatives</td>
                  <td className="py-4 text-center text-zinc-400">5 / month</td>
                  <td className="py-4 text-center font-bold text-white">30 / month</td>
                  <td className="py-4 text-center font-bold text-brand">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Progress Reports</td>
                  <td className="py-4 text-center text-zinc-400">1 / month</td>
                  <td className="py-4 text-center font-bold text-white">4 / month</td>
                  <td className="py-4 text-center font-bold text-brand">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Advanced Analytics</td>
                  <td className="py-4 text-center text-zinc-600">❌</td>
                  <td className="py-4 text-center text-green-400 font-bold">✅</td>
                  <td className="py-4 text-center text-green-400 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Premium Challenges</td>
                  <td className="py-4 text-center text-zinc-600">❌</td>
                  <td className="py-4 text-center text-zinc-600">❌</td>
                  <td className="py-4 text-center text-green-400 font-bold">✅</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold">Elite Badge</td>
                  <td className="py-4 text-center text-zinc-600">❌</td>
                  <td className="py-4 text-center text-zinc-600">❌</td>
                  <td className="py-4 text-center text-yellow-400 font-bold text-lg">👑</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
