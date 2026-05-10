# 🏗️ Blueprint do Ecossistema: Detroit Roleplay (Prompt & Guia de Replicação)

> **Aviso para IAs e Desenvolvedores:** Este documento contém TODAS as especificações, regras de negócios e arquiteturas necessárias para recriar o ecossistema "Detroit Roleplay" do absoluto zero. Siga rigorosamente as instruções de arquitetura e design descritas aqui.

---

## 🏛️ 1. Visão Geral da Arquitetura

O projeto não é uma aplicação monolítica. Ele é dividido em **três microsserviços/projetos separados** que se conectam ao **mesmo banco de dados MySQL**.

1. **Site Principal (Frontend / Loja):** Loja virtual voltada para o jogador, onde ele faz login com o Discord, visualiza os produtos e gera os pagamentos PIX.
2. **Painel Admin (Dashboard):** Painel voltado para a Staff. Usado para criar/editar produtos, hospedar imagens em nuvem, e visualizar histórico financeiro e de atendimento.
3. **Bot do Discord (Backend Interativo):** O cérebro dentro do servidor do Discord. Envia DMs de compras confirmadas, cria e gerencia tickets de atendimento e aplica automações (auto-role, anti-flood).

---

## 🛠️ 2. Stack Tecnológica Obrigatória

Qualquer recriação deste projeto deve utilizar as seguintes tecnologias para manter compatibilidade e performance:

*   **Banco de Dados:** MySQL (Única fonte da verdade para os três sistemas).
*   **Site e Admin:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS (Vanilla, sem componentes pesados pré-prontos, priorizando Glassmorphism e Dark Mode premium).
*   **Bot do Discord:** Node.js, `discord.js` v14, TypeScript ou JavaScript ES6+.
*   **Hospedagem e Storage:** As aplicações rodam na SquareCloud. As imagens dos produtos são hospedadas utilizando a **SquareCloud Blob API**.
*   **Autenticação:** `next-auth` (Discord OAuth para o Site, Credentials com E-mail + Senha gerenciada via sistema de Convites/Magic-Links para o Admin).
*   **Pagamentos:** API nativa do **Mercado Pago** (Geração de PIX e recepção de Webhooks `payment.updated`).

---

## 💾 3. Esquema do Banco de Dados

Crie um banco de dados MySQL com as seguintes tabelas e relacionamentos:

*   `users`: Armazena os usuários logados da loja (`id`, `discord_id`, `email`, `role`).
*   `admins`: Armazena a staff do painel (`email`, `password_hash`, `role` [superadmin, staff], `permissions` [JSON], `invite_token`).
*   `admin_logs`: Histórico de auditoria de ações (`admin_email`, `action`, `details`).
*   `categories`: Categorias da loja (`name`, `slug`, `icon`). Ex: vips, veiculos, planos, drops.
*   `products`: Produtos vinculados às categorias (`title`, `price`, `image_url`, `category_id`).
*   `orders`: Tabela vital de pedidos (`code`, `status` [pendente, pago, entregue], `mp_payment_id`, `game_id`).
*   `coupons`: Cupons de desconto (`code`, `discount_type`, `discount_value`, `max_uses`).
*   `settings`: Chave-valor para o Bot Discord (`key`, `value`). Ex: canais de ticket, cargo de recém-chegados.
*   `tickets`: Histórico de tickets do Discord (`ticket_id`, `user_id`, `transcript_html`, `status`).

---

## 🌐 4. Especificações: Site Principal (Loja)

O site deve ter um design **escuro (Dark Mode), premium, com micro-animações (Framer Motion) e efeito Glassmorphism**.

**Regras de Negócio do Site:**
1. **Página Inicial:** Listagem de categorias e uma grade de produtos ordenados sempre na seguinte ordem: VIPs > Veículos > Planos > Drops.
2. **Login:** Apenas via botão "Entrar com Discord". Ao logar, capturar o ID do Discord e salvar na tabela `users`.
3. **Carrinho e Checkout:** O usuário deve inserir o seu ID do jogo (game_id).
4. **Pagamento PIX:** O site gera a cobrança consumindo a API do Mercado Pago. Deve existir uma rota de API (`/api/webhooks/mercadopago`) esperando o retorno do Mercado Pago.
5. **Pós-Pagamento:** Quando o Webhook acusa pagamento aprovado, o site muda o status do banco para `pago`, avisa a staff num canal de Logs do Discord (via Webhook) e manda o Bot disparar uma DM pro usuário.

---

## 🛡️ 5. Especificações: Painel Admin

Interface voltada para gestão e produtividade, protegida por sistema de autenticação via E-mail e Senha (com senhas definidas no primeiro acesso via Token). Possui um sistema completo de RBAC (Role-Based Access Control).

**Regras de Negócio do Admin:**
1. **Dashboard Financeiro:** Gráficos com total arrecadado no dia, no mês, e ticket médio. Elementos do painel são ocultos caso o staff não tenha permissão.
2. **Produtos:** Criação de produtos. **Regra de Imagem:** Ao dar upload na foto, renomear para um padrão válido (`a-z`, `0-9`, `_`) e enviar via POST (`axios` ou `fetch` seguro) para a `SquareCloud Blob API`. Salvar apenas o link gerado no banco de dados.
3. **Pedidos:** Lista em tempo real (atualizada) de pedidos com status. O admin pode mudar o status para `entregue` assim que entregar o item in-game.
4. **Histórico de Tickets:** Leitura da tabela `tickets`. O admin pode visualizar o `transcript_html` inteiro de um atendimento que já foi fechado no Discord.
5. **Gestão de Staff (`/admin/staff`):** O superadmin pode convidar novos membros usando seus e-mails. O sistema gera um link (`/invite?token=...`) para o staff criar sua senha. O superadmin marca as caixinhas de permissões granulares (ex: "Apenas Financeiro", "Apenas Produtos").
6. **Auditoria (`/admin/logs`):** Qualquer ação (criar, editar, excluir) executada no painel fica gravada de forma permanente para monitoramento.

---

## 🤖 6. Especificações: Bot do Discord

O bot roda 24/7 e gerencia a comunidade.

**Regras de Negócio do Bot:**
1. **Comando `/config`:** A staff usa esse comando para configurar canais (ex: qual canal abre os tickets) e cargos. As opções são salvas na tabela `settings`.
2. **Eventos:**
   *   `guildMemberAdd`: Dá um cargo automático para quem entrar no servidor.
   *   `messageCreate`: Moderação automática. Filtra palavras proibidas e convites (`discord.gg/`). Pune infratores com Mute (Timeout).
3. **Sistema de Tickets:** 
   *   O bot envia um painel (Embed) em um canal específico com um botão "Abrir Ticket".
   *   Ao clicar, cria um canal privado (`ticket-nome`).
   *   Quando fechado, o bot lê todas as mensagens, gera um arquivo HTML (transcrição) e salva no banco de dados MySQL (tabela `tickets`), fechando e deletando o canal.
4. **Notificações:** Ouve eventos do banco (ou recebe chamadas HTTP do Site) para mandar Mensagem Direta (DM) agradecendo compras confirmadas.

---

## 🔑 7. Variáveis de Ambiente Necessárias (.env)

Para rodar este ecossistema localmente, será necessário definir:

```env
DATABASE_URL=mysql://user:pass@host:3306/db
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=sua_hash_secreta
AUTH_DISCORD_ID=seu_client_id_discord
AUTH_DISCORD_SECRET=seu_client_secret_discord
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_TOKEN=MTE...
SQUARE_CLOUD_API_KEY=sua_chave_blob
```

---

> **Instrução Final para a IA:** Se o usuário solicitar a criação deste sistema, comece inicializando o banco de dados e os repositórios Next.js. Implemente uma tela de cada vez validando o design premium exigido antes de passar para a lógica pesada de backend.
