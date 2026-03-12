import { describe, expect, it, beforeEach } from "vitest";

import { useAppStore } from "@/store";

function setupScenarioWithObjections(objectionCount: number) {
  useAppStore.getState().resetAll();
  useAppStore.getState().activateProject("demo-smartwings-123", {
    mode: "synthetic",
    clientName: "SmartWings",
  });
  
  const objections = Array.from({ length: objectionCount }, (_, i) => ({
    id: `obj-${i + 1}`,
    title: `Objection ${i + 1}`,
    detail: `Detail for objection ${i + 1}`,
    tested: false,
  }));
  
  useAppStore.getState().setBriefing({
    clientProfile: {
      name: "SmartWings",
      size: "Enterprise",
      budgetCycle: "Q4",
      decisionTimeline: "3 months",
      buyerPersona: "VP of Operations",
    },
    buyingConstraints: [],
    objections,
  });
  
  return objections;
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
});

describe("session objection selection", () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it("selects a varied subset of objections when starting a new session with mastered objections", () => {
    setupScenarioWithObjections(5);
    
    useAppStore.getState().startSparringSession();
    expect(useAppStore.getState().sparringSession.isActive).toBe(true);
    
    useAppStore.getState().addMessage({ id: 2, role: "seller", content: "test" });
    
    useAppStore.getState().endSparringSession();
    
    const masteredIds = new Set(["obj-1", "obj-2"]);
    useAppStore.getState().startSparringSession(masteredIds);
    
    const sessionObjections = useAppStore.getState().sparringSession.objectionChecklist;
    
    expect(sessionObjections.length).toBeGreaterThanOrEqual(3);
    expect(sessionObjections.length).toBeLessThanOrEqual(4);
    
    const unmasteredInSession = sessionObjections.filter(o => !masteredIds.has(o.id));
    expect(unmasteredInSession.length).toBeGreaterThan(0);
  });

  it("includes all objections when total count is small", () => {
    setupScenarioWithObjections(3);
    
    useAppStore.getState().startSparringSession();
    useAppStore.getState().addMessage({ id: 2, role: "seller", content: "test" });
    useAppStore.getState().endSparringSession();
    
    const masteredIds = new Set(["obj-1"]);
    useAppStore.getState().startSparringSession(masteredIds);
    
    const sessionObjections = useAppStore.getState().sparringSession.objectionChecklist;
    expect(sessionObjections.length).toBe(3);
  });

  it("prioritizes unmastered objections in selection", () => {
    setupScenarioWithObjections(6);
    
    useAppStore.getState().startSparringSession();
    useAppStore.getState().addMessage({ id: 2, role: "seller", content: "test" });
    useAppStore.getState().endSparringSession();
    
    const masteredIds = new Set(["obj-1", "obj-2", "obj-3", "obj-4"]);
    useAppStore.getState().startSparringSession(masteredIds);
    
    const sessionObjections = useAppStore.getState().sparringSession.objectionChecklist;
    const unmasteredInSession = sessionObjections.filter(o => !masteredIds.has(o.id));
    
    expect(unmasteredInSession.length).toBe(2);
  });
});

