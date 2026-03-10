import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FolderOpen,
  Loader2,
  MessageSquareWarning,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type SessionSummary } from "@/lib/api";
import { formatScenarioIdAsProjectName, resolveProjectName } from "@/lib/projects";
import { useAppStore } from "@/store";

type ProjectSnapshot = ReturnType<typeof useAppStore.getState>["projectStates"][string];

type ProjectSummary = {
  scenarioId: string;
  label: string;
  snapshot?: ProjectSnapshot;
  sessions: SessionSummary[];
  lastSessionAt: string | null;
  latestScore: number | null;
  latestWeaknesses: string[];
};

function formatDate(value?: string | null): string {
  if (!value) return "No sessions yet";

  const date = new Date(value);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatModeLabel(mode?: ProjectSnapshot["contextSetup"]["mode"]): string {
  switch (mode) {
    case "demo":
      return "Demo";
    case "synthetic":
      return "Synthetic";
    case "upload":
      return "Upload";
    default:
      return "History";
  }
}

function scoreVariant(score: number | null): "default" | "secondary" | "warning" | "destructive" {
  if (score === null) return "secondary";
  if (score >= 75) return "default";
  if (score >= 50) return "warning";
  return "destructive";
}

function latestSessionSummary(sessions: SessionSummary[]): SessionSummary | null {
  if (sessions.length === 0) return null;

  return [...sessions].sort((a, b) => {
    const left = a.created_at ? new Date(a.created_at).getTime() : 0;
    const right = b.created_at ? new Date(b.created_at).getTime() : 0;
    return right - left;
  })[0] ?? null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activatingProjectId, setActivatingProjectId] = useState<string | null>(null);

  const activeProjectId = useAppStore((state) => state.contextSetup.scenarioId);
  const activeProjectName = useAppStore((state) =>
    resolveProjectName({
      scenarioId: state.contextSetup.scenarioId,
      clientName: state.contextSetup.clientName || state.briefing.clientProfile.name,
    })
  );
  const projectStates = useAppStore((state) => state.projectStates);
  const activateProject = useAppStore((state) => state.activateProject);
  const setBriefing = useAppStore((state) => state.setBriefing);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    api.listSessions()
      .then((data) => {
        if (!cancelled) {
          setSessions(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load project history.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sessionsByProject = useMemo(() => {
    return sessions.reduce<Record<string, SessionSummary[]>>((acc, session) => {
      const scenarioId = session.scenario_id || session.project_id;
      if (!scenarioId) return acc;

      acc[scenarioId] = [...(acc[scenarioId] ?? []), session];
      return acc;
    }, {});
  }, [sessions]);

  const projects = useMemo<ProjectSummary[]>(() => {
    const scenarioIds = new Set([
      ...Object.keys(projectStates),
      ...Object.keys(sessionsByProject),
    ]);

    return Array.from(scenarioIds)
      .map((scenarioId) => {
        const snapshot = projectStates[scenarioId];
        const projectSessions = sessionsByProject[scenarioId] ?? [];
        const latestSession = latestSessionSummary(projectSessions);

        return {
          scenarioId,
          label: resolveProjectName({
            scenarioId,
            clientName: snapshot?.contextSetup.clientName || snapshot?.briefing.clientProfile.name,
            fallbackName: latestSession?.scenario_name ?? null,
          }),
          snapshot,
          sessions: projectSessions,
          lastSessionAt: latestSession?.created_at ?? null,
          latestScore: latestSession?.overall_score ?? null,
          latestWeaknesses: latestSession?.weaknesses ?? [],
        };
      })
      .sort((left, right) => {
        if (left.scenarioId === activeProjectId) return -1;
        if (right.scenarioId === activeProjectId) return 1;

        const leftTime = left.lastSessionAt ? new Date(left.lastSessionAt).getTime() : 0;
        const rightTime = right.lastSessionAt ? new Date(right.lastSessionAt).getTime() : 0;

        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }

        return left.label.localeCompare(right.label);
      });
  }, [activeProjectId, projectStates, sessionsByProject]);

  const handleActivateProject = async (project: ProjectSummary) => {
    setActivatingProjectId(project.scenarioId);
    setLoadError(null);

    try {
      if (project.snapshot) {
        activateProject(project.scenarioId);
        navigate("/briefing");
        return;
      }

      const briefingData = await api.loadScenario(project.scenarioId);
      const { scenario_id, ...pureBriefing } = briefingData;

      activateProject(scenario_id, {
        mode: "synthetic",
        clientName: briefingData.clientProfile.name || project.label,
      });
      setBriefing(pureBriefing);
      navigate("/briefing");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to activate project.");
    } finally {
      setActivatingProjectId(null);
    }
  };

  const trackedProjects = projects.length;
  const projectsWithResearch = projects.filter((project) => project.snapshot?.briefing.clientResearch).length;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compressed project cards with expandable briefing, research, and practice history.
          </p>
        </div>
        <Button onClick={() => navigate("/")} className="rounded-xl self-start lg:self-auto">
          Create Project
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tracked</p>
            <p className="mt-2 text-3xl font-semibold">{trackedProjects}</p>
            <p className="mt-1 text-sm text-muted-foreground">Projects in local memory or session history.</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active</p>
            <p className="mt-2 text-xl font-semibold">{activeProjectId ? activeProjectName : "None selected"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Current workspace in the training flow.</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Research Ready</p>
            <p className="mt-2 text-3xl font-semibold">{projectsWithResearch}</p>
            <p className="mt-1 text-sm text-muted-foreground">Projects with saved company research.</p>
          </CardContent>
        </Card>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Session history could not be fully loaded: {loadError}
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="p-0">
          {loading && trackedProjects === 0 ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/45" />
              <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate a client or load the demo scenario to start building a reusable project list.
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {projects.map((project) => {
                const snapshot = project.snapshot;
                const briefing = snapshot?.briefing;
                const context = snapshot?.contextSetup;
                const performance = snapshot?.performance;
                const session = snapshot?.sparringSession;
                const isActive = project.scenarioId === activeProjectId;

                return (
                  <AccordionItem
                    key={project.scenarioId}
                    value={project.scenarioId}
                    className="border-b border-border last:border-b-0"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline">
                      <div className="flex flex-1 flex-col gap-4 text-left lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold text-foreground">
                                {project.label}
                              </span>
                              {isActive && (
                                <Badge variant="success" className="rounded-lg px-2 py-0 text-[10px] uppercase tracking-wider">
                                  Active
                                </Badge>
                              )}
                              <Badge variant="secondary" className="rounded-lg px-2 py-0 text-[10px] uppercase tracking-wider">
                                {formatModeLabel(context?.mode)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {context?.industry || formatScenarioIdAsProjectName(project.scenarioId) || "Scenario"} · Last activity {formatDate(project.lastSessionAt)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4 lg:w-[24rem]">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Sessions</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{project.sessions.length}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Score</p>
                            <div className="mt-1">
                              <Badge variant={scoreVariant(project.latestScore)} className="rounded-lg px-2 py-0 font-mono text-[10px]">
                                {project.latestScore ?? "N/A"}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Persona</p>
                            <p className="mt-1 truncate text-sm text-foreground">
                              {briefing?.clientProfile.buyerPersona || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Objections</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{briefing?.objections.length ?? 0}</p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-5 pb-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Client Snapshot</h3>
                          </div>
                          {snapshot ? (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <InfoRow label="Company" value={briefing?.clientProfile.name || project.label} />
                              <InfoRow label="Industry" value={context?.industry || "Not specified"} />
                              <InfoRow label="Company Size" value={briefing?.clientProfile.size || "Not specified"} />
                              <InfoRow label="Buyer Persona" value={briefing?.clientProfile.buyerPersona || "Not specified"} />
                              <InfoRow label="Budget Cycle" value={briefing?.clientProfile.budgetCycle || "Not specified"} />
                              <InfoRow label="Decision Timeline" value={briefing?.clientProfile.decisionTimeline || "Not specified"} />
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                              Stored briefing details are not available locally for this project yet.
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold">Opportunity Framing</h3>
                          </div>
                          {snapshot ? (
                            <div className="mt-4 space-y-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Value Proposition</p>
                                <p className="mt-1 text-sm leading-relaxed text-foreground">{briefing?.valueProposition || "No value proposition saved."}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pain Points</p>
                                <p className="mt-1 text-sm leading-relaxed text-foreground">{context?.painPoints || "No explicit pain points captured."}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                              Activate the project to reload its briefing and opportunity notes.
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-amber-600" />
                            <h3 className="text-sm font-semibold">Constraints And Objections</h3>
                          </div>
                          {snapshot ? (
                            <div className="mt-4 grid gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Buying Constraints</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(briefing?.buyingConstraints ?? []).length > 0 ? (
                                    briefing?.buyingConstraints.map((constraint) => (
                                      <Badge key={constraint} variant="secondary" className="rounded-lg px-2 py-1 text-[11px] font-normal">
                                        {constraint}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No buying constraints saved.</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Objection Coverage</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(briefing?.objections ?? []).length > 0 ? (
                                    briefing?.objections.map((objection) => (
                                      <Badge key={objection.id} variant="outline" className="rounded-lg px-2 py-1 text-[11px] font-normal">
                                        {objection.title}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No objections saved.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                              History is available, but the underlying objection set is not cached locally.
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-sky-600" />
                            <h3 className="text-sm font-semibold">Research And Practice Status</h3>
                          </div>
                          <div className="mt-4 space-y-4">
                            {briefing?.clientResearch ? (
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Company Research</p>
                                <p className="mt-1 text-sm leading-relaxed text-foreground">
                                  {briefing.clientResearch.summary}
                                </p>
                                {briefing.clientResearch.sources.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {briefing.clientResearch.sources.map((source) => (
                                      <a
                                        key={source.url}
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary underline-offset-4 hover:underline"
                                      >
                                        {source.title}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No saved company research for this project yet.</p>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                              <InfoRow
                                label="Difficulty"
                                value={session?.difficulty ? session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1) : "Not started"}
                              />
                              <InfoRow label="Transcript Turns" value={String(session?.messages.length ?? 0)} />
                              <InfoRow label="Latest Score" value={project.latestScore === null ? "Not evaluated" : String(project.latestScore)} />
                              <InfoRow label="Last Session" value={formatDate(project.lastSessionAt)} />
                            </div>

                            {project.latestWeaknesses.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Latest Coaching Flags</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {project.latestWeaknesses.map((weakness) => (
                                    <Badge key={weakness} variant="warning" className="rounded-lg px-2 py-1 text-[11px] font-normal">
                                      {weakness}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <details className="mt-4 rounded-2xl border border-border bg-muted/10">
                          <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Company Research
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">Click to expand</span>
                          </summary>
                          <div className="px-4 pb-4 pt-1 space-y-4 text-sm">
                            {briefing?.clientResearch ? (
                              <>
                                {briefing.clientResearch.summary && (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Executive Summary
                                    </p>
                                    <p className="mt-1 leading-relaxed text-foreground">
                                      {briefing.clientResearch.summary}
                                    </p>
                                  </div>
                                )}
                                {briefing.clientResearch.keyFacts?.length > 0 && (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Key Facts
                                    </p>
                                    <ul className="mt-1 list-disc list-inside space-y-1 text-muted-foreground">
                                      {briefing.clientResearch.keyFacts.map((fact, idx) => (
                                        <li key={idx}>{fact}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {briefing.clientResearch.strategicPriorities?.length > 0 && (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Strategic Priorities
                                    </p>
                                    <ul className="mt-1 list-disc list-inside space-y-1 text-muted-foreground">
                                      {briefing.clientResearch.strategicPriorities.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {briefing.clientResearch.potentialPainPoints?.length > 0 && (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Potential Pain Points
                                    </p>
                                    <ul className="mt-1 list-disc list-inside space-y-1 text-muted-foreground">
                                      {briefing.clientResearch.potentialPainPoints.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {briefing.clientResearch.sources?.length > 0 && (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Sources
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {briefing.clientResearch.sources.map((source) => (
                                        <a
                                          key={source.url}
                                          href={source.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-primary underline-offset-4 hover:underline"
                                        >
                                          {source.title}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No saved company research for this project yet.
                              </p>
                            )}
                          </div>
                        </details>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          onClick={() => void handleActivateProject(project)}
                          disabled={activatingProjectId === project.scenarioId}
                          className="rounded-xl"
                        >
                          {activatingProjectId === project.scenarioId ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Opening Project
                            </>
                          ) : (
                            <>
                              {isActive ? "Open Briefing" : "Set Active And Open"}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <Button variant="outline" onClick={() => navigate("/history")} className="rounded-xl">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          View Session History
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {!loading && projects.length > 0 && projects.every((project) => !project.snapshot) && (
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <MessageSquareWarning className="mr-2 inline h-4 w-4 align-text-bottom" />
          These projects came from session history only. Opening one will reload its briefing from the backend before making it active.
        </div>
      )}
    </div>
  );
}
