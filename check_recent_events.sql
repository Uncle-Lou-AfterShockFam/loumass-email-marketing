-- Check recent email events (last 10 minutes)
SELECT id, "userId", "contactId", type, subject, "createdAt", details
FROM "EmailEvent" 
WHERE "createdAt" > NOW() - INTERVAL '10 minutes'
ORDER BY "createdAt" DESC
LIMIT 10;