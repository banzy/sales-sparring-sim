import { useState } from "react";
import { Upload, Sparkles, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ContextSetup() {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const { contextSetup, setContextSetup } = useAppStore();
  const [clientName, setClientName] = useState(contextSetup.clientName || '');
  const [industry, setIndustry] = useState(contextSetup.industry || '');
  const [painPoints, setPainPoints] = useState(contextSetup.painPoints || '');

  const { toast } = useToast();

  const handleProcess = async (mode: 'upload' | 'synthetic' | 'demo') => {
    setContextSetup({
      mode: mode === 'demo' ? 'synthetic' : mode, // Treat demo as synthetic for downstream components
      clientName: mode === 'synthetic' ? clientName : mode === 'demo' ? 'SmartWings' : undefined,
      industry: mode === 'synthetic' ? industry : mode === 'demo' ? 'airlines' : undefined,
      painPoints: mode === 'synthetic' ? painPoints : mode === 'demo' ? 'Pitching Ciklum AI Passenger Tracking' : undefined,
    });

    setLoading(true);

    try {
      if (mode === 'synthetic' || mode === 'demo') {
        const fetchMethod = mode === 'demo'
          ? api.loadDemoClient()
          : api.generateClient(clientName, industry, painPoints);

        const briefingData = await fetchMethod;

        // Save the scenario ID in context setup so arena can use it,
        // and save the rest of the briefing data into the briefing store.
        setContextSetup({
          mode: 'synthetic', // Keep the rest of the app thinking it's a synthetic scenario
          clientName: mode === 'demo' ? 'SmartWings' : clientName,
          industry: mode === 'demo' ? 'airlines' : industry,
          painPoints: mode === 'demo' ? 'Pitching Ciklum AI Passenger Tracking' : painPoints,
          scenarioId: briefingData.scenario_id,
        });

        // Remove scenario_id from briefing before storing it as the types mismatch slightly
        const { scenario_id, ...pureBriefing } = briefingData;

        useAppStore.getState().setBriefing(pureBriefing);

        navigate("/briefing");
      } else {
        // Upload mode not yet wired to backend
        setTimeout(() => {
          setLoading(false);
          toast({ variant: "destructive", title: "Upload mode not implemented yet" })
        }, 1000);
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate synthetic scenario.";
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center animate-pulse-slow">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Building Knowledge Base...</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Analyzing documents, extracting personas, and generating objection patterns.
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configure Sales Scenario</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Define your target client and knowledge base to begin training.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Option A: Upload */}
        <Card className="glass-card hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Upload Existing Knowledge</CardTitle>
                <CardDescription className="text-xs">PDFs, text files, sales decks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              className={`
                border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px]
                ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}
              `}
            >
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, TXT, DOCX up to 10MB</p>
            </div>
            <Button className="w-full rounded-xl" onClick={() => handleProcess('upload')}>
              Process Documents
            </Button>
          </CardContent>
        </Card>

        {/* Option B: Synthetic */}
        <Card className="glass-card hover:shadow-md transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Generate Synthetic Client</CardTitle>
                <CardDescription className="text-xs">Meta-demo mode for testing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 min-h-[180px]">
              <div className="space-y-1.5">
                <Label htmlFor="client-name" className="text-xs font-medium">Target Client Name</Label>
                <Input
                  id="client-name"
                  placeholder="e.g. Acme Corp"
                  className="rounded-xl"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Industry / Sector</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="saas">SaaS / Technology</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="retail">Retail / E-Commerce</SelectItem>
                    <SelectItem value="energy">Energy</SelectItem>
                    <SelectItem value="airlines">Airlines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pain-points" className="text-xs font-medium">Specific Requirements or Pain Points</Label>
                <Textarea
                  id="pain-points"
                  placeholder="Describe the client's challenges..."
                  rows={2}
                  className="rounded-xl"
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                />
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={() => handleProcess('synthetic')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Synthetic World
            </Button>
          </CardContent>
        </Card>

        {/* Option C: Load Demo */}
        <Card className="glass-card hover:shadow-md transition-all border-primary/50 relative overflow-hidden !bg-[#D6F7FF]">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider z-10">
            Recommended
          </div>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base text-primary">Load SmartWings Demo</CardTitle>
                <CardDescription className="text-xs">Pre-configured airline scenario</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-center min-h-[180px] flex flex-col justify-center items-center gap-3 border border-border">
              <p className="text-muted-foreground">
                Pitch Ciklum's <span className="font-semibold text-foreground">AI Passenger Activity Tracking</span> to SmartWings.
              </p>
              <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-[11px] text-muted-foreground mt-2 max-w-[200px] leading-relaxed">
                Client: SmartWings (Czech Airlines)<br />
                Sector: Airlines<br />
                Goal: Sell full-cycle AI tracking system
              </p>
            </div>
            <Button className="w-full rounded-xl bg-primary hover:bg-primary/90" onClick={() => handleProcess('demo')}>
              Start SmartWings Demo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
