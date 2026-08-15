import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="primary-gradient grid size-8 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-soft)]">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H12v16H6.5A2.5 2.5 0 0 0 4 22V6.5Z"
            fill="currentColor"
            opacity=".9"
          />
          <path
            d="M20 6.5A2.5 2.5 0 0 0 17.5 4H12v16h5.5A2.5 2.5 0 0 1 20 22V6.5Z"
            fill="currentColor"
            opacity=".55"
          />
        </svg>
      </span>
      {showWord && (
        <span className="font-display text-base font-semibold tracking-tight">
          PassSabi<span className="text-highlight"> AI</span>
        </span>
      )}
    </span>
  );
}
