import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Fragment, lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { Loading } from "./components/ui";
import { useLang } from "./lib/i18n";
import "./styles.css";

const Home = lazy(() => import("./pages/Home"));
const Overview = lazy(() => import("./pages/Overview"));
const Explorer = lazy(() => import("./pages/Explorer"));
const Skills = lazy(() => import("./pages/Skills"));
const Salary = lazy(() => import("./pages/Salary"));
const Geography = lazy(() => import("./pages/Geography"));
const Career = lazy(() => import("./pages/Career"));
const Compare = lazy(() => import("./pages/Compare"));
const Employers = lazy(() => import("./pages/Employers"));
const Trends = lazy(() => import("./pages/Trends"));
const Quality = lazy(() => import("./pages/Quality"));
const Builder = lazy(() => import("./pages/Builder"));
const Insights = lazy(() => import("./pages/Insights"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

// ECharts caches text widths; measuring with the fallback font clips axis labels
// once the faces arrive. Load them first (never wait more than 1.5 s): Geist for
// Latin, Readex Pro for Arabic (the stack falls through to it per glyph).
const fontReady = Promise.race([
  Promise.all(["400 12px", "500 12px"].flatMap((w) => [
    document.fonts?.load(`${w} "Geist Variable"`, "Aa"),
    document.fonts?.load(`${w} "Readex Pro Variable"`, "عر"),
  ])),
  new Promise((r) => setTimeout(r, 1500)),
]).catch(() => undefined);

/** Switching language remounts the views so every string, number and chart is rebuilt in it. */
function LangScope({ children }: { children: ReactNode }) {
  const [lang] = useLang();
  return <Fragment key={lang}>{children}</Fragment>;
}

await fontReady;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LangScope>
      <BrowserRouter>
        <Shell>
          <RouteErrorBoundary>
          <Suspense fallback={<Loading h={420} />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/market" element={<Overview />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/salary" element={<Salary />} />
              <Route path="/geography" element={<Geography />} />
              <Route path="/career" element={<Career />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/employers" element={<Employers />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/quality" element={<Quality />} />
              <Route path="/builder" element={<Builder />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </RouteErrorBoundary>
        </Shell>
      </BrowserRouter>
      </LangScope>
    </QueryClientProvider>
  </StrictMode>,
);
