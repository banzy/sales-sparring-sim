import { useEffect } from "react";
import { TrendingUp, TrendingDown, MessageSquare, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store";
import { api } from "@/lib/api";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function Performance() {
  const { performance, sparringSession, setPerformance } = useAppStore();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hasError, setHasError] = useState(false);
  // @ts-ignore
  const scenarioId = useAppStore(state => state.contextSetup.scenarioId);

  const shouldEvaluate = performance.overallScore === 0 && !!scenarioId && sparringSession.messages.length > 0;

  useEffect(() => {
    async function evaluate() {
      if (!shouldEvaluate) return;

      setIsEvaluating(true);
      setHasError(false);
      try {
        const result = await api.evaluateSession(scenarioId, sparringSession.messages);
        setPerformance({
          overallScore: result.overallScore,
          objectionHandling: result.objectionHandling,
          communicationClarity: result.communicationClarity,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          aiFeedback: result.aiFeedback,
        });

        // Use the returned nextDifficulty to update local store difficulty
        useAppStore.setState(state => ({
          sparringSession: {
            ...state.sparringSession,
            // @ts-ignore
            difficulty: result.nextDifficulty || state.sparringSession.difficulty
          }
        }));
      } catch (err) {
        console.error("Evaluation failed:", err);
        setHasError(true);
      } finally {
        setIsEvaluating(false);
      }
    }

    evaluate();
  }, [performance.overallScore, setPerformance, scenarioId, sparringSession.messages, shouldEvaluate]);

  if (isEvaluating || shouldEvaluate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center animate-pulse-slow">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">AI Coach Analyzing Transcript...</h2>
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
          <h2 className="text-xl font-semibold text-destructive">Evaluation Failed</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            There was an error while analyzing your transcript. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (performance.overallScore === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">No Performance Data</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Complete a session in the Sparring Arena to see your performance and history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Session Debrief</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Performance analysis from your sparring session with <span className="font-medium text-foreground">{sparringSession.currentPersona.name}</span>.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold font-mono text-primary">{performance.overallScore}</div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Overall Score</p>
            <Progress value={performance.overallScore} className="mt-4 h-1.5 rounded-full" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold font-mono text-foreground">{performance.objectionHandling}</div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Objection Handling</p>
            <Progress value={performance.objectionHandling} className="mt-4 h-1.5 rounded-full" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold font-mono text-foreground">{performance.communicationClarity}</div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Communication Clarity</p>
            <Progress value={performance.communicationClarity} className="mt-4 h-1.5 rounded-full" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.strengths.map((s, i) => (
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
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weaknesses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Coach Feedback</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <p>{performance.aiFeedback}</p>
        </CardContent>
      </Card>

      <Alert className="border-border bg-muted/50 rounded-2xl">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm font-semibold">Agent Memory Updated</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground mt-1">
          Next session difficulty will be increased to <Badge variant="secondary" className="font-mono text-[10px] mx-1 rounded-lg">
            {sparringSession.difficulty === 'beginner' ? 'Intermediate' :
              sparringSession.difficulty === 'intermediate' ? 'Advanced' : 'Adversarial'}
          </Badge>.
          The agent will push harder on <span className="font-medium text-foreground">pricing objections</span> and
          <span className="font-medium text-foreground"> ROI quantification</span>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
