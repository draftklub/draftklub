# ADR 0021 — Player Sport Enrollment

**Status:** Accepted
**Data:** 2026-04-30

## Contexto

`BookingVisibilityService` (10D) usa `Membership` como proxy para
"user inscrito na modalidade do booking". É grosseiro: João pode ser
member do Tennis Carioca mas só joga tennis — pelo modelo atual, ele tem
visibility full em bookings de squash também.

Solução: model `PlayerSportEnrollment` ligando `User × KlubSportProfile`
com estados (`pending`, `active`, `suspended`, `cancelled`).

## Decisão

`PlayerSportEnrollment` é o vínculo formal de um player a uma modalidade
dentro de um Klub. Estados:

- **pending**: player solicitou, comissão precisa aprovar
- **active**: comissão aprovou, player tem visibility full em bookings da modalidade
- **suspended**: comissão suspendeu temporariamente (sem visibility full)
- **cancelled**: removido permanentemente (sem visibility full)

### Fluxos de criação

1. Player solicita: `RequestEnrollmentHandler` cria com `status='pending'`.
   Comissão usa `Approve`/`Reject`.
2. Comissão cria direto: `CreateEnrollmentDirectHandler` skipa `pending`,
   nasce `status='active'`. Útil para inscrever members que ainda não
   solicitaram.

### BookingVisibilityService

Substitui o fallback antigo via `Membership` genérica. Nova regra final:

```
6. enrollment ativo na modalidade do booking → 'full'
   (resolve via Space.sportCode → KlubSportProfile → enrollment)
```

Sem enrollment ou enrollment não-ativo → `'limited'`.

### Backward compat

Bookings anteriores ao W2.3 ainda funcionam. A modalidade do booking é
inferida pelo `Space.sportCode` (já existe). Para players sem enrollment
ainda criado (legado de antes do W2.3), o seed cria enrollments ativos
para os players seed conhecidos no profile tennis do Tennis Carioca.
Em prod, comissão ou players precisam criar via endpoints.

## Consequências

- 7 handlers novos (Request/Approve/Reject/CreateDirect/Suspend/Reactivate/Cancel).
- 9 endpoints novos.
- `BookingVisibilityService` muda assinatura interna (consulta via
  KlubSportProfile + PlayerSportEnrollment em vez de Membership).
- 4 testes existentes do visibility precisam atualizar mocks para o novo
  modelo.
- Auto-criação no momento que um member entra no Klub: **NÃO**. Decisão
  consciente — um Klub pode ter member que joga só tennis e nunca solicita
  squash. ADR 0019 já documentou que Membership ≠ enrollment.
- Carlos Silva (guest) NÃO recebe enrollment. Convidados têm visibility
  via "participant" — basta estar no booking.
