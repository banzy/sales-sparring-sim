import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import ContextSetup from "./pages/ContextSetup";
import Projects from "./pages/Projects";
import Briefing from "./pages/Briefing";
import SparringArena from "./pages/SparringArena";
import Performance from "./pages/Performance";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<ContextSetup />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/briefing" element={<Briefing />} />
            <Route path="/arena" element={<SparringArena />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
