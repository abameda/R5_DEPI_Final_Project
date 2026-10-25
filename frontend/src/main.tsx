import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { Loading } from "./components/ui";
import "./styles.css";

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
// once Readex Pro arrives. Load the face first (never wait more than 1.5 s).
const fontReady = Promise.race([
  Promise.all(["400 12px", "500 12px"].map((w) => document.fonts?.load(`${w} "Readex Pro Variable"`))),
  new Promise((r) => setTimeout(r, 1500)),
]).catch(() => undefined);

await fontReady;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell>
          <RouteErrorBoundary>
          <Suspense fallback={<Loading h={420} />}>
            <Routes>
              <Route path="/" element={<Overview />} />
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
    </QueryClientProvider>
  </StrictMode>,
);
