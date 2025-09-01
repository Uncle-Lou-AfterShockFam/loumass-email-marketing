# Detailed OAuth Scope Justifications for Google Approval

## SENSITIVE SCOPE JUSTIFICATION (998 characters)
```
LOUMASS is an email marketing automation platform that enables users to send personalized campaigns through their own Gmail account. The gmail.send scope is absolutely essential for our core functionality.

HOW WE USE gmail.send:
- Users create email campaigns in our interface with rich text editors and templates
- They upload contact lists and personalize each email with merge variables
- When ready, users explicitly click "Send Campaign" to trigger sending
- We send individual emails through their Gmail account to maintain deliverability
- Each email includes unsubscribe links and complies with CAN-SPAM requirements

WHY LESS PERMISSIVE SCOPES DON'T WORK:
- gmail.compose only creates drafts but CANNOT send emails to recipients
- Without gmail.send, we cannot deliver email campaigns, which is our entire purpose
- Users expect their marketing emails to actually reach their customers

USER CONTROL:
- Every send requires explicit user action - we never send automatically
- Users see exactly what will be sent before confirming
- They can pause or stop campaigns at any time
- Full audit logs show all sent emails
```

## RESTRICTED SCOPES JUSTIFICATION (999 characters)
```
LOUMASS requires these specific Gmail scopes to provide complete email marketing functionality:

gmail.modify (ESSENTIAL FOR TRACKING):
We update message labels to track which emails are part of campaigns, mark replies as processed to avoid duplicate handling, and organize campaign threads. Without modify access, we cannot track campaign performance or prevent duplicate reply processing.

gmail.compose (DRAFT MANAGEMENT):
Users preview campaigns as drafts before sending, create email templates, and schedule sequences. This ensures quality control - users can review and edit before dispatch. Creating drafts is critical for multi-step email sequences.

gmail.readonly (REPLY DETECTION):
We detect actual human replies vs auto-responses by reading message content, identify bounce messages, and track conversation engagement. Metadata alone cannot distinguish between "Out of office" and real replies. This is essential for measuring campaign success.

WHY ALL THREE ARE REQUIRED:
These scopes work together - compose creates campaigns, modify tracks them, readonly measures engagement. Removing any scope breaks core features users pay for. Users maintain full control and transparency.
```

## FEATURES SELECTION
Select ONLY: **Email productivity**

## VIDEO DEMONSTRATION SCRIPT
Your YouTube video should show:
1. Connecting Gmail account (OAuth flow)
2. Creating an email campaign
3. Sending to a test list
4. Tracking opens and clicks
5. Detecting replies
6. Showing user control and privacy

## DOMAIN VERIFICATION
You need to verify domain ownership:
1. Go to https://search.google.com/search-console
2. Add property: https://loumassbeta.vercel.app
3. Choose HTML file verification
4. Download the verification file
5. Send me the file to add to the project

## IMMEDIATE FIX - SWITCH TO TESTING MODE

Since you've hit the 1 user cap, you need to:

1. **Go to Google Cloud Console**
2. **OAuth consent screen**
3. **Click "BACK TO TESTING"** (if available)
4. **Add test users:**
   - ljpiotti@aftershockfam.org
   - Any other emails you need

This will let you use Gmail immediately while working on verification.