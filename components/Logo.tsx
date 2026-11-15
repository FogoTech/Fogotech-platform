// Placeholder emblem until the real FogoTech logo file is added to /public.
export function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 40" className="h-8 w-auto" aria-hidden="true">
        <ellipse cx="32" cy="20" rx="30" ry="18" fill="#1f5a3a" stroke="#c9a23a" strokeWidth="3" />
        <text x="32" y="27" textAnchor="middle" fontSize="20" fontWeight="800" fill="#c9a23a" fontFamily="system-ui, sans-serif">
          FT
        </text>
      </svg>
      <span className={`text-lg font-extrabold tracking-wide ${light ? "text-white" : "text-brand-green"}`}>
        FOGO<span className="text-brand-gold">TECH</span>
      </span>
    </span>
  );
}
