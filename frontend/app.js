const API_URL = "http://127.0.0.1:8000/api";

// --- FUNÇÃO AUXILIAR ESSENCIAL ---
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// --- LÓGICA DE CADA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (path.includes("login.html")) {
    setupLoginPage();
  } else if (path.includes("dashboard.html")) {
    setupDashboardPage();
  } else if (path.includes("admin.html")) {
    setupAdminPage();
  }
});

// --- PÁGINA DE LOGIN ---
function setupLoginPage() {
  // Busca o cookie CSRF do backend ANTES de qualquer coisa
  fetch(`${API_URL}/session/`, { credentials: "include" });
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");
  const csrftoken = getCookie("csrftoken");

  const response = await fetch(`${API_URL}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });

  if (response.ok) {
    window.location.href = "dashboard.html";
  } else {
    errorMessage.textContent = "Credenciais inválidas.";
  }
}

// --- PÁGINAS PROTEGIDAS (DASHBOARD E ADMIN) ---
async function protectPage(isAdminPage = false) {
  const response = await fetch(`${API_URL}/session/`, {
    credentials: "include",
  });
  if (!response.ok) {
    window.location.href = "login.html";
    return null;
  }

  const data = await response.json();
  if (!data.is_authenticated) {
    window.location.href = "login.html";
    return null;
  }
  if (isAdminPage && !data.user.is_staff) {
    alert("Acesso negado. Apenas para administradores.");
    window.location.href = "dashboard.html";
    return null;
  }
  return data.user;
}

async function fetchProtectedData(url, containerSelector) {
  const container = document.querySelector(containerSelector);
  try {
    const response = await fetch(url, { credentials: "include" });
    if (response.ok) {
      const data = await response.json();
      container.textContent = data.message;
    } else {
      container.textContent = "Erro ao carregar dados.";
    }
  } catch (error) {
    container.textContent = "Erro de conexão.";
  }
}

async function setupDashboardPage() {
  const user = await protectPage();
  if (!user) return;

  document.getElementById(
    "welcome-message"
  ).textContent = `Bem-vindo(a), ${user.username}!`;
  if (user.is_staff) {
    document.getElementById(
      "admin-link-container"
    ).innerHTML = `<a href="admin.html">Acessar Área do Administrador</a>`;
  }
  fetchProtectedData(`${API_URL}/data/normal/`, "#data-container");
  setupLogoutButton();
}

async function setupAdminPage() {
  const user = await protectPage(true); // requer admin
  if (!user) return;
  fetchProtectedData(`${API_URL}/data/admin/`, "#admin-data-container");
  setupLogoutButton();
}

// --- LOGOUT ---
function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-button");
  logoutButton.addEventListener("click", handleLogout);
}

async function handleLogout() {
  const csrftoken = getCookie("csrftoken");
  await fetch(`${API_URL}/logout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
    credentials: "include",
  });
  window.location.href = "login.html";
}
