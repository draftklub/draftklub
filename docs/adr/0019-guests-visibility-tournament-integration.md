# ADR 0019 — Guests, Agenda Visibility, Tournament-Booking Integration

**Status:** Accepted
**Data:** 2026-04-30

## Contexto

Klubs precisam de:

1. Convidados que jogam acompanhando membros (Cenário A: User existente,
   Cenário B: pessoa externa cadastrada na hora)
2. Visibilidade granular de bookings (privacidade entre modalidades, mas
   abertura pra próprio member, staff e admin)
3. Bookings gerados automaticamente do agendamento de torneios (já
   acontece em `TournamentMatch.scheduledFor` mas sem espelho em Booking)

## Decisão

### Guests

User com `kind='guest'`. Sem Firebase. Email obrigatório, document/phone
opcionais. Em Cenário A (já é User), busca por search e adiciona.
Em Cenário B (externo), staff/player preenche dados → cria User guest.

Em Klub `members_only`, todo booking com guests precisa de pelo menos 1
member presente. `responsibleMemberId` guarda quem responde formalmente
(default: primaryPlayer se for member).

### Visibility

Função pura `BookingVisibilityService.resolve(viewer, booking)` retorna
`'full'` ou `'limited'`. Matriz:

- Próprio participante: `full`
- SUPER_ADMIN: `full`
- KLUB_ADMIN do mesmo Klub: `full` (todas modalidades)
- STAFF do mesmo Klub: `full`
- SPORTS_COMMITTEE da mesma modalidade do booking: `full`
- SPORTS_COMMITTEE de outra modalidade: `limited`
- Member ativo do mesmo Klub: `full` (no MVP, sem checagem de modalidade
  — `PlayerSportEnrollment` ainda não existe; refinar quando vier)
- Não-member ou de outro Klub: `limited`

`limited` esconde: `primaryPlayerId`, `otherPlayers`, `responsibleMemberId`,
`notes`, `extensions`. Mantém: `id`, `spaceId`, `startsAt`, `endsAt`,
`bookingType`, `matchType`, `status`, `tournamentInfo` (nome do torneio +
fase).

Bloqueios operacionais (`maintenance`/`weather_closed`/`staff_blocked`)
sempre são visíveis com tipo (info pública).

### Tournament integration

Novo `bookingType='tournament_match'`. `ScheduleDistributorService` cria/
atualiza bookings após distribuir `TournamentMatch`. Conflito com avulso
resolvido por config:

- `block_avulso`: schedule falha, staff resolve manual
- `auto_cancel_avulso`: cancela avulso com `auto_cancelled:tournament:<id>`
- `staff_decides`: marca pendência, retorna lista pro staff resolver

Cancelar `tournament_match` diretamente: 403 (só staff pode, ou via flow
de tournament). Cascade tournament → booking fica como TODO até existir
handler de cancel/finish de tournament.

## Consequências

- `User.kind` introduz caminho pra futuro (memberships, contas distintas).
- `firebaseUid` vira nullable — guests não autenticam.
- Visibility presenter centralizado evita drift entre endpoints.
- ScheduleDistributor tem efeito colateral em booking module
  (acoplamento intencional via ação dentro de transação).
