/** Gold and green wave, as on the FogoTech exhibition artwork. Sits at the bottom of a green section. */
export function Wave({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className={`block h-16 w-full md:h-28 ${className}`} aria-hidden="true">
      <path d="M0 40 C 360 140, 720 140, 1080 70 C 1260 35, 1380 40, 1440 60 L1440 140 L0 140 Z" fill="#e6be31" />
      <path d="M0 62 C 360 160, 760 150, 1100 92 C 1270 62, 1390 70, 1440 86 L1440 140 L0 140 Z" fill="#faf9f4" />
      <path d="M0 74 C 380 168, 780 150, 1110 104 C 1270 82, 1390 92, 1440 104 L1440 116 C 1380 104, 1270 96, 1110 118 C 780 166, 380 180, 0 92 Z" fill="#2a9a48" />
    </svg>
  );
}

/** Faint circuit-board background pattern (CSS background image). */
export const circuitBg: React.CSSProperties = {
  backgroundColor: "#faf9f4",
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' fill='none' stroke='#2a9a48' stroke-opacity='0.11' stroke-width='2'>
      <path d='M10 0v30l20 20h40'/><circle cx='74' cy='50' r='4'/>
      <path d='M0 90h30l15-15h25l10 10v40'/><circle cx='80' cy='129' r='4'/>
      <path d='M110 0v20l-15 15v20'/><circle cx='95' cy='59' r='4'/>
      <path d='M160 70h-35l-10 10v30l15 15h30'/><circle cx='111' cy='66' r='4'/>
      <path d='M40 160v-25l15-15h20'/><circle cx='79' cy='120' r='0'/>
      <path d='M130 160v-20'/><circle cx='130' cy='136' r='4'/>
      <path d='M60 0v12'/><circle cx='60' cy='16' r='4'/>
    </svg>`
  )}")`,
};
