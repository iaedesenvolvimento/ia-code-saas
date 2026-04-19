# Guia de Integração Stripe

## 1. Criar Conta Stripe

1. Acesse [https://stripe.com](https://stripe.com)
2. Clique em "Sign up" (Criar conta)
3. Preencha seus dados
4. Confirme seu email
5. Escolha "Não sou desenvolvedor" ou "Sou desenvolvedor"

## 2. Obter Chaves de API

1. Acesse o Dashboard do Stripe: [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Clique em "Developers" no menu esquerdo
3. Clique em "API Keys"
4. Você verá:
   - **Publishable Key**: pk_live_... (ou pk_test_... em modo teste)
   - **Secret Key**: sk_live_... (ou sk_test_... em modo teste)

## 3. Configurar Variáveis de Ambiente

No arquivo `.env` do backend:

```
STRIPE_KEY=sk_test_seu_secret_key_aqui
STRIPE_PUBLIC_KEY=pk_test_sua_publishable_key_aqui
FRONTEND_URL=http://localhost:5500/frontend
```

**Nota:** Para desenvolvimento, use as chaves `test_` (começam com `pk_test_` e `sk_test_`)

## 4. Configurar Webhook (Importante!)

O webhook permite que o Stripe notifique seu servidor quando o pagamento for finalizado.

### No Dashboard do Stripe:

1. Vá para **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. Insira a URL:
   ```
   https://seu-dominio.com/webhook
   ```
   
   **Para desenvolvimento local**, use ngrok:
   - Baixe ngrok em [https://ngrok.com](https://ngrok.com)
   - No terminal, rode:
     ```
     ngrok http 3000
     ```
   - Copie a URL gerada (ex: `https://abc123.ngrok.io`)
   - Use na webhook:
     ```
     https://abc123.ngrok.io/webhook
     ```

4. Selecione os eventos:
   - `checkout.session.completed` ✓
   - `customer.subscription.updated` (opcional)

5. Clique em **Add endpoint**

6. Copie o **Signing Secret** (Whsec_...)

7. Adicione ao `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
   ```

## 5. Atualizar Backend para Validar Webhook

No `server.js`, atualize o webhook:

```javascript
import crypto from 'crypto';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    try {
      const user = await User.findById(userId);
      if (user) {
        user.plan = 'pro';
        user.credits = 999;
        await user.save();
        console.log(`Usuário ${user.email} atualizado para pro`);
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  }

  res.status(200).json({ received: true });
});
```

## 6. Testar em Modo Teste

### Cartões de Teste do Stripe:

- **Sucesso:**
  ```
  4242 4242 4242 4242
  Exp: 12/25
  CVC: 123
  ```

- **Falha:**
  ```
  4000 0000 0000 0002
  Exp: 12/25
  CVC: 123
  ```

### Fluxo de Teste:

1. Inicie o backend:
   ```
   cd backend
   node server.js
   ```

2. Se usar ngrok, certifique-se que está rodando:
   ```
   ngrok http 3000
   ```

3. Abra o frontend: `http://localhost:5500/frontend/index.html`

4. Faça login

5. Clique em "Upgrade Pro"

6. Use um cartão de teste

7. Verifique:
   - Dashboard do Stripe: deve usar o pagamento
   - No MongoDB: usuário deve ter `plan: 'pro'` e `credits: 999`
   - Console do backend: deve ter log do webhook

## 7. Ambiente de Produção

Depois de testar tudo:

1. Vá para **Settings** → **Billing settings**
2. Ative o modo produção
3. Obtenha as chaves `sk_live_` e `pk_live_`
4. Atualize o `.env` com chaves de produção
5. Configure o webhook com a URL real (não ngrok)

## 💡 Dicas

- **Teste sempre em modo teste** antes de produção
- **Não versionie o `.env`** (adicione ao `.gitignore`)
- **Verifique os logs** do webhook no Dashboard do Stripe
- **Use HTTPS** em produção (obrigatório para Stripe)

## ⚠️ Checklist

- [ ] Conta Stripe criada
- [ ] Chaves sk_test_ e pk_test_ obtidas
- [ ] `.env` atualizado com STRIPE_KEY
- [ ] ngrok rodando (se for teste local)
- [ ] Webhook configurado no Stripe
- [ ] Webhook secret adicionado ao `.env`
- [ ] Backend reiniciado
- [ ] Teste com cartão 4242...
- [ ] Usuário atualizado para Pro no MongoDB
