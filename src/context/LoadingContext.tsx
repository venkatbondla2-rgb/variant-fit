"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface LoadingContextType {
  isLoading: boolean;
  isExiting: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  isExiting: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function useLoading() {
  return useContext(LoadingContext);
}

const MIN_DISPLAY_MS = 800;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const loadStartRef = useRef<number>(0);
  const prevPathname = useRef(pathname);
  const isLoadingRef = useRef(false);

  const startLoading = useCallback(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    loadStartRef.current = Date.now();
    setIsExiting(false);
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (!isLoadingRef.current) return;
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsExiting(false);
        isLoadingRef.current = false;
      }, 400);
    }, remaining);
  }, []);

  // Intercept link clicks BEFORE navigation to show preloader immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only intercept internal same-origin links
      if (href.startsWith("/") && !href.startsWith("//") && href !== pathname) {
        startLoading();
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, startLoading]);

  // Stop loading when pathname actually changes (navigation completed)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (isLoadingRef.current) {
        stopLoading();
      }
    }
  }, [pathname, stopLoading]);

  return (
    <LoadingContext.Provider value={{ isLoading, isExiting, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}
