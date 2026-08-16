import { useState, type ReactNode } from "react";
import { MessageSquareHeart, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug report" },
  { value: "suggestion", label: "Suggestion" },
  { value: "feature", label: "Feature idea" },
] as const;

export function FeedbackDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("general");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (message.trim().length < 5) {
      toast.error("Please tell us a little more so we can help.");
      return;
    }
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("feedback").insert({
        user_id: auth.user?.id ?? null,
        category,
        rating,
        message: message.trim(),
        email: email.trim() || auth.user?.email || null,
        page: typeof window !== "undefined" ? window.location.pathname : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      if (error) throw error;
      toast.success("Thank you! Your feedback has been sent.");
      setMessage("");
      setRating(null);
      setCategory("general");
      setOpen(false);
    } catch {
      toast.error("Could not send your feedback. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm" className="gap-2">
            <MessageSquareHeart className="size-4" />
            Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your experience</DialogTitle>
          <DialogDescription>
            Found a bug, have an idea, or something felt confusing? Your feedback shapes
            PassSabi AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              How was the experience?
            </Label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Rate ${n} out of 5`}
                  onClick={() => setRating(n)}
                  className="rounded-lg p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "size-6",
                      rating && n <= rating
                        ? "fill-highlight text-highlight"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Type
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    category === c.value
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-message">Your message</Label>
            <Textarea
              id="feedback-message"
              rows={5}
              placeholder="What happened, what you were trying to do, and the device or browser you used."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-email">Email (optional)</Label>
            <Input
              id="feedback-email"
              type="email"
              placeholder="So we can reply to you"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={submit} disabled={sending}>
            {sending ? "Sending…" : "Send feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackFab() {
  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-6">
      <FeedbackDialog
        trigger={
          <Button size="sm" className="gap-2 rounded-full shadow-[var(--shadow-lift)]">
            <MessageSquareHeart className="size-4" />
            Feedback
          </Button>
        }
      />
    </div>
  );
}
