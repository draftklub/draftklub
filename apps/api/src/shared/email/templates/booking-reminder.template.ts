/**
 * Email de lembrete 24h antes da reserva. Worker escaneia bookings
 * confirmados em [now+23h, now+25h] e dispara este template.
 *
 * Vai pro primary player + outros players com userId (otherPlayers
 * guests não têm User registrado). Cancela amigável: link direto pra
 * /minhas-reservas pra alterar/cancelar se preciso.
 */

export interface BookingReminderTemplateInput {
  klubName: string;
  klubSlug: string;
  spaceName: string;
  startsAt: string; // ISO
  endsAt: string | null;
  matchType: string;
  appBaseUrl: string;
}

export function renderBookingReminderEmail(input: BookingReminderTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const myBookingsUrl = `${input.appBaseUrl}/k/${input.klubSlug}/minhas-reservas`;
  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : null;
  const dateLabel = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const startLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endLabel = end
    ? end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const matchLabel = input.matchType === 'singles' ? 'Singles' : 'Doubles';
  const subject = `Lembrete: jogo amanhã no ${input.klubName}`;

  const text = [
    `Lembrete: você tem reserva amanhã!`,
    ``,
    `Klub: ${input.klubName}`,
    `Quadra: ${input.spaceName}`,
    `Data: ${dateLabel}`,
    `Horário: ${startLabel}${endLabel ? ` – ${endLabel}` : ''}`,
    `Tipo: ${matchLabel}`,
    ``,
    `Bom jogo! Se precisar alterar/cancelar:`,
    myBookingsUrl,
    ``,
    `— Equipe DraftKlub`,
  ].join('\n');

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
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0f172a;">Lembrete · 24h antes</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">Bom jogo amanhã no ${escapeHtml(input.klubName)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-size:14px;line-height:1.6;color:#404040;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e5e5;border-radius:8px;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;">
                    <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:700;">Quadra</span>
                    <span style="font-weight:600;">${escapeHtml(input.spaceName)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;">
                    <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:700;">Data</span>
                    <span style="text-transform:capitalize;">${dateLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;">
                    <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:700;">Horário</span>
                    <span>${startLabel}${endLabel ? ` – ${endLabel}` : ''}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;">
                    <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:700;">Tipo</span>
                    <span>${matchLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px 32px;">
              <a href="${myBookingsUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                Ver reserva
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#737373;">
              <p style="margin:0;">Se algum imprevisto rolou, é só cancelar pelo link acima.</p>
              <p style="margin:8px 0 0 0;font-weight:600;">— Equipe DraftKlub</p>
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
