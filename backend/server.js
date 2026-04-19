import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());

const stripe = new Stripe(process.env.STRIPE_KEY);
const openai = new OpenAI({ 
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500/frontend';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// ===== WEBHOOK (raw body) - ANTES de app.use(express.json()) =====
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(400).send('Webhook secret não configurado');
  }
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
    console.log('Webhook signature verificado');
  } catch (error) {
    console.error('Erro na verificação de assinatura:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user) {
          user.plan = 'pro';
          user.credits = 999;
          await user.save();
          console.log(`[WEBHOOK] Usuário ${user.email} atualizado para Pro`);
        }
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        return res.status(500).send('Erro ao atualizar usuário');
      }
    } else {
      console.warn('userId não encontrado no metadata');
    }
  }

  res.status(200).json({ received: true });
});

app.use(express.json());

// ===== SERVIR FRONTEND (produção) =====
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all para SPA (Single Page Application)
app.get('*', (req, res) => {
  // Só serve index.html se não for uma API route
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// ===== DATABASE =====
mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('User', {
  email: String,
  password: String,
  credits: Number,
  plan: String
});

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('Sem header Authorization');
    return res.status(401).json({ error: 'Sem token' });
  }

  let token = authHeader;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ===== REGISTER =====
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const user = new User({
    email,
    password: hash,
    credits: 5,
    plan: 'free'
  });

  await user.save();
  res.json({ message: 'Criado' });
});

// ===== LOGIN =====
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Login inválido' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({
    token,
    plan: user.plan,
    credits: user.credits,
    email: user.email
  });
});

// ===== GENERATE CODE =====
app.post('/generate', auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.plan !== 'pro' && user.credits <= 0) {
    return res.status(403).json({ error: 'Sem créditos' });
  }

  const { prompt } = req.body;

  const ai = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Gere HTML, CSS e JS moderno.' },
      { role: 'user', content: prompt }
    ]
  });

  if (user.plan !== 'pro') {
    user.credits--;
    await user.save();
  }

  res.json({
    code: ai.choices[0].message.content,
    credits: user.credits,
    plan: user.plan
  });
});

// ===== ME =====
app.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      plan: user.plan,
      credits: user.credits,
      email: user.email,
      id: user._id.toString()
    });
  } catch (error) {
    console.error('Erro em /me:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// ===== UPGRADE =====
app.post('/upgrade', auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  user.plan = 'pro';
  user.credits = 999;
  await user.save();

  res.json({
    message: 'Plano Pro ativado com sucesso!',
    plan: user.plan,
    credits: user.credits
  });
});

// ===== STRIPE CHECKOUT =====
app.post('/checkout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const sessionData = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Plano Pro - Gerações Ilimitadas' },
          unit_amount: 1000
        },
        quantity: 1
      }],
      success_url: `${FRONTEND_URL}/success.html`,
      cancel_url: `${FRONTEND_URL}/index.html`,
      customer_email: user.email,
      metadata: {
        userId: user._id.toString()
      }
    };

    const session = await stripe.checkout.sessions.create(sessionData);
    console.log(`[CHECKOUT] Sessão criada para ${user.email}:`, session.id);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ error: 'Erro ao iniciar checkout' });
  }
});

app.listen(process.env.PORT, () => {
  console.log('Server rodando');
});