import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

import { AuthProvider } from "@/hooks/useAuth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="mobile-shell flex flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-7xl font-black text-[color:var(--forest)]">404</div>
      <h2 className="mt-4 text-2xl font-display text-[color:var(--ink)]">Lost in the woods</h2>
      <p className="mt-2 text-[15px] text-[color:var(--ink-mid)]">
        That page doesn’t exist. Let’s get you back on track.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex items-center justify-center h-12 px-8 rounded-[20px] bg-gradient-cta text-white font-semibold shadow-elev-cta"
      >
        Back to home
      </a>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1C3A2A" },
      { title: "NutriAI — Eat smarter. Live longer." },
      { name: "description", content: "AI-powered nutrition coach. Track meals, hit your macros, and live longer with NutriAI." },
      { name: "author", content: "NutriAI" },
      { property: "og:title", content: "NutriAI — Eat smarter. Live longer." },
      { property: "og:description", content: "AI-powered nutrition coach. Personalised meal scoring, macro tracking and longevity insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
