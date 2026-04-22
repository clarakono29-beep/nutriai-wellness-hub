import { LeafMark, Wordmark } from "./Logo";

/**
 * Brand splash — full-bleed forest gradient with the gold leaf
 * and Playfair wordmark. Used during initial auth/profile bootstrap.
 */
export function SplashScreen({ subtitle }: { subtitle?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-hero text-white animate-fade-in"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-up">
        <div
          className="text-[color:var(--gold)] animate-leaf-pulse drop-shadow-[0_8px_30px_rgba(196,151,58,0.4)]"
        >
          <LeafMark size={84} />
        </div>
        <Wordmark className="text-white text-5xl" />
        <p className="text-caption text-white/70">
          {subtitle ?? "Eat smarter. Live longer."}
        </p>
      </div>

      <div className="absolute bottom-12 flex items-center gap-1.5 text-white/40 text-caption">
        <span className="h-px w-6 bg-white/30" />
        <span>Crafted with care</span>
        <span className="h-px w-6 bg-white/30" />
      </div>
    </div>
  );
}
