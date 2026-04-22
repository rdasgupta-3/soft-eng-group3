const resetButton = document.getElementById('reset-password-btn');
const resetError = document.getElementById('error-message');
const resetSuccess = document.getElementById('success-message');

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

function resetResetMessages() {
    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';
}

async function submitReset() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    resetResetMessages();

    if (!token) {
        resetError.textContent = 'Reset token missing from URL.';
        resetError.style.display = 'block';
        return;
    }

    if (!newPassword || newPassword.length < 8) {
        resetError.textContent = 'Password must be at least 8 characters.';
        resetError.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        resetError.textContent = 'Passwords do not match.';
        resetError.style.display = 'block';
        return;
    }

    try {
        await fetchJson('/api/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });

        resetSuccess.textContent = 'Password reset complete. Redirecting to login...';
        resetSuccess.style.display = 'block';
        window.setTimeout(() => {
            window.location.href = '/';
        }, 900);
    } catch (error) {
        resetError.textContent = error.message;
        resetError.style.display = 'block';
    }
}
// Rishita Dasgupta wrote this
window.submitReset = submitReset;

if (resetButton) {
    resetButton.addEventListener('click', submitReset);
}
