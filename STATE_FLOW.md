# State Flow Architecture

## Store Structure

```
useAppStore
├── contextSetup (persisted)
│   ├── mode: 'upload' | 'synthetic' | null
│   ├── clientName?: string
│   ├── industry?: string
│   └── painPoints?: string
│
├── briefing (persisted)
│   ├── clientProfile
│   │   ├── name
│   │   ├── size
│   │   ├── budgetCycle
│   │   ├── decisionTimeline
│   │   └── buyerPersona
│   ├── valueProposition: string
│   ├── buyingConstraints: string[]
│   └── objections: Objection[]
│
├── sparringSession (ephemeral)
│   ├── isActive: boolean
│   ├── messages: Message[]
│   ├── currentPersona
│   │   ├── name
│   │   └── description
│   ├── difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adversarial'
│   ├── objectionChecklist: Objection[]
│   └── sessionStats
│       ├── duration: number
│       ├── exchanges: number
│       └── startTime?: number
│
└── performance (ephemeral)
    ├── overallScore: number
    ├── objectionHandling: number
    ├── communicationClarity: number
    ├── strengths: string[]
    ├── weaknesses: string[]
    └── aiFeedback: string
```

## Data Flow

```
┌─────────────────┐
│  ContextSetup   │
│     Page        │
└────────┬────────┘
         │ setContextSetup()
         ▼
    ┌────────┐
    │ Store  │
    └────────┘
         │
         ▼
┌─────────────────┐
│    Briefing     │ ◄── reads briefing data
│      Page       │
└────────┬────────┘
         │ navigate to arena
         ▼
┌─────────────────┐
│ SparringArena   │ ◄── reads/writes session data
│      Page       │     - messages
└────────┬────────┘     - stats
         │              - objections
         │ endSparringSession()
         ▼
┌─────────────────┐
│  Performance    │ ◄── reads performance data
│      Page       │     setPerformance()
└─────────────────┘
```

## Component-Store Integration

### ContextSetup
```typescript
const { contextSetup, setContextSetup } = useAppStore();

// Save data before navigation
setContextSetup({
  mode: 'synthetic',
  clientName: 'Acme Corp',
  industry: 'fintech',
  painPoints: '...'
});
```

### Briefing
```typescript
const { briefing } = useAppStore();

// Read-only access to briefing data
<div>{briefing.clientProfile.name}</div>
<div>{briefing.valueProposition}</div>
```

### SparringArena
```typescript
const { 
  sparringSession, 
  addMessage, 
  startSparringSession,
  endSparringSession 
} = useAppStore();

// Auto-start session
useEffect(() => {
  if (!sparringSession.isActive) {
    startSparringSession();
  }
}, []);

// Add messages
addMessage({
  id: messages.length + 1,
  role: 'seller',
  content: 'Hello',
  timestamp: Date.now()
});
```

### Performance
```typescript
const { performance, setPerformance } = useAppStore();

// Initialize performance data
useEffect(() => {
  if (performance.overallScore === 0) {
    setPerformance({
      overallScore: 72,
      objectionHandling: 58,
      // ...
    });
  }
}, []);
```

## Persistence Strategy

### Persisted (localStorage)
- `contextSetup` - User's initial configuration
- `briefing` - Generated briefing materials

**Why?** These should survive page refreshes so users don't lose their setup.

### Ephemeral (memory only)
- `sparringSession` - Active conversation state
- `performance` - Session results

**Why?** These are session-specific and should reset between sessions.

## Benefits Over Context API

1. **No Provider Nesting**: Direct import and use
2. **Selective Re-renders**: Components only re-render when their selected state changes
3. **DevTools**: Built-in Redux DevTools support
4. **Middleware**: Easy to add logging, persistence, etc.
5. **Outside React**: Can access store from anywhere (utils, API calls, etc.)
6. **Better Performance**: Optimized subscription model
7. **Simpler Testing**: Store can be tested independently

## Migration Checklist

- [x] Install zustand
- [x] Create store with all state slices
- [x] Add persistence middleware
- [x] Add devtools middleware
- [x] Update ContextSetup to use store
- [x] Update Briefing to use store
- [x] Update SparringArena to use store
- [x] Update Performance to use store
- [x] Remove all local useState for shared state
- [x] Remove React Context usage (none found)
- [x] Test TypeScript compilation
- [x] Test production build
