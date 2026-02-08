import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ReminderNotificationProvider } from "@/components/ReminderNotificationProvider";
import { ProtectedFeatureRoute } from "@/components/ProtectedFeatureRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Inbox from "./pages/Inbox";
import Contacts from "./pages/Contacts";
import Notes from "./pages/Notes";
import Statuses from "./pages/Statuses";
import Rules from "./pages/Rules";
import Channels from "./pages/Channels";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Objects from "./pages/Objects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ReminderNotificationProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/inbox" element={
                <ProtectedFeatureRoute feature="inbox">
                  <Inbox />
                </ProtectedFeatureRoute>
              } />
              <Route path="/contacts" element={
                <ProtectedFeatureRoute feature="contacts">
                  <Contacts />
                </ProtectedFeatureRoute>
              } />
              <Route path="/notes" element={
                <ProtectedFeatureRoute feature="notes">
                  <Notes />
                </ProtectedFeatureRoute>
              } />
              <Route path="/statuses" element={
                <ProtectedFeatureRoute feature="statuses">
                  <Statuses />
                </ProtectedFeatureRoute>
              } />
              <Route path="/rules" element={
                <ProtectedFeatureRoute feature="rules">
                  <Rules />
                </ProtectedFeatureRoute>
              } />
              <Route path="/channels" element={
                <ProtectedFeatureRoute feature="channels">
                  <Channels />
                </ProtectedFeatureRoute>
              } />
              <Route path="/settings" element={<Settings />} />
              <Route path="/objects" element={
                <ProtectedFeatureRoute feature="objects">
                  <Objects />
                </ProtectedFeatureRoute>
              } />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ReminderNotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
