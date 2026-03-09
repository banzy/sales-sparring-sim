import { useState, useEffect, useMemo, useRef } from "react";
import { Send, Mic, User, Bot, AlertTriangle, CheckCircle2, X, Check, Loader2, PlayCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAppStore, type Message } from "@/store";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type InputMode = "text" | "recording" | "processing";

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
    <span className="font-mono text-sm text-hud-foreground tabular-nums">
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
          className="w-[3px] rounded-full bg-hud-accent"
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
  const navigate = useNavigate();
  const { sparringSession, addMessage, startSparringSession, endSparringSession, updateSessionStats } = useAppStore();

  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [recordingStart, setRecordingStart] = useState(0);
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Parse messages into an array of iterations/turns
  const turns = useMemo(() => {
    const parsedTurns: Message[][] = [];
    let currentTurn: Message[] = [];

    sparringSession.messages.forEach(msg => {
      // A new turn starts when a seller sends a message, providing we already have messages in the current turn
      if (msg.role === 'seller' && currentTurn.length > 0 && currentTurn.some(m => m.role === 'buyer')) {
        parsedTurns.push([...currentTurn]);
        currentTurn = [msg];
      } else {
        currentTurn.push(msg);
      }
    });

    // push the final turn
    if (currentTurn.length > 0) {
      parsedTurns.push(currentTurn);
    }
    return parsedTurns;
  }, [sparringSession.messages]);

  const latestTurnIndex = turns.length > 0 ? turns.length - 1 : 0;
  // If selectedTurn is null or out of bounds, use the latest turn
  const activeTurnIndex = selectedTurn !== null && selectedTurn <= latestTurnIndex ? selectedTurn : latestTurnIndex;

  // Calculate which messages to show (all messages up to the end of the selected turn)
  const displayedMessages = useMemo(() => {
    const endOfTurn = turns.slice(0, activeTurnIndex + 1);
    return endOfTurn.flat();
  }, [turns, activeTurnIndex]);

  const isHistoricalView = activeTurnIndex < latestTurnIndex;

  useEffect(() => {
    if (!sparringSession.isActive) {
      startSparringSession();
    }
  }, [sparringSession.isActive, startSparringSession]);

  const { toast } = useToast();
  // @ts-ignore
  const scenarioId = useAppStore(state => state.contextSetup.scenarioId);

  const handleSend = async (content?: string) => {
    const text = content || input.trim();
    if (!text) return;

    if (!scenarioId) {
      toast({ variant: "destructive", title: "Missing Scenario context. Go back to setup." });
      return;
    }

    const newMsg: Message = {
      id: sparringSession.messages.length + 1,
      role: "seller",
      content: text,
      timestamp: Date.now()
    };

    addMessage(newMsg);
    setInput("");
    setInputMode("processing");

    try {
      // Include the message we just added to state, along with previous history
      const historyToSend = [...sparringSession.messages, newMsg];

      const response = await api.sparringChat(scenarioId, historyToSend, text);

      const buyerMsg: Message = {
        id: historyToSend.length + 1,
        role: "buyer",
        content: response.buyer_response,
        timestamp: Date.now()
      };

      addMessage(buyerMsg);

      // Update objections triggered
      if (response.objections_triggered && response.objections_triggered.length > 0) {
        response.objections_triggered.forEach((obj: any) => {
          useAppStore.getState().markObjectionTested(obj.id);
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Communication Error",
        description: err.message || "Failed to reach the sparring engine.",
      });
    } finally {
      setInputMode("text");
      // ensure we snap back to the latest turn when sending
      setSelectedTurn(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      console.log("[Audio] MediaRecorder started.");
      setInputMode("recording");
      setRecordingStart(Date.now());
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Access Denied" });
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setInputMode("text");
  };

  const sendRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

        setInputMode("processing");

        try {
          // Send blob via HTTP to backend
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');

          const response = await fetch('http://localhost:8000/api/stt', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
          }

          const data = await response.json();
          if (data && data.text) {
            setInput((prev) => prev + (prev ? " " : "") + data.text.trim());
          }
          setInputMode("text");
        } catch (error) {
          console.error("[Audio] DECODE ERROR:", error);
          toast({ variant: "destructive", title: "Transcription Error", description: String(error) });
          setInputMode("text");
        }
      };

      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Chat Area - 70% */}
      <div className="flex-[7] flex flex-col min-w-0">
        <div className="px-6 py-3.5 border-b border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isHistoricalView ? 'bg-muted-foreground' : 'bg-success animate-pulse'}`} />
              <span className="text-sm font-medium">
                {isHistoricalView ? 'Historical View' : 'Live Sparring Session'}
              </span>
              {!isHistoricalView && <Badge variant="secondary" className="text-[10px] font-mono ml-2 rounded-lg">REC</Badge>}
            </div>

            {/* Iteration Navigator */}
            {turns.length > 1 && (
              <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg">
                <History className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1">Turns</span>
                {turns.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTurn(idx)}
                    className={`h-6 min-w-[24px] px-2 rounded-md text-xs font-medium transition-colors ${idx === activeTurnIndex
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:bg-background/50'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4 bg-muted/30">
          <div className="space-y-4 max-w-2xl">
            {displayedMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "seller" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === "buyer"
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted text-muted-foreground"
                    }`}
                >
                  {msg.role === "buyer" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[80%] ${msg.role === "buyer"
                    ? "bg-card border border-border text-foreground rounded-tl-md"
                    : "bg-primary text-primary-foreground rounded-tr-md"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border bg-background">
          <div className="flex gap-2 max-w-2xl items-center">
            {isHistoricalView ? (
              <div className="flex-1 flex flex-col items-center justify-center py-2 bg-muted/40 rounded-xl border border-dashed border-border/60">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium">Viewing Past Iteration (Read Only)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTurn(latestTurnIndex)}
                  className="rounded-lg h-8 border-primary/20 text-primary hover:bg-primary/10"
                >
                  <PlayCircle className="h-3.5 w-3.5 mr-2" />
                  Return to Active Session
                </Button>
              </div>
            ) : (
              <>
                {inputMode === "text" && (
                  <>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Type your response..."
                      className="flex-1 rounded-xl"
                    />
                    <Button onClick={() => handleSend()} disabled={!input.trim()} className="shrink-0 rounded-xl">
                      <Send className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={startRecording}
                      title={"Start Recording"}
                      className="shrink-0 h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  </>
                )}

                {inputMode === "recording" && (
                  <>
                    <div className="flex-1 flex items-center gap-3 bg-muted rounded-xl px-4 py-2">
                      <div className="h-3 w-3 rounded-full bg-destructive animate-pulse shrink-0" />
                      <AudioWaveform />
                      <RecordingTimer startTime={recordingStart} />
                    </div>
                    <Button size="icon" variant="destructive" onClick={cancelRecording} className="shrink-0 rounded-xl">
                      <X className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={sendRecording}
                      className="shrink-0 h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </>
                )}

                {inputMode === "processing" && (
                  <div className="flex-1 flex items-center justify-center gap-2 py-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Transcribing Voice...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* HUD Panel - 30% */}
      <div className="flex-[3] hud-panel flex flex-col border-l overflow-auto">
        <div className="p-5 space-y-5">
          {isHistoricalView && (
            <div className="bg-muted/60 border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 font-medium mb-1.5">
                <History className="h-4 w-4 text-muted-foreground" />
                Turn {activeTurnIndex + 1} Review
              </div>
              <p className="text-xs text-muted-foreground text-balance leading-relaxed">
                You are reviewing a past exchange. Active objections and session stats reflect the session up to this turn.
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-1">
              Current Persona
            </p>
            <p className="text-sm font-semibold text-hud-foreground">{sparringSession.currentPersona.name}</p>
            <p className="text-xs text-hud-foreground/60 mt-0.5">
              {sparringSession.currentPersona.description}
            </p>
          </div>

          <Separator className="bg-hud-border" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-2">
              Difficulty Level
            </p>
            <Badge className="bg-warning/20 text-warning border border-warning font-mono text-xs rounded-full px-3 py-0.5">
              {sparringSession.difficulty.charAt(0).toUpperCase() + sparringSession.difficulty.slice(1)}
            </Badge>
          </div>

          <Separator className="bg-hud-border" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-hud-foreground/50 font-mono mb-3">
              Active Objections
            </p>
            <div className="space-y-2.5">
              {sparringSession.objectionChecklist.map((obj) => (
                <div key={obj.id} className="flex items-center gap-2.5 text-xs">
                  {obj.tested ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-hud-foreground/30 shrink-0" />
                  )}
                  <span className={obj.tested ? "text-hud-foreground/40 line-through" : "text-hud-foreground"}>
                    {obj.title}
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
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <p className="text-lg font-bold font-mono text-hud-foreground">
                  {Math.floor(sparringSession.sessionStats.duration / 60)}:{String(sparringSession.sessionStats.duration % 60).padStart(2, '0')}
                </p>
                <p className="text-[10px] text-hud-foreground/50">Duration</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <p className="text-lg font-bold font-mono text-hud-foreground">
                  {isHistoricalView ? displayedMessages.length : sparringSession.sessionStats.exchanges}
                </p>
                <p className="text-[10px] text-hud-foreground/50">Exchanges</p>
              </div>
            </div>
          </div>
        </div>

        {!isHistoricalView && (
          <div className="mt-auto p-5">
            <Button
              variant="destructive"
              className="w-full rounded-xl"
              onClick={() => {
                endSparringSession();
                navigate("/performance");
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              End Sparring Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
