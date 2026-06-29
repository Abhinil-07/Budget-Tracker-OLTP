import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

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

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden">
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
