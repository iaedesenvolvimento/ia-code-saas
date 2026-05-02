/**
 * AI Code Builder - Client Side Logic
 * Refactored for modularity, clean code, and Prism.js integration.
 */

let token = localStorage.getItem('authToken') || '';
let currentAttachedImage = null;
let API_BASE_URL;

// Identify API URL based on environment
if (['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.port === '5500') {
  API_BASE_URL = 'http://localhost:3000';
} else {
  API_BASE_URL = 'https://iacode.onrender.com';
}

// Elements Cache
const elements = {
  message: null,
  authSection: null,
  appSection: null,
  prompt: null,
  output: null,
  preview: null,
  planBadge: null,
  creditsBadge: null,
  generateBtn: null,
  forms: {
    auth: null,
    register: null,
    forgot: null,
    reset: null
  }
};

/**
 * Initialize DOM Elements
 */
function init() {
  elements.message = document.getElementById('message');
  elements.authSection = document.getElementById('authSection');
  elements.appSection = document.getElementById('appSection');
  elements.prompt = document.getElementById('prompt');
  elements.output = document.getElementById('output');
  elements.preview = document.getElementById('preview');
  elements.planBadge = document.getElementById('planInfo');
  elements.creditsBadge = document.getElementById('creditsInfo');
  elements.generateBtn = document.getElementById('generateButton');

  elements.forms.auth = document.getElementById('authForm');
  elements.forms.register = document.getElementById('registerForm');
  elements.forms.forgot = document.getElementById('forgotPasswordForm');
  elements.forms.reset = document.getElementById('resetPasswordForm');

  handleDeepLinks();
  checkSession();
  setupEventListeners();
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  // Real-time password strength for registration
  const regPass = document.getElementById('registerPassword');
  if (regPass) {
    regPass.addEventListener('input', (e) => {
      updatePasswordStrength(e.target.value, 'strengthBar', 'strengthText');
    });
  }
}

/**
 * Global Message Handler
 */
function showStatus(msg, type = 'info') {
  if (!elements.message) return;
  elements.message.textContent = msg;
  elements.message.className = `message ${type}`;
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      elements.message.classList.add('hidden');
    }, 5000);
  }
}

/**
 * UI State Management
 */
function setButtonLoading(btn, isLoading, text = 'Carregando...') {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> ${text}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || 'Enviar';
  }
}

/**
 * Auth Session Check
 */
async function checkSession() {
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      onLoginSuccess(data);
    } else {
      logout();
    }
  } catch (err) {
    console.error('Session check failed', err);
  }
}

/**
 * Handle URL Search Params (Password Reset)
 */
function handleDeepLinks() {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  if (resetToken) {
    showForm('reset');
  }
}

/**
 * Authentication Actions
 */
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.querySelector('#authForm .primary');

  if (!email || !password) return showStatus('Por favor, preencha todos os campos', 'error');

  setButtonLoading(btn, true, 'Entrando...');
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem('authToken', token);
      onLoginSuccess(data);
      showStatus('Bem-vindo de volta!', 'success');
    } else {
      showStatus(data.error || 'Credenciais inválidas', 'error');
    }
  } catch (err) {
    showStatus('Erro de conexão', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function register() {
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  const btn = document.querySelector('#registerForm .primary');

  if (password !== confirm) return showStatus('As senhas não coincidem', 'error');
  
  setButtonLoading(btn, true, 'Criando conta...');
  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      showStatus('Conta criada! Por favor, faça login.', 'success');
      setTimeout(() => showForm('auth'), 2000);
    } else {
      showStatus(data.error || 'Falha no cadastro', 'error');
    }
  } catch (err) {
    showStatus('Erro de conexão', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function onLoginSuccess(userData) {
  console.log('Login bem-sucedido, ocultando formulário...');
  if (elements.authSection) elements.authSection.classList.add('hidden');
  if (elements.appSection) elements.appSection.classList.remove('hidden');
  updateUserStats(userData.plan, userData.credits);
}

function logout() {
  token = '';
  localStorage.removeItem('authToken');
  if (elements.authSection) elements.authSection.classList.remove('hidden');
  if (elements.appSection) elements.appSection.classList.add('hidden');
  showStatus('Sessão encerrada com sucesso', 'info');
}

/**
 * App Logic
 */
async function generate(e) {
  const prompt = elements.prompt.value.trim();
  if (!prompt) return showStatus('Por favor, descreva o que você quer construir', 'error');

  setButtonLoading(elements.generateBtn, true, 'Gerando Código...');
  try {
    const res = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt, image: currentAttachedImage })
    });

    const data = await res.json();
    if (res.ok) {
      displayGeneratedCode(data.code);
      updateUserStats(data.plan, data.credits);
      showStatus('Componente gerado com sucesso!', 'success');
    } else {
      showStatus(data.error || 'Falha na geração', 'error');
    }
  } catch (err) {
    showStatus('Falha na geração. Verifique a conexão com o servidor.', 'error');
  } finally {
    setButtonLoading(elements.generateBtn, false);
  }
}

// Handler para anexar imagem
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showStatus('Por favor, selecione um arquivo de imagem válido', 'error');
    return;
  }
  
  // Limite de tamanho (ex: 4MB)
  if (file.size > 4 * 1024 * 1024) {
    showStatus('A imagem deve ter no máximo 4MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAttachedImage = e.target.result;
    document.getElementById('imagePreview').src = currentAttachedImage;
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

// Handler para remover a imagem anexada
function removeImage() {
  currentAttachedImage = null;
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('imagePreview').src = '';
}

function displayGeneratedCode(rawCode) {
  // Update output text with Prism highlighting
  elements.output.textContent = rawCode;
  Prism.highlightElement(elements.output);

  // Update preview iFrame
  elements.preview.srcdoc = buildPreview(rawCode);
}

function buildPreview(rawCode) {
  const { html, css, js } = extractCode(rawCode);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 20px; }
          ${css}
        </style>
      </head>
      <body>
        ${html || '<div style="color: #666; text-align: center; margin-top: 100px;">Gerando visualização...</div>'}
        <script>${js}<\/script>
      </body>
    </html>
  `;
}

function extractCode(text) {
  const blocks = { html: '', css: '', js: '' };
  const fenceRegex = /```(?:([a-zA-Z0-9]+)\n)?([\s\S]*?)```/g;
  let match;

  while ((match = fenceRegex.exec(text)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    const code = match[2].trim();

    if (lang.includes('html')) blocks.html += code + '\n';
    else if (lang.includes('css')) blocks.css += code + '\n';
    else if (lang.includes('js') || lang.includes('javascript')) blocks.js += code + '\n';
    else if (!lang && code.includes('<')) blocks.html += code + '\n';
  }

  // Fallback if no markdown fences found
  if (!blocks.html && !blocks.css && !blocks.js) {
    blocks.html = text;
  }

  return blocks;
}

/**
 * Utility Functions
 */
function updateUserStats(plan, credits) {
  elements.planBadge.textContent = `Plano: ${plan.toUpperCase()}`;
  elements.creditsBadge.textContent = plan === 'pro' ? 'Créditos Ilimitados' : `Créditos: ${credits}`;
  elements.generateBtn.disabled = plan !== 'pro' && credits <= 0;
}

function showForm(type) {
  Object.values(elements.forms).forEach(form => form?.classList.add('hidden'));
  elements.forms[type]?.classList.remove('hidden');

  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');

  switch(type) {
    case 'auth':
      title.textContent = 'Acesse sua conta';
      subtitle.textContent = 'Entre para começar a criar.';
      break;
    case 'register':
      title.textContent = 'Criar Conta';
      subtitle.textContent = 'Junte-se ao futuro do desenvolvimento UI.';
      break;
    case 'forgot':
      title.textContent = 'Recuperar Acesso';
      subtitle.textContent = 'Enviaremos um link de recuperação.';
      break;
    case 'reset':
      title.textContent = 'Nova Senha';
      subtitle.textContent = 'Proteja sua conta.';
      break;
  }
}

function toggleAuthMode() {
  const isLoginVisible = !elements.forms.auth.classList.contains('hidden');
  showForm(isLoginVisible ? 'register' : 'auth');
}

function showForgotPassword() { showForm('forgot'); }
function showLoginForm() { showForm('auth'); }

function copyCode() {
  const code = elements.output.textContent;
  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = originalText, 2000);
  });
}

function updatePasswordStrength(pass, barId, textId) {
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  let strength = 0;

  if (pass.length > 5) strength++;
  if (pass.length > 10) strength++;
  if (/[A-Z]/.test(pass)) strength++;
  if (/[0-9]/.test(pass)) strength++;
  if (/[^A-Za-z0-9]/.test(pass)) strength++;

  bar.className = 'strength-bar';
  if (strength < 2) {
    bar.classList.add('strength-weak');
    text.textContent = 'Fraca';
  } else if (strength < 4) {
    bar.classList.add('strength-medium');
    text.textContent = 'Média';
  } else {
    bar.classList.add('strength-strong');
    text.textContent = 'Forte';
  }
}

async function requestPasswordReset() {
  const email = document.getElementById('resetEmail').value.trim();
  const btn = document.querySelector('#forgotPasswordForm .primary');
  
  setButtonLoading(btn, true);
  try {
    const res = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showStatus('Link de recuperação gerado!', 'success');
      
      // Como não há servidor de e-mail configurado (Nodemailer/SendGrid), exibimos o link na tela
      if (data.resetLink) {
        setTimeout(() => {
          const copiar = prompt("Email não configurado no Backend.\n\nCopie o link abaixo para redefinir sua senha:", data.resetLink);
          if (copiar) window.location.href = data.resetLink;
        }, 500);
      }
    } else {
      showStatus(data.error || 'Erro ao enviar link', 'error');
    }
  } catch (err) { 
    showStatus('Erro de conexão', 'error'); 
  }
  finally { setButtonLoading(btn, false); }
}

async function checkout() {
  if (!token) return showStatus('Login necessário', 'error');
  
  try {
    const res = await fetch(`${API_BASE_URL}/checkout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } catch { showStatus('Erro no Stripe', 'error'); }
}

async function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  const btn = document.querySelector('#resetPasswordForm .primary');

  // Pega o token da URL
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  if (!resetToken) return showStatus('Token de recuperação ausente', 'error');
  if (newPassword.length < 6) return showStatus('A senha deve ter 6+ caracteres', 'error');
  if (newPassword !== confirmPassword) return showStatus('As senhas não coincidem', 'error');

  setButtonLoading(btn, true, 'Salvando...');
  try {
    const res = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      showStatus('Senha alterada com sucesso! Faça login.', 'success');
      setTimeout(() => {
        window.location.href = window.location.pathname; // Limpa o token da URL e volta pro login
      }, 2000);
    } else {
      showStatus(data.error || 'Erro ao redefinir senha', 'error');
    }
  } catch (err) {
    showStatus('Erro ao conectar com o servidor', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

// Initial Boot
document.addEventListener('DOMContentLoaded', init);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed', err));
  });
}
