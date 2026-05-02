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
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());

const stripe = new Stripe(process.env.STRIPE_KEY || 'sk_test_dummy');
const openai = process.env.OPENROUTER_KEY ? new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1"
}) : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500/frontend';
const resend = new Resend(process.env.RESEND_API_KEY);
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
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Falha rápido se não achar o servidor
  family: 4 // Força o uso de IPv4 (Resolve problemas de ECONNRESET no Node 18+)
})
.then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
.catch(err => {
  console.error('❌ ERRO CRÍTICO: Falha ao conectar no MongoDB!');
  console.error(err.message);
  console.error('Verifique sua rede, senha ou se a porta 27017 não está bloqueada pelo seu provedor de internet.');
});

const User = mongoose.model('User', new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    default: 5
  },
  plan: {
    type: String,
    default: 'free'
  }
}));

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
  try {
    const { email, password } = req.body;

    // Validações básicas
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se usuário já existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      email: email.toLowerCase(),
      password: hash,
      credits: 3,
      plan: 'free'
    });

    await user.save();
    res.json({ message: 'Usuário criado com sucesso' });
  } catch (error) {
    console.error('Erro no registro:', error);
    if (error.code === 11000) {
      // Erro de duplicata do MongoDB
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
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

// ===== FORGOT PASSWORD =====
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return res.json({ message: 'Se o email existir, você receberá instruções em breve' });
    }

    // Gerar token de redefinição (válido por 1 hora)
    const resetToken = jwt.sign(
      { id: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Enviar e-mail real com Resend
    try {
      await resend.emails.send({
        from: 'AI Code Builder <onboarding@resend.dev>',
        to: email,
        subject: 'Redefinição de Senha - AI Code Builder',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #6366f1;">Redefinição de Senha</h2>
            <p>Você solicitou a redefinição de sua senha no AI Code Builder.</p>
            <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
            </div>
            <p style="font-size: 12px; color: #666;">Se você não solicitou isso, pode ignorar este e-mail.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 10px; color: #999;">Link direto: ${resetLink}</p>
          </div>
        `
      });
      console.log(`📧 E-mail de redefinição enviado para ${email}`);
    } catch (emailError) {
      console.error('Falha ao enviar e-mail via Resend:', emailError);
      // Continuamos o processo para não travar a UI, o link ainda é gerado no console em dev
    }

    res.json({
      message: 'Link de redefinição enviado! Verifique seu email.',
      resetLink: resetLink // Mantido para facilitar testes locais sem e-mail configurado
    });
  } catch (error) {
    console.error('Erro no forgot-password:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== RESET PASSWORD =====
app.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Buscar usuário
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Hash da nova senha
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro no reset-password:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== GENERATE CODE =====
app.post('/generate', auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.plan !== 'pro' && user.credits <= 0) {
    return res.status(403).json({ error: 'Sem créditos' });
  }

  const { prompt, image } = req.body;

  if (!openai) {
    return res.status(503).json({ error: 'Serviço de IA não configurado' });
  }

  let userContent = [];
  if (prompt) {
    userContent.push({ type: "text", text: prompt });
  }
  if (image) {
    userContent.push({
      type: "image_url",
      image_url: { url: image }
    });
  }

  const ai = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      { 
        role: 'system', 
        content: `Você é um desenvolvedor frontend especialista em UI/UX. 
        Gere componentes modernos, responsivos e visualmente atraentes. 
        Sempre retorne o código dividido em blocos de markdown: \`\`\`html\`, \`\`\`css\` e \`\`\`javascript\`.
        Use cores modernas, fontes elegantes e boas práticas de acessibilidade. 
        Não inclua textos explicativos longos antes ou depois do código, foque no snippet.` 
      },
      { role: 'user', content: userContent.length > 0 ? userContent : prompt }
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