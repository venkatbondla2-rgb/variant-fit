"use client";

import { LoadingProvider } from "@/context/LoadingContext";
import { PageLoader } from "@/components/ui/PageLoader";

/**
 * Client-side wrapper that combines LoadingProvider and PageLoader.
 * Must be wrapped in <Suspense> in layout.tsx because
 * LoadingContext uses useSearchParams() which requires it.
 */
export function LoadingWrapper() {
  return (
    <LoadingProvider>
      <PageLoader />
    </LoadingProvider>
  );
}
