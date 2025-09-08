export async function GET() {
  return Response.json({
    message: "🎯 DEPLOYMENT TEST ENDPOINT",
    timestamp: new Date().toISOString(),
    deploymentId: "test-" + Date.now(),
    status: "WORKING",
    version: "3.0.0"
  })
}