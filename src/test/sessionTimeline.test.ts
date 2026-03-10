import { describe, expect, it } from "vitest";
import type { SessionSummary } from "@/lib/api";
import {
  buildSessionTimeline,
  getCurrentSessionNumber,
  getSessionDisplayState,
} from "@/lib/sessionTimeline";

function makeSession(id: string, createdAt: string): SessionSummary {
  return {
    id,
    scenario_id: "demo-smartwings-123",
    project_id: "demo-smartwings-123",
    created_at: createdAt,
    evaluation_insufficient: false,
    evaluation_notice: null,
    overall_score: 70,
    objection_handling: 68,
    communication_clarity: 74,
    strengths: [],
    weaknesses: [],
  };
}

describe("session timeline numbering", () => {
  it("orders completed sessions chronologically before assigning labels", () => {
    const timeline = buildSessionTimeline([
      makeSession("session-3", "2026-03-09T12:00:00.000Z"),
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-2", "2026-03-07T12:00:00.000Z"),
    ]);

    expect(timeline.map((session) => session.id)).toEqual(["session-1", "session-2", "session-3"]);
    expect(timeline.map((session) => session.sessionNumber)).toEqual([1, 2, 3]);
    expect(getCurrentSessionNumber(timeline)).toBe(4);
  });

  it("deduplicates repeated session ids so the live slot does not skip a number", () => {
    const duplicatedSessions = [
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-2", "2026-03-07T12:00:00.000Z"),
    ];

    expect(buildSessionTimeline(duplicatedSessions).map((session) => session.sessionNumber)).toEqual([1, 2]);
    expect(getCurrentSessionNumber(duplicatedSessions)).toBe(3);
  });

  it("treats the newest saved session as current until the next live run starts", () => {
    const sessions = [
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-2", "2026-03-07T12:00:00.000Z"),
      makeSession("session-3", "2026-03-09T12:00:00.000Z"),
    ];

    expect(getSessionDisplayState(sessions, false)).toMatchObject({
      currentSessionNumber: 3,
      pastSessions: [
        expect.objectContaining({ id: "session-1", sessionNumber: 1 }),
        expect.objectContaining({ id: "session-2", sessionNumber: 2 }),
      ],
    });
  });

  it("shows all completed sessions once the next live run has started", () => {
    const sessions = [
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-2", "2026-03-07T12:00:00.000Z"),
      makeSession("session-3", "2026-03-09T12:00:00.000Z"),
    ];

    expect(getSessionDisplayState(sessions, true)).toMatchObject({
      currentSessionNumber: 4,
      pastSessions: [
        expect.objectContaining({ id: "session-1", sessionNumber: 1 }),
        expect.objectContaining({ id: "session-2", sessionNumber: 2 }),
        expect.objectContaining({ id: "session-3", sessionNumber: 3 }),
      ],
    });
  });
});
