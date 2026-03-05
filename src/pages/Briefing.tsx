import { Building2, Target, Shield, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

export default function Briefing() {
  const navigate = useNavigate();
  const { briefing } = useAppStore();

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Briefing & Materials</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your AI-prepared sales intelligence package.</p>
        </div>
        <Button size="lg" onClick={() => navigate("/arena")} className="rounded-xl glow-primary">
          Enter Sparring Arena
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Company", briefing.clientProfile.name],
              ["Size", briefing.clientProfile.size],
              ["Budget Cycle", briefing.clientProfile.budgetCycle],
              ["Decision Timeline", briefing.clientProfile.decisionTimeline],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Buyer Persona</span>
              <Badge variant="secondary" className="font-mono text-xs rounded-lg">{briefing.clientProfile.buyerPersona}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value Proposition</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            <p>{briefing.valueProposition}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-muted flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buying Constraints</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {briefing.buyingConstraints.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anticipated Objections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {briefing.objections.map((obj) => (
              <AccordionItem key={obj.id} value={obj.id}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] rounded-lg">OBJ-{obj.id}</Badge>
                    {obj.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {obj.detail}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
