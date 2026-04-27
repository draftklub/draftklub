/**
 * Template de email — Klub aprovado pela equipe DraftKlub. Tom polite,
 * brand voice "casual-profissional" (PT-BR). Não usa CSS externo;
 * inline-only pra max compatibilidade de cliente de email.
 */

export interface KlubApprovedTemplateInput {
  klubName: string;
  klubSlug: string;
  appBaseUrl: string;
}

export function renderKlubApprovedEmail(input: KlubApprovedTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const dashboardUrl = `${input.appBaseUrl}/k/${input.klubSlug}/dashboard`;
  const subject = `${input.klubName} foi aprovado na DraftKlub`;

  const text = [
    `Olá!`,
    ``,
    `Tudo certo: o cadastro do ${input.klubName} foi aprovado pela nossa equipe.`,
    `Você já pode entrar e começar a configurar quadras, modalidades e convidar jogadores.`,
    ``,
    `Acessar dashboard: ${dashboardUrl}`,
    ``,
    `Qualquer dúvida, é só responder este email.`,
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
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a;">Cadastro aprovado</p>
              <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;">${escapeHtml(input.klubName)} está no ar 🎉</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;font-size:14.5px;line-height:1.6;color:#404040;">
              <p style="margin:0 0 12px 0;">Tudo certo. A equipe revisou os dados e seu Klub já pode entrar em operação.</p>
              <p style="margin:0 0 12px 0;">Você pode começar a configurar quadras, cadastrar modalidades e convidar jogadores.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;">
              <a href="${dashboardUrl}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">
                Acessar dashboard
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#737373;">
              <p style="margin:0;">Qualquer dúvida, é só responder este email. Boa partida!</p>
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
