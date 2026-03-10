import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type SessionDetail, type SessionSummary } from "@/lib/api";
import { useAppStore } from "@/store";

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function scoreBadgeVariant(score: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (score === null) return "secondary";
  if (score >= 75) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function formatScenarioIdFallback(scenarioId: string): string {
  if (scenarioId === "demo-smartwings-123") {
    return "SmartWings";
  }

  const normalized = scenarioId
    .replace(/^demo-/, "")
    .replace(/^scenario_/, "")
    .replace(/[-_][a-f0-9]{8}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  if (!normalized) {
    return scenarioId;
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

// ─── Session List Item ──────────────────────────────────────────────────────

function SessionCard({
  session,
  isActive,
  onClick,
}: {
  session: SessionSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${isActive
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-transparent hover:border-border hover:bg-muted/50"
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground">#{shortId(session.id)}</span>
        <Badge variant={scoreBadgeVariant(session.overall_score)} className="font-mono text-[10px] rounded-lg tabular-nums">
          {session.overall_score ?? "—"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3 shrink-0" />
        {formatDate(session.created_at)}
      </p>
    </button>
  );
}

// ─── Transcript toggle ──────────────────────────────────────────────────────

function TranscriptAccordion({ transcript }: { transcript: SessionDetail["transcript"] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Transcript ({transcript.length} turns)
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border/60">
          {transcript.map((msg, i) => (
            <div key={i} className={`px-4 py-3 text-sm ${msg.role === "buyer" ? "bg-muted/30" : ""}`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wider mr-2 ${msg.role === "buyer" ? "text-destructive/70" : "text-primary"}`}>
                {msg.role}
              </span>
              <span className="text-muted-foreground leading-relaxed">{msg.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail panel ───────────────────────────────────────────────────────────

function SessionDetailPanel({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDetail(null);
    api.getSession(sessionId).then(d => {
      if (!cancelled) setDetail(d);
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading session…</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Failed to load session details.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Session #{shortId(detail.id)}</h2>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" />
          {formatDate(detail.created_at)}
        </p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Overall", value: detail.overall_score },
          { label: "Objections", value: detail.objection_handling },
          { label: "Clarity", value: detail.communication_clarity },
        ].map(({ label, value }) => (
          <Card key={label} className="glass-card">
            <CardContent className="pt-4 pb-3 text-center">
              <div className={`text-3xl font-bold font-mono ${scoreColor(value)}`}>
                {value ?? "—"}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
              <Progress value={value ?? 0} className="mt-2 h-1 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weaknesses */}
      {detail.weaknesses.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Weaknesses
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <TranscriptAccordion transcript={detail.transcript} />
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { contextSetup, activateProject } = useAppStore();
  const activeProjectId = contextSetup.scenarioId;

  useEffect(() => {
    api.listSessions().then(list => {
      setSessions(list);
      if (list.length > 0) setSelectedId(list[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Group sessions by project id
  const groupedSessions = sessions.reduce((acc, curr) => {
    const pid = curr.scenario_id || "Unknown Project";
    if (!acc[pid]) {
      acc[pid] = {
        label: curr.scenario_name || formatScenarioIdFallback(pid),
        sessions: [],
      };
    }
    acc[pid].sessions.push(curr);
    return acc;
  }, {} as Record<string, { label: string; sessions: SessionSummary[] }>);

  const projectIds = Object.keys(groupedSessions);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left — session list */}
      <aside className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-sm font-semibold">Session History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} pitch{sessions.length !== 1 ? "es" : ""} recorded across {projectIds.length} project{projectIds.length !== 1 ? "s" : ""}</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {loading && (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            )}
            {!loading && sessions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-10 px-4">
                No sessions yet. Complete a sparring session to see history here.
              </p>
            )}

            {projectIds.map(pid => (
              <div key={pid} className="mb-4">
                <div className="flex items-center justify-between px-2 py-2 mb-1">
                  <span className="uppercase tracking-wider w-36 truncate" style={{ color: 'rgba(108, 111, 117, 1)', fontWeight: 800, fontSize: '13px' }}>
                    {groupedSessions[pid].label}
                  </span>
                  {activeProjectId === pid ? (
                    <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-widest">
                      Active
                    </Badge>
                  ) : (
                    <button
                      onClick={() => {
                        activateProject(pid, { clientName: groupedSessions[pid].label });
                        navigate("/arena");
                      }}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Set Active
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {groupedSessions[pid].sessions.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      isActive={s.id === selectedId}
                      onClick={() => setSelectedId(s.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Right — detail */}
      <main className="flex-1 overflow-auto">
        {selectedId ? (
          <SessionDetailPanel key={selectedId} sessionId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {loading ? "" : "Select a session to view details."}
          </div>
        )}
      </main>
    </div>
  );
}
