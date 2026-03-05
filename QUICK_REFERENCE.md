# Zustand Store - Quick Reference

## Import the Store

```typescript
import { useAppStore } from '@/store';
// or use custom hooks
import { useSparringSession, useBriefing } from '@/store';
```

## Common Patterns

### 1. Read State
```typescript
// Select specific value (recommended)
const messages = useAppStore((state) => state.sparringSession.messages);

// Destructure multiple values
const { briefing, setBriefing } = useAppStore();
```

### 2. Update State
```typescript
const setContextSetup = useAppStore((state) => state.setContextSetup);

setContextSetup({
  mode: 'synthetic',
  clientName: 'Acme Corp'
});
```

### 3. Add Message
```typescript
const addMessage = useAppStore((state) => state.addMessage);

addMessage({
  id: Date.now(),
  role: 'seller',
  content: 'Hello!',
  timestamp: Date.now()
});
```

### 4. Session Management
```typescript
const { startSparringSession, endSparringSession } = useAppStore();

// Start
startSparringSession();

// End
endSparringSession();
```

### 5. Using Custom Hooks
```typescript
// Sparring session with helpers
const { session, sendMessage, isActive } = useSparringSession();
sendMessage('Hello!', 'seller');

// Briefing data
const { briefing } = useBriefing();

// Performance
const { performance, setPerformance, hasData } = usePerformance();
```

## Store Actions Reference

| Action | Description | Usage |
|--------|-------------|-------|
| `setContextSetup(data)` | Update context setup | `setContextSetup({ mode: 'synthetic' })` |
| `setBriefing(data)` | Update briefing | `setBriefing({ clientProfile: {...} })` |
| `startSparringSession()` | Start session | `startSparringSession()` |
| `endSparringSession()` | End session | `endSparringSession()` |
| `addMessage(msg)` | Add message | `addMessage({ id, role, content })` |
| `updateSessionStats(stats)` | Update stats | `updateSessionStats({ duration: 120 })` |
| `markObjectionTested(id)` | Mark objection | `markObjectionTested('1')` |
| `setPerformance(data)` | Update performance | `setPerformance({ overallScore: 85 })` |
| `resetAll()` | Reset store | `resetAll()` |

## State Structure

```typescript
{
  contextSetup: {
    mode: 'upload' | 'synthetic' | null,
    clientName?: string,
    industry?: string,
    painPoints?: string
  },
  
  briefing: {
    clientProfile: { name, size, budgetCycle, decisionTimeline, buyerPersona },
    valueProposition: string,
    buyingConstraints: string[],
    objections: Objection[]
  },
  
  sparringSession: {
    isActive: boolean,
    messages: Message[],
    currentPersona: { name, description },
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adversarial',
    objectionChecklist: Objection[],
    sessionStats: { duration, exchanges, startTime }
  },
  
  performance: {
    overallScore: number,
    objectionHandling: number,
    communicationClarity: number,
    strengths: string[],
    weaknesses: string[],
    aiFeedback: string
  }
}
```

## Types Reference

```typescript
import type { 
  Message,
  Objection,
  ClientProfile,
  ContextSetupData,
  BriefingData,
  SparringSession,
  PerformanceData
} from '@/store';
```

## DevTools

Open Redux DevTools in your browser to:
- Inspect current state
- Track state changes
- Time-travel debug
- Export/import state

## Persistence

**Persisted** (survives refresh):
- `contextSetup`
- `briefing`

**Ephemeral** (resets on refresh):
- `sparringSession`
- `performance`

Stored in localStorage as: `sales-sparring-storage`

## Tips

1. **Performance**: Use selectors to subscribe only to what you need
2. **Debugging**: Use Redux DevTools to inspect state changes
3. **Testing**: Access store directly with `useAppStore.getState()`
4. **Reset**: Call `resetAll()` to clear all state
5. **Custom Hooks**: Use provided hooks for common operations

## Example: Complete Flow

```typescript
import { useAppStore, useSparringSession } from '@/store';

function MyComponent() {
  // Setup
  const { setContextSetup } = useAppStore();
  setContextSetup({ mode: 'synthetic', clientName: 'Acme' });
  
  // Session
  const { sendMessage, session } = useSparringSession();
  sendMessage('Hello!', 'seller');
  
  // Display
  return (
    <div>
      {session.messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```
