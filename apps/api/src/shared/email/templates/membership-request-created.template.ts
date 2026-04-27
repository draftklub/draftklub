/**
 * Email pros KLUB_ADMINs de um Klub privado quando alguém pede entrada.
 * Inclui CTA pra abrir a fila de solicitações no admin do Klub.
 */

export interface MembershipRequestCreatedTemplateInput {
  klubName: string;
  klubSlug: string;
  applicantName: string;
  message: string;
  appBaseUrl: string;
}

export function renderMembershipRequestCreatedEmail(
  input: MembershipRequestCreatedTemplateInput,
): { subject: string; html: string; text: string } {
  const reviewUrl = `${input.appBaseUrl}/k/${input.klubSlug}/solicitacoes`;
  const subject = `Nova solicitação de entrada — ${input.klubName}`;

  const text = [
    `Olá!`,
    ``,
    `${input.applicantName} pediu pra entrar no ${input.klubName}.`,
    ``,
    `Mensagem do solicitante:`,
    input.message,
    ``,
    `Revise e aprove (ou rejeite com um motivo): ${reviewUrl}`,
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
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0f172a;">Nova solicitação</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">${escapeHtml(input.applicantName)} quer entrar no ${escapeHtml(input.klubName)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;font-size:14.5px;line-height:1.6;color:#404040;">
              <p style="margin:0 0 8px 0;font-weight:600;">Mensagem do solicitante:</p>
              <blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:3px solid #0f172a;background-color:#f8fafc;font-size:13.5px;line-height:1.55;color:#1a1a1a;">
                ${escapeHtml(input.message)}
              </blockquote>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;">
              <a href="${reviewUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                Revisar solicitação
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
