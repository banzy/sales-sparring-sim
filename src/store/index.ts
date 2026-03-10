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

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ClientResearch {
  summary: string;
  keyFacts: string[];
  strategicPriorities: string[];
  potentialPainPoints: string[];
  sources: ResearchSource[];
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
  clientResearch: ClientResearch | null;
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
  clientResearch: null,
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

function normalizeConstraint(constraint: string): string {
  return constraint.trim().replace(/\.+$/, '');
}

function buildScenarioPersona(briefing: BriefingData): SparringSession['currentPersona'] {
  const persona = briefing.clientProfile.buyerPersona?.trim();
  if (!persona) {
    return { ...defaultPersona };
  }

  return {
    name: persona,
    description: `${briefing.clientProfile.name} stakeholder focused on risk, implementation credibility, and measurable ROI.`,
  };
}

function buildScenarioOpeningMessage(briefing: BriefingData): Message {
  const clientName = briefing.clientProfile.name?.trim() || 'our team';
  const constraints = briefing.buyingConstraints
    .slice(0, 3)
    .map(normalizeConstraint)
    .filter(Boolean);

  const content = constraints.length > 0
    ? `Thanks for joining. At ${clientName}, I need clarity on ${constraints.join(', ')}. Why should we take this seriously now?`
    : `Thanks for joining. Give me the clearest case for why ${clientName} should take this seriously now.`;

  return {
    id: 1,
    role: 'buyer',
    content,
    timestamp: Date.now(),
  };
}

function cloneMessage(message: Message): Message {
  return { ...message };
}

function cloneObjection(objection: Objection): Objection {
  return { ...objection };
}

function cloneClientProfile(profile: ClientProfile): ClientProfile {
  return { ...profile };
}

function cloneResearchSource(source: ResearchSource): ResearchSource {
  return { ...source };
}

function cloneClientResearch(research: ClientResearch): ClientResearch {
  return {
    summary: research.summary,
    keyFacts: [...research.keyFacts],
    strategicPriorities: [...research.strategicPriorities],
    potentialPainPoints: [...research.potentialPainPoints],
    sources: research.sources.map(cloneResearchSource),
  };
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
    clientResearch: briefing.clientResearch ? cloneClientResearch(briefing.clientResearch) : null,
    valueProposition: briefing.valueProposition,
    buyingConstraints: [...briefing.buyingConstraints],
    objections: briefing.objections.map(cloneObjection),
  };
}

function createDefaultSparringSession(
  briefing: BriefingData = defaultBriefing,
  contextSetup: ContextSetupData = defaultContextSetup,
): SparringSession {
  const resolvedBriefing = briefing.clientProfile.name || contextSetup.clientName
    ? briefing
    : defaultBriefing;

  return {
    isActive: false,
    messages: [buildScenarioOpeningMessage(resolvedBriefing)],
    currentPersona: buildScenarioPersona(resolvedBriefing),
    difficulty: 'intermediate',
    objectionChecklist: resolvedBriefing.objections.map(cloneObjection),
    sessionStats: {
      duration: 0,
      exchanges: 0,
    },
  };
}

function createFreshSparringSession(
  briefing: BriefingData,
  contextSetup: ContextSetupData,
  difficulty: SparringSession['difficulty'],
): SparringSession {
  return {
    ...createDefaultSparringSession(briefing, contextSetup),
    difficulty,
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
    clientResearch: updates.clientResearch === undefined
      ? (base.clientResearch ? cloneClientResearch(base.clientResearch) : null)
      : (updates.clientResearch ? cloneClientResearch(updates.clientResearch) : null),
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
  const contextSetup = snapshot
    ? { ...cloneContextSetup(snapshot.contextSetup), ...contextOverrides, scenarioId }
    : { ...cloneContextSetup(defaultContextSetup), ...contextOverrides, scenarioId };
  const sparringSession = snapshot
    ? cloneSparringSession(snapshot.sparringSession)
    : createDefaultSparringSession(briefing, contextSetup);
  const performance = snapshot ? clonePerformance(snapshot.performance) : createDefaultPerformance();

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
  const contextSetup = cloneContextSetup(defaultContextSetup);

  return {
    contextSetup,
    briefing,
    sparringSession: createDefaultSparringSession(briefing, contextSetup),
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
            const shouldReplaceSeedTranscript = state.sparringSession.sessionStats.exchanges === 0;

            return syncActiveProjectState({
              ...state,
              briefing,
              sparringSession: {
                ...state.sparringSession,
                currentPersona: buildScenarioPersona(briefing),
                messages: shouldReplaceSeedTranscript
                  ? [buildScenarioOpeningMessage(briefing)]
                  : state.sparringSession.messages.map(cloneMessage),
                objectionChecklist: briefing.objections.map(cloneObjection),
              },
            });
          }),

        startSparringSession: () =>
          set((state) => {
            const shouldCreateFreshSession = state.performance.overallScore > 0;
            const nextSession = shouldCreateFreshSession
              ? createFreshSparringSession(
                state.briefing,
                state.contextSetup,
                state.sparringSession.difficulty,
              )
              : cloneSparringSession(state.sparringSession);

            return syncActiveProjectState({
              ...state,
              sparringSession: {
                ...nextSession,
                isActive: true,
                sessionStats: {
                  ...nextSession.sessionStats,
                  startTime: Date.now(),
                },
              },
              performance: shouldCreateFreshSession
                ? createDefaultPerformance()
                : clonePerformance(state.performance),
            });
          }),

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
