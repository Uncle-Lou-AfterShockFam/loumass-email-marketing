-- Check automation execution status
SELECT ae.id, ae."automationId", ae."contactId", ae.status, ae."currentNodeId", ae."updatedAt"
FROM "AutomationExecution" ae
WHERE ae."automationId" IN (
  SELECT id FROM "Automation" WHERE "userId" = 'cmevnl4ub00008oy13oo09459'
)
ORDER BY ae."updatedAt" DESC
LIMIT 5;