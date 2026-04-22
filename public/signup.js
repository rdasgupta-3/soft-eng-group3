const signupButton = document.getElementById('signup-btn');
const signupError = document.getElementById('error-message');
const signupSuccess = document.getElementById('success-message');

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

function setSignupMessage(message, tone) {
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';

    if (!message) {
        return;
    }

    if (tone === 'success') {
        signupSuccess.textContent = message;
        signupSuccess.style.display = 'block';
        return;
    }

    signupError.textContent = message;
    signupError.style.display = 'block';
}

async function createAccount() {
    const email = document.getElementById('new-email').value.trim();
    const password = document.getElementById('new-password').value.trim();

    setSignupMessage('');

    if (!email || !password) {
        setSignupMessage('Email and password are required.', 'error');
        return;
    }

    try {
        await fetchJson('/api/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        setSignupMessage('Account created successfully! Redirecting to login...', 'success');
        window.setTimeout(() => {
            window.location.href = '/';
        }, 900);
    } catch (error) {
        setSignupMessage(error.message, 'error');
    }
}

window.createAccount = createAccount;

if (signupButton) {
    signupButton.addEventListener('click', createAccount);
}

document.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        createAccount();
    }
});
