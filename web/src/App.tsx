import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/context/AuthContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { TrustProvider } from "@/context/TrustContext";
import { OfflineProvider } from "@/context/OfflineContext";

import { AppLayout } from "@/components/app/AppLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieBanner } from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Public pages
import Landing from "./pages/public/Landing";
import Features from "./pages/public/Features";
import Pricing from "./pages/public/Pricing";
import About from "./pages/public/About";
import Faq from "./pages/public/Faq";
import Contact from "./pages/public/Contact";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import ForgotPassword from "./pages/public/ForgotPassword";
import Legal from "./pages/public/Legal";
import Cookies from "./pages/public/Cookies";

// App pages
import Dashboard from "./pages/app/Dashboard";
import Modules from "./pages/app/Modules";
import ModuleDetail from "./pages/app/ModuleDetail";
import Toolkits from "./pages/app/Toolkits";
import ToolkitDetail from "./pages/app/ToolkitDetail";
import PdfViewer from "./pages/app/PdfViewer";
import OnCall from "./pages/app/OnCall";
import SearchPage from "./pages/app/SearchPage";
import Bookmarks from "./pages/app/Bookmarks";
import Account from "./pages/app/Account";
import Billing from "./pages/app/Billing";
import OfflineStatus from "./pages/app/OfflineStatus";
import Disclaimer from "./pages/app/Disclaimer";
import Sources from "./pages/app/Sources";
import ReportClinical from "./pages/app/ReportClinical";
import ReportTechnical from "./pages/app/ReportTechnical";
import Admin from "./pages/app/Admin";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OfflineProvider>
        <TrustProvider>
          <LibraryProvider>
            <TooltipProvider>
              <Toaster richColors position="top-center" />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ErrorBoundary>
                  <ScrollToTop />
                  <Routes>
                    {/* Public marketing site */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/features" element={<Features />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/faq" element={<Faq />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/terms" element={<Legal kind="terms" />} />
                    <Route path="/privacy" element={<Legal kind="privacy" />} />
                    <Route path="/legal-disclaimer" element={<Legal kind="disclaimer" />} />
                    <Route path="/cookies" element={<Cookies />} />

                    {/* Authenticated clinical application */}
                    <Route path="/app" element={<AppLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="modules" element={<Modules />} />
                      <Route path="modules/:slug" element={<ModuleDetail />} />
                      <Route path="toolkits" element={<Toolkits />} />
                      <Route path="toolkits/:slug" element={<ToolkitDetail />} />
                      <Route path="pdf-viewer" element={<PdfViewer />} />
                      <Route path="on-call" element={<OnCall />} />
                      <Route path="search" element={<SearchPage />} />
                      <Route path="bookmarks" element={<Bookmarks />} />
                      <Route path="account" element={<Account />} />
                      <Route path="billing" element={<Billing />} />
                      <Route path="offline" element={<OfflineStatus />} />
                      <Route path="disclaimer" element={<Disclaimer />} />
                      <Route path="sources" element={<Sources />} />
                      <Route path="report/clinical" element={<ReportClinical />} />
                      <Route path="report/technical" element={<ReportTechnical />} />
                      <Route path="admin" element={<Admin />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <CookieBanner />
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </LibraryProvider>
        </TrustProvider>
      </OfflineProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
