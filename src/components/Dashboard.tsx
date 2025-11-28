import { StatsCard } from "./StatsCard";
import { TranscriptionList } from "./TranscriptionList";
import { SidebarSection } from "../lib/types";

interface DashboardProps {
  onNavigate: (section: SidebarSection) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  // Mock data for now, replace with real data later
  const transcriptions = [
    {
      id: "1",
      text: "Okay. So I'm recording. Let's see how well this does.",
      date: "Nov 13, 2025",
    },
    {
      id: "2",
      text: "I want you to help me fix a few things. One is that it doesn't let me single key as a keyboard shortcut.",
      date: "Nov 13, 2025",
    },
    {
      id: "3",
      text: "Okay. Nice. So let me just put this here. Okay. So it's oh, okay. I'll do it here.",
      date: "Nov 7, 2025",
    },
    {
      id: "4",
      text: "It just wants to know if it can control, my clipboard or something. So if I I'm testing it out now down here. So I'm gonna",
      date: "Nov 7, 2025",
    },
    {
      id: "5",
      text: "So I'm testing this out. Let's see how this",
      date: "Nov 7, 2025",
    },
  ];

  return (
    <div className="flex-1 p-12 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-end mb-12 animate-reveal">
        <div>
          <h1 className="text-6xl font-serif font-light text-primary tracking-tight leading-[0.9]">
            Welcome back,
            <br />
            <span className="italic font-medium">Sam</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-md leading-relaxed">
            Your voice has been productive today. Here is your daily overview.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 mb-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-wider font-semibold">
            <span className="material-symbols-outlined text-lg">schedule</span>
            <span>0m today</span>
          </div>
          <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg shadow-primary/20">
            186 credits
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 animate-reveal delay-100">
        <StatsCard label="Total Transcriptions" value="13" />
        <StatsCard label="Hours Transcribed" value="< 1" />
        <StatsCard label="This Week" value="3" />
      </div>

      <div className="animate-reveal delay-200">
        <TranscriptionList transcriptions={transcriptions} />
      </div>
    </div>
  );
}
