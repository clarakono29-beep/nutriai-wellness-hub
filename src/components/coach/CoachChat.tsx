import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Send, X, Loader2, Sparkles, Square } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useFoodLog } from "@/hooks/useFoodLog";
import { useStreak } from "@/hooks/useStreak";
import { fmtKcal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-coach`;

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function nextMealFor(date = new Date()) {
  const h = date.getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 20) return "dinner";
  return "a snack";
}

// Generic follow-up chips. The model sometimes ends with a question; these are
// always-safe quick replies that keep the conversation flowing without an extra
// API call to generate suggestions.
function followupsFor(lastAssistant: string): string[] {
  const t = lastAssistant.toLowerCase();
  if (t.includes("dinner") || t.includes("lunch") || t.includes("breakfast") || t.includes("snack")) {
    return ["Sounds good!", "Give me another option", "Make it higher protein"];
  }
  if (t.includes("protein")) {
    return ["More high-protein ideas", "Vegetarian options?", "What about carbs?"];
  }
  if (t.includes("water") || t.includes("hydrat")) {
    return ["How much should I drink?", "Tips to drink more"];
  }
  return ["Tell me more", "Give me an example", "What should I eat next?"];
}

export function CoachChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          haptics.light();
          setOpen(true);
        }}
        aria-label="Open nutrition coach"
        className="fixed right-4 bottom-[170px] z-30 h-[52px] w-[52px] rounded-full bg-gradient-cta text-white grid place-items-center shadow-elev-cta active:scale-95 ease-luxury transition-transform animate-pulse-glow"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Brain className="h-5 w-5" />
      </button>
      {open && <CoachPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function CoachPanel({ onClose }: { onClose: () => void }) {
  const { profile } = useProfile();
  const { logs, totals } = useFoodLog();
  const { streak } = useStreak();

  const target = profile?.daily_calories ?? 2000;
  const remaining = Math.max(0, target - totals.calories);
  const onTrack = totals.calories >= target * 0.4 && totals.calories <= target * 1.05;

  const opening = useMemo(() => {
    const firstName = profile?.name?.split(" ")[0] ?? "there";
    const greeting = greetingFor();
    const eaten = fmtKcal(totals.calories);
    const left = fmtKcal(remaining);
    const status =
      logs.length === 0
        ? "You haven't logged anything yet — let's start strong. What can I help you with?"
        : onTrack
          ? "You're on track — great work! What can I help you with?"
          : totals.calories < target * 0.4
            ? "Looks like you're behind for the day — want some quick meal ideas?"
            : "You're a bit over for today — want lighter ideas for tomorrow?";
    return `${greeting}, ${firstName}! 👋\nYou've had ${eaten} kcal today, with ${left} remaining.\n${status}`;
  }, [profile?.name, totals.calories, remaining, target, logs.length, onTrack]);

  const initialQuickPrompts = useMemo(
    () => [
      "How am I doing today?",
      `What should I eat for ${nextMealFor()}?`,
      "Give me a high protein dinner idea",
      `Why does ${profile?.goal === "lose" ? "protein" : "fibre"} matter for my goal?`,
    ],
    [profile?.goal],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: opening },
  ]);
  const [followups, setFollowups] = useState<string[]>(initialQuickPrompts);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const rafScrollRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
  };

  // Track whether the user is near the bottom; if they scroll up, stop pinning.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  };

  // rAF-throttled smooth scroll. Only pin if user hasn't scrolled up.
  const scheduleScroll = (smooth = true) => {
    if (rafScrollRef.current !== null) return;
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null;
      const el = scrollRef.current;
      if (!el || !stickToBottomRef.current) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  };

  useEffect(() => {
    scheduleScroll(true);
  }, [messages, loading, streaming]);

  useEffect(() => {
    return () => {
      if (rafScrollRef.current !== null) cancelAnimationFrame(rafScrollRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const buildContext = () => {
    const summary =
      logs.length === 0
        ? "no entries yet"
        : `${logs.length} items, ${fmtKcal(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat`;
    return {
      name: profile?.name,
      goal: profile?.goal,
      daily_calories: profile?.daily_calories,
      protein_target: profile?.protein_g,
      carbs_target: profile?.carbs_g,
      fat_target: profile?.fat_g,
      streak: streak.current_streak,
      diet_preferences: profile?.diet_preferences,
      todays_log_summary: summary,
    };
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    haptics.light();
    const next: ChatMessage[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setFollowups([]);
    setInput("");
    setLoading(true);
    stickToBottomRef.current = true; // a brand-new send always scrolls

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    let aborted = false;

    try {
      // Send only the last 10 messages for context window control
      const trimmed = next.slice(-10).map(({ role, content }) => ({ role, content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: trimmed,
          user_context: buildContext(),
        }),
        signal: controller.signal,
      });

      if (resp.status === 429) {
        appendAssistant("I'm getting too many requests right now — try again in a moment.");
        return;
      }
      if (resp.status === 402) {
        appendAssistant("AI credits are exhausted. Top up in workspace settings to continue.");
        return;
      }
      if (!resp.ok || !resp.body) {
        appendAssistant("Something went wrong. Please try again.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setStreaming(true);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      // When aborted mid-stream, cancel the reader so the loop exits promptly.
      const onAbort = () => {
        aborted = true;
        reader.cancel().catch(() => {});
      };
      controller.signal.addEventListener("abort", onAbort);

      try {
        while (!done) {
          const { value, done: d } = await reader.read();
          if (d) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                acc += delta;
                const snapshot = acc;
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = { ...last, content: snapshot };
                  }
                  return copy;
                });
                scheduleScroll(true);
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
      } finally {
        controller.signal.removeEventListener("abort", onAbort);
      }

      // If the user stopped the stream, finalize the partial message with a marker.
      if (aborted) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            const finalized = (last.content || "").trimEnd();
            copy[copy.length - 1] = {
              ...last,
              content: finalized ? `${finalized}${STOPPED_SUFFIX}` : STOPPED_PLACEHOLDER,
            };
          }
          return copy;
        });
        setFollowups(["Continue", "Try a different question", "Start over"]);
      } else {
        // After streaming completes normally, set context-aware follow-up chips
        setFollowups(followupsFor(acc));
      }
    } catch (e: unknown) {
      const isAbort =
        (e instanceof DOMException && e.name === "AbortError") ||
        (typeof e === "object" && e !== null && "name" in e && (e as { name?: string }).name === "AbortError");
      if (isAbort) {
        // Already handled above (or aborted before any tokens arrived).
        if (!acc) {
          setMessages((prev) => [...prev, { role: "assistant", content: "_(stopped)_" }]);
        }
      } else {
        console.error(e);
        appendAssistant("Network hiccup — try again.");
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreaming(false);
    }
  };

  const appendAssistant = (content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  };

  const showQuickPrompts = messages.length === 1 && !loading;
  const chips = showQuickPrompts ? initialQuickPrompts : followups;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button
        aria-label="Close coach"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative w-full max-w-[430px] h-[92vh] bg-[color:var(--cream)] rounded-t-[28px] shadow-elev-lg flex flex-col animate-slide-up-panel"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="bg-gradient-cta text-white px-5 py-4 rounded-t-[28px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>🧠</span>
            <div>
              <div className="font-display text-[20px] leading-none">Your Coach</div>
              <div className="text-[10px] text-white/70 mt-1.5 uppercase tracking-widest">
                Powered by AI
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full grid place-items-center bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        >
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <Bubble
                key={i}
                role={m.role}
                content={m.content}
                isStreaming={streaming && isLast && m.role === "assistant"}
              />
            );
          })}
          {loading && !streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-[12px] text-[color:var(--ink-mid)] pl-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
            </div>
          )}
        </div>

        {/* Quick prompts / follow-ups */}
        {chips.length > 0 && (
          <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {chips.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white border border-[color:var(--cream-border)] text-[12px] text-[color:var(--ink-mid)] hover:border-[color:var(--forest)] hover:text-[color:var(--forest)] transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" /> {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[color:var(--cream-border)] bg-white p-3 flex items-center gap-2">
          <textarea
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask your coach..."
            className="flex-1 resize-none bg-transparent border-0 outline-none text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)] py-2 px-2 max-h-[120px]"
          />
          {loading ? (
            <button
              onClick={stop}
              className="h-10 w-10 rounded-full bg-[color:var(--ink)] grid place-items-center text-white shadow-elev-sm active:scale-95 ease-luxury transition-transform"
              aria-label="Stop generating"
              title="Stop"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="h-10 w-10 rounded-full bg-gradient-cta grid place-items-center text-white shadow-elev-sm disabled:opacity-50 active:scale-95 ease-luxury transition-transform"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  isStreaming = false,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex animate-fade-up", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-[color:var(--forest)] text-white rounded-[20px] rounded-br-[4px]"
            : "bg-white border border-[color:var(--cream-border)] text-[color:var(--ink)] rounded-[20px] rounded-bl-[4px] shadow-elev-sm",
        )}
      >
        {content ? (
          <>
            {content}
            {isStreaming && (
              <span
                aria-hidden
                className="inline-block w-[2px] h-[1em] align-[-2px] ml-0.5 bg-[color:var(--forest)]/70 animate-pulse"
              />
            )}
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-[color:var(--forest)]/70">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
          </span>
        )}
      </div>
    </div>
  );
}
