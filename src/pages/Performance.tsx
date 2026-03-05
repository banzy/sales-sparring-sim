import { TrendingUp, TrendingDown, MessageSquare, Shield, BarChart3, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const strengths = [
  "Strong opening rapport and empathy-building",
  "Effective use of case studies to counter skepticism",
  "Good active listening — acknowledged buyer concerns before responding",
];

const weaknesses = [
  "Avoided direct pricing conversation when challenged",
  "Failed to quantify ROI with specific metrics",
  "Did not establish next-step commitment before session end",
];

export default function Performance() {
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Session Debrief</h1>
        <p className="text-muted-foreground mt-1">
          Performance analysis from your sparring session with <span className="font-medium text-foreground">Skeptical CFO</span>.
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="glass-card glow-primary">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold font-mono text-primary">72</div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Overall Score</p>
            <Progress value={72} className="mt-4 h-1.5" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold font-mono text-foreground">58</div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Objection Handling</p>
            <Progress value={58} className="mt-4 h-1.5" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold font-mono text-foreground">85</div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Communication Clarity</p>
            <Progress value={85} className="mt-4 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Weaknesses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Feedback */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">AI Coach Feedback</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          <p>
            Your conversational flow was strong — you built genuine rapport and showed empathy early. However, 
            when the CFO pressed on pricing, you deflected rather than anchoring with a value-first framing. 
            In future sessions, try the <span className="text-foreground font-medium">"Cost of Inaction"</span> framework: 
            quantify what the client loses each month by not switching, then position your price as an investment 
            against that loss. Your communication clarity was excellent — keep leveraging concrete examples.
          </p>
        </CardContent>
      </Card>

      {/* System Update Notice */}
      <Alert className="border-primary/30 bg-primary/5">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm font-semibold">Agent Memory Updated</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground mt-1">
          Next session difficulty will be increased to <Badge variant="secondary" className="font-mono text-[10px] mx-1">Adversarial</Badge>.
          The agent will push harder on <span className="font-medium text-foreground">pricing objections</span> and 
          <span className="font-medium text-foreground"> ROI quantification</span>.
        </AlertDescription>
      </Alert>
    </div>
  );
}
