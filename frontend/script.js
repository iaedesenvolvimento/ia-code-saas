let token = '';
let messageEl, emailInput, passwordInput, promptInput, output, preview, authSection, appSection, planInfo, creditsInfo, generateButton;

// URL dinâmica da API (funciona local e produção)
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

function initElements() {
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
  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    return showMessage('Preencha email e senha', 'error');
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

    if (response.ok) {
      showMessage('Conta criada com sucesso! Agora faça login.', 'success');
      // Limpar campos após sucesso
      emailInput.value = '';
      passwordInput.value = '';
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
  clearMessage();

  if (!emailInput.value || !passwordInput.value) {
    return showMessage('Preencha email e senha', 'error');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value
      })
    });

    const data = await res.json();

    if (!data.token) {
      return showMessage('Login inválido. Verifique seus dados.', 'error');
    }

    token = data.token;
    localStorage.setItem('authToken', token);
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    updateUserStatus(data.plan, data.credits);
    showMessage('Login realizado com sucesso!', 'success');
  } catch {
    showMessage('Erro no login. Tente novamente.', 'error');
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

async function setupApp() {
  initElements();
  
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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.log('Falha ao registrar Service Worker:', error);
      });
  });
}
