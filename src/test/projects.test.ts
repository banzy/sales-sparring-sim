import { describe, expect, it } from "vitest";
import { formatScenarioIdAsProjectName, resolveProjectName } from "@/lib/projects";

describe("project labels", () => {
  it("formats stored scenario ids into readable project names", () => {
    expect(formatScenarioIdAsProjectName("demo-smartwings-123")).toBe("SmartWings");
    expect(formatScenarioIdAsProjectName("scenario_acme-corp_9f8e7d6c")).toBe("Acme Corp");
  });

  it("prefers explicit client names when resolving a project label", () => {
    expect(resolveProjectName({
      scenarioId: "scenario_acme-corp_9f8e7d6c",
      clientName: "Acme Corp Europe",
      fallbackName: "Acme",
    })).toBe("Acme Corp Europe");
  });
});
