import React, { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  ArrowRight,
  Check,
  Copy,
  History as HistoryIcon,
  Languages,
  Mic,
  Sparkles,
  Star,
  Volume2,
  Clock3,
} from "lucide-react";
import { Button } from "./ui/Button";
import Badge from "./ui/Badge";
import { useSettings } from "../hooks/useSettings";
import type { HistoryEntry, SidebarSection } from "../lib/types";

interface DashboardProps {
  onNavigate?: (section: SidebarSection) => void;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  helper?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  helper,
}) => {
  return (
    <div className="bg-background border border-mid-gray/20 rounded-lg p-4 flex gap-3 items-start">
      <div className="h-10 w-10 rounded-lg bg-mid-gray/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-logo-stroke" />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase text-mid-gray tracking-wide">{label}</p>
        <div className="text-xl font-semibold leading-tight">{value}</div>
        {helper && <p className="text-xs text-mid-gray mt-1">{helper}</p>}
      </div>
    </div>
  );
};

interface SnapshotRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  dim?: boolean;
}

const SnapshotRow: React.FC<SnapshotRowProps> = ({
  icon: Icon,
  label,
  value,
  dim = false,
}) => (
  <div className="flex items-start gap-3">
    <div className="h-9 w-9 rounded-lg bg-mid-gray/10 flex items-center justify-center">
      <Icon className="w-4 h-4 text-logo-stroke" />
    </div>
    <div className="flex-1">
      <p className="text-[11px] uppercase text-mid-gray tracking-wide">
        {label}
      </p>
      <p className={`text-sm font-medium ${dim ? "text-mid-gray" : ""}`}>
        {value}
      </p>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { settings } = useSettings();
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadHistoryEntries = useCallback(async () => {
    try {
      const entries = await invoke<HistoryEntry[]>("get_history_entries");
      setHistoryEntries(entries);
    } catch (error) {
      console.error("Failed to load history entries:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryEntries();
  }, [loadHistoryEntries]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen("history-updated", loadHistoryEntries);
      } catch (error) {
        console.error("Failed to listen for history updates:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [loadHistoryEntries]);

  const savedCount = useMemo(
    () => historyEntries.filter((entry) => entry.saved).length,
    [historyEntries],
  );

  const recentEntries = useMemo(
    () =>
      [...historyEntries]
        .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
        .slice(0, 4),
    [historyEntries],
  );

  const lastTranscribed = useMemo(() => {
    if (historyEntries.length === 0) return null;
    const latest = historyEntries.reduce((latestEntry, current) =>
      current.timestamp > latestEntry.timestamp ? current : latestEntry,
    );
    return formatTimestamp(latest.timestamp);
  }, [historyEntries]);

  const historyLimit = settings?.history_limit ?? 5;
  const languageLabel = settings?.translate_to_english
    ? "Translate to English"
    : settings?.selected_language || "Auto";

  const copyTranscription = async (entry: HistoryEntry) => {
    try {
      await navigator.clipboard.writeText(
        entry.post_processed_text || entry.transcription_text,
      );
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (error) {
      console.error("Failed to copy transcription text:", error);
    }
  };

  const formatEntrySubtitle = (entry: HistoryEntry) => {
    const timestampLabel = formatTimestamp(entry.timestamp);
    const savedLabel = entry.saved ? "Saved" : "Recent";
    return `${timestampLabel} • ${savedLabel}`;
  };

  const trimmedText = (text: string) => {
    if (text.length <= 140) return text;
    return `${text.slice(0, 140)}…`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="bg-background border border-logo-primary/40 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase text-mid-gray tracking-wide">
              Handy overview
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-mid-gray max-w-xl">
              A quick glance at your recordings, favorites, and the setup Handy
              will use when you start talking.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => onNavigate?.("history")}>
                Open History
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onNavigate?.("general")}
              >
                General Settings
              </Button>
            </div>
          </div>
          <div className="self-start bg-mid-gray/10 border border-mid-gray/20 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-mid-gray">
            <Clock3 className="w-4 h-4" />
            {loadingHistory
              ? "Checking activity..."
              : lastTranscribed || "No recordings yet"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Mic}
          label="Recordings"
          value={historyEntries.length}
          helper="Total saved locally"
        />
        <StatCard
          icon={Star}
          label="Saved items"
          value={savedCount}
          helper="Favorites pinned in History"
        />
        <StatCard
          icon={HistoryIcon}
          label="History window"
          value={
            historyLimit === 0 ? "Unlimited" : `${historyLimit} entries kept`
          }
          helper="Manage retention in History settings"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-background border border-mid-gray/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-mid-gray tracking-wide">
                Recent transcriptions
              </p>
              <h2 className="text-lg font-semibold">Latest notes</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate?.("history")}
              className="flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          {loadingHistory ? (
            <div className="text-sm text-mid-gray py-6 text-center">
              Loading history…
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="text-sm text-mid-gray py-6 text-center">
              No transcriptions yet. Start a recording to see it here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => {
                const wasCopied = copiedId === entry.id;
                return (
                  <button
                    key={entry.id}
                    className="w-full text-left border border-mid-gray/20 rounded-lg p-3 hover:border-logo-primary/70 hover:bg-mid-gray/10 transition-colors"
                    onClick={() => copyTranscription(entry)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {entry.title || "Untitled"}
                        </p>
                        <p className="text-xs text-mid-gray">
                          {formatEntrySubtitle(entry)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-mid-gray">
                        {entry.saved && <Badge className="text-[11px]">Saved</Badge>}
                        <div className="flex items-center gap-1">
                          {wasCopied ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm mt-2 leading-relaxed text-text">
                      {trimmedText(
                        entry.post_processed_text || entry.transcription_text,
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-background border border-mid-gray/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-mid-gray tracking-wide">
                Current setup
              </p>
              <h2 className="text-lg font-semibold">Ready to record</h2>
            </div>
            <Sparkles className="w-5 h-5 text-logo-stroke" />
          </div>
          <div className="space-y-3">
            <SnapshotRow
              icon={Mic}
              label="Microphone"
              value={settings?.selected_microphone || "Default"}
            />
            <SnapshotRow
              icon={Volume2}
              label="Output"
              value={settings?.selected_output_device || "Default"}
            />
            <SnapshotRow icon={Languages} label="Language" value={languageLabel} />
            <SnapshotRow
              icon={Sparkles}
              label="Post-processing"
              value={settings?.post_process_enabled ? "On" : "Off"}
              dim={!settings?.post_process_enabled}
            />
            <SnapshotRow
              icon={HistoryIcon}
              label="Always-on mic"
              value={settings?.always_on_microphone ? "Enabled" : "Shortcut to start"}
              dim={!settings?.always_on_microphone}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate?.("advanced")}
            className="w-full flex items-center justify-center gap-2"
          >
            Review setup <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatTimestamp = (timestamp: number) => {
  const value = typeof timestamp === "number" ? timestamp : Number(timestamp);
  if (!value) return "Unknown time";
  const date = new Date(value * 1000);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
