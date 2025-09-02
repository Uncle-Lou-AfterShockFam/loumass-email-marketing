# 🚀 Enhanced Sequence Automation - Acumbamail-Style Conditional Logic

## 📋 Overview
Transform LOUMASS sequences into powerful automation flows with advanced conditional branching, behavioral triggers, and sophisticated node types similar to Acumbamail.

## 🎯 Core Enhancements Required

### 1. Initial Event Types (Triggers)
Currently we have manual enrollment. We need to add:

```typescript
enum SequenceTriggerType {
  MANUAL = 'MANUAL',                    // ✅ Current
  NEW_SUBSCRIBER = 'NEW_SUBSCRIBER',    // 🆕 When contact added to list
  SPECIFIC_DATE = 'SPECIFIC_DATE',      // 🆕 Trigger on specific date/time
  SEGMENT_ENTRY = 'SEGMENT_ENTRY',      // 🆕 When contact enters segment
  TAG_ADDED = 'TAG_ADDED',              // 🆕 When specific tag is added
  FORM_SUBMISSION = 'FORM_SUBMISSION',  // 🆕 When form is submitted
}
```

### 2. Enhanced Node Types

#### Current Implementation:
- ✅ Email Step
- ✅ Delay Step  
- ✅ Basic Condition (opened/clicked/replied)

#### New Node Types Needed:

```typescript
interface SequenceStepTypes {
  // Existing
  EMAIL: EmailStep;
  DELAY: DelayStep;
  CONDITION: ConditionStep;
  
  // New Advanced Nodes
  WAIT: WaitStep;              // Fixed or variable wait times
  UNTIL: UntilStep;            // Wait until condition is met
  WHEN: WhenStep;              // Wait until specific date/time
  RULES: RulesStep;            // Field-based conditions
  BEHAVIOR: BehaviorStep;      // Email engagement conditions
  SMS: SmsStep;                // SMS sending
  WEBHOOK: WebhookStep;        // External API calls
  MOVE_TO: MoveToStep;         // Jump to another node
  SPLIT_TEST: SplitTestStep;   // A/B testing
  GOAL: GoalStep;              // Track conversion goals
}
```

### 3. Enhanced Condition Types

#### A. Rules-Based Conditions
```typescript
interface RulesCondition {
  type: 'RULES';
  operator: 'ALL' | 'ANY';  // All conditions or any condition
  rules: Array<{
    field: string;           // Contact field name
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' | 
              'GREATER_THAN' | 'LESS_THAN' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
    value: any;
  }>;
  trueBranch: SequenceStep[];
  falseBranch: SequenceStep[];
}
```

#### B. Behavioral Conditions
```typescript
interface BehaviorCondition {
  type: 'BEHAVIOR';
  action: 'OPENED' | 'NOT_OPENED' | 'CLICKED' | 'NOT_CLICKED' | 
          'REPLIED' | 'NOT_REPLIED' | 'BOUNCED' | 'NOT_BOUNCED';
  referenceEmail: string;    // ID of previous email in sequence
  timeWindow?: {             // Optional time constraint
    value: number;
    unit: 'MINUTES' | 'HOURS' | 'DAYS';
  };
  specificLink?: string;     // For click conditions
  trueBranch: SequenceStep[];
  falseBranch: SequenceStep[];
}
```

#### C. Until Conditions (Blocking)
```typescript
interface UntilCondition {
  type: 'UNTIL';
  condition: RulesCondition | BehaviorCondition;
  timeout?: {               // Optional maximum wait time
    value: number;
    unit: 'MINUTES' | 'HOURS' | 'DAYS';
    timeoutBranch: SequenceStep[];
  };
}
```

### 4. Advanced Wait Types

#### A. Variable Wait
```typescript
interface VariableWait {
  type: 'VARIABLE';
  waitUntil: {
    dayOfWeek?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 
                'FRIDAY' | 'SATURDAY' | 'SUNDAY';
    dayOfMonth?: number;     // 1-31
    time: string;            // "14:30" format
    timezone: string;        // IANA timezone
  };
}
```

#### B. Business Hours Wait
```typescript
interface BusinessHoursWait {
  type: 'BUSINESS_HOURS';
  nextBusinessDay: boolean;
  businessHours: {
    start: string;          // "09:00"
    end: string;            // "17:00"
    workDays: number[];     // [1,2,3,4,5] for Mon-Fri
    timezone: string;
  };
}
```

### 5. Enhanced Database Schema

```prisma
// Update Sequence model
model Sequence {
  id               String           @id @default(cuid())
  userId           String
  name             String
  description      String?
  
  // Trigger configuration
  triggerType      SequenceTriggerType @default(MANUAL)
  triggerConfig    Json?            // Stores trigger-specific settings
  
  // New fields
  applyToExisting  Boolean          @default(false)  // Apply to existing contacts
  maxEnrollments   Int?             // Limit total enrollments
  reEnrollment     Boolean          @default(false)  // Allow re-enrollment
  reEnrollmentDelay Int?            // Days before re-enrollment allowed
  
  // Enhanced step storage
  steps            Json             // Enhanced step structure
  nodes            SequenceNode[]   // New: Individual nodes for better tracking
  
  // ... existing fields
}

// New: Individual node tracking
model SequenceNode {
  id              String           @id @default(cuid())
  sequenceId      String
  nodeId          String           // Unique identifier within sequence
  type            String           // EMAIL, DELAY, CONDITION, etc.
  config          Json             // Node-specific configuration
  
  // Statistics
  totalPassed     Int              @default(0)
  currentPassed   Int              @default(0)  // Since last activation
  inNode          Int              @default(0)  // Currently waiting
  
  sequence        Sequence         @relation(fields: [sequenceId], references: [id])
  nodeExecutions  NodeExecution[]
  
  @@unique([sequenceId, nodeId])
  @@index([sequenceId])
}

// New: Track individual node executions
model NodeExecution {
  id              String           @id @default(cuid())
  nodeId          String
  enrollmentId    String
  
  enteredAt       DateTime         @default(now())
  exitedAt        DateTime?
  status          NodeStatus       // WAITING, COMPLETED, FAILED, SKIPPED
  result          Json?            // Store condition results, etc.
  
  node            SequenceNode     @relation(fields: [nodeId], references: [id])
  enrollment      SequenceEnrollment @relation(fields: [enrollmentId], references: [id])
  
  @@index([nodeId])
  @@index([enrollmentId])
}

enum NodeStatus {
  WAITING
  COMPLETED
  FAILED
  SKIPPED
  TIMEOUT
}

enum SequenceTriggerType {
  MANUAL
  NEW_SUBSCRIBER
  SPECIFIC_DATE
  SEGMENT_ENTRY
  TAG_ADDED
  FORM_SUBMISSION
}
```

### 6. UI Components to Build

#### A. Enhanced Step Palette
```tsx
// components/sequences/StepPalette.tsx
const stepTypes = [
  // Communication
  { icon: Email, label: 'Email', type: 'EMAIL' },
  { icon: MessageSquare, label: 'SMS', type: 'SMS' },
  
  // Timing
  { icon: Clock, label: 'Wait', type: 'WAIT' },
  { icon: Calendar, label: 'Wait Until Date', type: 'WHEN' },
  { icon: Pause, label: 'Wait Until Condition', type: 'UNTIL' },
  
  // Logic
  { icon: GitBranch, label: 'Rules Condition', type: 'RULES' },
  { icon: UserCheck, label: 'Behavior Check', type: 'BEHAVIOR' },
  { icon: Shuffle, label: 'A/B Split', type: 'SPLIT_TEST' },
  { icon: ArrowRight, label: 'Jump To', type: 'MOVE_TO' },
  
  // Integration
  { icon: Webhook, label: 'Webhook', type: 'WEBHOOK' },
  { icon: Target, label: 'Goal', type: 'GOAL' },
];
```

#### B. Condition Builder UI
```tsx
// components/sequences/ConditionBuilder.tsx
interface ConditionBuilderProps {
  type: 'RULES' | 'BEHAVIOR';
  onChange: (condition: Condition) => void;
}

// Visual rule builder with dropdown selectors
// Field selector → Operator selector → Value input
// Add/Remove rule buttons
// AND/OR toggle for multiple rules
```

#### C. Flow Visualization
```tsx
// components/sequences/FlowVisualization.tsx
// Enhanced flow chart showing:
// - Node statistics (total/current/waiting)
// - Branch percentages
// - Active paths highlighted
// - Click to view node details
```

### 7. Execution Engine Updates

#### A. Trigger Manager
```typescript
class TriggerManager {
  // Monitor for trigger events
  async checkTriggers() {
    await this.checkNewSubscribers();
    await this.checkSpecificDates();
    await this.checkSegmentChanges();
    await this.checkTagAdditions();
  }
  
  // Auto-enroll based on triggers
  async autoEnroll(
    sequence: Sequence,
    contacts: Contact[]
  ) {
    // Check if should apply to existing
    // Respect max enrollments
    // Handle re-enrollment rules
  }
}
```

#### B. Advanced Condition Evaluator
```typescript
class AdvancedConditionEvaluator {
  // Evaluate field-based rules
  async evaluateRules(
    contact: Contact,
    rules: Rule[],
    operator: 'ALL' | 'ANY'
  ): Promise<boolean> {
    // Check each rule against contact fields
    // Apply ALL/ANY logic
  }
  
  // Evaluate behavioral conditions
  async evaluateBehavior(
    enrollment: SequenceEnrollment,
    behavior: BehaviorCondition
  ): Promise<boolean> {
    // Check EmailEvents for behavior
    // Apply time windows
    // Check specific links if needed
  }
  
  // Handle UNTIL conditions
  async waitUntilConditionMet(
    enrollment: SequenceEnrollment,
    condition: UntilCondition
  ): Promise<boolean> {
    // Keep checking condition
    // Respect timeout if set
    // Move to timeout branch if expired
  }
}
```

#### C. Node Executor
```typescript
class NodeExecutor {
  async executeNode(
    node: SequenceNode,
    enrollment: SequenceEnrollment
  ) {
    // Track entry to node
    await this.recordNodeEntry(node, enrollment);
    
    switch(node.type) {
      case 'EMAIL':
        await this.sendEmail(node, enrollment);
        break;
      case 'SMS':
        await this.sendSMS(node, enrollment);
        break;
      case 'WEBHOOK':
        await this.callWebhook(node, enrollment);
        break;
      case 'WAIT':
        await this.scheduleWait(node, enrollment);
        break;
      case 'RULES':
        await this.evaluateRules(node, enrollment);
        break;
      case 'MOVE_TO':
        await this.jumpToNode(node, enrollment);
        break;
      // ... other node types
    }
    
    // Track exit from node
    await this.recordNodeExit(node, enrollment);
  }
}
```

### 8. API Endpoints

```typescript
// Sequence statistics
GET /api/sequences/[id]/statistics
Response: {
  nodes: [{
    nodeId: string;
    type: string;
    totalPassed: number;
    currentPassed: number;
    inNode: number;
    conversionRate?: number;
  }]
}

// Node-specific statistics
GET /api/sequences/[id]/nodes/[nodeId]/statistics
Response: {
  executions: [{
    contactEmail: string;
    enteredAt: Date;
    exitedAt?: Date;
    status: string;
    result?: any;
  }]
}

// Update node configuration
PUT /api/sequences/[id]/nodes/[nodeId]
Body: {
  config: { /* node-specific config */ }
}

// Test sequence with sample contact
POST /api/sequences/[id]/test
Body: {
  contactId: string;
  startNode?: string;  // Optional: start from specific node
}
```

### 9. Real-time Updates

#### WebSocket Events
```typescript
// Server -> Client events
{
  type: 'NODE_ENTRY',
  sequenceId: string,
  nodeId: string,
  enrollmentId: string,
  contactEmail: string
}

{
  type: 'NODE_EXIT',
  sequenceId: string,
  nodeId: string,
  enrollmentId: string,
  result: any
}

{
  type: 'SEQUENCE_COMPLETED',
  sequenceId: string,
  enrollmentId: string,
  totalNodes: number,
  duration: number
}
```

### 10. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- [ ] Update database schema
- [ ] Create node tracking system
- [ ] Build trigger manager
- [ ] Implement basic node executor

#### Phase 2: Advanced Conditions (Week 2)
- [ ] Rules-based conditions
- [ ] Behavioral conditions
- [ ] UNTIL conditions
- [ ] Condition builder UI

#### Phase 3: Advanced Timing (Week 3)
- [ ] Variable wait (day of week/month)
- [ ] Business hours wait
- [ ] Specific date/time wait
- [ ] Timezone handling

#### Phase 4: Integrations (Week 4)
- [ ] SMS integration
- [ ] Webhook support
- [ ] Goal tracking
- [ ] A/B split testing

#### Phase 5: Analytics & Monitoring (Week 5)
- [ ] Node statistics
- [ ] Flow visualization
- [ ] Real-time updates
- [ ] Performance reports

### 11. Success Metrics
- Support 10+ node types
- Handle 1000+ concurrent enrollments
- Process nodes within 1 minute of scheduled time
- 99.9% execution reliability
- Real-time statistics updates

---
*Last Updated: December 2024*
*Reference: Acumbamail automation features*