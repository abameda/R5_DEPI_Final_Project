import { fmtPct } from "../lib/format";
import { isRtl } from "../lib/i18n";
import { dialAngle } from "../lib/match";
import { useCountUp, usePrefersReducedMotion } from "../lib/motion";

const R = 96; // arc radius in the 240 × 132 drawing
const CX = 120;
const CY = 118;
const ARC = Math.PI * R;
const EASE = "600ms cubic-bezier(.2,.8,.2,1)";

/** A point on the dial at a share of the way round (0 = left end, 1 = right end). */
const at = (share: number, r = R) => {
  const a = Math.PI * (1 - share);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};

/**
 * The match as a compass: the arc fills with the share of demand you cover and
 * the needle points at it. Drawn on the navy answer surface. The number is
 * real text, and the meter role carries the value for assistive technology.
 */
export function CompassDial({ score, name, size = "lg" }: { score: number; name: string; size?: "lg" | "sm" }) {
  const reduced = usePrefersReducedMotion();
  const shown = useCountUp(score) ?? score;
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  const motion = reduced ? "none" : undefined;
  const mirror = isRtl() ? `translate(${CX * 2} 0) scale(-1 1)` : undefined;
  const width = size === "lg" ? 240 : 150;

  return (
    <div role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      aria-valuetext={`${pct}% ${name}`} className="inline-flex flex-col items-center" style={{ width }}>
      <svg viewBox="0 0 240 132" width={width} aria-hidden className="block overflow-visible">
        <g transform={mirror}>
          <path d={`M ${at(0).join(" ")} A ${R} ${R} 0 0 1 ${at(1).join(" ")}`} fill="none"
            stroke="var(--rail-line)" strokeWidth={14} strokeLinecap="round" />
          <path d={`M ${at(0).join(" ")} A ${R} ${R} 0 0 1 ${at(1).join(" ")}`} fill="none"
            stroke="var(--good-fill)" strokeWidth={14} strokeLinecap="round"
            strokeDasharray={ARC} strokeDashoffset={ARC * (1 - pct / 100)}
            style={{ transition: motion ?? `stroke-dashoffset ${EASE}` }} />
          {[0, 0.25, 0.5, 0.75, 1].map((s) => {
            const [x1, y1] = at(s, R - 16);
            const [x2, y2] = at(s, R - 24);
            return <line key={s} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--rail-ink-2)" strokeWidth={2} strokeLinecap="round" />;
          })}
          {/* the needle: a compass diamond, bright tip toward the score */}
          <g data-needle style={{ transform: `rotate(${dialAngle(pct / 100)}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: motion ?? `transform ${EASE}` }}>
            <path d={`M ${CX} ${CY - (R - 30)} L ${CX + 7} ${CY} L ${CX} ${CY + 14} L ${CX - 7} ${CY} Z`} fill="var(--rail-ink-2)" />
            <path d={`M ${CX} ${CY - (R - 30)} L ${CX + 7} ${CY} L ${CX - 7} ${CY} Z`} fill="var(--rail-ink)" />
          </g>
          <circle cx={CX} cy={CY} r={6} fill="var(--rail)" stroke="var(--rail-ink)" strokeWidth={2.5} />
        </g>
      </svg>
      <span className={size === "lg" ? "tnum -mt-1 text-[2.25rem] leading-none font-semibold tracking-[-0.03em]" : "tnum -mt-0.5 text-2xl leading-none font-semibold tracking-[-0.02em]"}>
        {fmtPct(shown, 0)}
      </span>
      <span className="mt-1.5 text-center text-xs font-medium tracking-wide text-rail-ink-2 uppercase">{name}</span>
    </div>
  );
}
