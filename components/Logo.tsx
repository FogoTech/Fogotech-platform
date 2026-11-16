/* eslint-disable @next/next/no-img-element */
// FogoTech emblem + wordmark (from /public/brand)
export function Logo({ className = "", size = "md", stacked = false }: { light?: boolean; className?: string; size?: "sm" | "md" | "lg"; stacked?: boolean }) {
  if (stacked) {
    return (
      <span className={`flex flex-col items-center gap-4 ${className}`}>
        <img src="/brand/emblem.png" alt="" className="h-24 w-auto" />
        <img src="/brand/wordmark.png" alt="FogoTech" className="h-5 w-auto" />
      </span>
    );
  }
  const em = size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-10";
  const wm = size === "lg" ? "h-5" : size === "sm" ? "h-3" : "h-3.5";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="/brand/emblem.png" alt="" className={`${em} w-auto`} />
      <img src="/brand/wordmark.png" alt="FogoTech" className={`${wm} w-auto`} />
    </span>
  );
}
