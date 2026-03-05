/** Helper functions for interacting with the FastAPI backend. */
import type { BriefingData, Message, PerformanceData, SparringSession } from '../store';

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

    /** Send a message to the adversarial buyer and get a reply */
    async sparringChat(
        scenarioId: string,
        history: Message[],
        userReply: string
    ): Promise<{ buyer_response: string, turn_feedback: any, objections_triggered: any[] }> {
        const res = await fetch(`${API_BASE}/sparring_chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scenario_id: scenarioId,
                user_id: "demo",
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
                user_id: "demo",
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
            nextDifficulty: data.next_difficulty,
        } as PerformanceData & { nextDifficulty: string };
    }
};
