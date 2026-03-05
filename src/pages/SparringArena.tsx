import { useState, useEffect } from "react";
import { Send, Mic, User, Bot, AlertTriangle, CheckCircle2, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

interface Message {
  id: number;
  role: "buyer" | "seller";
  content: string;
}

type InputMode = "text" | "recording" | "processing";

const initialMessages: Message[] = [
  { id: 1, role: "buyer", content: "Thanks for making the time. I'll be honest — we've been burned by vendors before, so I need to see real proof before I bring anything to the board." },
  { id: 2, role: "seller", content: "Absolutely, I appreciate the candor. That's actually one of the reasons I wanted to start with a case study from a company very similar to yours in the manufacturing space." },
  { id: 3, role: "buyer", content: "Fine, but let's cut to the chase — what's this going to cost us? We're in the middle of a cost-reduction initiative." },
];

const objectionChecklist = [
  { label: "Budget Constraints", tested: true },
  { label: "Vendor Lock-In", tested: false },
  { label: "Timeline Risk", tested: false },
  { label: "ROI Skepticism", tested: false },
];

function RecordingTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(interval);
  }, [startTime]);
  const secs = Math.floor(elapsed / 1000);
  const mins = Math.floor(secs / 60);
  const displaySecs = secs % 60;
  return (
    <span className="font-mono text-sm text-foreground tabular-nums">
      {String(mins).padStart(2, "0")}:{String(displaySecs).padStart(2, "0")}
    </span>
  );
}

function AudioWaveform() {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-primary"
          style={{
            animation: `waveform 1.2s ease-in-out ${i * 0.06}s infinite alternate`,
            height: "30%",
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          0% { height: 15%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function SparringArena() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [recordingStart, setRecordingStart] = useState(0);
  const navigate = useNavigate();

  const handleSend = (content?: string) => {
    const text = content || input.trim();
    if (!text) return;
    const newMsg: Message = { id: messages.length + 1, role: "seller", content: text };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setInputMode("text");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          role: "buyer",
          content: "Interesting point. But how do you justify that timeline given our compliance requirements? We can't afford a delay.",
        },
      ]);
    }, 1500);
  };

  const startRecording = () => {
    setInputMode("recording");
    setRecordingStart(Date.now());
  };

  const cancelRecording = () => {
    setInputMode("text");
  };

  const sendRecording = () => {
    setInputMode("processing");
    setTimeout(() => {
      handleSend("I understand your concern about the timeline. Let me walk you through our phased implementation plan that accounts for compliance checkpoints at every stage.");
    }, 2000);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Chat Area - 70% */}
      <div className="flex-[7] flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium">Live Sparring Session</span>
            <Badge variant="secondary" className="text-[10px] font-mono ml-2">REC</Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4 max-w-2xl">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "seller" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "buyer"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {msg.role === "buyer" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[80%] ${
                    msg.role === "buyer"
                      ? "bg-muted text-foreground rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border bg-card/50">
          <div className="flex gap-2 max-w-2xl items-center">
            {inputMode === "text" && (
              <>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your response..."
                  className="flex-1"
                />
                <Button onClick={() => handleSend()} disabled={!input.trim()} className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
                <button
                  onClick={startRecording}
                  className="shrink-0 h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Mic className="h-5 w-5" />
                </button>
              </>
            )}

            {inputMode === "recording" && (
              <>
                <div className="flex-1 flex items-center gap-3 bg-muted rounded-lg px-4 py-2">
                  <div className="h-3 w-3 rounded-full bg-destructive animate-pulse shrink-0" />
                  <AudioWaveform />
                  <RecordingTimer startTime={recordingStart} />
                </div>
                <Button size="icon" variant="destructive" onClick={cancelRecording} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
                <button
                  onClick={sendRecording}
                  className="shrink-0 h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
                >
                  <Check className="h-5 w-5" />
                </button>
              </>
            )}

            {inputMode === "processing" && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Analyzing Pitch...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HUD Panel - 30% */}
      <div className="flex-[3] hud-panel flex flex-col border-l overflow-auto">
        <div className="p-5 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-1">
              Current Persona
            </p>
            <p className="text-sm font-semibold text-hud-foreground">Skeptical CFO</p>
            <p className="text-xs text-hud-foreground/60 mt-0.5">
              Risk-averse, data-driven, 15+ years in finance
            </p>
          </div>

          <Separator className="bg-hud-border" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-2">
              Difficulty Level
            </p>
            <Badge className="bg-warning text-warning-foreground font-mono text-xs">
              Intermediate
            </Badge>
          </div>

          <Separator className="bg-hud-border" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-3">
              Active Objections
            </p>
            <div className="space-y-2">
              {objectionChecklist.map((obj, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {obj.tested ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-hud-foreground/30 shrink-0" />
                  )}
                  <span className={obj.tested ? "text-hud-foreground/40 line-through" : "text-hud-foreground"}>
                    {obj.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-hud-border" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-2">
              Session Stats
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-hud-foreground">4:32</p>
                <p className="text-[10px] text-hud-foreground/50">Duration</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold font-mono text-hud-foreground">6</p>
                <p className="text-[10px] text-hud-foreground/50">Exchanges</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto p-5">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => navigate("/performance")}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            End Sparring Session
          </Button>
        </div>
      </div>
    </div>
  );
}
