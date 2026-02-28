import { createHash } from 'crypto'

type DeliveryResult = {
  provider: 'resend' | 'mailchimp' | 'none'
  delivered: boolean
  status: number
  details?: string
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.NEWSLETTER_FROM_EMAIL
  return { apiKey, from }
}

function getMailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX
  return { apiKey, audienceId, serverPrefix }
}

export async function sendNewsletterConfirmEmail(email: string, confirmUrl: string): Promise<DeliveryResult> {
  const config = getResendConfig()
  if (!config.apiKey || !config.from) {
    return { provider: 'none', delivered: false, status: 0, details: 'Resend is not configured' }
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>Confirm your newsletter subscription</h2>
      <p>You are one step away from receiving KIWI BIT updates.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px">Confirm subscription</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: 'Confirm your KIWI BIT newsletter subscription',
      html,
      text: `Confirm your subscription: ${confirmUrl}`,
    }),
  })

  return {
    provider: 'resend',
    delivered: response.ok,
    status: response.status,
    details: response.ok ? 'sent' : await response.text(),
  }
}

export async function upsertMailchimpSubscriber(email: string): Promise<DeliveryResult> {
  const config = getMailchimpConfig()
  if (!config.apiKey || !config.audienceId || !config.serverPrefix) {
    return { provider: 'none', delivered: false, status: 0, details: 'Mailchimp is not configured' }
  }

  const normalized = email.trim().toLowerCase()
  const subscriberHash = createHash('md5').update(normalized).digest('hex')
  const endpoint = `https://${config.serverPrefix}.api.mailchimp.com/3.0/lists/${config.audienceId}/members/${subscriberHash}`
  const auth = Buffer.from(`anystring:${config.apiKey}`).toString('base64')

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      email_address: normalized,
      status_if_new: 'subscribed',
      status: 'subscribed',
    }),
  })

  return {
    provider: 'mailchimp',
    delivered: response.ok,
    status: response.status,
    details: response.ok ? 'subscribed' : await response.text(),
  }
}
