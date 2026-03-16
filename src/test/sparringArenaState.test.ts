import { describe, expect, it } from 'vitest';
import { getArenaStatusLabel } from '@/lib/sparringArenaState';

describe('getArenaStatusLabel', () => {
  it('uses a buyer-response status for typed sends instead of the transcription status', () => {
    expect(getArenaStatusLabel('responding')).toBe('Buyer is responding...');
    expect(getArenaStatusLabel('transcribing')).toBe('Transcribing voice...');
  });

  it('returns no status label for idle and recording modes', () => {
    expect(getArenaStatusLabel('text')).toBeNull();
    expect(getArenaStatusLabel('recording')).toBeNull();
  });
});
