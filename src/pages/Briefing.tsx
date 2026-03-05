import { Building2, Target, Shield, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const objections = [
  { id: "1", title: "Budget Constraints", detail: "The CFO will push back on pricing, citing recent cost-cutting measures across all departments." },
  { id: "2", title: "Existing Vendor Lock-In", detail: "They've invested heavily in their current solution over 3 years. Switching costs are a major concern." },
  { id: "3", title: "Timeline Concerns", detail: "Q4 implementation feels risky. They'll want assurances about go-live dates and rollback plans." },
  { id: "4", title: "ROI Skepticism", detail: "Past vendors over-promised. They'll demand concrete case studies and guaranteed metrics." },
];

export default function Briefing() {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Briefing & Materials</h1>
          <p className="text-muted-foreground mt-1">Your AI-prepared sales intelligence package.</p>
        </div>
        <Button size="lg" onClick={() => navigate("/arena")} className="glow-primary">
          Enter Sparring Arena
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Client Profile */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Client Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">Acme Corp</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">500–1000 employees</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer Persona</span>
              <Badge variant="secondary" className="font-mono text-xs">VP of Operations</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget Cycle</span>
              <span className="font-medium">Q4 Planning</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Decision Timeline</span>
              <span className="font-medium">6–8 weeks</span>
            </div>
          </CardContent>
        </Card>

        {/* Value Proposition */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Value Proposition</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            <p>
              "Our platform reduces operational overhead by <span className="text-foreground font-semibold">40%</span> within 
              the first quarter, directly addressing your team's bottleneck in cross-department workflows. 
              Unlike your current solution, we offer real-time analytics 
              and a <span className="text-foreground font-semibold">14-day</span> deployment guarantee."
            </p>
          </CardContent>
        </Card>

        {/* Buying Constraints */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Buying Constraints</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {["Board approval required > $50k", "SOC 2 Type II compliance mandatory", "Must integrate with Salesforce", "3-year contract minimum preferred"].map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Objection Guide */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide">
            Anticipated Objections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {objections.map((obj) => (
              <AccordionItem key={obj.id} value={obj.id}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">OBJ-{obj.id}</Badge>
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
