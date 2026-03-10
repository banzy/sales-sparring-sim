/** Helper functions for interacting with the FastAPI backend. */
import type { BriefingData, Message, PerformanceData, SparringSession } from '../store';

export interface SessionSummary {
    id: string;
    project_id?: string | null;
    scenario_id: string;
    scenario_name?: string | null;
    created_at: string | null;
    overall_score: number | null;
    objection_handling: number | null;
    communication_clarity: number | null;
    weaknesses: string[];
}

export interface SessionDetail extends SessionSummary {
    transcript: Array<{ role: string; content: string }>;
}

const API_BASE = '/api';

export const api = {
    /** Generate a new synthetic client scenario */
    async generateClient(clientName: string, sector: string, requirements: string): Promise<BriefingData & { scenario_id: string }> {
        const res = await fetch(`${API_BASE}/generate_synthetic_client`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_name: clientName, sector, requirements }),
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }

        const data = await res.json();
        return {
            scenario_id: data.scenario_id,
            clientProfile: {
                name: data.client_profile.name,
                size: data.client_profile.size,
                budgetCycle: data.client_profile.budget_cycle,
                decisionTimeline: data.client_profile.decision_timeline,
                buyerPersona: data.client_profile.buyer_persona,
            },
            valueProposition: data.value_proposition,
            buyingConstraints: data.buying_constraints,
            objections: data.objections.map((o: any) => ({
                id: o.id,
                title: o.title,
                detail: o.detail,
                tested: o.tested,
            })),
        };
    },

    /** Load the hardcoded SmartWings demo scenario */
    async loadDemoClient(): Promise<BriefingData & { scenario_id: string }> {
        const res = await fetch(`${API_BASE}/load_demo_scenario`, {
            method: "GET",
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }

        const data = await res.json();
        return {
            scenario_id: data.scenario_id,
            clientProfile: {
                name: data.client_profile.name,
                size: data.client_profile.size,
                budgetCycle: data.client_profile.budget_cycle,
                decisionTimeline: data.client_profile.decision_timeline,
                buyerPersona: data.client_profile.buyer_persona,
            },
            valueProposition: data.value_proposition,
            buyingConstraints: data.buying_constraints,
            objections: data.objections.map((o: any) => ({
                id: o.id,
                title: o.title,
                detail: o.detail,
                tested: o.tested,
            })),
        };
    },

    /** Send a message to the adversarial buyer and get a reply */
    async sparringChat(
        scenarioId: string,
        history: Message[],
        userReply: string
    ): Promise<{ buyer_response: string, turn_feedback: { handled_well: boolean; comment: string; weakness_tags: string[] }, objections_triggered: Array<{ id: string; title: string }> }> {
        const res = await fetch(`${API_BASE}/sparring_chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario_id: scenarioId,
                project_id: scenarioId,
                conversation_history: history.filter(m => m.role === "buyer" || m.role === "seller"),
                user_reply: userReply,
            }),
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }

        return await res.json();
    },

    /** Evaluate the entire session */
    async evaluateSession(scenarioId: string, transcript: Message[]): Promise<PerformanceData> {
        const res = await fetch(`${API_BASE}/evaluate_session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario_id: scenarioId,
                project_id: scenarioId,
                transcript: transcript.map(m => ({ role: m.role, content: m.content })),
            }),
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }

        const data = await res.json();
        return {
            overallScore: data.overall_score,
            objectionHandling: data.objection_handling,
            communicationClarity: data.communication_clarity,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            aiFeedback: data.ai_feedback,
            evolutionAnalysis: data.evolution_analysis,
            nextDifficulty: data.next_difficulty,
            nextFocusAreas: data.next_focus_areas || [],
        } as PerformanceData & { nextDifficulty: string };
    },

    /** List all past sessions for the default user */
    async listSessions(projectId?: string): Promise<SessionSummary[]> {
        const search = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
        const res = await fetch(`${API_BASE}/sessions${search}`);
        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
        const data = await res.json();
        return data.sessions as SessionSummary[];
    },

    /** Fetch full detail for a single session */
    async getSession(sessionId: string): Promise<SessionDetail> {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
        return await res.json() as SessionDetail;
    },
};
