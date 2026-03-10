import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export * from './hooks';

export interface Message {
  id: number;
  role: 'buyer' | 'seller';
  content: string;
  timestamp?: number;
}

export interface Objection {
  id: string;
  title: string;
  detail: string;
  tested?: boolean;
}

export interface ClientProfile {
  name: string;
  size: string;
  budgetCycle: string;
  decisionTimeline: string;
  buyerPersona: string;
}

export interface ContextSetupData {
  mode: 'upload' | 'synthetic' | 'demo' | null;
  scenarioId?: string;
  clientName?: string;
  industry?: string;
  painPoints?: string;
  uploadedFiles?: File[];
}

export interface BriefingData {
  clientProfile: ClientProfile;
  valueProposition: string;
  buyingConstraints: string[];
  objections: Objection[];
}

export interface SparringSession {
  isActive: boolean;
  messages: Message[];
  currentPersona: {
    name: string;
    description: string;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adversarial';
  objectionChecklist: Objection[];
  sessionStats: {
    duration: number;
    exchanges: number;
    startTime?: number;
  };
}

export interface PerformanceData {
  overallScore: number;
  objectionHandling: number;
  communicationClarity: number;
  strengths: string[];
  weaknesses: string[];
  aiFeedback: string;
  evolutionAnalysis: string;
  nextFocusAreas: string[];
}

interface ProjectStateSnapshot {
  contextSetup: ContextSetupData;
  briefing: BriefingData;
  sparringSession: SparringSession;
  performance: PerformanceData;
}

interface AppState {
  contextSetup: ContextSetupData;
  briefing: BriefingData;
  sparringSession: SparringSession;
  performance: PerformanceData;
  projectStates: Record<string, ProjectStateSnapshot>;

  setContextSetup: (data: Partial<ContextSetupData>) => void;
  activateProject: (scenarioId: string, contextOverrides?: Partial<ContextSetupData>) => void;
  setBriefing: (data: Partial<BriefingData>) => void;

  startSparringSession: () => void;
  endSparringSession: () => void;
  addMessage: (message: Message) => void;
  setInputMode: (mode: 'text' | 'recording' | 'processing') => void;
  updateSessionStats: (stats: Partial<SparringSession['sessionStats']>) => void;
  markObjectionTested: (objectionId: string) => void;

  setPerformance: (data: Partial<PerformanceData>) => void;

  resetAll: () => void;
}

const defaultContextSetup: ContextSetupData = {
  mode: null,
};

const defaultBriefing: BriefingData = {
  clientProfile: {
    name: 'Acme Corp',
    size: '500–1000 employees',
    budgetCycle: 'Q4 Planning',
    decisionTimeline: '6–8 weeks',
    buyerPersona: 'VP of Operations',
  },
  valueProposition: 'Our platform reduces operational overhead by 40% within the first quarter, directly addressing your team\'s bottleneck in cross-department workflows. Unlike your current solution, we offer real-time analytics and a 14-day deployment guarantee.',
  buyingConstraints: [
    'Board approval required > $50k',
    'SOC 2 Type II compliance mandatory',
    'Must integrate with Salesforce',
    '3-year contract minimum preferred',
  ],
  objections: [
    { id: '1', title: 'Budget Constraints', detail: 'The CFO will push back on pricing, citing recent cost-cutting measures across all departments.', tested: false },
    { id: '2', title: 'Existing Vendor Lock-In', detail: 'They\'ve invested heavily in their current solution over 3 years. Switching costs are a major concern.', tested: false },
    { id: '3', title: 'Timeline Concerns', detail: 'Q4 implementation feels risky. They\'ll want assurances about go-live dates and rollback plans.', tested: false },
    { id: '4', title: 'ROI Skepticism', detail: 'Past vendors over-promised. They\'ll demand concrete case studies and guaranteed metrics.', tested: false },
  ],
};

const defaultPersona = {
  name: 'Skeptical CFO',
  description: 'Risk-averse, data-driven, 15+ years in finance',
};

function cloneMessage(message: Message): Message {
  return { ...message };
}

function cloneObjection(objection: Objection): Objection {
  return { ...objection };
}

function cloneClientProfile(profile: ClientProfile): ClientProfile {
  return { ...profile };
}

function cloneContextSetup(contextSetup: ContextSetupData): ContextSetupData {
  return {
    mode: contextSetup.mode,
    scenarioId: contextSetup.scenarioId,
    clientName: contextSetup.clientName,
    industry: contextSetup.industry,
    painPoints: contextSetup.painPoints,
  };
}

function cloneBriefing(briefing: BriefingData): BriefingData {
  return {
    clientProfile: cloneClientProfile(briefing.clientProfile),
    valueProposition: briefing.valueProposition,
    buyingConstraints: [...briefing.buyingConstraints],
    objections: briefing.objections.map(cloneObjection),
  };
}

function createDefaultMessages(): Message[] {
  const timestamp = Date.now();

  return [
    { id: 1, role: 'buyer', content: 'Thanks for making the time. I\'ll be honest — we\'ve been burned by vendors before, so I need to see real proof before I bring anything to the board.', timestamp },
    { id: 2, role: 'seller', content: 'Absolutely, I appreciate the candor. That\'s actually one of the reasons I wanted to start with a case study from a company very similar to yours in the manufacturing space.', timestamp },
    { id: 3, role: 'buyer', content: 'Fine, but let\'s cut to the chase — what\'s this going to cost us? We\'re in the middle of a cost-reduction initiative.', timestamp },
  ];
}

function createDefaultSparringSession(briefing: BriefingData = defaultBriefing): SparringSession {
  return {
    isActive: false,
    messages: createDefaultMessages(),
    currentPersona: { ...defaultPersona },
    difficulty: 'intermediate',
    objectionChecklist: briefing.objections.map(cloneObjection),
    sessionStats: {
      duration: 0,
      exchanges: 0,
    },
  };
}

function cloneSparringSession(session: SparringSession): SparringSession {
  return {
    isActive: session.isActive,
    messages: session.messages.map(cloneMessage),
    currentPersona: { ...session.currentPersona },
    difficulty: session.difficulty,
    objectionChecklist: session.objectionChecklist.map(cloneObjection),
    sessionStats: { ...session.sessionStats },
  };
}

function createDefaultPerformance(): PerformanceData {
  return {
    overallScore: 0,
    objectionHandling: 0,
    communicationClarity: 0,
    strengths: [],
    weaknesses: [],
    aiFeedback: '',
    evolutionAnalysis: '',
    nextFocusAreas: [],
  };
}

function clonePerformance(performance: PerformanceData): PerformanceData {
  return {
    overallScore: performance.overallScore,
    objectionHandling: performance.objectionHandling,
    communicationClarity: performance.communicationClarity,
    strengths: [...performance.strengths],
    weaknesses: [...performance.weaknesses],
    aiFeedback: performance.aiFeedback,
    evolutionAnalysis: performance.evolutionAnalysis,
    nextFocusAreas: [...performance.nextFocusAreas],
  };
}

function mergeBriefing(base: BriefingData, updates: Partial<BriefingData>): BriefingData {
  return {
    clientProfile: {
      ...base.clientProfile,
      ...(updates.clientProfile ?? {}),
    },
    valueProposition: updates.valueProposition ?? base.valueProposition,
    buyingConstraints: updates.buyingConstraints ? [...updates.buyingConstraints] : [...base.buyingConstraints],
    objections: updates.objections ? updates.objections.map(cloneObjection) : base.objections.map(cloneObjection),
  };
}

function buildProjectSnapshot(state: AppState): ProjectStateSnapshot {
  return {
    contextSetup: cloneContextSetup(state.contextSetup),
    briefing: cloneBriefing(state.briefing),
    sparringSession: cloneSparringSession(state.sparringSession),
    performance: clonePerformance(state.performance),
  };
}

function syncActiveProjectState(state: AppState): AppState {
  const scenarioId = state.contextSetup.scenarioId;
  if (!scenarioId) {
    return state;
  }

  return {
    ...state,
    projectStates: {
      ...state.projectStates,
      [scenarioId]: buildProjectSnapshot(state),
    },
  };
}

function applyProjectState(
  state: AppState,
  scenarioId: string,
  contextOverrides: Partial<ContextSetupData> = {},
): AppState {
  const snapshot = state.projectStates[scenarioId];
  const briefing = snapshot ? cloneBriefing(snapshot.briefing) : cloneBriefing(defaultBriefing);
  const sparringSession = snapshot ? cloneSparringSession(snapshot.sparringSession) : createDefaultSparringSession(briefing);
  const performance = snapshot ? clonePerformance(snapshot.performance) : createDefaultPerformance();
  const contextSetup = snapshot
    ? { ...cloneContextSetup(snapshot.contextSetup), ...contextOverrides, scenarioId }
    : { ...cloneContextSetup(defaultContextSetup), ...contextOverrides, scenarioId };

  return syncActiveProjectState({
    ...state,
    contextSetup,
    briefing,
    sparringSession,
    performance,
  });
}

function createInitialSlices() {
  const briefing = cloneBriefing(defaultBriefing);

  return {
    contextSetup: cloneContextSetup(defaultContextSetup),
    briefing,
    sparringSession: createDefaultSparringSession(briefing),
    performance: createDefaultPerformance(),
    projectStates: {} as Record<string, ProjectStateSnapshot>,
  };
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        ...createInitialSlices(),

        setContextSetup: (data) =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              contextSetup: {
                ...state.contextSetup,
                ...data,
              },
            })
          ),

        activateProject: (scenarioId, contextOverrides = {}) =>
          set((state) => applyProjectState(syncActiveProjectState(state), scenarioId, contextOverrides)),

        setBriefing: (data) =>
          set((state) => {
            const briefing = mergeBriefing(state.briefing, data);

            return syncActiveProjectState({
              ...state,
              briefing,
              sparringSession: {
                ...state.sparringSession,
                objectionChecklist: briefing.objections.map(cloneObjection),
              },
            });
          }),

        startSparringSession: () =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              sparringSession: {
                ...state.sparringSession,
                isActive: true,
                sessionStats: {
                  ...state.sparringSession.sessionStats,
                  startTime: Date.now(),
                },
              },
            })
          ),

        endSparringSession: () =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              sparringSession: {
                ...state.sparringSession,
                isActive: false,
              },
            })
          ),

        addMessage: (message) =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              sparringSession: {
                ...state.sparringSession,
                messages: [...state.sparringSession.messages, cloneMessage(message)],
                sessionStats: {
                  ...state.sparringSession.sessionStats,
                  exchanges: state.sparringSession.sessionStats.exchanges + 1,
                },
              },
            })
          ),

        setInputMode: () => { },

        updateSessionStats: (stats) =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              sparringSession: {
                ...state.sparringSession,
                sessionStats: {
                  ...state.sparringSession.sessionStats,
                  ...stats,
                },
              },
            })
          ),

        markObjectionTested: (objectionId) =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              sparringSession: {
                ...state.sparringSession,
                objectionChecklist: state.sparringSession.objectionChecklist.map((obj) =>
                  obj.id === objectionId ? { ...obj, tested: true } : cloneObjection(obj)
                ),
              },
            })
          ),

        setPerformance: (data) =>
          set((state) =>
            syncActiveProjectState({
              ...state,
              performance: {
                ...state.performance,
                ...data,
                strengths: data.strengths ? [...data.strengths] : [...state.performance.strengths],
                weaknesses: data.weaknesses ? [...data.weaknesses] : [...state.performance.weaknesses],
                nextFocusAreas: data.nextFocusAreas ? [...data.nextFocusAreas] : [...state.performance.nextFocusAreas],
              },
            })
          ),

        resetAll: () =>
          set(() => createInitialSlices()),
      }),
      {
        name: 'sales-sparring-storage',
        partialize: (state) => ({
          contextSetup: cloneContextSetup(state.contextSetup),
          briefing: cloneBriefing(state.briefing),
          sparringSession: cloneSparringSession(state.sparringSession),
          performance: clonePerformance(state.performance),
          projectStates: Object.fromEntries(
            Object.entries(state.projectStates).map(([scenarioId, snapshot]) => [
              scenarioId,
              {
                contextSetup: cloneContextSetup(snapshot.contextSetup),
                briefing: cloneBriefing(snapshot.briefing),
                sparringSession: cloneSparringSession(snapshot.sparringSession),
                performance: clonePerformance(snapshot.performance),
              },
            ])
          ),
        }),
      }
    )
  )
);
