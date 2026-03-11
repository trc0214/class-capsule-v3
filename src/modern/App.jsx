import { useEffect } from "react";
import { NotesSection } from "./components/NotesSection";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { TranscriptSection } from "./components/TranscriptSection";
import { initLegacyApp } from "./initLegacyApp";

export function App() {
  useEffect(() => {
    document.body.className = "bg-zinc-100 text-ink antialiased";
    initLegacyApp().catch((error) => {
      console.error(error);
      window.alert(error.message);
    });
  }, []);

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(229,231,235,0.8)_45%,_rgba(212,212,216,0.75))]">
        <div className="mx-auto flex min-h-screen max-w-[1800px] gap-4 p-4 lg:p-6">
          <Sidebar />
          <div id="resizer-sidebar" className="resizer" data-resizer="sidebar"></div>
          <main id="mainArea" className="flex flex-1 min-h-[90vh] gap-0">
            <TranscriptSection />
            <div id="resizer-notes" className="resizer" data-resizer="notes"></div>
            <NotesSection />
          </main>
        </div>
      </div>

      <div id="toastContainer" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"></div>
      <SettingsDialog />
    </>
  );
}
