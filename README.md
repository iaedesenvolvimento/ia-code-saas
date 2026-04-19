# 🚀 AI Code SaaS - PWA

Uma aplicação SaaS completa para geração de componentes HTML/CSS/JS usando IA, implementada como Progressive Web App (PWA).

## ✨ Funcionalidades

- 🔐 **Autenticação JWT** com persistência de sessão
- 🤖 **Geração de código** via OpenRouter API (GPT-4o-mini)
- 💳 **Sistema de pagamentos** com Stripe
- 📱 **PWA completa** - instalável no desktop/mobile
- 🔄 **Offline support** via Service Worker
- 📊 **Sistema de créditos** (5 free, ilimitado pro)
- 🎨 **Interface moderna** com tema dark

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JavaScript (PWA)
- **Database:** MongoDB Atlas
- **Payments:** Stripe
- **AI:** OpenRouter API
- **Deploy:** Render/Heroku

## 🚀 Deploy no Render

### 1. Subir para GitHub
```bash
git init
git add .
git commit -m "Initial commit - AI Code SaaS PWA"
git branch -M main
git remote add origin https://github.com/SEU_USERNAME/SEU_REPO.git
git push -u origin main
```

### 2. Deploy no Render
1. Vá para [render.com](https://render.com)
2. **New** → **Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### 3. Configurar Environment Variables
```
JWT_SECRET=seu_jwt_secret_super_seguro
MONGO_URI=mongodb+srv://...
OPENROUTER_KEY=sk-or-v1-...
STRIPE_KEY=sk_live_...
FRONTEND_URL=https://seu-app.onrender.com
```

### 4. Configurar Webhook Stripe
- URL: `https://seu-app.onrender.com/webhook`
- Evento: `checkout.session.completed`

## 🧪 Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- MongoDB Atlas account
- Stripe account
- OpenRouter API key

### Setup
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edite .env com suas chaves

# Iniciar
node server.js

# Frontend estará disponível em http://localhost:3000
```

### Teste PWA
- Abra `http://localhost:3000`
- DevTools → Application → Service Workers
- Deve aparecer "sw.js" registrado

## 📱 PWA Features

- **Instalável** no desktop/mobile
- **Offline-first** com cache inteligente
- **Push notifications** (pronto para implementação)
- **Background sync** (pronto para implementação)

## 📚 Documentação

- [DEPLOY.md](./DEPLOY.md) - Guia completo de deploy
- [README-PWA.md](./README-PWA.md) - Configuração PWA
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Setup Stripe

## 🎯 Roadmap

- [ ] Push notifications
- [ ] Background sync
- [ ] Analytics integration
- [ ] Admin dashboard
- [ ] Multi-language support

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**Feito com ❤️ para a comunidade de desenvolvedores**