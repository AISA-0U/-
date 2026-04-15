import { useState, useEffect } from "react";
import { AgentWorkspace } from "./components/AgentWorkspace";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "next-themes";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <AgentWorkspace />
        <Toaster position="top-right" />
      </div>
    </ThemeProvider>
  );
}
