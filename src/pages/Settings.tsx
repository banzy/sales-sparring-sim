import { useState } from 'react';
import { Volume2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Energetic and friendly' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and clear' },
];

export default function Settings() {
  const { settings, setSettings } = useAppStore();
  const [testingVoice, setTestingVoice] = useState(false);

  const testVoice = async () => {
    setTestingVoice(true);
    const text = "Hello! This is a test of the text-to-speech system. I'm your AI buyer persona.";
    
    if (settings.voiceProvider === 'browser') {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setTestingVoice(false);
      utterance.onerror = () => setTestingVoice(false);
      window.speechSynthesis.speak(utterance);
    } else {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: settings.openaiVoice }),
        });

        if (!response.ok) {
          throw new Error(`TTS API returned status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setTestingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setTestingVoice(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (error) {
        console.error('[TTS Test] Error:', error);
        setTestingVoice(false);
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
                      <div className="mt-3 space-y-3">
                        <div>
                          <Label htmlFor="voice-select" className="text-xs font-medium mb-2 block">
                            Voice Selection
                          </Label>
                          <Select
                            value={settings.openaiVoice}
                            onValueChange={(value) => setSettings({ openaiVoice: value })}
                          >
                            <SelectTrigger id="voice-select" className="w-full">
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
                    )}
                  </div>
                </div>
              </div>
            </RadioGroup>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Test the selected voice
              </p>
              <Button
                onClick={testVoice}
                disabled={testingVoice}
                variant="outline"
                size="sm"
              >
                {testingVoice ? (
                  <>
                    <Volume2 className="h-4 w-4 mr-2 animate-pulse" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-2" />
                    Test Voice
                  </>
                )}
              </Button>
            </div>
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
      </div>
    </div>
  );
}
