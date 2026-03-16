export type ArenaInputMode = 'text' | 'recording' | 'transcribing' | 'responding';

export function getLastSellerMessageId(
  messages: Array<{ id: number; role: string }>,
): number | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'seller') {
      return messages[index].id;
    }
  }

  return null;
}

export function getArenaStatusLabel(inputMode: ArenaInputMode): string | null {
  if (inputMode === 'transcribing') {
    return 'Transcribing voice...';
  }

  if (inputMode === 'responding') {
    return 'Buyer is responding...';
  }

  return null;
}
