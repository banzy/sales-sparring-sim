import { useState } from "react";
import { Upload, Sparkles, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function ContextSetup() {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const handleProcess = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/briefing");
    }, 2500);
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

      <div className="grid md:grid-cols-2 gap-6">
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
                border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
                ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}
              `}
            >
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, TXT, DOCX up to 10MB</p>
            </div>
            <Button className="w-full rounded-xl" onClick={handleProcess}>
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
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-name" className="text-xs font-medium">Target Client Name</Label>
                <Input id="client-name" placeholder="e.g. Acme Corp" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Industry / Sector</Label>
                <Select>
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pain-points" className="text-xs font-medium">Specific Requirements or Pain Points</Label>
                <Textarea id="pain-points" placeholder="Describe the client's challenges..." rows={3} className="rounded-xl" />
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={handleProcess}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Synthetic World
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
