const logoutButton = document.getElementById('logout-btn');

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

async function checkSession() {
    try {
        await fetchJson('/api/session');
    } catch (error) {
        window.location.href = '/';
    }
}

function choosePersona(persona) {
    window.location.href = `/chat?persona=${encodeURIComponent(persona)}`;
}

async function logout() {
    try {
        await fetchJson('/api/logout', {
            method: 'POST'
        });
    } catch (error) {}

    window.location.href = '/';
}

window.choosePersona = choosePersona;
window.logout = logout;

document.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', () => {
        choosePersona(card.dataset.persona);
    });
});

if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

checkSession();
