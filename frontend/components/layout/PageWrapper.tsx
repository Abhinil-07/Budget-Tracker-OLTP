import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  onAddTransactionClick?: () => void;
}

export default function PageWrapper({
  children,
  title,
  onAddTransactionClick,
}: PageWrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Polling backend /health endpoint to check server availability status
  const { error: healthError } = useQuery({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error("Unreachable");
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds to detect server outages
    retry: 1,
  });

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden">
      {/* Persistent Connection Outage Banner */}
      {healthError && (
        <div className="bg-danger text-white text-center py-2 px-4 text-xs font-semibold font-mono z-50 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-200 shrink-0 border-b border-danger/20 shadow-md">
          <AlertCircle className="h-4 w-4 shrink-0 animate-pulse" />
          <span>Connection Error: Unable to reach the backend service. Check your connection or server status.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar - sticky left / drawer overlay */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header - sticky top */}
          <Header
            title={title}
            onAddTransactionClick={onAddTransactionClick}
            onMenuClick={() => setIsSidebarOpen(true)}
          />

          {/* Scrollable Content Container */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#07090E]">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
