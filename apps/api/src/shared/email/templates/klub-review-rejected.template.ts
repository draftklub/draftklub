/**
 * Template de email — Klub rejeitado pela equipe. Tom polite, sempre
 * expõe o motivo da rejeição (mín 10 chars validado no handler) +
 * CTA pra abrir formulário e tentar de novo.
 */

export interface KlubRejectedTemplateInput {
  klubName: string;
  reason: string;
  appBaseUrl: string;
}

export function renderKlubRejectedEmail(input: KlubRejectedTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const retryUrl = `${input.appBaseUrl}/criar-klub`;
  const subject = `Sobre o cadastro do ${input.klubName} na DraftKlub`;

  const text = [
    `Olá,`,
    ``,
    `Recebemos a solicitação de cadastro do ${input.klubName}, mas dessa vez não conseguimos liberar.`,
    ``,
    `Motivo:`,
    input.reason,
    ``,
    `Você pode editar os dados e tentar de novo a qualquer momento: ${retryUrl}`,
    ``,
    `Se ficou com dúvida sobre o que precisa ajustar, é só responder este email — a gente ajuda.`,
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
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b45309;">Cadastro pendente de ajuste</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">Sobre o cadastro do ${escapeHtml(input.klubName)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;font-size:14.5px;line-height:1.6;color:#404040;">
              <p style="margin:0 0 12px 0;">Recebemos a solicitação, mas dessa vez não conseguimos liberar o cadastro.</p>
              <p style="margin:0 0 8px 0;font-weight:600;">Motivo:</p>
              <blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:3px solid #f59e0b;background-color:#fffbeb;font-size:13.5px;line-height:1.55;color:#1a1a1a;">
                ${escapeHtml(input.reason)}
              </blockquote>
              <p style="margin:0 0 12px 0;">Você pode editar os dados e tentar de novo a qualquer momento.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;">
              <a href="${retryUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                Editar e reenviar
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#737373;">
              <p style="margin:0;">Ficou na dúvida? Responda este email — a gente te ajuda a entender o que precisa ajustar.</p>
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
