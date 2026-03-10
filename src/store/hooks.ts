import { useAppStore } from './index';
import type { Message } from './index';

/**
 * Hook for managing context setup
 */
export const useContextSetup = () => {
  const contextSetup = useAppStore((state) => state.contextSetup);
  const setContextSetup = useAppStore((state) => state.setContextSetup);
  
  return {
    contextSetup,
    setContextSetup,
    isConfigured: contextSetup.mode !== null,
  };
};

/**
 * Hook for accessing briefing data
 */
export const useBriefing = () => {
  const briefing = useAppStore((state) => state.briefing);
  const setBriefing = useAppStore((state) => state.setBriefing);
  
  return {
    briefing,
    setBriefing,
  };
};

/**
 * Hook for managing sparring session
 */
export const useSparringSession = () => {
  const session = useAppStore((state) => state.sparringSession);
  const addMessage = useAppStore((state) => state.addMessage);
  const startSession = useAppStore((state) => state.startSparringSession);
  const endSession = useAppStore((state) => state.endSparringSession);
  const updateStats = useAppStore((state) => state.updateSessionStats);
  const markObjectionTested = useAppStore((state) => state.markObjectionTested);
  
  const sendMessage = (content: string, role: 'buyer' | 'seller' = 'seller') => {
    const message: Message = {
      id: session.messages.length + 1,
      role,
      content,
      timestamp: Date.now(),
    };
    addMessage(message);
    return message;
  };
  
  return {
    session,
    addMessage,
    sendMessage,
    startSession,
    endSession,
    updateStats,
    markObjectionTested,
    isActive: session.isActive,
    messageCount: session.messages.length,
  };
};

/**
 * Hook for managing performance data
 */
export const usePerformance = () => {
  const performance = useAppStore((state) => state.performance);
  const setPerformance = useAppStore((state) => state.setPerformance);
  const hasData =
    performance.aiFeedback.trim().length > 0 ||
    performance.evolutionAnalysis.trim().length > 0 ||
    performance.strengths.length > 0 ||
    performance.weaknesses.length > 0 ||
    performance.nextFocusAreas.length > 0;
  
  return {
    performance,
    setPerformance,
    hasData,
  };
};

/**
 * Hook for resetting the entire app state
 */
export const useResetApp = () => {
  const resetAll = useAppStore((state) => state.resetAll);
  
  return {
    resetAll,
  };
};
