type AlertSeverity = 'info' | 'warning' | 'critical'

type OpsAlertInput = {
  event: string
  severity: AlertSeverity
  message: string
  context?: Record<string, unknown>
}

function getWebhookUrl() {
  return process.env.OPS_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || ''
}

export async function emitOpsAlert(input: OpsAlertInput) {
  const webhook = getWebhookUrl()
  if (!webhook) return

  const payload = {
    text: `[${input.severity.toUpperCase()}] ${input.event}: ${input.message}`,
    event: input.event,
    severity: input.severity,
    message: input.message,
    context: input.context ?? {},
    at: new Date().toISOString(),
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Do not break request flow on alerting failures.
  }
}
