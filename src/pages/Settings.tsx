import { useState, useEffect } from 'react';
import { Volume2, Database, Save, RotateCcw, Trash2, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Energetic and friendly' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and clear' },
];

interface SnapshotInfo {
  id: string;
  label?: string | null;
  created_at: string;
  size_bytes: number;
  table_counts: Record<string, number>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Settings() {
  const { settings, setSettings } = useAppStore();
  const [testingVoice, setTestingVoice] = useState<'buyer' | 'seller' | null>(null);

  // Snapshot state
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setSnapshotsLoading(true);
    setSnapshotError(null);
    try {
      const res = await fetch('/api/snapshots');
      if (res.ok) {
        setSnapshots(await res.json());
      } else {
        setSnapshotError('Failed to load snapshots.');
      }
    } catch {
      setSnapshotError('Could not reach the backend.');
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const takeSnapshot = async () => {
    setTakingSnapshot(true);
    setSnapshotError(null);
    try {
      const res = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: snapshotLabel.trim() || null }),
      });
      if (res.ok) {
        setSnapshotLabel('');
        await loadSnapshots();
      } else {
        const data = await res.json().catch(() => ({}));
        setSnapshotError(data.detail || 'Failed to create snapshot.');
      }
    } catch {
      setSnapshotError('Could not reach the backend.');
    } finally {
      setTakingSnapshot(false);
    }
  };

  const restoreSnapshot = async (id: string) => {
    setRestoringId(id);
    setSnapshotError(null);
    try {
      const res = await fetch(`/api/snapshots/${id}/restore`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSnapshotError(data.detail || 'Failed to restore snapshot.');
      }
    } catch {
      setSnapshotError('Could not reach the backend.');
    } finally {
      setRestoringId(null);
    }
  };

  const deleteSnapshot = async (id: string) => {
    setDeletingId(id);
    setSnapshotError(null);
    try {
      const res = await fetch(`/api/snapshots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSnapshots();
      } else {
        const data = await res.json().catch(() => ({}));
        setSnapshotError(data.detail || 'Failed to delete snapshot.');
      }
    } catch {
      setSnapshotError('Could not reach the backend.');
    } finally {
      setDeletingId(null);
    }
  };

  const testVoice = async (target: 'buyer' | 'seller') => {
    setTestingVoice(target);
    const text =
      target === 'buyer'
        ? "Hello! This is a test of the text-to-speech system. I'm your AI buyer persona."
        : "Hello! This is a test of my voice as the seller.";
    const voiceId =
      target === 'buyer'
        ? settings.openaiBuyerVoice || settings.openaiVoice
        : settings.openaiSellerVoice || settings.openaiBuyerVoice || settings.openaiVoice;

    if (settings.voiceProvider === 'browser') {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setTestingVoice(null);
      utterance.onerror = () => setTestingVoice(null);
      window.speechSynthesis.speak(utterance);
    } else {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: voiceId }),
        });

        if (!response.ok) {
          throw new Error(`TTS API returned status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setTestingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setTestingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (error) {
        console.error('[TTS Test] Error:', error);
        setTestingVoice(null);
      }
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your sparring experience
        </p>
      </div>

      <div className="space-y-6">
        {/* TTS Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Text-to-Speech
            </CardTitle>
            <CardDescription>
              Choose how buyer responses are read aloud
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={settings.voiceProvider}
              onValueChange={(value: 'browser' | 'openai') =>
                setSettings({ voiceProvider: value })
              }
            >
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="browser" id="browser" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="browser" className="font-semibold cursor-pointer">
                      Browser Voice (Free)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Uses your browser's built-in text-to-speech. Works offline, but sounds robotic.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">Free</Badge>
                      <Badge variant="outline" className="text-xs">Offline</Badge>
                      <Badge variant="secondary" className="text-xs">Robotic</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="openai" id="openai" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="openai" className="font-semibold cursor-pointer">
                      OpenAI TTS (Premium)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      High-quality, natural-sounding voices. Requires API key and costs ~$0.015 per 1,000 characters.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">$0.015/1K chars</Badge>
                      <Badge variant="outline" className="text-xs">Natural</Badge>
                      <Badge variant="default" className="text-xs">Recommended</Badge>
                    </div>
                    {settings.voiceProvider === 'openai' && (
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <Label
                            htmlFor="voice-select-buyer"
                            className="text-xs font-medium mb-2 block"
                          >
                            Buyer voice
                          </Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => testVoice('buyer')}
                              disabled={testingVoice !== null}
                              title="Listen to buyer voice"
                              className="h-10 w-10 shrink-0"
                            >
                              <Volume2
                                className={`h-4 w-4 ${testingVoice === 'buyer' ? 'animate-pulse' : ''}`}
                              />
                            </Button>
                            <Select
                              value={settings.openaiBuyerVoice || settings.openaiVoice}
                              onValueChange={(value) =>
                                setSettings({ openaiBuyerVoice: value, openaiVoice: value })
                              }
                            >
                              <SelectTrigger id="voice-select-buyer" className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPENAI_VOICES.map((voice) => (
                                  <SelectItem key={voice.id} value={voice.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{voice.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {voice.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label
                            htmlFor="voice-select-seller"
                            className="text-xs font-medium mb-2 block"
                          >
                            Your voice
                          </Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => testVoice('seller')}
                              disabled={testingVoice !== null}
                              title="Listen to your voice"
                              className="h-10 w-10 shrink-0"
                            >
                              <Volume2
                                className={`h-4 w-4 ${testingVoice === 'seller' ? 'animate-pulse' : ''}`}
                              />
                            </Button>
                            <Select
                              value={
                                settings.openaiSellerVoice ||
                                settings.openaiBuyerVoice ||
                                settings.openaiVoice
                              }
                              onValueChange={(value) => setSettings({ openaiSellerVoice: value })}
                            >
                              <SelectTrigger id="voice-select-seller" className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPENAI_VOICES.map((voice) => (
                                  <SelectItem key={voice.id} value={voice.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{voice.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {voice.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {settings.voiceProvider === 'openai' && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-base">Cost Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs font-mono text-muted-foreground">
                  OpenAI TTS-1: $0.015 per 1,000 characters
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Typical 10-message session: ~$0.10-0.20
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database Snapshots Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Snapshots
                </CardTitle>
                <CardDescription className="mt-1">
                  Save and restore point-in-time copies of the database
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadSnapshots}
                disabled={snapshotsLoading}
                title="Refresh snapshots"
              >
                <RefreshCw className={`h-4 w-4 ${snapshotsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create new snapshot */}
            <div className="flex gap-2">
              <Input
                placeholder="Label (optional)"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !takingSnapshot && takeSnapshot()}
                className="flex-1"
              />
              <Button
                onClick={takeSnapshot}
                disabled={takingSnapshot}
                size="sm"
              >
                {takingSnapshot ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Take Snapshot
                  </>
                )}
              </Button>
            </div>

            {snapshotError && (
              <p className="text-sm text-destructive">{snapshotError}</p>
            )}

            {/* Snapshot list */}
            <div className="space-y-2">
              {snapshotsLoading && snapshots.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Loading snapshots...
                </div>
              ) : snapshots.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                  No snapshots yet. Take one to get started.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {snap.label && (
                          <span className="font-medium text-sm truncate">{snap.label}</span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatDate(snap.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatSize(snap.size_bytes)}
                        </span>
                        {Object.entries(snap.table_counts).map(([table, count]) => (
                          <span key={table} className="text-xs text-muted-foreground">
                            {table}: <span className="font-medium text-foreground">{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Restore */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={restoringId === snap.id}
                            title="Restore this snapshot"
                            className="h-8 w-8"
                          >
                            {restoringId === snap.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore snapshot?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will replace the current database with the snapshot taken on{' '}
                              <strong>{formatDate(snap.created_at)}</strong>
                              {snap.label ? ` (${snap.label})` : ''}.{' '}
                              All data added after that point will be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => restoreSnapshot(snap.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === snap.id}
                            title="Delete this snapshot"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            {deletingId === snap.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete snapshot?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The snapshot from{' '}
                              <strong>{formatDate(snap.created_at)}</strong>
                              {snap.label ? ` (${snap.label})` : ''} will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSnapshot(snap.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
