import { useEffect, useMemo, useState } from "react";
import { Building2, Target, Shield, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

const BUYER_PERSONAS = [
  "VP of Operations",
  "Chief Technology Officer",
  "Chief Financial Officer",
  "VP of Sales",
  "VP of Marketing",
  "Director of IT",
  "Head of Procurement",
  "Chief Risk Officer",
];

const PERSONA_DESCRIPTIONS: Record<string, string> = {
  "VP of Operations": "Process-focused, efficiency-driven. Cares about workflow optimization and cost reduction.",
  "Chief Technology Officer": "Tech-savvy, innovation-oriented. Evaluates based on integration, scalability, and modernization.",
  "Chief Financial Officer": "Risk-averse, ROI-focused. Demands strong business case and financial guarantees.",
  "VP of Sales": "Revenue-focused, competitive. Wants tools that improve win rates and deal velocity.",
  "VP of Marketing": "Brand and demand-focused. Seeks integration with marketing stack and lead generation impact.",
  "Director of IT": "Security and stability-focused. Prioritizes compliance, support, and operational reliability.",
  "Head of Procurement": "Negotiation and cost-focused. Evaluates vendor contracts, terms, and TCO carefully.",
  "Chief Risk Officer": "Compliance and liability-focused. Emphasizes risk mitigation, governance, and regulatory alignment.",
};

export default function Briefing() {
  const navigate = useNavigate();
  const { briefing, setBriefing } = useAppStore();
  const [openObjections, setOpenObjections] = useState<string[]>([]);

  const objectionIds = useMemo(() => briefing.objections.map(o => o.id), [briefing.objections]);
  const allObjectionsOpen = objectionIds.length > 0 && openObjections.length === objectionIds.length;

  useEffect(() => {
    // Keep state consistent if the objections list changes.
    setOpenObjections(prev => prev.filter(id => objectionIds.includes(id)));
  }, [objectionIds]);

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
              <div className="h-7 w-7 rounded-xl bg-sky-500/15 dark:bg-sky-400/15 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-sky-700 dark:text-sky-300" />
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
            <div className="flex flex-col items-start gap-2">
              <span className="text-muted-foreground w-full">Buyer Persona</span>
              <select
                value={briefing.clientProfile.buyerPersona}
                onChange={(e) => setBriefing({
                  clientProfile: {
                    ...briefing.clientProfile,
                    buyerPersona: e.target.value,
                  },
                })}
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-input rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {BUYER_PERSONAS.map(persona => (
                  <option key={persona} value={persona}>
                    {persona}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground italic">
                {PERSONA_DESCRIPTIONS[briefing.clientProfile.buyerPersona] || "Select a buyer persona to see their key traits."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-emerald-500/15 dark:bg-emerald-400/15 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
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
              <div className="h-7 w-7 rounded-xl bg-amber-500/20 dark:bg-amber-400/20 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Anticipated Objections
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              aria-label={allObjectionsOpen ? "Collapse all objections" : "Expand all objections"}
              onClick={() => setOpenObjections(allObjectionsOpen ? [] : objectionIds)}
            >
              {allObjectionsOpen ? (
                <ChevronsDownUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            value={openObjections}
            onValueChange={setOpenObjections}
            className="w-full"
          >
            {briefing.objections.map((obj) => (
              <AccordionItem key={obj.id} value={obj.id}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2 text-[#2172B0]">
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
