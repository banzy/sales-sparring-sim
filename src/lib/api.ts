/** Helper functions for interacting with the FastAPI backend. */
import type { BriefingData, ClientResearch, Message, PerformanceData } from '../store';

export interface SessionSummary {
    id: string;
    project_id?: string | null;
    scenario_id: string;
    scenario_name?: string | null;
    created_at: string | null;
    evaluation_insufficient: boolean;
    evaluation_notice: string | null;
    overall_score: number | null;
    objection_handling: number | null;
    communication_clarity: number | null;
    relevance?: number | null;
    groundedness?: number | null;
    strengths: string[];
    weaknesses: string[];
    /**
     * Objection IDs that were completed in this saved session.
     * Comes from backend `completed_objections` field.
     */
    completed_objections?: string[];
}

export interface SessionDetail extends SessionSummary {
    transcript: Array<{ role: string; content: string }>;
}

export interface GlobalPerformance {
    sessionsCount: number;
    overallScore: number;
    objectionHandling: number;
    communicationClarity: number;
    relevance: number;
    groundedness: number;
    strengths: string[];
    weaknesses: string[];
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "/api";

function getErrorMessage(fallback: string, detail: any): string {
    if (typeof detail === "string" && detail.trim()) {
        return detail;
    }

    return fallback;
}

function mapClientResearch(data: any): ClientResearch | null {
    if (!data) {
        return null;
    }

    return {
        summary: data.summary,
        keyFacts: data.key_facts ?? [],
        strategicPriorities: data.strategic_priorities ?? [],
        potentialPainPoints: data.potential_pain_points ?? [],
        sources: (data.sources ?? []).map((source: any) => ({
            title: source.title,
            url: source.url,
        })),
    };
}

function mapBriefingResponse(data: any): BriefingData & { scenario_id: string } {
    return {
        scenario_id: data.scenario_id,
        clientProfile: {
            name: data.client_profile.name,
            size: data.client_profile.size,
            budgetCycle: data.client_profile.budget_cycle,
            decisionTimeline: data.client_profile.decision_timeline,
            buyerPersona: data.client_profile.buyer_persona,
        },
        clientResearch: mapClientResearch(data.client_research),
        valueProposition: data.value_proposition,
        buyingConstraints: data.buying_constraints,
        objections: data.objections.map((o: any) => ({
            id: o.id,
            title: o.title,
            detail: o.detail,
            tested: o.tested,
        })),
    };
}

export const api = {
    async loadScenario(scenarioId: string): Promise<BriefingData & { scenario_id: string }> {
        const res = await fetch(`${API_BASE}/scenarios/${encodeURIComponent(scenarioId)}`);

        if (!res.ok) {
            let detail: any = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                detail = null;
            }
            throw new Error(getErrorMessage(`API error: ${res.statusText}`, detail));
        }

        const data = await res.json();
        return mapBriefingResponse(data);
    },

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
        return await this.loadScenario(data.scenario_id);
    },

    /** Upload knowledge documents for a specific project */
    async uploadProjectDocuments(
        projectId: string,
        files: File[],
    ): Promise<{ project_id: string; documents: Array<{ id: number; filename: string; file_type?: string | null; file_size?: number | null; qdrant_doc_id?: string | null; created_at?: string | null }> }> {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("files", file);
        });

        const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/documents`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            let detail: any = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                detail = null;
            }
            throw new Error(getErrorMessage(`API error: ${res.statusText}`, detail));
        }

        return await res.json();
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
        return await this.loadScenario(data.scenario_id);
    },

    async getClientResearch(scenarioId: string): Promise<ClientResearch | null> {
        const res = await fetch(`${API_BASE}/scenarios/${encodeURIComponent(scenarioId)}/client_research`);

        if (!res.ok) {
            let detail: any = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                detail = null;
            }
            throw new Error(getErrorMessage(`API error: ${res.statusText}`, detail));
        }

        const data = await res.json();
        return mapClientResearch(data.client_research);
    },

    async refreshClientResearch(scenarioId: string): Promise<ClientResearch | null> {
        const res = await fetch(`${API_BASE}/scenarios/${encodeURIComponent(scenarioId)}/client_research`, {
            method: "POST",
        });

        if (!res.ok) {
            let detail: any = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                detail = null;
            }
            throw new Error(getErrorMessage(`API error: ${res.statusText}`, detail));
        }

        const data = await res.json();
        return mapClientResearch(data.client_research);
    },

    /** Send a message to the adversarial buyer and get a reply */
    async sparringChat(
        scenarioId: string,
        projectId: string,
        history: Message[],
        userReply: string,
        testedObjectionIds: string[] = []
    ): Promise<{ buyer_response: string, turn_feedback: { handled_well: boolean; comment: string; weakness_tags: string[] }, objections_triggered: Array<{ id: string; title: string }> }> {
        const res = await fetch(`${API_BASE}/sparring_chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario_id: scenarioId,
                project_id: projectId,
                conversation_history: history.filter(m => m.role === "buyer" || m.role === "seller"),
                user_reply: userReply,
                tested_objection_ids: testedObjectionIds,
            }),
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }

        return await res.json();
    },

    /** Evaluate the entire session */
    async evaluateSession(
        scenarioId: string,
        transcript: Message[],
        completedObjectionIds?: string[],
    ): Promise<PerformanceData> {
        const res = await fetch(`${API_BASE}/evaluate_session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario_id: scenarioId,
                project_id: scenarioId,
                transcript: transcript.map(m => ({ role: m.role, content: m.content })),
                completed_objections: completedObjectionIds ?? [],
            }),
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }

        const data = await res.json();
        const breakdown = data.score_breakdown ?? {};
        const clarityVal = data.clarity || (breakdown.clarity ? breakdown.clarity * 10 : 0) || data.communication_clarity || 0;
        const relevanceVal = data.relevance || (breakdown.relevance ? breakdown.relevance * 10 : 0) || 0;
        const groundednessVal = data.groundedness || (breakdown.groundedness ? breakdown.groundedness * 10 : 0) || 0;
        return {
            overallScore: data.overall_score,
            objectionHandling: data.objection_handling,
            communicationClarity: data.communication_clarity,
            clarity: clarityVal,
            relevance: relevanceVal,
            groundedness: groundednessVal,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            aiFeedback: data.ai_feedback,
            evolutionAnalysis: data.evolution_analysis,
            nextDifficulty: data.next_difficulty,
            nextFocusAreas: data.next_focus_areas || [],
        } as PerformanceData;
    },

    async getGlobalPerformance(projectId: string): Promise<GlobalPerformance> {
        const search = `?project_id=${encodeURIComponent(projectId)}`;
        const res = await fetch(`${API_BASE}/global_performance${search}`);
        if (!res.ok) {
            throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return {
            sessionsCount: data.sessions_count,
            overallScore: data.overall_score,
            objectionHandling: data.objection_handling,
            communicationClarity: data.communication_clarity,
            relevance: data.relevance ?? 0,
            groundedness: data.groundedness ?? 0,
            strengths: data.strengths ?? [],
            weaknesses: data.weaknesses ?? [],
        };
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

    /** Permanently delete a session and its scores */
    async deleteSession(sessionId: string): Promise<void> {
        const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(`API error: ${res.statusText}`);
    },

    /** Generate an AI-suggested seller response grounded in full context */
    async suggestResponse(
        scenarioId: string,
        history: Array<{ role: string; content: string }>,
    ): Promise<{ suggestion: string }> {
        const res = await fetch(`${API_BASE}/suggest_response`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario_id: scenarioId,
                project_id: scenarioId,
                conversation_history: history.filter(m => m.role === "buyer" || m.role === "seller"),
            }),
        });

        if (!res.ok) {
            let detail: string | null = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                detail = null;
            }
            throw new Error(getErrorMessage(`API error: ${res.statusText}`, detail));
        }

        return await res.json();
    },
};
