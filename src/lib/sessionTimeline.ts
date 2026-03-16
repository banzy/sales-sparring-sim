import type { SessionSummary } from "@/lib/api";

export interface NumberedSessionSummary extends SessionSummary {
  sessionNumber: number;
}

export interface SessionDisplayState {
  currentSessionNumber: number;
  pastSessions: NumberedSessionSummary[];
}

export function isArenaVisibleSession(session: SessionSummary): boolean {
  return session.overall_score !== null || session.evaluation_insufficient;
}

export function filterArenaVisibleSessions(sessions: SessionSummary[]): SessionSummary[] {
  return sessions.filter(isArenaVisibleSession);
}

function getCreatedAtTimestamp(session: SessionSummary): number {
  if (!session.created_at) {
    return 0;
  }

  const timestamp = new Date(session.created_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function buildSessionTimeline(sessions: SessionSummary[]): NumberedSessionSummary[] {
  const uniqueSessions = Array.from(
    sessions.reduce((acc, session) => {
      if (!acc.has(session.id)) {
        acc.set(session.id, session);
      }

      return acc;
    }, new Map<string, SessionSummary>())
      .values()
  );

  return uniqueSessions
    .sort((left, right) => getCreatedAtTimestamp(left) - getCreatedAtTimestamp(right))
    .map((session, index) => ({
      ...session,
      sessionNumber: index + 1,
    }));
}

export function getCurrentSessionNumber(sessions: SessionSummary[]): number {
  return buildSessionTimeline(sessions).length + 1;
}

export function getSessionDisplayState(sessions: SessionSummary[]): SessionDisplayState {
  const timeline = buildSessionTimeline(sessions);

  return {
    currentSessionNumber: timeline.length + 1,
    pastSessions: timeline,
  };
}
