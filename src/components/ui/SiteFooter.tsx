import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full py-8 mt-auto border-t border-border/50 text-center text-xs text-zinc-500 flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link href="/about" className="hover:text-brand transition-colors">About Us</Link>
        <Link href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-brand transition-colors">Terms & Conditions</Link>
        <Link href="/ads-info" className="hover:text-brand transition-colors">Ads Info</Link>
      </div>
      <p className="mt-2">© {new Date().getFullYear()} Variant Fit. All rights reserved.</p>
    </footer>
  );
}
