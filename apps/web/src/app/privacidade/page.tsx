import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLockup } from '@/components/brand/brand-lockup';

export const metadata: Metadata = {
  title: 'Política de Privacidade · DraftKlub',
  description: 'Como o DraftKlub coleta, usa e protege seus dados pessoais (LGPD).',
};

/**
 * Sprint M batch 8 — Política de Privacidade pública (LGPD Art. 9º).
 *
 * Versão sincronizada com `CURRENT_CONSENT_VERSION` em
 * apps/web/src/lib/api/me.ts. Bump da versão exige re-aceite do user.
 */
const POLICY_VERSION = '2026-04-29-v1';

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
      <Link href="/" className="inline-block">
        <BrandLockup size="sm" />
      </Link>

      <div className="mt-8 space-y-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Política de Privacidade
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Como cuidamos dos seus dados
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão <strong className="font-mono">{POLICY_VERSION}</strong>. Em vigor a partir de{' '}
            29/04/2026.
          </p>
        </header>

        <Section title="1. Quem somos">
          <p>
            DraftKlub é uma plataforma de gestão de clubes esportivos, condomínios, escolas e
            espaços públicos. Esta política descreve como tratamos seus dados pessoais conforme a{' '}
            <strong>Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD)</strong>.
          </p>
        </Section>

        <Section title="2. Encarregado (DPO)">
          <p>
            Dúvidas, exercício de direitos ou denúncias relacionadas a dados pessoais devem ser
            enviadas para nosso Encarregado pelo e-mail{' '}
            <a className="text-primary hover:underline" href="mailto:dpo@draftklub.com">
              dpo@draftklub.com
            </a>
            . Respondemos em até 15 dias úteis.
          </p>
        </Section>

        <Section title="3. Dados que coletamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Identidade:</strong> nome, e-mail, telefone, data de nascimento, gênero, foto
              de perfil.
            </li>
            <li>
              <strong>Documentos fiscais:</strong> CPF (necessário pra emissão de nota fiscal e
              fluxos de pagamento). Armazenado <strong>cifrado</strong> em repouso.
            </li>
            <li>
              <strong>Endereço:</strong> CEP, logradouro, número, complemento, bairro, cidade, UF.
              Armazenado cifrado em repouso (exceto cidade/UF, usados em busca de Klubs).
            </li>
            <li>
              <strong>Localização aproximada:</strong> latitude/longitude derivadas do CEP via
              BrasilAPI, pra recurso "Klubs próximos".
            </li>
            <li>
              <strong>Atividade esportiva:</strong> reservas de quadra, inscrições em torneios,
              resultados de partidas, ranking.
            </li>
            <li>
              <strong>Dados técnicos:</strong> logs de acesso, IP, user-agent, eventos de auditoria
              (quem fez o quê).
            </li>
          </ul>
        </Section>

        <Section title="4. Bases legais (Art. 7º LGPD)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Consentimento</strong> (Art. 7º I): coletamos via aceite explícito no
              cadastro. Pode ser revogado a qualquer momento via &ldquo;Excluir conta&rdquo;.
            </li>
            <li>
              <strong>Execução de contrato</strong> (Art. 7º V): pra te entregar o serviço de
              reservas, torneios, ranking.
            </li>
            <li>
              <strong>Cumprimento de obrigação legal</strong> (Art. 7º II): emissão de notas fiscais
              (CPF), retenção de logs por prazos legais.
            </li>
            <li>
              <strong>Legítimo interesse</strong> (Art. 7º IX): segurança da plataforma, prevenção a
              fraude, melhoria do produto.
            </li>
          </ul>
        </Section>

        <Section title="5. Compartilhamento">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Firebase Authentication (Google):</strong> autenticação de login. Política de
              privacidade do Google aplicável.
            </li>
            <li>
              <strong>Firebase Storage:</strong> armazenamento de fotos de perfil e do Klub.
            </li>
            <li>
              <strong>BrasilAPI:</strong> consulta pública de CEP e CNPJ (sem envio de dados
              pessoais sensíveis).
            </li>
            <li>
              <strong>Resend:</strong> envio de e-mails transacionais (confirmações, lembretes).
            </li>
            <li>
              <strong>Google Cloud (Brasil):</strong> hospedagem da API e banco de dados em região
              brasileira.
            </li>
            <li>
              <strong>Sentry:</strong> rastreamento de erros (sem dados pessoais — payloads são
              redatados).
            </li>
          </ul>
          <p className="mt-2">
            Não vendemos seus dados a terceiros. Nunca. Compartilhamento publicitário não faz parte
            do nosso modelo de negócio.
          </p>
        </Section>

        <Section title="6. Seus direitos (Art. 18 LGPD)">
          <p>Você tem direito de:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Confirmar e acessar</strong> os dados que temos sobre você — disponível no
              perfil e via{' '}
              <code className="rounded bg-muted px-1 font-mono text-xs">GET /me/export</code>.
            </li>
            <li>
              <strong>Corrigir</strong> dados incompletos ou inexatos — disponível no perfil.
            </li>
            <li>
              <strong>Anonimizar/excluir</strong> dados desnecessários — botão &ldquo;Excluir
              conta&rdquo; em{' '}
              <Link href="/perfil/acesso" className="text-primary hover:underline">
                /perfil/acesso
              </Link>
              .
            </li>
            <li>
              <strong>Portabilidade</strong> em formato JSON — endpoint{' '}
              <code className="rounded bg-muted px-1 font-mono text-xs">/me/export</code>.
            </li>
            <li>
              <strong>Informação sobre compartilhamentos</strong> — listados na seção 5.
            </li>
            <li>
              <strong>Revogar consentimento</strong> a qualquer momento.
            </li>
          </ul>
        </Section>

        <Section title="7. Retenção">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após exclusão, anonimizamos campos
            de identidade pessoal (CPF, e-mail, nome, telefone, endereço) mas preservamos o registro
            mínimo necessário pra integridade de reservas, torneios e ranking — exigência de outros
            usuários que dependem desses históricos.
          </p>
          <p className="mt-2">
            Logs de auditoria de eventos sensíveis são mantidos por 5 anos (forensics + obrigação
            legal).
          </p>
        </Section>

        <Section title="8. Segurança">
          <ul className="list-disc space-y-1 pl-5">
            <li>Comunicação 100% via HTTPS com HSTS.</li>
            <li>CPF e endereço cifrados em repouso (AES-256-GCM).</li>
            <li>Senhas armazenadas pelo Firebase Auth (nunca pelo DraftKlub).</li>
            <li>Audit log estruturado de todas as ações sensíveis.</li>
            <li>Rate limiting + Helmet + CSP em todas as rotas.</li>
            <li>Backup do banco com retenção de 30 dias e PITR.</li>
          </ul>
        </Section>

        <Section title="9. Crianças e adolescentes">
          <p>
            O DraftKlub não é direcionado a menores de 13 anos. Para usuários entre 13 e 18,
            recomendamos consentimento dos responsáveis. O e-mail{' '}
            <a className="text-primary hover:underline" href="mailto:dpo@draftklub.com">
              dpo@draftklub.com
            </a>{' '}
            recebe pedidos de remoção imediatos.
          </p>
        </Section>

        <Section title="10. Mudanças nesta política">
          <p>
            Quando alterarmos materialmente esta política, a versão muda (ex.: 2026-04-29-v2) e
            todos os usuários ativos são notificados por e-mail e precisam aceitar a nova versão na
            próxima sessão.
          </p>
        </Section>

        <Section title="11. Autoridade de proteção">
          <p>
            Reclamações também podem ser enviadas à <strong>ANPD</strong> (Autoridade Nacional de
            Proteção de Dados):{' '}
            <a
              className="text-primary hover:underline"
              href="https://www.gov.br/anpd/"
              rel="noreferrer noopener"
              target="_blank"
            >
              gov.br/anpd
            </a>
            .
          </p>
        </Section>

        <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Última atualização: 29/04/2026 · DraftKlub · DPO:{' '}
            <a className="text-foreground hover:underline" href="mailto:dpo@draftklub.com">
              dpo@draftklub.com
            </a>
          </p>
          <p className="mt-1">
            <Link href="/termos" className="text-foreground hover:underline">
              Termos de Uso
            </Link>{' '}
            ·{' '}
            <Link href="/" className="text-foreground hover:underline">
              Voltar pra home
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 text-sm leading-relaxed text-foreground/90">
      <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
