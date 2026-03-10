export function formatScenarioIdAsProjectName(scenarioId?: string | null): string | null {
  if (!scenarioId) return null;

  if (scenarioId === "demo-smartwings-123") {
    return "SmartWings";
  }

  const normalized = scenarioId
    .replace(/^demo-/, "")
    .replace(/^scenario_/, "")
    .replace(/[-_][a-f0-9]{8}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  if (!normalized) {
    return scenarioId;
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveProjectName({
  scenarioId,
  clientName,
  fallbackName,
}: {
  scenarioId?: string | null;
  clientName?: string | null;
  fallbackName?: string | null;
}): string {
  return (
    clientName?.trim() ||
    fallbackName?.trim() ||
    formatScenarioIdAsProjectName(scenarioId) ||
    "Untitled Project"
  );
}
