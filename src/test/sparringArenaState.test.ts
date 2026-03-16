import { describe, expect, it } from 'vitest';
import {
  getArenaStatusLabel,
  getLastSellerMessageId,
} from '@/lib/sparringArenaState';

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

describe('getLastSellerMessageId', () => {
  it('keeps the delete target on the latest seller message after the buyer replies', () => {
    expect(
      getLastSellerMessageId([
        { id: 1, role: 'buyer' },
        { id: 2, role: 'seller' },
        { id: 3, role: 'buyer' },
      ]),
    ).toBe(2);
  });

  it('returns null when there is no seller message in the transcript', () => {
    expect(
      getLastSellerMessageId([
        { id: 1, role: 'buyer' },
        { id: 2, role: 'buyer' },
      ]),
    ).toBeNull();
  });
});
