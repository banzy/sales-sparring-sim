import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store";

describe("active project session state", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().resetAll();
  });

  it("restores the SmartWings demo state when the demo project is reselected", () => {
    const demoId = "demo-smartwings-123";
    const otherId = "scenario_other_123";

    useAppStore.getState().activateProject(demoId, {
      mode: "synthetic",
      clientName: "SmartWings",
      industry: "airlines",
      painPoints: "Pitching Ciklum AI Passenger Tracking",
    });
    useAppStore.getState().setBriefing({
      clientProfile: {
        name: "SmartWings",
        size: "Enterprise",
        budgetCycle: "Annual",
        decisionTimeline: "90 days",
        buyerPersona: "Head of Customer Experience",
      },
      clientResearch: {
        summary: "SmartWings is a regional airline balancing efficiency, customer experience, and operational reliability.",
        keyFacts: ["Operates in the airline sector"],
        strategicPriorities: ["Improve passenger communication"],
        potentialPainPoints: ["Irregular operations create support spikes"],
        sources: [{ title: "Corporate site", url: "https://www.smartwings.com" }],
      },
      objections: [
        { id: "sw-1", title: "Integration risk", detail: "Needs proof it fits the airline stack.", tested: false },
      ],
    });
    useAppStore.getState().addMessage({
      id: 4,
      role: "seller",
      content: "SmartWings-specific opener",
      timestamp: 1,
    });
    useAppStore.getState().setPerformance({
      overallScore: 82,
      strengths: ["Handled ROI objection well"],
    });

    useAppStore.getState().activateProject(otherId, {
      mode: "synthetic",
      clientName: "Other Corp",
    });

    useAppStore.getState().activateProject(demoId);
    const state = useAppStore.getState();

    expect(state.contextSetup.scenarioId).toBe(demoId);
    expect(state.contextSetup.clientName).toBe("SmartWings");
    expect(state.briefing.clientProfile.name).toBe("SmartWings");
    expect(state.briefing.clientResearch?.summary).toContain("regional airline");
    expect(state.sparringSession.messages.at(-1)?.content).toBe("SmartWings-specific opener");
    expect(state.sparringSession.objectionChecklist[0]?.title).toBe("Integration risk");
    expect(state.performance.overallScore).toBe(82);
  });

  it("replaces the generic seed transcript with a project-specific opener when briefing loads", () => {
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
        buyerPersona: "CIO / VP of Customer Experience",
      },
      buyingConstraints: [
        "Must integrate with legacy Sabre systems without downtime",
        "ROI must be demonstrable within 12 months",
      ],
      objections: [
        { id: "sw-1", title: "Integration risk", detail: "Show how the rollout avoids downtime.", tested: false },
      ],
    });

    const state = useAppStore.getState();

    expect(state.sparringSession.currentPersona.name).toBe("CIO / VP of Customer Experience");
    expect(state.sparringSession.messages).toHaveLength(1);
    expect(state.sparringSession.messages[0]?.content).toContain("SmartWings");
    expect(state.sparringSession.messages[0]?.content).toContain("Sabre");
  });

  it("starts a fresh live session after a completed session has been scored", () => {
    useAppStore.getState().activateProject("demo-smartwings-123", {
      mode: "synthetic",
      clientName: "SmartWings",
      industry: "airlines",
      painPoints: "Pitching Ciklum AI Passenger Tracking",
    });

    useAppStore.getState().setBriefing({
      clientProfile: {
        name: "SmartWings",
        size: "Enterprise",
        budgetCycle: "Q4",
        decisionTimeline: "3 months",
        buyerPersona: "VP of Operations",
      },
      buyingConstraints: [
        "Must integrate with legacy Sabre systems without downtime",
        "ROI must be demonstrable within 12 months",
      ],
      objections: [
        { id: "sw-1", title: "Integration risk", detail: "Show how the rollout avoids downtime.", tested: false },
      ],
    });

    useAppStore.getState().startSparringSession();
    useAppStore.getState().addMessage({
      id: 2,
      role: "seller",
      content: "Completed session seller message",
      timestamp: 1,
    });
    useAppStore.getState().addMessage({
      id: 3,
      role: "buyer",
      content: "Completed session buyer message",
      timestamp: 2,
    });
    useAppStore.getState().endSparringSession();
    useAppStore.getState().setPerformance({
      overallScore: 78,
      objectionHandling: 74,
      communicationClarity: 81,
      strengths: ["Strong ROI framing"],
    });

    useAppStore.getState().startSparringSession();
    const state = useAppStore.getState();

    expect(state.performance.overallScore).toBe(0);
    expect(state.sparringSession.isActive).toBe(true);
    expect(state.sparringSession.messages).toHaveLength(1);
    expect(state.sparringSession.messages[0]?.content).toContain("SmartWings");
    expect(state.sparringSession.messages[0]?.content).not.toContain("Completed session seller message");
  });

  it("starts a fresh live session after any ended run, even before scoring", () => {
    useAppStore.getState().activateProject("demo-smartwings-123", {
      mode: "synthetic",
      clientName: "SmartWings",
      industry: "airlines",
      painPoints: "Pitching Ciklum AI Passenger Tracking",
    });

    useAppStore.getState().setBriefing({
      clientProfile: {
        name: "SmartWings",
        size: "Enterprise",
        budgetCycle: "Q4",
        decisionTimeline: "3 months",
        buyerPersona: "VP of Operations",
      },
      buyingConstraints: [
        "Must integrate with legacy Sabre systems without downtime",
        "ROI must be demonstrable within 12 months",
      ],
      objections: [
        { id: "sw-1", title: "Integration risk", detail: "Show how the rollout avoids downtime.", tested: false },
      ],
    });

    useAppStore.getState().startSparringSession();
    useAppStore.getState().addMessage({
      id: 2,
      role: "seller",
      content: "Unscored session seller message",
      timestamp: 1,
    });
    useAppStore.getState().addMessage({
      id: 3,
      role: "buyer",
      content: "Unscored session buyer message",
      timestamp: 2,
    });
    useAppStore.getState().endSparringSession();

    useAppStore.getState().startSparringSession();
    const state = useAppStore.getState();

    expect(state.sparringSession.isActive).toBe(true);
    expect(state.sparringSession.messages).toHaveLength(1);
    expect(state.sparringSession.messages[0]?.content).toContain("SmartWings");
    expect(state.sparringSession.messages[0]?.content).not.toContain("Unscored session seller message");
  });
});
