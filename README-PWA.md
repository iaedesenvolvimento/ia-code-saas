# 📱 PWA - Progressive Web App

Sua aplicação agora é uma PWA completa! Aqui está o que foi implementado e como testar/deploy.

## ✅ O que foi adicionado

### 1. **Manifest.json**
- Define nome, ícones, cores do tema
- Configura modo standalone (como app nativo)
- Suporte a instalação no desktop/mobile

### 2. **Service Worker (sw.js)**
- Cache offline dos arquivos estáticos
- Funciona sem internet (exceto para geração de código)
- Atualização automática de cache

### 3. **Meta Tags**
- Tema colors (#6366f1)
- Apple touch icons
- Mobile web app capable

### 4. **Registro no JavaScript**
- Service Worker registrado automaticamente
- Funciona apenas em HTTPS (produção)

## 🖼️ Ícones

Os ícones SVG foram criados. Para produção, converta para PNG:

### Opção 1: Online (Fácil)
1. Vá para [cloudconvert.com](https://cloudconvert.com/svg-to-png)
2. Converta `icon-192.svg` → `icon-192.png` (192x192)
3. Converta `icon-512.svg` → `icon-512.png` (512x512)

### Opção 2: Node.js
```bash
npm install -g sharp
sharp icon-192.svg -o icon-192.png -w 192 -h 192
sharp icon-512.svg -o icon-512.png -w 512 -h 512
```

### Opção 3: Ferramentas Online
- [favicon.io](https://favicon.io/favicon-converter/)
- [realfavicongenerator.net](https://realfavicongenerator.net/)

## 🧪 Como Testar PWA

### Local (HTTP)
1. Inicie o backend: `node backend/server.js`
2. Abra `http://localhost:3000` (não 5500)
3. Abra DevTools → Application → Service Workers
4. Deve aparecer "sw.js" registrado

### Produção (HTTPS)
1. Deploy no Railway/Heroku
2. Abra a URL HTTPS
3. Deve aparecer banner de instalação
4. Chrome: "Instalar AI Code"
5. Mobile: Adicionar à tela inicial

## 🚀 Deploy para Produção

### 1. Railway.app (Recomendado)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Adicionar variáveis de ambiente
railway variables set JWT_SECRET=seu_jwt_secret_seguro
railway variables set MONGO_URI=mongodb+srv://...
railway variables set OPENROUTER_KEY=sk-or-v1-...
railway variables set STRIPE_KEY=sk_live_...
railway variables set FRONTEND_URL= (automático)

# 5. Deploy
railway up
```

### 2. Heroku

```bash
# 1. Instalar Heroku CLI
npm install -g heroku

# 2. Login e criar app
heroku login
heroku create seu-app-nome

# 3. Configurar variáveis
heroku config:set JWT_SECRET=seu_jwt_secret
heroku config:set MONGO_URI=mongodb+srv://...
heroku config:set OPENROUTER_KEY=sk-or-v1-...
heroku config:set STRIPE_KEY=sk_live_...

# 4. Deploy
git init
git add .
git commit -m "PWA + Production"
git push heroku main
```

### 3. Configurar Webhook Stripe

Após deploy:
1. Copie a URL do Railway/Heroku
2. Vá para Stripe Dashboard → Webhooks
3. Adicione endpoint: `https://sua-url.com/webhook`
4. Evento: `checkout.session.completed`
5. Copie o Signing Secret para `STRIPE_WEBHOOK_SECRET`

## 📱 Funcionalidades PWA

### Instalável
- Desktop: Chrome → "Instalar AI Code"
- Mobile: Safari/Chrome → "Adicionar à tela inicial"

### Offline
- Funciona sem internet
- Cache automático de arquivos estáticos
- API calls (login/generation) requerem internet

### Atualização
- Service Worker atualiza automaticamente
- Novos usuários baixam versão mais recente

## 🔧 Personalização

### Mudar Cores
Edite `manifest.json`:
```json
"background_color": "#0a0a0a",
"theme_color": "#6366f1"
```

### Mudar Nome
Edite `manifest.json`:
```json
"name": "Seu Nome do App",
"short_name": "Nome Curto"
```

### Ícones Customizados
1. Crie ícones PNG 192x192 e 512x512
2. Substitua `icon-192.png` e `icon-512.png`
3. Para maskable, use fundo transparente

## 🐛 Debug PWA

### Chrome DevTools
1. F12 → Application
2. **Manifest**: Verificar se válido
3. **Service Workers**: Status do SW
4. **Storage**: Cache e localStorage

### Safari (iOS)
1. Settings → Safari → Advanced → Web Inspector
2. Conecte iPhone ao Mac
3. Debug remoto

### Limpar Cache
```javascript
// Console do navegador
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

## 📊 Analytics (Opcional)

Adicione Google Analytics para PWA:

```javascript
// No script.js
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

// Após registro do SW
if (await isSupported()) {
  const analytics = getAnalytics();
}
```

## 🎯 Checklist Final

- [ ] Ícones PNG gerados e colocados na pasta frontend/
- [ ] Testado localmente (http://localhost:3000)
- [ ] Deploy realizado (Railway/Heroku)
- [ ] Webhook Stripe configurado
- [ ] Testado em HTTPS (deve aparecer "Instalar")
- [ ] Testado offline (recarregar página)
- [ ] Testado em mobile (instalação)

## 🚀 Próximos Passos

1. **Domínio customizado**: Configure domínio próprio
2. **Push notifications**: Adicione notificações
3. **Background sync**: Sincronização em background
4. **App stores**: Publique nas lojas (PWA não requer)

Sua app está pronta para produção como PWA! 🎉