const forgotButton = document.getElementById('forgot-password-btn');
const forgotError = document.getElementById('error-message');
const forgotSuccess = document.getElementById('success-message');
const previewLink = document.getElementById('preview-link');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function resetForgotMessages() {
    forgotError.style.display = 'none';
    forgotSuccess.style.display = 'none';
    previewLink.style.display = 'none';
    previewLink.innerHTML = '';
}

async function requestReset() {
    const email = document.getElementById('email').value.trim();

    resetForgotMessages();

    if (!email) {
        forgotError.textContent = 'Email is required.';
        forgotError.style.display = 'block';
        return;
    }

    if (!emailRegex.test(email)) {
        forgotError.textContent = 'Please enter a valid email address (example@domain.com).';
        forgotError.style.display = 'block';
        return;
    }

    try {
        const result = await fetchJson('/api/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        forgotSuccess.textContent = result.message || 'If this email exists, a reset link has been sent.';
        forgotSuccess.style.display = 'block';

        if (result.previewResetLink) {
            previewLink.innerHTML = `
                <div class="preview-link__card">
                    Dev preview link:
                    <a href="${result.previewResetLink}">${result.previewResetLink}</a>
                </div>
            `;
            previewLink.style.display = 'block';
        }
    } catch (error) {
        forgotError.textContent = error.message;
        forgotError.style.display = 'block';
    }
}

window.requestReset = requestReset;

if (forgotButton) {
    forgotButton.addEventListener('click', requestReset);
}
