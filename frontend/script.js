let token = '';
let messageEl, emailInput, passwordInput, promptInput, output, preview, authSection, appSection, planInfo, creditsInfo, generateButton;

console.log('Script carregado');

// URL dinâmica da API (funciona local e produção)
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

function initElements() {
  console.log('Iniciando initElements');
  messageEl = document.getElementById('message');
  emailInput = document.getElementById('email');
  passwordInput = document.getElementById('password');
  promptInput = document.getElementById('prompt');
  output = document.getElementById('output');
  preview = document.getElementById('preview');
  authSection = document.querySelector('.auth');
  appSection = document.querySelector('.app');
  planInfo = document.getElementById('planInfo');
  creditsInfo = document.getElementById('creditsInfo');
  generateButton = document.getElementById('generateButton');

  // Novos elementos para formulários aprimorados
  registerEmailInput = document.getElementById('registerEmail');
  registerPasswordInput = document.getElementById('registerPassword');
  confirmPasswordInput = document.getElementById('confirmPassword');
  resetEmailInput = document.getElementById('resetEmail');
  newPasswordInput = document.getElementById('newPassword');
  confirmNewPasswordInput = document.getElementById('confirmNewPassword');

  authTitle = document.getElementById('authTitle');
  authSubtitle = document.getElementById('authSubtitle');
  authForm = document.getElementById('authForm');
  registerForm = document.getElementById('registerForm');
  forgotPasswordForm = document.getElementById('forgotPasswordForm');
  resetPasswordForm = document.getElementById('resetPasswordForm');

  strengthBar = document.getElementById('strengthBar');
  strengthText = document.getElementById('strengthText');
  newStrengthBar = document.getElementById('newStrengthBar');
  newStrengthText = document.getElementById('newStrengthText');

  // Event listeners para validação em tempo real
  if (registerPasswordInput) {
    registerPasswordInput.addEventListener('input', () => checkPasswordStrength(registerPasswordInput.value, strengthBar, strengthText));
  }
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', () => checkPasswordStrength(newPasswordInput.value, newStrengthBar, newStrengthText));
  }

  console.log('emailInput:', emailInput);
  console.log('passwordInput:', passwordInput);
  console.log('Elementos inicializados');
}

function showMessage(msg, type = 'info') {
  messageEl.textContent = msg;
  messageEl.className = `message ${type}`;
}

function updateUserStatus(plan, credits) {
  planInfo.textContent = `Plano: ${plan}`;
  creditsInfo.textContent = `Gerações disponíveis: ${plan === 'pro' ? 'ilimitado' : credits}`;

  if (plan === 'pro') {
    generateButton.disabled = false;
  } else {
    generateButton.disabled = credits <= 0;
  }
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.className = 'message hidden';
}

function setLoading(button, state) {
  if (!button) return;
  if (state) {
    button.dataset.original = button.textContent;
    button.disabled = true;
    button.textContent = 'Carregando...';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.original || 'Enviar';
  }
}

async function register() {
  console.log('Função register chamada');
  clearMessage();

  // Detectar se estamos no modo de cadastro ou login
  const isRegisterMode = !registerForm.classList.contains('hidden');
  console.log('Modo registro:', isRegisterMode);

  const email = isRegisterMode ? registerEmailInput.value.trim() : emailInput.value.trim();
  const password = isRegisterMode ? registerPasswordInput.value : passwordInput.value;
  const confirmPassword = isRegisterMode ? confirmPasswordInput.value : null;

  console.log('Email:', email, 'Password length:', password.length);

  if (!email || !password) {
    return showMessage('Preencha email e senha', 'error');
  }

  if (isRegisterMode && !confirmPassword) {
    return showMessage('Confirme sua senha', 'error');
  }

  if (isRegisterMode && password !== confirmPassword) {
    return showMessage('As senhas não coincidem', 'error');
  }

  if (password.length < 6) {
    return showMessage('Senha deve ter pelo menos 6 caracteres', 'error');
  }

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return showMessage('Digite um email válido', 'error');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Se não conseguir fazer parse do JSON, cria um objeto de erro
      data = { error: `Erro do servidor (${response.status})` };
    }

    console.log('Register data:', data);
    if (response.ok) {
      showMessage('Conta criada com sucesso! Agora faça login.', 'success');
      // Limpar campos após sucesso
      if (isRegisterMode) {
        registerEmailInput.value = '';
        registerPasswordInput.value = '';
        confirmPasswordInput.value = '';
        // Voltar para login
        setTimeout(() => toggleAuthMode(), 2000);
      } else {
        emailInput.value = '';
        passwordInput.value = '';
      }
    } else {
      // Mostrar mensagem específica do erro
      showMessage(data.error || `Erro ${response.status}: ${response.statusText}`, 'error');
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    showMessage('Erro de conexão. Verifique se o servidor está rodando.', 'error');
  }
}

async function login() {
  console.log('Função login chamada');
  console.log('emailInput.value:', emailInput ? emailInput.value : 'null');
  console.log('passwordInput.value:', passwordInput ? passwordInput.value : 'null');
  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  console.log('Email:', email, 'Password length:', password.length);

  if (!email || !password) {
    return showMessage('Preencha email e senha', 'error');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return showMessage('Digite um email válido', 'error');
  }

  try {
    console.log('Fazendo fetch para login:', `${API_BASE_URL}/login`);
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = { error: `Erro do servidor (${response.status})` };
    }

    console.log('Login response:', response.status, data);
    if (response.ok && data.token) {
      token = data.token;
      localStorage.setItem('authToken', token);
      authSection.classList.add('hidden');
      appSection.classList.remove('hidden');
      updateUserStatus(data.plan, data.credits);
      showMessage('Login realizado com sucesso!', 'success');

      // Limpar campos após login bem-sucedido
      emailInput.value = '';
      passwordInput.value = '';
    } else {
      showMessage(data.error || 'Login inválido. Verifique seus dados.', 'error');
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    showMessage('Erro de conexão. Verifique se o servidor está rodando.', 'error');
  }
}

function logout() {
  token = '';
  localStorage.removeItem('authToken');
  authSection.classList.remove('hidden');
  appSection.classList.add('hidden');
  showMessage('Você saiu do sistema.', 'info');
}

function extractCodeBlocks(text) {
  const blocks = { html: '', css: '', js: '' };
  const fenceRegex = /```(?:([a-zA-Z0-9]+)\n)?([\s\S]*?)```/g;
  let match;

  while ((match = fenceRegex.exec(text)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    const code = match[2].trim();

    if (lang.includes('html') && !blocks.html) {
      blocks.html = code;
    } else if (lang.includes('css') && !blocks.css) {
      blocks.css = code;
    } else if ((lang.includes('js') || lang.includes('javascript')) && !blocks.js) {
      blocks.js = code;
    } else if (!lang && !blocks.html && code.includes('<')) {
      blocks.html = code;
    }
  }

  return blocks;
}

function buildPreviewDoc(text) {
  const { html, css, js } = extractCodeBlocks(text);

  if (!html && !css && !js) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#111;color:#fff;padding:24px;}</style></head><body><div>Preview indisponível para este conteúdo. Copie o código gerado e use em seus arquivos HTML/CSS/JS.</div></body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css || ''}</style></head><body>${html || ''}<script>${js || ''}<!-- --></script></body></html>`;
}

async function generate(event) {
  clearMessage();

  const btn = event?.target;
  setLoading(btn, true);

  if (!promptInput.value) {
    setLoading(btn, false);
    return showMessage('Digite um prompt para continuar.', 'error');
  }

  if (!token) {
    setLoading(btn, false);
    return showMessage('Faça login antes de gerar o código.', 'error');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ prompt: promptInput.value })
    });

    const data = await res.json();

    if (data.error) {
      showMessage(data.error, 'error');
    } else {
      output.textContent = data.code;
      preview.srcdoc = buildPreviewDoc(data.code);
      updateUserStatus(data.plan, data.credits);
      showMessage('Código gerado com sucesso!', 'success');
    }
  } catch {
    showMessage('Erro ao gerar código. Verifique o servidor.', 'error');
  }

  setLoading(btn, false);
}

async function checkout(event) {
  clearMessage();
  const btn = event?.target;
  setLoading(btn, true);

  if (!token) {
    setLoading(btn, false);
    return showMessage('Faça login antes de fazer upgrade.', 'error');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': token
      }
    });

    const data = await res.json();
    if (data.url) {
      showMessage('Redirecionando para o pagamento...', 'info');
      window.location.href = data.url;
    } else {
      showMessage('Erro ao iniciar o pagamento.', 'error');
    }
  } catch {
    showMessage('Erro ao iniciar o pagamento. Tente novamente.', 'error');
  }

  setLoading(btn, false);
}

function copyCode() {
  if (!output.textContent.trim()) {
    return showMessage('Não há código para copiar.', 'error');
  }

  navigator.clipboard.writeText(output.textContent)
    .then(() => showMessage('Código copiado para a área de transferência.', 'success'))
    .catch(() => showMessage('Não foi possível copiar o código.', 'error'));
}

// ===== FUNÇÕES DE AUTENTICAÇÃO APRIMORADAS =====

function toggleAuthMode() {
  console.log('toggleAuthMode chamado');
  const isLoginMode = !registerForm.classList.contains('hidden');
  console.log('isLoginMode:', isLoginMode);

  if (isLoginMode) {
    console.log('Mostrando formulário de cadastro');
    // Mostrar formulário de cadastro
    authTitle.textContent = 'Criar nova conta';
    authSubtitle.textContent = 'Preencha os dados abaixo para criar sua conta.';
    authForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    forgotPasswordForm.classList.add('hidden');
    resetPasswordForm.classList.add('hidden');
  } else {
    console.log('Mostrando formulário de login');
    // Mostrar formulário de login
    authTitle.textContent = 'Entrar na sua conta';
    authSubtitle.textContent = 'Use seu email para acessar o gerador de componentes.';
    authForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
    resetPasswordForm.classList.add('hidden');
  }
}

function showForgotPassword() {
  authTitle.textContent = 'Esqueci minha senha';
  authSubtitle.textContent = 'Digite seu email para receber instruções de redefinição.';
  authForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  forgotPasswordForm.classList.remove('hidden');
  resetPasswordForm.classList.add('hidden');
}

function showLoginForm() {
  authTitle.textContent = 'Entrar na sua conta';
  authSubtitle.textContent = 'Use seu email para acessar o gerador de componentes.';
  authForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  forgotPasswordForm.classList.add('hidden');
  resetPasswordForm.classList.add('hidden');
}

function checkPasswordStrength(password, barElement, textElement) {
  let strength = 0;
  let feedback = [];

  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  barElement.className = 'strength-bar';

  if (strength <= 2) {
    barElement.classList.add('strength-weak');
    textElement.textContent = 'Fraca';
    textElement.style.color = '#ef4444';
  } else if (strength <= 4) {
    barElement.classList.add('strength-medium');
    textElement.textContent = 'Média';
    textElement.style.color = '#f59e0b';
  } else {
    barElement.classList.add('strength-strong');
    textElement.textContent = 'Forte';
    textElement.style.color = '#10b981';
  }
}

async function register() {
  clearMessage();

  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (!email || !password || !confirmPassword) {
    return showMessage('Preencha todos os campos', 'error');
  }

  if (password !== confirmPassword) {
    return showMessage('As senhas não coincidem', 'error');
  }

  if (password.length < 6) {
    return showMessage('Senha deve ter pelo menos 6 caracteres', 'error');
  }

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return showMessage('Digite um email válido', 'error');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = { error: `Erro do servidor (${response.status})` };
    }

    if (response.ok) {
      showMessage('Conta criada com sucesso! Agora faça login.', 'success');
      // Limpar campos após sucesso
      registerEmailInput.value = '';
      registerPasswordInput.value = '';
      confirmPasswordInput.value = '';
      // Voltar para login
      setTimeout(() => toggleAuthMode(), 2000);
    } else {
      showMessage(data.error || `Erro ${response.status}: ${response.statusText}`, 'error');
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    showMessage('Erro de conexão. Verifique se o servidor está rodando.', 'error');
  }
}

async function requestPasswordReset() {
  clearMessage();

  const email = resetEmailInput.value.trim();

  if (!email) {
    return showMessage('Digite seu email', 'error');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return showMessage('Digite um email válido', 'error');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email })
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = { error: `Erro do servidor (${response.status})` };
    }

    if (response.ok) {
      showMessage('Link de redefinição enviado! Verifique seu email.', 'success');
      resetEmailInput.value = '';
    } else {
      showMessage(data.error || 'Erro ao enviar link de redefinição', 'error');
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    showMessage('Erro de conexão. Tente novamente.', 'error');
  }
}

async function resetPassword() {
  clearMessage();

  const password = newPasswordInput.value;
  const confirmPassword = confirmNewPasswordInput.value;
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    return showMessage('Link de redefinição inválido', 'error');
  }

  if (!password || !confirmPassword) {
    return showMessage('Preencha todos os campos', 'error');
  }

  if (password !== confirmPassword) {
    return showMessage('As senhas não coincidem', 'error');
  }

  if (password.length < 6) {
    return showMessage('Senha deve ter pelo menos 6 caracteres', 'error');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        token: token,
        password: password
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = { error: `Erro do servidor (${response.status})` };
    }

    if (response.ok) {
      showMessage('Senha redefinida com sucesso! Faça login.', 'success');
      // Limpar campos e voltar para login
      newPasswordInput.value = '';
      confirmNewPasswordInput.value = '';
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        showLoginForm();
      }, 2000);
    } else {
      showMessage(data.error || 'Erro ao redefinir senha', 'error');
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    showMessage('Erro de conexão. Tente novamente.', 'error');
  }
}

async function setupApp() {
  initElements();
  console.log('setupApp chamado');

  // Garantir estado inicial dos formulários
  console.log('authForm:', authForm);
  console.log('registerForm:', registerForm);
  if (authForm) authForm.classList.remove('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  if (forgotPasswordForm) forgotPasswordForm.classList.add('hidden');
  if (resetPasswordForm) resetPasswordForm.classList.add('hidden');
  console.log('Formulários resetados');

  // Verificar se há token de redefinição de senha na URL
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  if (resetToken) {
    console.log('Token de redefinição encontrado, mostrando formulário...');
    authTitle.textContent = 'Redefinir senha';
    authSubtitle.textContent = 'Digite sua nova senha.';
    authForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
    resetPasswordForm.classList.remove('hidden');
    return; // Não continua com o fluxo normal
  }
  
  const savedToken = localStorage.getItem('authToken');
  if (savedToken) {
    console.log('Token encontrado no localStorage, restaurando sessão...');
    token = savedToken;
    
    try {
      const res = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Sessão restaurada:', data.email);
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        updateUserStatus(data.plan, data.credits);
      } else {
        console.log('Token inválido, limpando...');
        localStorage.removeItem('authToken');
        token = '';
      }
    } catch (error) {
      console.error('Erro ao restaurar sessão:', error);
      localStorage.removeItem('authToken');
      token = '';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupApp);
} else {
  setupApp();
}

// ===== REGISTRO PWA =====
console.log('toggleAuthMode defined:', typeof toggleAuthMode);
console.log('register defined:', typeof register);
console.log('login defined:', typeof login);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.log('Falha ao registrar Service Worker:', error);
      });
  });
}
