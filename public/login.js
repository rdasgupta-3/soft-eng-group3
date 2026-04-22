const loginButton = document.getElementById('login-btn');
const loginError = document.getElementById('error-message');

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(payload.error || 'Request failed.');
        error.status = response.status;
        throw error;
    }

    return payload;
}

function showLoginError(message) {
    if (!message) {
        loginError.textContent = '';
        loginError.style.display = 'none';
        return;
    }

    loginError.textContent = message;
    loginError.style.display = 'block';
}

async function attemptLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    showLoginError('');

    if (!email || !password) {
        showLoginError('Error: Email and password fields cannot be empty.');
        return;
    }

    try {
        await fetchJson('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        window.location.href = '/choose-player';
    } catch (error) {
        showLoginError(error.message);
    }
}

async function checkSession() {
    try {
        await fetchJson('/api/session');
        window.location.href = '/choose-player';
    } catch (error) {}
}

window.attemptLogin = attemptLogin;

if (loginButton) {
    loginButton.addEventListener('click', attemptLogin);
}

document.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        attemptLogin();
    }
});

checkSession();
