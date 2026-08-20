import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/icons/icon-192.png"
        alt="PassSabi AI logo"
        width={32}
        height={32}
        className="size-8 rounded-xl shadow-[var(--shadow-soft)]"
      />
      {showWord && (
        <span className="font-display text-base font-semibold tracking-tight">
          PassSabi<span className="text-highlight"> AI</span>
        </span>
      )}
    </span>
  );
}
