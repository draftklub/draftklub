/**
 * Email pro player principal quando uma reserva é cancelada (por ele
 * próprio, outro participante, ou staff).
 */

export interface BookingCancelledTemplateInput {
  klubName: string;
  klubSlug: string;
  spaceName: string;
  startsAt: string; // ISO
  cancelledByIsStaff: boolean;
  cancelledBySelf: boolean;
  reason: string | null;
  appBaseUrl: string;
}

export function renderBookingCancelledEmail(input: BookingCancelledTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const reservarUrl = `${input.appBaseUrl}/k/${input.klubSlug}/reservar`;
  const start = new Date(input.startsAt);
  const dateLabel = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const startLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const subject = `Reserva cancelada — ${input.klubName}`;
  const whoLabel = input.cancelledBySelf
    ? 'Você cancelou'
    : input.cancelledByIsStaff
      ? 'O Klub cancelou'
      : 'Outro participante cancelou';

  const text = [
    `${whoLabel} a reserva no ${input.klubName}.`,
    ``,
    `Quadra: ${input.spaceName}`,
    `Data: ${dateLabel}, ${startLabel}`,
    input.reason ? `Motivo: ${input.reason}` : '',
    ``,
    `Faz outra reserva: ${reservarUrl}`,
    ``,
    `— Equipe DraftKlub`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b45309;">Reserva cancelada</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">${escapeHtml(whoLabel)} a reserva</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;font-size:14px;line-height:1.6;color:#404040;">
              <p style="margin:0 0 8px 0;">
                <strong>${escapeHtml(input.spaceName)}</strong> no <strong>${escapeHtml(input.klubName)}</strong> · <span style="text-transform:capitalize;">${dateLabel}</span> às ${startLabel}.
              </p>
              ${
                input.reason
                  ? `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #f59e0b;background-color:#fffbeb;font-size:13.5px;line-height:1.55;">${escapeHtml(
                      input.reason,
                    )}</blockquote>`
                  : ''
              }
              <p style="margin:8px 0 0 0;">Você pode fazer outra reserva quando quiser.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px 32px;">
              <a href="${reservarUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                Reservar outro horário
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#737373;">
              <p style="margin:0;font-weight:600;">— Equipe DraftKlub</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
