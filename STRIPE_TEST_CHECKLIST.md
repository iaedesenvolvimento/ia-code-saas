# Checklist de Integração Stripe

## 📋 Tarefas

### 1. Obter Chaves do Stripe

- [ ] Criar conta em [stripe.com](https://stripe.com)
- [ ] Acessar Dashboard → Developers → API Keys
- [ ] Copiar as chaves de **teste** (começam com `pk_test_` e `sk_test_`)

### 2. Configurar Variáveis de Ambiente

Edite `backend/.env`:

```
STRIPE_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
FRONTEND_URL=http://localhost:5500/frontend
```

### 3. Configurar Webhook no Stripe

**Opção A: Teste Local com ngrok**

1. Baixe [ngrok](https://ngrok.com/download)
2. No terminal:
   ```
   ngrok http 3000
   ```
3. Copie a URL (ex: `https://abc123.ngrok.io`)
4. No Dashboard Stripe:
   - Vá para **Developers** → **Webhooks**
   - Clique **Add endpoint**
   - URL: `https://abc123.ngrok.io/webhook`
   - Eventos: `checkout.session.completed`
   - Clique **Add endpoint**
   - Copie o **Signing Secret** (começa com `whsec_`)

**Opção B: Usar Stripe CLI (Recomendado)**

1. Instale o Stripe CLI:
   - Windows: baixe em https://stripe.com/docs/stripe-cli#install
   - macOS: use `brew install stripe/stripe-cli/stripe`
   - Linux: siga o passo a passo em https://stripe.com/docs/stripe-cli#install

2. Faça login no Stripe CLI com sua conta de teste:
   ```bash
   stripe login
   ```
   - O comando abrirá uma página Stripe no navegador para autenticação.

3. Aponte o Stripe CLI para o webhook local:
   ```bash
   stripe listen --forward-to localhost:3000/webhook
   ```

4. Copie o `Signing Secret` exibido no terminal.
   - Ele terá o formato `whsec_test_...`
   - Cole no `backend/.env` em `STRIPE_WEBHOOK_SECRET`

5. Se precisar disparar manualmente um evento de teste:
   ```bash
   stripe trigger checkout.session.completed
   ```
   - Isso ajuda a verificar se o webhook está funcionando sem pagar.

### 4. Testar o Fluxo

1. Inicie o backend:
   ```
   cd backend
   node server.js
   ```

2. Se usar ngrok, certifique-se que está rodando em outro terminal

3. Abra o frontend:
   ```
   http://localhost:5500/frontend/index.html
   ```

4. **Teste completo:**
   - [ ] Faça login
   - [ ] Clique em "Upgrade Pro"
   - [ ] Você será redirecionado ao Stripe
   - [ ] Use o cartão de teste: **4242 4242 4242 4242**
     - Data: **12/25**
     - CVC: **123**
   - [ ] Clique "Pay"
   - [ ] Você será redirecionado para `success.html`
   - [ ] Verifique:
     - Console do servidor (deve ter logs do webhook)
     - MongoDB (usuário deve ter `plan: 'pro'` e `credits: 999`)
     - Frontend (ao voltar, deve estar com plano Pro)

### 5. Testar Pagamento que Falha

Use o cartão: **4000 0000 0000 0002**
- Deve ser declinado
- Webhook não será disparado
- Usuário permanece com plano `free`

### 6. Cartões de Teste Adicionais

| Cenário | Cartão |
|---------|--------|
| Sucesso | 4242 4242 4242 4242 |
| Falha | 4000 0000 0000 0002 |
| Requer autenticação | 4000 0025 0000 3155 |
| Expirado | 4000 0000 0000 0069 |

## 🔍 Checklist de Debug

Se o webhook não funcionar:

1. **Verifique STRIPE_WEBHOOK_SECRET:**
   ```
   # No backend console, procure por:
   # "STRIPE_WEBHOOK_SECRET não configurado"
   ```

2. **Veja os logs do Stripe:**
   - Dashboard → Developers → Webhooks
   - Clique no endpoint
   - Veja o histórico de eventos
   - Procure por erros na coluna "Status"

3. **Verifique o ngrok:**
   - Deve exibir requisições POST em tempo real
   - Se não ver nada, o webhook não está chegando

4. **Verifique o MongoDB:**
   ```javascript
   db.users.findOne({ email: "seu@email.com" })
   // Procure por: plan: "pro", credits: 999
   ```

5. **Verifique logs do backend:**
   - Procure por:
     - `"[WEBHOOK] Webhook signature verificado"`
     - `"[WEBHOOK] Usuário ... atualizado para Pro"`

## ✅ Teste Final

Após tudo estar funcionando:

1. Faça refresh na página (`F5`)
2. Você deve estar ainda logado
3. Seu plano deve aparecer como "Plano: pro"
4. Créditos devem aparecer como "Gerações disponíveis: ilimitado"
5. Clique em "Gerar Código" e veja que funciona sem limite

## 📌 Próximos Passos

- [ ] Testar fluxo completo com cartão de teste
- [ ] Verificar logs do webhook no Dashboard
- [ ] Confirmar que MongoDB foi atualizado
- [ ] Testar refresh da página (persistência de sessão)
- [ ] Deslogar e fazer login novamente (restauração de sessão)
- [ ] Quando tudo funcionar, obter chaves de **produção** (`sk_live_` e `pk_live_`)
