// Client-side Cashfree SDK loader and helper

let cashfreePromise: Promise<any> | null = null;

export function loadCashfree(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  // If already loaded, return the global Cashfree constructor
  if ((window as any).Cashfree) {
    return Promise.resolve((window as any).Cashfree);
  }

  if (cashfreePromise) {
    return cashfreePromise;
  }

  cashfreePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).Cashfree) {
        resolve((window as any).Cashfree);
      } else {
        reject(new Error("Cashfree SDK failed to initialize."));
      }
    };
    script.onerror = (err) => {
      reject(new Error("Failed to load Cashfree script: " + err));
    };
    document.body.appendChild(script);
  });

  return cashfreePromise;
}

/**
 * Get an initialized Cashfree SDK instance.
 */
export async function getCashfreeInstance(): Promise<any> {
  const CashfreeConstructor = await loadCashfree();
  if (!CashfreeConstructor) {
    throw new Error("Unable to load Cashfree SDK on server-side.");
  }

  const env = process.env.NEXT_PUBLIC_CASHFREE_ENV || 'sandbox';
  
  return CashfreeConstructor({
    mode: env === 'production' ? 'production' : 'sandbox',
  });
}
