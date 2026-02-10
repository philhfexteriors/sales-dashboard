import { Resend } from 'resend'

const FROM_ADDRESS = 'H&F Exteriors <plans@hfext.com>'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(apiKey)
  }
  return _resend
}

interface SendPlanEmailParams {
  clientEmail: string
  salespersonEmail: string
  clientName: string
  pdfBuffer: Buffer
  pdfFileName: string
}

export async function sendPlanEmail({
  clientEmail,
  salespersonEmail,
  clientName,
  pdfBuffer,
  pdfFileName,
}: SendPlanEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend()

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #A30A32; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">H&F Exteriors</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Production Plan</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello${clientName ? ` ${clientName}` : ''},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for choosing H&F Exteriors. Please find your signed Production Plan attached to this email.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            This document outlines the work to be performed, materials to be used, and the agreed-upon pricing.
            Please review and keep for your records.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            If you have any questions, please don't hesitate to reach out.
          </p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 32px;">
            Best regards,<br/>
            <strong style="color: #374151;">H&F Exteriors</strong>
          </p>
        </div>
        <div style="background: #F9FAFB; padding: 16px 24px; text-align: center; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            H&F Exteriors · Quality Roofing, Siding & More
          </p>
        </div>
      </div>
    `

    const recipients = [clientEmail, salespersonEmail].filter(Boolean)
    if (recipients.length === 0) {
      return { success: false, error: 'No email recipients' }
    }

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipients,
      subject: `Your H&F Exteriors Production Plan${clientName ? ` — ${clientName}` : ''}`,
      html,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    }
  }
}
