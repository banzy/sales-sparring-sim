import { useEffect } from "react";
import { TrendingUp, TrendingDown, MessageSquare, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store";

export default function Performance() {
  const { performance, sparringSession, setPerformance } = useAppStore();
  
  useEffect(() => {
    if (performance.overallScore === 0) {
      setPerformance({
        overallScore: 72,
        objectionHandling: 58,
        communicationClarity: 85,
        strengths: [
          "Strong opening rapport and empathy-building",
          "Effective use of case studies to counter skepticism",
          "Good active listening — acknowledged buyer concerns before responding",
        ],
        weaknesses: [
          "Avoided direct pricing conversation when challenged",
          "Failed to quantify ROI with specific metrics",
          "Did not establish next-step commitment before session end",
        ],
        aiFeedback: 'Your conversational flow was strong — you built genuine rapport and showed empathy early. However, when the CFO pressed on pricing, you deflected rather than anchoring with a value-first framing. In future sessions, try the "Cost of Inaction" framework: quantify what the client loses each month by not switching, then position your price as an investment against that loss. Your communication clarity was excellent — keep leveraging concrete examples.',
      });
    }
  }, [performance.overallScore, setPerformance]);
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
