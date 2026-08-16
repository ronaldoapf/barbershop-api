# API de Gerenciamento de Barbearia — Especificação

## 1. Visão Geral

API para gerenciamento completo de uma barbearia: cadastro de barbeiros, serviços, agendamentos, comissões, horários de trabalho e plano de fidelidade. Suporta agendamento tanto pela plataforma web/app quanto por chatbot de WhatsApp.

### Stack técnica (regras não funcionais)
- **Framework:** NestJS
- **ORM:** Prisma
- **Banco de dados:** PostgreSQL
- **Arquitetura:** Single-tenant (uma única barbearia por instância)
- **Autenticação:** JWT contendo `role` e `barberId` no payload; login por senha e OAuth Google habilitados simultaneamente
- **Convenção monetária:** valores armazenados como inteiro em centavos

---

## 2. Papéis e Controle de Acesso

O sistema usa uma entidade única `User` com um campo `role`, que pode ser:

| Papel | Descrição |
|---|---|
| `OWNER` | Barbeiro administrador. Acesso total: gerencia serviços, convida barbeiros, vê todos os agendamentos, ajusta comissões. |
| `BARBER` | Barbeiro comum. Só vê e gerencia os próprios agendamentos, horários de trabalho e comissão (leitura). |
| `CUSTOMER` | Cliente. Agenda horários, vê seus próprios agendamentos e saldo de pontos de fidelidade. |

### Mecanismo de autorização
- **`RolesGuard` + `@Roles(...)`** — bloqueia rotas inteiras por papel (ex: só `OWNER` pode criar serviços ou convidar barbeiros).
- **Filtro automático no service** — para leitura/listagem, toda query de `BARBER` aplica automaticamente `WHERE barberId = <barberId do token>`; `CUSTOMER` filtra por `customerId`; `OWNER` vê tudo. Isso evita até vazamento de existência de recursos de terceiros.
- **`AppointmentOwnershipGuard`** — para escrita (update/delete), verifica que o `barberId` do recurso bate com o do usuário autenticado antes de permitir a mutação (exceto `OWNER`, que tem acesso irrestrito).
- **`ServiceApiKeyGuard`** — guard separado para rotas chamadas pelo módulo externo de WhatsApp, autenticado por API key de serviço em vez de JWT de usuário.

---

## 3. Modelo de Dados

### 3.1 `User`
Entidade central de identidade — unifica cliente, barbeiro e administrador em uma única tabela, diferenciados pelo campo `role`.

| Campo | Descrição |
|---|---|
| `id` | Identificador único |
| `name`, `email`, `phone` | Dados de contato |
| `passwordHash` | Opcional — cliente via WhatsApp pode não ter senha |
| `role` | `CUSTOMER`, `BARBER` ou `OWNER` |
| `loyaltyPoints` | Saldo de pontos denormalizado (para leitura rápida) |
| `avatarUrl` / `avatarStorageKey` | Foto de perfil |
| `disabledAt` | Soft delete / desativação de conta |

Login suporta **senha local** e **OAuth Google** simultaneamente (tabela `Account` guarda o vínculo com o provedor).

### 3.2 `Barber`
Perfil estendido, em relação 1:1 com `User`, usado apenas por quem tem `role: BARBER` ou `OWNER`. Mantém `User` enxuto e isola dados específicos de barbeiro.

| Campo | Descrição |
|---|---|
| `userId` | FK única para `User` |
| `commissionPercentage` | Percentual fixo de comissão do barbeiro (não varia por serviço). Começa com valor padrão na criação e é ajustado pelo `OWNER` depois. |

### 3.3 `BarberInvite`
Controla o convite de novos barbeiros, feito por e-mail.

| Campo | Descrição |
|---|---|
| `userId` | Vincula ao `User` já criado (com conta desabilitada até aceite) |
| `tokenHash` | Hash do token enviado por e-mail (token em texto plano nunca é persistido) |
| `expiresAt` | Validade do convite |
| `acceptedAt` | Preenchido quando o barbeiro aceita e define senha |

### 3.4 `Service`
Catálogo de serviços oferecidos pela barbearia.

| Campo | Descrição |
|---|---|
| `name`, `description`, `price`, `durationMinutes` | Dados básicos do serviço |
| `status` | `ACTIVE` / `INACTIVE` |
| `pointsEarned` | Pontos de fidelidade ganhos ao concluir esse serviço |
| `pointsRequired` | Pontos necessários para resgatar esse serviço gratuitamente |

### 3.5 `BarberWorkingHours`
Horário de trabalho configurável por barbeiro, com suporte a exceções pontuais.

| Campo | Descrição |
|---|---|
| `barberId` | Barbeiro dono do horário |
| `type` | `WEEKLY` (grade semanal recorrente) ou `SPECIFIC_DATE` (exceção — folga, feriado, horário especial) |
| `dayOfWeek` | Usado quando `type = WEEKLY` |
| `date` | Usado quando `type = SPECIFIC_DATE` |
| `startTime`, `endTime` | Faixa de horário |
| `isWorking` | Permite marcar um dia específico como "não trabalha" |

Registros `SPECIFIC_DATE` têm prioridade sobre `WEEKLY` no cálculo de disponibilidade.

### 3.6 `Appointment`
Agendamento de um cliente com um barbeiro.

| Campo | Descrição |
|---|---|
| `customerId` | Cliente (`User`) |
| `barberId` | Barbeiro (`Barber`) |
| `startsAt`, `endsAt` | Janela do agendamento |
| `totalAmount` | Valor total (centavos) |
| `status` | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW` |
| `source` | Canal de origem: plataforma ou WhatsApp |
| `cancellationReason`, `cancelledBy`, `cancelledAt` | Rastreamento de cancelamento |

### 3.7 `AppointmentService`
Tabela de junção entre `Appointment` e `Service` — permite múltiplos serviços em um único agendamento (ex: corte + barba) e guarda um **snapshot** dos dados do serviço no momento da compra, preservando o histórico mesmo se o serviço mudar de preço depois.

| Campo | Descrição |
|---|---|
| `appointmentId`, `serviceId` | Relações |
| `serviceName`, `price`, `durationMinutes` | Snapshot no momento do agendamento |
| `pointsEarned` | Pontos que esse item específico vai gerar |
| `redeemedWithPoints` | Se este item foi resgatado com pontos (grátis) |

### 3.8 `LoyaltyTransaction`
Extrato completo (ledger) de movimentações de pontos, complementando o saldo denormalizado em `User.loyaltyPoints`.

| Campo | Descrição |
|---|---|
| `customerId` | Cliente dono da movimentação |
| `appointmentId` | Agendamento relacionado (opcional) |
| `type` | `EARN` (ganho) ou `REDEEM` (resgate) |
| `points` | Quantidade movimentada |
| `description` | Descrição legível da transação |

### 3.9 `CompletedService`
Registra a conclusão de um serviço e a comissão gerada para o barbeiro.

### 3.10 `Setting`
Tabela genérica de configuração (key-value), para parâmetros administráveis sem precisar de migration (ex: valor padrão de comissão, regras futuras de negócio).

---

## 4. Regras de Negócio

### 4.1 Barbeiros e convites
- Apenas `OWNER` pode cadastrar e convidar outros barbeiros.
- Convite é feito por **e-mail**, com link contendo token de uso único e validade (7 dias sugeridos).
- Ao aceitar o convite, o barbeiro define sua senha, a conta é ativada e o registro `Barber` é criado com `commissionPercentage` no valor padrão do sistema.
- O `OWNER` ajusta a comissão do barbeiro separadamente, depois do aceite.
- Convites expirados podem ser reenviados, invalidando o token anterior.

### 4.2 Escopo de gerenciamento
- Um `BARBER` só pode ver e gerenciar agendamentos, horários de trabalho e dados relacionados a si mesmo.
- Comissão é **somente leitura** para o `BARBER` — apenas o `OWNER` pode alterá-la.

### 4.3 Comissão
- Comissão é um **percentual único fixo por barbeiro** (não varia por tipo de serviço).
- Aplicada sobre **cada serviço concluído** individualmente.
- **Pendente de definição:** se o barbeiro recebe comissão sobre um serviço resgatado com pontos (gratuito para o cliente) ou não.

### 4.4 Horário de trabalho
- Configurável por barbeiro, com grade semanal (`WEEKLY`) e possibilidade de exceções pontuais (`SPECIFIC_DATE`) para folgas ou horários especiais.

### 4.5 Agendamentos e disponibilidade
- Slots de horário disponível são **dinâmicos**, calculados a partir da duração do(s) serviço(s) escolhido(s) — não seguem uma grade fixa (ex: 15/30 min).
- Cálculo cruza: horário de trabalho do barbeiro no dia, agendamentos já existentes (`PENDING`/`CONFIRMED`), e duração total do pedido.
- Prevenção de conflito de horário é feita via checagem dentro de uma transação (`$transaction`) no momento da criação — relê agendamentos do barbeiro no intervalo antes de confirmar, evitando dupla marcação por concorrência.
- Cliente pode agendar via:
  - **Plataforma:** autenticado com JWT (`CUSTOMER`), exige senha.
  - **WhatsApp:** cliente identificado só por telefone verificado, sem necessidade de senha. O chatbot é um **serviço/módulo separado** que consome esta API via API key de serviço, criando o `User` `CUSTOMER` automaticamente na primeira interação, se necessário.

### 4.6 Plano de fidelidade
- Cliente ganha pontos por serviço concluído, conforme `Service.pointsEarned`.
- Cliente pode resgatar um serviço **gratuitamente** usando pontos acumulados, conforme `Service.pointsRequired`.
- O resgate é sempre **tudo-ou-nada** (não há desconto parcial com pontos insuficientes).
- O resgate é decidido e aplicado pelo **barbeiro no momento do atendimento** (não na hora da reserva do agendamento).
- Pontos (ganho ou resgate) só são efetivamente debitados/creditados no saldo quando o agendamento é marcado como `COMPLETED` — não há reserva ("hold") de pontos na criação do agendamento, o que evita a necessidade de estorno em caso de cancelamento.
- Saldo de pontos é mantido de duas formas: `User.loyaltyPoints` (leitura rápida, denormalizado) e `LoyaltyTransaction` (extrato completo/auditável). As duas devem ser atualizadas atomicamente, dentro da mesma transação Prisma, para evitar dessincronização sob concorrência.

---

## 5. Fluxo de Convite de Barbeiro (detalhado)

| Passo | Rota | Quem executa |
|---|---|---|
| Convidar | `POST /invites` | `OWNER` |
| Validar token do link recebido por e-mail | `GET /invites/:token` | Público (via link) |
| Aceitar convite e definir senha | `POST /invites/:token/accept` | Público (via token) |
| Reenviar convite expirado | `POST /invites/:id/resend` | `OWNER` |
| Ajustar comissão do barbeiro | `PATCH /barbers/:id/commission` | `OWNER` |

---

## 6. Pontos em Aberto

- **Comissão sobre serviço resgatado com pontos:** ainda não definido se o barbeiro recebe comissão normal (barbearia absorve o custo do resgate) ou não recebe comissão nesse caso. Pode ser resolvido futuramente como uma flag configurável em `Setting` (ex: `commission_on_redeemed_service`), evitando travar a regra no código.