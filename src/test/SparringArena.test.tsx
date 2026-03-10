import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SparringArena from "@/pages/SparringArena";
import { useAppStore } from "@/store";

const navigateMock = vi.fn();
const listSessionsMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listSessions: listSessionsMock,
    getSession: vi.fn(),
    sparringChat: vi.fn(),
  },
}));

describe("SparringArena session navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().resetAll();

    useAppStore.getState().activateProject("demo-smartwings-123", {
      mode: "synthetic",
      clientName: "SmartWings",
      industry: "airlines",
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
        "Must integrate with Sabre",
        "ROI must be demonstrable within 12 months",
      ],
      objections: [],
    });
    useAppStore.getState().startSparringSession();

    listSessionsMock.mockResolvedValue([
      {
        id: "session-1",
        scenario_id: "demo-smartwings-123",
        project_id: "demo-smartwings-123",
        created_at: "2026-03-03T12:00:00.000Z",
        overall_score: 70,
        objection_handling: 68,
        communication_clarity: 74,
        weaknesses: [],
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetAll();
  });

  it("keeps the sidebar list limited to past sessions", async () => {
    render(<SparringArena />);

    await waitFor(() => {
      expect(listSessionsMock).toHaveBeenCalledWith("demo-smartwings-123");
    });

    expect(await screen.findByText("Session 1")).toBeInTheDocument();
    expect(screen.getByText("Session 2")).toBeInTheDocument();
    expect(screen.queryByText("Current Session")).not.toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });
});
