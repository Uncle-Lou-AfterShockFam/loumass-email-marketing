# Comprehensive Fix for Email Sequence Issues

## Issues Identified:

1. **Threading Headers Missing**: In-Reply-To and References headers are not being added to follow-up emails
2. **Both Condition Branches Sent**: Despite having proper branch configuration, both branches are executing
3. **Tracking Pixels Missing**: Follow-up emails don't have tracking pixels/links
4. **FROM Name Inconsistency**: Changes from "LOUMASS" to "LOUIS" between emails

## Root Causes:

### 1. Threading Headers Issue
- The Message-ID is stored correctly: `<CAMDusAuU6h-U4LHCAj4Sx1m3Uxx9YDXB6TmMG4qg61NBvdWmQw@mail.gmail.com>`
- The validation in gmail-service.ts would pass (contains @, <, and CAM)
- **PROBLEM**: The messageIdForReply might not be getting set or passed correctly

### 2. Condition Branch Issue
- The sequence structure has branches correctly defined in `condition` object:
  ```json
  "condition": {
    "type": "replied",
    "trueBranch": ["email-1756782885379"],
    "falseBranch": ["email-1756782888390"],
    "referenceStep": "email-1756782826479"
  }
  ```
- The code correctly accesses `stepToExecute.condition?.trueBranch`
- **PROBLEM**: The condition evaluation or branch execution logic might be failing

### 3. Tracking Pixels Issue
- First email has tracking enabled and works
- Follow-up emails have `trackingEnabled: true` but tracking not added
- **PROBLEM**: The tracking addition logic might not be executing for follow-up emails

### 4. FROM Name Issue
- First email uses "LOUMASS"
- Follow-up emails use "LOUIS"
- **PROBLEM**: The fromName parameter might not be consistent

## Fixes Needed:

### Fix 1: Ensure Message-ID is passed correctly
```typescript
// In sequence-service.ts, ensure messageIdForReply is always set when available
if (enrollment.messageIdHeader && !messageIdForReply) {
  messageIdForReply = enrollment.messageIdHeader
  console.log('✅ Using stored Message-ID for threading:', messageIdForReply)
}
```

### Fix 2: Debug condition execution
- Add comprehensive logging to understand why both branches execute
- Verify the condition evaluation returns correct boolean
- Check if the branch step lookup is working correctly

### Fix 3: Ensure tracking is added to all emails
```typescript
// Check if tracking is being added consistently
htmlContent: (enrollment.sequence.trackingEnabled && (stepToExecute.trackingEnabled !== false)) ? 
  await this.addTrackingToEmail(htmlContent, trackingId, enrollment.sequence.userId) : htmlContent
```

### Fix 4: Consistent FROM name
```typescript
// In gmail-service.ts
from: `${emailData.fromName || 'LOUMASS'} <${fromEmail}>`
```

## Implementation Plan:

1. Add comprehensive logging to trace execution flow
2. Fix Message-ID passing to ensure threading headers are added
3. Debug why both condition branches are executing
4. Ensure tracking is consistently added to all emails
5. Standardize FROM name across all emails