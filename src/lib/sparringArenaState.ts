export type ArenaInputMode = 'text' | 'recording' | 'transcribing' | 'responding';

export function getArenaStatusLabel(inputMode: ArenaInputMode): string | null {
  if (inputMode === 'transcribing') {
    return 'Transcribing voice...';
  }

  if (inputMode === 'responding') {
    return 'Buyer is responding...';
  }

  return null;
}
