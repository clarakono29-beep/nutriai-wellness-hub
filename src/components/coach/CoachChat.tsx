import { useEffect, useRef, useState } from "react";
import { Brain, Send, X, Loader2, Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useFoodLog } from "@/hooks/useFoodLog";
import { fmtKcal } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "What should I eat for dinner?",
  "How am I doing today?",
  "Best foods for my goal?",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-coach`;

export function CoachChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open nutrition coach"
        className="fixed right-4 bottom-[170px] z-30 h-12 w-12 rounded-full bg-gradient-cta text-white grid place-items-center shadow-elev-cta active:scale-95 ease-luxury transition-transform"
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi${profile?.name ? ` ${profile.name.split(" ")[0]}` : ""} — I'm your nutrition coach. Ask me anything about your day, your goal, or what to eat next.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = () => {
    const summary =
      logs.length === 0
        ? "no entries yet"
        : `${logs.length} items, ${fmtKcal(totals.calories)} kcal, ${Math.round(totals.protein)}g protein`;
    return {
      name: profile?.name,
      goal: profile?.goal,
      daily_calories: profile?.daily_calories,
      protein_target: profile?.protein_g,
      todays_log_summary: summary,
    };
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          user_context: buildContext(),
        }),
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

      // Add an empty assistant message we'll fill as tokens stream
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      let acc = "";

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
            }
          } catch {
            // partial JSON, push back
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      appendAssistant("Network hiccup — try again.");
    } finally {
      setLoading(false);
    }
  };

  const appendAssistant = (content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      <button
        aria-label="Close coach"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="relative w-full max-w-[430px] h-[92vh] bg-[color:var(--cream)] rounded-t-[28px] shadow-elev-lg flex flex-col animate-fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="bg-gradient-cta text-white px-5 py-4 rounded-t-[28px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <div>
              <div className="font-display text-[18px] leading-none">Your Nutrition Coach</div>
              <div className="text-[11px] text-white/70 mt-1 uppercase tracking-widest">
                Powered by Lovable AI
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-[12px] text-[color:var(--ink-mid)] pl-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((p) => (
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
            placeholder="Ask your coach anything…"
            className="flex-1 resize-none bg-transparent border-0 outline-none text-[15px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-light)] py-2 px-2 max-h-[120px]"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="h-11 w-11 rounded-full bg-gradient-cta grid place-items-center text-white shadow-elev-sm disabled:opacity-50 active:scale-95 ease-luxury transition-transform"
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-white border border-[color:var(--cream-border)] rounded-2xl rounded-br-sm text-[color:var(--ink)]"
            : "bg-[color:var(--sage-light)] text-[color:var(--forest)] rounded-2xl rounded-bl-sm",
        )}
      >
        {content || (
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
