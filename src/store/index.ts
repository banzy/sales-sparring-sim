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

interface AppState {
  contextSetup: ContextSetupData;
  briefing: BriefingData;
  sparringSession: SparringSession;
  performance: PerformanceData;

  setContextSetup: (data: Partial<ContextSetupData>) => void;
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

const defaultMessages: Message[] = [
  { id: 1, role: 'buyer', content: 'Thanks for making the time. I\'ll be honest — we\'ve been burned by vendors before, so I need to see real proof before I bring anything to the board.', timestamp: Date.now() },
  { id: 2, role: 'seller', content: 'Absolutely, I appreciate the candor. That\'s actually one of the reasons I wanted to start with a case study from a company very similar to yours in the manufacturing space.', timestamp: Date.now() },
  { id: 3, role: 'buyer', content: 'Fine, but let\'s cut to the chase — what\'s this going to cost us? We\'re in the middle of a cost-reduction initiative.', timestamp: Date.now() },
];

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        contextSetup: {
          mode: null,
        },

        briefing: defaultBriefing,

        sparringSession: {
          isActive: false,
          messages: defaultMessages,
          currentPersona: {
            name: 'Skeptical CFO',
            description: 'Risk-averse, data-driven, 15+ years in finance',
          },
          difficulty: 'intermediate',
          objectionChecklist: defaultBriefing.objections,
          sessionStats: {
            duration: 0,
            exchanges: 0,
          },
        },

        performance: {
          overallScore: 0,
          objectionHandling: 0,
          communicationClarity: 0,
          strengths: [],
          weaknesses: [],
          aiFeedback: '',
          evolutionAnalysis: '',
          nextFocusAreas: [],
        },

        setContextSetup: (data) =>
          set((state) => ({
            contextSetup: { ...state.contextSetup, ...data },
          })),

        setBriefing: (data) =>
          set((state) => ({
            briefing: { ...state.briefing, ...data },
          })),

        startSparringSession: () =>
          set((state) => ({
            sparringSession: {
              ...state.sparringSession,
              isActive: true,
              sessionStats: {
                ...state.sparringSession.sessionStats,
                startTime: Date.now(),
              },
            },
          })),

        endSparringSession: () =>
          set((state) => ({
            sparringSession: {
              ...state.sparringSession,
              isActive: false,
            },
          })),

        addMessage: (message) =>
          set((state) => ({
            sparringSession: {
              ...state.sparringSession,
              messages: [...state.sparringSession.messages, message],
              sessionStats: {
                ...state.sparringSession.sessionStats,
                exchanges: state.sparringSession.sessionStats.exchanges + 1,
              },
            },
          })),

        setInputMode: () => { },

        updateSessionStats: (stats) =>
          set((state) => ({
            sparringSession: {
              ...state.sparringSession,
              sessionStats: {
                ...state.sparringSession.sessionStats,
                ...stats,
              },
            },
          })),

        markObjectionTested: (objectionId) =>
          set((state) => ({
            sparringSession: {
              ...state.sparringSession,
              objectionChecklist: state.sparringSession.objectionChecklist.map((obj) =>
                obj.id === objectionId ? { ...obj, tested: true } : obj
              ),
            },
          })),

        setPerformance: (data) =>
          set((state) => ({
            performance: { ...state.performance, ...data },
          })),

        resetAll: () =>
          set({
            contextSetup: { mode: null },
            briefing: defaultBriefing,
            sparringSession: {
              isActive: false,
              messages: defaultMessages,
              currentPersona: {
                name: 'Skeptical CFO',
                description: 'Risk-averse, data-driven, 15+ years in finance',
              },
              difficulty: 'intermediate',
              objectionChecklist: defaultBriefing.objections,
              sessionStats: {
                duration: 0,
                exchanges: 0,
              },
            },
            performance: {
              overallScore: 0,
              objectionHandling: 0,
              communicationClarity: 0,
              strengths: [],
              weaknesses: [],
              aiFeedback: '',
              evolutionAnalysis: '',
              nextFocusAreas: [],
            },
          }),
      }),
      {
        name: 'sales-sparring-storage',
        partialize: (state) => ({
          contextSetup: state.contextSetup,
          briefing: state.briefing,
        }),
      }
    )
  )
);
