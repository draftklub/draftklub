import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLockup } from '@/components/brand/brand-lockup';

export const metadata: Metadata = {
  title: 'Termos de Uso · DraftKlub',
  description: 'Regras de uso da plataforma DraftKlub.',
};

const TERMS_VERSION = '2026-04-29-v1';

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
      <Link href="/" className="inline-block">
        <BrandLockup size="sm" />
      </Link>

      <div className="mt-8 space-y-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Termos de Uso
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Como funciona o DraftKlub
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão <strong className="font-mono">{TERMS_VERSION}</strong>. Em vigor a partir de
            29/04/2026.
          </p>
        </header>

        <Section title="1. Aceite">
          <p>
            Ao criar uma conta no DraftKlub, você concorda com estes termos e com a{' '}
            <Link href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            . Se não concorda, não use o serviço.
          </p>
        </Section>

        <Section title="2. O que é o DraftKlub">
          <p>
            Plataforma SaaS de gestão de Klubs (clubes esportivos, condomínios, escolas, espaços
            públicos) com reserva de quadras, organização de torneios, ranking e gestão de
            modalidades. Disponível via web em <strong>draftklub.com</strong> e{' '}
            <strong>draftklub.com.br</strong>.
          </p>
        </Section>

        <Section title="3. Conta e responsabilidades">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Você é responsável pelas informações que cadastra (nome, e-mail, CPF, endereço).
            </li>
            <li>Mantenha sua senha em segurança. Não compartilhe credenciais.</li>
            <li>
              Comportamento inadequado em quadra, contestações abusivas ou tentativas de fraude
              podem levar à suspensão ou remoção da conta.
            </li>
          </ul>
        </Section>

        <Section title="4. Reservas e cancelamentos">
          <p>
            As regras de reserva, hour bands, cancelamento e extensão são definidas por cada Klub
            individualmente, no painel de configuração do administrador. Consulte o seu Klub.
          </p>
        </Section>

        <Section title="5. Torneios">
          <p>
            Inscrição, formato de chave, distribuição em categorias e disputa seguem a configuração
            de cada torneio definida pela comissão técnica do Klub. Resultados podem ser reportados
            por jogadores ou pela comissão, conforme o modo de reporting do torneio.
          </p>
        </Section>

        <Section title="6. Ranking">
          <p>
            Pontos e cálculo de ranking variam por modalidade e Klub. Decisões finais sobre
            posicionamento estão sob responsabilidade da comissão técnica de cada modalidade.
          </p>
        </Section>

        <Section title="7. Limitação de responsabilidade">
          <p>
            O DraftKlub é uma ferramenta. Não somos responsáveis por: lesões em quadra, conflitos
            entre membros do Klub, decisões administrativas dos Klubs sobre seus próprios membros,
            indisponibilidades temporárias da plataforma (manutenção ou incidentes).
          </p>
        </Section>

        <Section title="8. Propriedade intelectual">
          <p>
            Marca, código, design e funcionalidades são propriedade do DraftKlub. Conteúdo gerado
            por usuários (fotos do Klub, nomes de torneios, mensagens) permanece do autor, mas
            licenciamos uso pra exibição na plataforma.
          </p>
        </Section>

        <Section title="9. Mudanças nos termos">
          <p>
            Quando alterarmos materialmente, a versão muda (ex.: 2026-04-29-v2) e usuários ativos
            recebem prompt de aceite na próxima sessão.
          </p>
        </Section>

        <Section title="10. Foro">
          <p>
            Fica eleito o foro da Comarca de São Paulo/SP pra dirimir questões decorrentes destes
            termos, com renúncia expressa a qualquer outro.
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
            <Link href="/privacidade" className="text-foreground hover:underline">
              Política de Privacidade
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
