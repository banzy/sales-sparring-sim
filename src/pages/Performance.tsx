import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppStore } from '@/store';
import type { SparringSession } from '@/store';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function Performance() {
  const { performance, sparringSession, setPerformance } = useAppStore();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalPerformance, setGlobalPerformance] = useState<{
    sessionsCount: number;
    overallScore: number;
    objectionHandling: number;
    communicationClarity: number;
    relevance: number;
    groundedness: number;
    strengths: string[];
    weaknesses: string[];
  } | null>(null);
  const scenarioId = useAppStore((state) => state.contextSetup.scenarioId);

  const hasEvaluationData =
    performance.aiFeedback.trim().length > 0 ||
    performance.evolutionAnalysis.trim().length > 0 ||
    performance.strengths.length > 0 ||
    performance.weaknesses.length > 0 ||
    performance.nextFocusAreas.length > 0;
  const hasSellerMessage = sparringSession.messages.some(
    (message) => message.role === 'seller',
  );
  const hasMeaningfulTranscript =
    sparringSession.sessionStats.exchanges > 0 && hasSellerMessage;
  const shouldEvaluate =
    !hasEvaluationData && !!scenarioId && hasMeaningfulTranscript;

  useEffect(() => {
    async function evaluate() {
      if (!shouldEvaluate) return;

      setIsEvaluating(true);
      setHasError(false);
      try {
        const result = await api.evaluateSession(
          scenarioId,
          sparringSession.messages,
        );
        setPerformance({
          overallScore: result.overallScore,
          objectionHandling: result.objectionHandling,
          communicationClarity: result.communicationClarity,
          clarity: result.clarity,
          relevance: result.relevance,
          groundedness: result.groundedness,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          aiFeedback: result.aiFeedback,
          evolutionAnalysis: result.evolutionAnalysis,
          nextFocusAreas: result.nextFocusAreas || [],
        });

        // Use the returned nextDifficulty to update local store difficulty
        useAppStore.setState((state) => ({
          sparringSession: {
            ...state.sparringSession,
            difficulty: (() => {
              const allowed: SparringSession['difficulty'][] = [
                'beginner',
                'intermediate',
                'advanced',
                'adversarial',
              ];
              const next = result.nextDifficulty;
              return allowed.includes(
                next as SparringSession['difficulty'],
              )
                ? (next as SparringSession['difficulty'])
                : state.sparringSession.difficulty;
            })(),
          },
        }));
      } catch (err) {
        console.error('Evaluation failed:', err);
        setHasError(true);
      } finally {
        setIsEvaluating(false);
      }
    }

    evaluate();
  }, [
    performance.overallScore,
    setPerformance,
    scenarioId,
    sparringSession.messages,
    shouldEvaluate,
  ]);

  useEffect(() => {
    async function loadGlobal() {
      if (hasEvaluationData || !scenarioId || hasMeaningfulTranscript) return;
      setIsLoadingGlobal(true);
      setGlobalError(null);
      try {
        const result = await api.getGlobalPerformance(scenarioId);
        setGlobalPerformance(result);
      } catch (err) {
        console.error('Global performance load failed:', err);
        setGlobalError('Could not load past performance.');
      } finally {
        setIsLoadingGlobal(false);
      }
    }

    loadGlobal();
  }, [hasEvaluationData, hasMeaningfulTranscript, scenarioId]);

  if (isEvaluating || shouldEvaluate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center animate-pulse-slow">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">
            AI Coach Analyzing Transcript...
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Evaluating objection handling, groundedness, and persuasion.
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-destructive">
            Evaluation Failed
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            There was an error while analyzing your transcript. Please try again
            later.
          </p>
        </div>
      </div>
    );
  }

  // Convert 0-100 backend values → "X.X" /10 for display
  function toTen(val: number): string {
    return (val / 10).toFixed(1);
  }

  function getScoreColors(value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    const score10 = clamped / 10; // 0–10 scale

    // 0 → dark red, 3 → bright red (no hue shift yet)
    if (score10 <= 3) {
      const t = score10 / 3; // 0–1
      const lightText = 35 + t * (60 - 35); // 35% → 60%
      const lightTrack = 30 + t * (55 - 30); // 30% → 55%
      const hue = 0; // pure red

      return {
        text: `hsl(${hue} 80% ${lightText}%)`,
        track: `hsl(${hue} 80% ${lightTrack}%)`,
      };
    }

    // Above 3, gradually move hue from red → green
    const t = (score10 - 3) / 7; // 0–1 for 3–10
    const hue = 0 + t * 120; // 0 (red) → 120 (green)
    const lightText = 60;
    const lightTrack = 55;

    return {
      text: `hsl(${hue} 80% ${lightText}%)`,
      track: `hsl(${hue} 80% ${lightTrack}%)`,
    };
  }

  const scores = hasEvaluationData
    ? {
        clarity: performance.clarity || performance.communicationClarity || 0,
        relevance: performance.relevance || Math.round(performance.overallScore * 0.9) || 0,
        groundedness: performance.groundedness || Math.round(performance.overallScore * 0.85) || 0,
        objectionHandling: performance.objectionHandling,
        overall: performance.overallScore,
      }
    : {
        clarity: globalPerformance?.communicationClarity ?? 0,
        relevance: globalPerformance?.relevance ?? 0,
        groundedness: globalPerformance?.groundedness ?? 0,
        objectionHandling: globalPerformance?.objectionHandling ?? 0,
        overall: globalPerformance?.overallScore ?? 0,
      };

  type ScoreMetric = { label: string; value: number };

  const scoreMetrics: ScoreMetric[] = [
    { label: 'Clarity',            value: scores.clarity },
    { label: 'Relevance',          value: scores.relevance },
    { label: 'Groundedness',       value: scores.groundedness },
    { label: 'Objection Handling', value: scores.objectionHandling },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {hasEvaluationData ? 'Session Debrief' : 'Global Performance'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {hasEvaluationData ? (
            <>
              Performance analysis from your sparring session with{' '}
              <span className="font-medium text-foreground">
                {sparringSession.currentPersona.name}
              </span>
              .
            </>
          ) : globalPerformance ? (
            <>
              Aggregated performance across{' '}
              <span className="font-medium text-foreground">
                {globalPerformance.sessionsCount}
              </span>{' '}
              past demo sessions.
            </>
          ) : null}
        </p>
      </div>

      {/* ── Session Scorecard ─────────────────────────────────────── */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Session Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            {/* Individual dimension metrics */}
            {scoreMetrics.map((m) => {
              const colors = getScoreColors(m.value);
              return (
                <div key={m.label} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold font-mono"
                      style={{ color: colors.text }}
                    >
                      {toTen(m.value)}
                    </span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{m.label}</p>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${m.value}%`,
                        backgroundColor: colors.track,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Overall – visually separated and highlighted */}
            {(() => {
              const overallColors = getScoreColors(scores.overall);
              return (
                <div className="flex flex-col gap-2 sm:border-l sm:border-border sm:pl-4">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold font-mono"
                      style={{ color: overallColors.text }}
                    >
                      {toTen(scores.overall)}
                    </span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <p className="text-xs font-extrabold text-foreground uppercase tracking-wide">Overall</p>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${scores.overall}%`,
                        backgroundColor: overallColors.track,
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* ── Strengths & Weaknesses ───────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Strengths
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(hasEvaluationData
              ? performance.strengths
              : globalPerformance?.strengths ?? []
            ).map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Weaknesses
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(hasEvaluationData
              ? performance.weaknesses
              : globalPerformance?.weaknesses ?? []
            ).map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {hasEvaluationData && (
        <>
          <Card className="glass-card !bg-yellow-400">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wide text-[rgba(65,71,83,1)]">
                  AI Coach Feedback
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-[rgba(65,71,83,1)] leading-relaxed">
              <p>{performance.aiFeedback}</p>
            </CardContent>
          </Card>

          {performance.evolutionAnalysis && (
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-primary/20 flex items-center justify-center">
                    <History className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    Evolution & History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-foreground leading-relaxed font-medium">
                <p>{performance.evolutionAnalysis}</p>
              </CardContent>
            </Card>
          )}

          <Alert className="border-border bg-muted/50 rounded-2xl">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm font-semibold">
              Agent Memory Updated
            </AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground mt-1">
              Next session difficulty will be increased to{' '}
              <Badge
                variant="secondary"
                className="font-mono text-[10px] mx-1 rounded-lg"
              >
                {sparringSession.difficulty === 'beginner'
                  ? 'Intermediate'
                  : sparringSession.difficulty === 'intermediate'
                    ? 'Advanced'
                    : 'Adversarial'}
              </Badge>
              . The agent will push harder on{' '}
              {performance.nextFocusAreas?.length > 0 ? (
                performance.nextFocusAreas.map((area, i) => (
                  <span key={area}>
                    <span className="font-medium text-foreground">{area}</span>
                    {i < performance.nextFocusAreas.length - 1 ? ' and ' : ''}
                  </span>
                ))
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    pricing objections
                  </span>{' '}
                  and
                  <span className="font-medium text-foreground">
                    {' '}
                    ROI quantification
                  </span>
                </>
              )}
              .
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
