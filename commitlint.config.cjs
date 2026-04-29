/**
 * Sprint M batch SM-7 — commitlint.
 *
 * Enforce Conventional Commits no commit-msg hook do husky. Padrões:
 *   feat: nova funcionalidade
 *   fix: correção
 *   chore: tarefa rotineira (deps, format)
 *   docs: documentação
 *   refactor: mudança sem novo comportamento
 *   test: testes
 *   perf: performance
 *   ci: pipeline / build
 *
 * Permite escopos curtos (sprint-m/sm-7, api, web, etc).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Subject pode ter caracteres acentuados (PT-BR comum nos commits).
    'subject-case': [0],
    // Permitir título mais longo (descritivo) — default 100, vamos pra 120.
    'header-max-length': [2, 'always', 120],
    // Body lines com até 200 chars (default 100 — quebra demais).
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200],
  },
};
