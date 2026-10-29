import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ReminderNotificationProvider } from "@/components/ReminderNotificationProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Notes = lazy(() => import("./pages/Notes"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Statuses = lazy(() => import("./pages/Statuses"));
const Rules = lazy(() => import("./pages/Rules"));
const Channels = lazy(() => import("./pages/Channels"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Objects = lazy(() => import("./pages/Objects"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OfflineBanner />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ReminderNotificationProvider>
              <ErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/statuses" element={<Statuses />} />
                    <Route path="/rules" element={<Rules />} />
                    <Route path="/channels" element={<Channels />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/objects" element={<Objects />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </ReminderNotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
