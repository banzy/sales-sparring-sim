import { describe, expect, it } from "vitest";
import type { SessionSummary } from "@/lib/api";
import {
  buildSessionTimeline,
  filterArenaVisibleSessions,
  getCurrentSessionNumber,
  getSessionDisplayState,
} from "@/lib/sessionTimeline";

function makeSession(
  id: string,
  createdAt: string,
  overrides: Partial<SessionSummary> = {},
): SessionSummary {
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
    ...overrides,
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

  it("keeps a completed first session in history and advances the next live number", () => {
    const sessions = [makeSession("session-1", "2026-03-03T12:00:00.000Z")];

    expect(getSessionDisplayState(sessions)).toMatchObject({
      currentSessionNumber: 2,
      pastSessions: [
        expect.objectContaining({ id: "session-1", sessionNumber: 1 }),
      ],
    });
  });

  it("shows all completed sessions and labels the next live run with the next number", () => {
    const sessions = [
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-2", "2026-03-07T12:00:00.000Z"),
      makeSession("session-3", "2026-03-09T12:00:00.000Z"),
    ];

    expect(getSessionDisplayState(sessions)).toMatchObject({
      currentSessionNumber: 4,
      pastSessions: [
        expect.objectContaining({ id: "session-1", sessionNumber: 1 }),
        expect.objectContaining({ id: "session-2", sessionNumber: 2 }),
        expect.objectContaining({ id: "session-3", sessionNumber: 3 }),
      ],
    });
  });

  it("keeps scored and too-short sessions visible in the arena timeline", () => {
    const visibleSessions = filterArenaVisibleSessions([
      makeSession("session-1", "2026-03-03T12:00:00.000Z"),
      makeSession("session-2", "2026-03-07T12:00:00.000Z", {
        overall_score: null,
        objection_handling: null,
        communication_clarity: null,
        evaluation_insufficient: true,
        evaluation_notice: "Too short to score",
      }),
      makeSession("session-3", "2026-03-09T12:00:00.000Z", {
        overall_score: null,
        objection_handling: null,
        communication_clarity: null,
      }),
    ]);

    expect(visibleSessions.map((session) => session.id)).toEqual([
      "session-1",
      "session-2",
    ]);
    expect(getSessionDisplayState(visibleSessions)).toMatchObject({
      currentSessionNumber: 3,
      pastSessions: [
        expect.objectContaining({ id: "session-1", sessionNumber: 1 }),
        expect.objectContaining({ id: "session-2", sessionNumber: 2 }),
      ],
    });
  });
});
