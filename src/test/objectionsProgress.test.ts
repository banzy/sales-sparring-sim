import { describe, expect, it } from "vitest";
import type { SessionSummary } from "@/lib/api";

import { useAppStore } from "@/store";

function makeSessionWithObjections(id: string, completed: string[]): SessionSummary {
  return {
    id,
    scenario_id: "demo-smartwings-123",
    project_id: "demo-smartwings-123",
    created_at: "2026-03-03T12:00:00.000Z",
    evaluation_insufficient: false,
    evaluation_notice: null,
    overall_score: 70,
    objection_handling: 68,
    communication_clarity: 74,
    strengths: [],
    weaknesses: [],
    completed_objections: completed,
  };
}

describe("cumulative objection progress", () => {
  it("starts with all objections unchecked for the first session", () => {
    useAppStore.getState().resetAll();
    useAppStore.getState().activateProject("demo-smartwings-123", {
      mode: "synthetic",
      clientName: "SmartWings",
    });
    useAppStore.getState().setBriefing({
      clientProfile: {
        name: "SmartWings",
        size: "Enterprise",
        budgetCycle: "Q4",
        decisionTimeline: "3 months",
        buyerPersona: "VP of Operations",
      },
      buyingConstraints: [],
      objections: [
        { id: "obj-1", title: "Budget", detail: "Concerned about price", tested: false },
        { id: "obj-2", title: "Integration", detail: "Concerned about integrations", tested: false },
      ],
    });

    const state = useAppStore.getState();
    expect(state.sparringSession.objectionChecklist.every((o) => !o.tested)).toBe(true);
  });

  it("can reflect previously completed objections via store when replaying history", () => {
    useAppStore.getState().resetAll();

    // Simulate that objection 1 has been completed in a prior run
    useAppStore.getState().activateProject("demo-smartwings-123", {
      mode: "synthetic",
      clientName: "SmartWings",
    });
    useAppStore.getState().setBriefing({
      clientProfile: {
        name: "SmartWings",
        size: "Enterprise",
        budgetCycle: "Q4",
        decisionTimeline: "3 months",
        buyerPersona: "VP of Operations",
      },
      buyingConstraints: [],
      objections: [
        { id: "obj-1", title: "Budget", detail: "Concerned about price", tested: false },
        { id: "obj-2", title: "Integration", detail: "Concerned about integrations", tested: false },
      ],
    });

    useAppStore.getState().markObjectionTested("obj-1");
    const state = useAppStore.getState();

    const testedIds = state.sparringSession.objectionChecklist
      .filter((o) => o.tested)
      .map((o) => o.id)
      .sort();

    expect(testedIds).toEqual(["obj-1"]);
  });
}

