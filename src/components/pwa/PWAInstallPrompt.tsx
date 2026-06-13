"use client";
import { useEffect, useState } from 'react';
import { X, Smartphone, Download, Sparkles } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // SW Update states
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Register Service Worker and manage Install / Update Prompt
  useEffect(() => {
    // 1. Register service worker
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('PWA Service Worker registered with scope:', reg.scope);

          // Force a check for updates immediately on load
          reg.update();

          // Check if there is already a waiting service worker
          if (reg.waiting) {
            setSwUpdateAvailable(true);
            setWaitingWorker(reg.waiting);
          }

          // Listen for future updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setSwUpdateAvailable(true);
                  setWaitingWorker(newWorker);
                }
              });
            }
          });
        } catch (err) {
          console.warn('PWA Service Worker registration failed:', err);
        }
      };
      
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }

      // Automatically reload when the active service worker changes
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 2. Check if already installed / running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Already installed, do not show install prompt
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Listen for the native beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault(); // Prevent native browser prompt
      setDeferredPrompt(e);
      // Wait 3 seconds before showing the slide-in pop-up
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 5. Fallback: If on iOS Safari, we can prompt them manually
    if (isIosDevice) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    // 6. Generic Fallback: If not installed and not iOS, but prompt event didn't fire
    const fallbackTimer = setTimeout(() => {
      const ignored = sessionStorage.getItem('pwa-prompt-ignored');
      if (!ignored && !deferredPrompt) {
        setShow(true);
      }
    }, 8000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallbackTimer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setDeferredPrompt(null);
        setShow(false);
      }
    } else {
      setShowInstructions(true);
    }
  };

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('pwa-prompt-ignored', 'true');
  };

  // If update is available, prioritize the update prompt
  if (swUpdateAvailable) {
    return (
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 left-6 md:left-auto max-w-sm bg-slate-900/90 backdrop-blur-xl border border-brand/20 shadow-2xl rounded-3xl p-5 z-[9999] animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-4">
        {/* Close button */}
        <button 
          onClick={() => setSwUpdateAvailable(false)} 
          className="absolute top-4 right-4 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close update prompt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Main Info */}
        <div className="flex gap-4 items-start">
          <div className="p-3 bg-brand/10 border border-brand/20 rounded-2xl text-brand flex-shrink-0 animate-bounce">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1.5 pr-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-widest text-brand uppercase font-mono">Update Available</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            </div>
            <h3 className="text-sm font-black text-white font-sans">New Version Ready</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
              A new version of Variant Fit with updated styles, icons, and features is ready. Update now to refresh instantly!
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 w-full mt-1">
          <button
            onClick={updateApp}
            className="flex-1 bg-brand text-black font-black text-xs py-3 rounded-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(234,255,102,0.15)]"
          >
            <Download className="w-4 h-4 animate-bounce" /> Update Now
          </button>
          <button
            onClick={() => setSwUpdateAvailable(false)}
            className="px-4 py-3 bg-surface border border-border text-zinc-400 hover:text-white font-bold text-xs rounded-2xl active:scale-95 transition-all"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 left-6 md:left-auto max-w-sm bg-slate-900/90 backdrop-blur-xl border border-brand/20 shadow-2xl rounded-3xl p-5 z-[9999] animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-4">
      {/* Close button */}
      <button 
        onClick={handleClose} 
        className="absolute top-4 right-4 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Close install prompt"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Main Info */}
      <div className="flex gap-4 items-start">
        <div className="p-3 bg-brand/10 border border-brand/20 rounded-2xl text-brand flex-shrink-0 animate-pulse">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1.5 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-widest text-brand uppercase font-mono">App Available</span>
            <Sparkles className="w-3.5 h-3.5 text-brand" />
          </div>
          <h3 className="text-sm font-black text-white font-sans">Install Variant Fit</h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
            Add Variant Fit to your home screen for quick offline access, streaks tracking, and instant workouts.
          </p>
        </div>
      </div>

      {/* Dynamic Installation Guide */}
      {showInstructions && (
        <div className="bg-background/50 border border-border/80 rounded-2xl p-3 text-xs text-zinc-300 flex flex-col gap-2 animate-in fade-in duration-200">
          <p className="font-bold text-brand">How to install:</p>
          {isIOS ? (
            <ol className="list-decimal pl-4 space-y-1 text-zinc-400 font-medium">
              <li>Tap the <span className="font-bold text-white">Share</span> button in Safari (icon looks like a square with an up arrow).</li>
              <li>Scroll down and tap <span className="font-bold text-white">Add to Home Screen</span>.</li>
              <li>Name it <span className="font-bold text-white">Variant Fit</span> and tap <span className="font-bold text-white">Add</span>.</li>
            </ol>
          ) : (
            <ol className="list-decimal pl-4 space-y-1 text-zinc-400 font-medium">
              <li>Open your browser menu (the three vertical dots in top-right or bottom-right).</li>
              <li>Tap <span className="font-bold text-white">Install App</span> or <span className="font-bold text-white">Add to Home screen</span>.</li>
            </ol>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!showInstructions && (
        <div className="flex gap-2.5 w-full mt-1">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-brand text-black font-black text-xs py-3 rounded-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(234,255,102,0.15)]"
          >
            <Download className="w-4 h-4" /> Install Now
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-3 bg-surface border border-border text-zinc-400 hover:text-white font-bold text-xs rounded-2xl active:scale-95 transition-all"
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
}
