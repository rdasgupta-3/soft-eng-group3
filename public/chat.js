const PROVIDERS = [
    { id: 'openai', label: 'GPT' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'claude', label: 'Claude' }
];
const VALID_PERSONAS = ['sweetheart', 'professional', 'silly'];

const STORAGE_KEY = 'llmChatConversations';
const ACTIVE_KEY = 'llmActiveConversationId';
const PREFS_KEY = 'llmChatPreferences';
const TEXT_SCALE_STEP = 0.1;
const useServerApi = (
    typeof window.fetch === 'function' &&
    window.location.protocol.startsWith('http') &&
    !/jsdom/i.test(window.navigator.userAgent || '')
);

const state = {
    email: 'local@example.com',
    persona: getCurrentPersona(),
    pendingPersona: getRequestedPersona(),
    conversations: [],
    activeConversationId: null,
    historySearchQuery: '',
    ollamaOnline: false,
    preferences: loadLocalPreferences()
};

const sessionEmail = document.getElementById('session-email');
const personaLabel = document.getElementById('persona-label');
const workspaceStatus = document.getElementById('workspace-status');
const historySearch = document.getElementById('history-search');
const conversationList = document.getElementById('conversation-list');
const newChatButton = document.getElementById('new-chat-btn');
const messages = document.getElementById('messages');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-btn');
const logoutButton = document.getElementById('logout-btn');
const ollamaWarning = document.getElementById('ollama-warning');
const boldToggle = document.getElementById('bold-toggle');
const highContrastToggle = document.getElementById('high-contrast-toggle');
const increaseTextButton = document.getElementById('increase-text-btn');
const decreaseTextButton = document.getElementById('decrease-text-btn');
const fontScaleValue = document.getElementById('font-scale-value');

function clampFontScale(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return 1;
    }

    return Math.min(1.6, Math.max(0.8, Math.round(numericValue * 100) / 100));
}

function isValidPersona(persona) {
    return VALID_PERSONAS.includes(persona);
}

function getRequestedPersona() {
    const params = new URLSearchParams(window.location.search);
    const persona = params.get('persona');

    if (isValidPersona(persona)) {
        return persona;
    }

    return null;
}

function getCurrentPersona() {
    const requestedPersona = getRequestedPersona();
    if (requestedPersona) {
        return requestedPersona;
    }

    return 'professional';
}

function getPersonaName(persona = state.persona) {
    if (persona === 'sweetheart') {
        return 'Miss Sweetheart';
    }

    if (persona === 'silly') {
        return 'Lord Silly The Ninth';
    }

    return 'Mr. Professional';
}

function updatePersonaLabel() {
    personaLabel.textContent = getPersonaName(state.persona);
}

function updatePersonaUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('persona', state.persona);
    window.history.replaceState({}, '', url.toString());
}

function setStatus(message, tone = '') {
    workspaceStatus.textContent = message;
    workspaceStatus.className = 'status-message workspace-status';
    if (tone) {
        workspaceStatus.classList.add(`is-${tone}`);
    }
}

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

function normalizeMessagePayload(payload) {
    if (typeof payload === 'string') {
        return { text: payload };
    }

    return payload || {};
}

function loadLocalPreferences() {
    try {
        const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        return {
            boldText: Boolean(stored.boldText),
            highContrast: Boolean(stored.highContrast),
            fontScale: clampFontScale(stored.fontScale)
        };
    } catch (error) {
        return {
            boldText: false,
            highContrast: false,
            fontScale: 1
        };
    }
}

function saveLocalPreferences() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.preferences));
}

function syncFontScaleLabel() {
    fontScaleValue.textContent = `${Math.round(clampFontScale(state.preferences.fontScale) * 100)}%`;
}

function applyPreferences() {
    document.body.style.setProperty('--message-font-scale', String(clampFontScale(state.preferences.fontScale)));
    document.body.classList.toggle('bold-mode', state.preferences.boldText);
    document.body.classList.toggle('high-contrast-mode', state.preferences.highContrast);
    boldToggle.checked = state.preferences.boldText;
    highContrastToggle.checked = state.preferences.highContrast;
    syncFontScaleLabel();
}

function buildConversation(persona = state.persona) {
    const now = Date.now();
    return {
        id: `conv-${now}-${Math.floor(Math.random() * 10000)}`,
        title: 'New Conversation',
        persona,
        pinned: false,
        isDraft: false,
        updatedAt: now,
        messages: []
    };
}

function buildDraftConversation(persona = state.persona) {
    const draft = buildConversation(persona);
    draft.isDraft = true;
    return draft;
}

function saveConversations() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
    localStorage.setItem(ACTIVE_KEY, state.activeConversationId || '');
}

function loadConversationsFromLocal() {
    try {
        state.conversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
        state.conversations = [];
    }

    state.activeConversationId = localStorage.getItem(ACTIVE_KEY);

    if (!state.conversations.length) {
        ensureDraftConversation();
        return;
    }

    if (!state.conversations.find(conversation => conversation.id === state.activeConversationId)) {
        state.activeConversationId = state.conversations[0].id;
    }
}

function ensureDraftConversation() {
    if (state.conversations.length) {
        return;
    }

    const draft = buildDraftConversation();
    state.conversations = [draft];
    state.activeConversationId = draft.id;
    saveConversations();
}

function getActiveConversation() {
    return state.conversations.find(conversation => conversation.id === state.activeConversationId) || null;
}

function sortedConversations() {
    return [...state.conversations].sort((left, right) => {
        if (left.pinned !== right.pinned) {
            return left.pinned ? -1 : 1;
        }

        return right.updatedAt - left.updatedAt;
    });
}

function conversationMatchesSearch(conversation) {
    if (!state.historySearchQuery) {
        return true;
    }

    const text = [
        conversation.title,
        ...(conversation.messages || []).flatMap(message => {
            if (message.type === 'model-group') {
                return message.responses.map(response => response.text);
            }

            return [message.text];
        })
    ].join(' ').toLowerCase();

    return text.includes(state.historySearchQuery);
}

function hasUserMessages(conversation) {
    return (conversation.messages || []).some(message => message.type === 'user-bubble' && (message.text || '').trim());
}

function getConversationPreview(conversation) {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) {
        return 'No messages yet';
    }

    if (lastMessage.type === 'model-group') {
        return lastMessage.responses.map(response => `${response.providerLabel}: ${response.text}`).join(' ');
    }

    return lastMessage.text;
}

function renderConversationList() {
    conversationList.innerHTML = '';

    const ordered = sortedConversations().filter(conversationMatchesSearch);
    if (!ordered.length) {
        const empty = document.createElement('div');
        empty.className = 'history-empty-state';
        empty.textContent = state.historySearchQuery ? 'No matching conversations.' : 'No conversations yet.';
        conversationList.appendChild(empty);
        return;
    }

    const pinned = ordered.filter(conversation => conversation.pinned);
    const unpinned = ordered.filter(conversation => !conversation.pinned);

    function appendConversationItem(conversation) {
        const item = document.createElement('div');
        item.className = `history-item ${conversation.id === state.activeConversationId ? 'active' : ''}`;
        item.dataset.conversationId = conversation.id;
        item.dataset.conversationTitle = conversation.title;
        item.addEventListener('click', () => {
            switchConversation(conversation.id);
        });

        const title = document.createElement('div');
        title.className = 'history-title';
        title.textContent = conversation.title;

        const preview = document.createElement('div');
        preview.className = 'history-preview';
        preview.textContent = getConversationPreview(conversation);

        item.appendChild(title);
        item.appendChild(preview);

        if (hasUserMessages(conversation)) {
            const actions = document.createElement('div');
            actions.className = 'history-actions';

            const pinButton = document.createElement('button');
            pinButton.type = 'button';
            pinButton.className = 'history-pin-btn';
            pinButton.classList.toggle('is-pinned', conversation.pinned);
            pinButton.textContent = conversation.pinned ? '★' : '☆';
            pinButton.title = conversation.pinned ? 'Unpin conversation' : 'Pin conversation';
            pinButton.setAttribute('aria-label', pinButton.title);
            pinButton.setAttribute('aria-pressed', conversation.pinned ? 'true' : 'false');
            pinButton.addEventListener('click', event => {
                event.stopPropagation();
                togglePin(conversation.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'history-delete-btn';
            deleteButton.textContent = '×';
            deleteButton.title = 'Delete conversation';
            deleteButton.setAttribute('aria-label', deleteButton.title);
            deleteButton.addEventListener('click', event => {
                event.stopPropagation();
                deleteConversation(conversation.id);
            });

            actions.appendChild(pinButton);
            actions.appendChild(deleteButton);
            item.appendChild(actions);
        }

        conversationList.appendChild(item);
    }

    if (pinned.length) {
        const label = document.createElement('div');
        label.className = 'history-separator';
        label.textContent = 'STARRED';
        conversationList.appendChild(label);
    }

    pinned.forEach(appendConversationItem);

    if (pinned.length && unpinned.length) {
        const divider = document.createElement('div');
        divider.className = 'history-divider';
        conversationList.appendChild(divider);
    }

    unpinned.forEach(appendConversationItem);
}

function switchConversation(conversationId) {
    state.activeConversationId = conversationId;

    const current = getActiveConversation();
    if (current && current.persona) {
        state.persona = current.persona;
        updatePersonaLabel();
        updatePersonaUrl();
    }

    saveConversations();
    renderConversationList();
    renderMessages();
}

function createNewConversation() {
    const current = getActiveConversation();
    const currentIsEmpty = current && Array.isArray(current.messages) && current.messages.length === 0;
    if (currentIsEmpty) {
        renderConversationList();
        renderMessages();
        return;
    }

    const draft = buildDraftConversation();
    state.conversations.unshift(draft);
    state.activeConversationId = draft.id;
    saveConversations();
    renderConversationList();
    renderMessages();
}

async function syncConversationsFromServer() {
    const payload = await fetchJson('/api/conversations');
    state.conversations = Array.isArray(payload.conversations) ? payload.conversations : [];

    if (!state.conversations.length) {
        ensureDraftConversation();
        const draft = getActiveConversation();
        if (draft && draft.persona) {
            state.persona = draft.persona;
        }
        saveConversations();
        updatePersonaLabel();
        updatePersonaUrl();
        renderConversationList();
        renderMessages();
        return;
    }

    if (!state.conversations.find(conversation => conversation.id === state.activeConversationId)) {
        state.activeConversationId = state.conversations[0].id;
    }

    const current = getActiveConversation();
    if (current && current.persona) {
        state.persona = current.persona;
    }

    saveConversations();
    updatePersonaLabel();
    updatePersonaUrl();
    renderConversationList();
    renderMessages();
}

async function applyPersonaSelection(persona, options = {}) {
    if (!isValidPersona(persona)) {
        return;
    }

    const syncServer = options.syncServer !== false;
    const current = getActiveConversation();

    if (current && current.persona !== persona && useServerApi && syncServer && !current.isDraft) {
        await fetchJson(`/api/conversations/${current.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ persona })
        });
    }

    state.persona = persona;
    state.pendingPersona = null;

    if (current) {
        current.persona = persona;
        current.updatedAt = Date.now();
        saveConversations();
    }

    updatePersonaLabel();
    updatePersonaUrl();
    renderConversationList();
    renderMessages();
}

async function togglePin(conversationId) {
    const conversation = state.conversations.find(item => item.id === conversationId);
    if (!conversation) {
        return;
    }

    if (useServerApi) {
        await fetchJson(`/api/conversations/${conversationId}`, {
            method: 'PATCH',
            body: JSON.stringify({ pinned: !conversation.pinned })
        });
        await syncConversationsFromServer();
        return;
    }

    conversation.pinned = !conversation.pinned;
    conversation.updatedAt = Date.now();
    saveConversations();
    renderConversationList();
}

async function deleteConversation(conversationId) {
    if (useServerApi) {
        await fetchJson(`/api/conversations/${conversationId}`, {
            method: 'DELETE'
        });

        await syncConversationsFromServer();
        if (!state.conversations.length) {
            ensureDraftConversation();
            renderConversationList();
            renderMessages();
        }
        return;
    }

    const wasActive = conversationId === state.activeConversationId;
    state.conversations = state.conversations.filter(conversation => conversation.id !== conversationId);

    if (!state.conversations.length) {
        ensureDraftConversation();
    } else if (wasActive) {
        state.activeConversationId = sortedConversations()[0].id;
    }

    saveConversations();
    renderConversationList();
    renderMessages();
}

function buildLocalResponses(prompt) {
    const personaName = getPersonaName();

    return PROVIDERS.map(provider => ({
        providerId: provider.id,
        providerLabel: provider.label,
        mode: 'demo-mode',
        text: `${personaName} guided ${provider.label} to respond to "${prompt}" with a short, readable answer tailored to that provider's style.`
    }));
}

async function addLocalMessage(type, payload) {
    const normalized = normalizeMessagePayload(payload);
    const current = getActiveConversation();
    if (!current) {
        return [];
    }

    if (type === 'model-group') {
        current.messages.push({
            type,
            responses: normalized.responses,
            at: Date.now()
        });
    } else {
        current.messages.push({
            type,
            text: normalized.text.trim(),
            at: Date.now()
        });
    }

    if (current.title === 'New Conversation' && type === 'user-bubble') {
        current.title = normalized.text.length > 28 ? `${normalized.text.slice(0, 28)}...` : normalized.text;
    }

    current.persona = state.persona;
    current.isDraft = false;
    current.updatedAt = Date.now();
    saveConversations();
    renderConversationList();
    renderMessages();
    return type === 'model-group' ? normalized.responses : [];
}

async function persistMessage(type, payload) {
    const normalized = normalizeMessagePayload(payload);

    if (!useServerApi) {
        return addLocalMessage(type, normalized);
    }

    let current = getActiveConversation();
    if (!current) {
        return [];
    }

    if (current.isDraft && type === 'user-bubble') {
        const created = await fetchJson('/api/conversations', {
            method: 'POST',
            body: JSON.stringify({ persona: state.persona })
        });

        state.activeConversationId = created.conversation.id;
        current = created.conversation;
    }

    if (type === 'user-bubble') {
        await fetchJson(`/api/conversations/${state.activeConversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ type, text: normalized.text })
        });
        await syncConversationsFromServer();
        return [];
    }

    const reply = await fetchJson(`/api/conversations/${state.activeConversationId}/ai-reply`, {
        method: 'POST',
        body: JSON.stringify({ persona: state.persona })
    });

    await syncConversationsFromServer();
    return Array.isArray(reply.responses) ? reply.responses : [];
}

function buildResponseCard(response, animate = false) {
    const card = document.createElement('div');
    card.className = 'response-card';
    card.dataset.providerId = response.providerId;

    const header = document.createElement('div');
    header.className = 'response-card__header';

    const label = document.createElement('span');
    label.className = 'response-card__label';
    label.textContent = response.providerLabel;

    const mode = document.createElement('span');
    mode.className = 'response-card__mode';
    mode.textContent = response.mode.replace(/-/g, ' ');

    const text = document.createElement('div');
    text.className = 'response-text';
    text.textContent = animate ? '' : response.text;
    text.dataset.fullText = response.text;

    header.appendChild(label);
    header.appendChild(mode);
    card.appendChild(header);
    card.appendChild(text);
    return card;
}

function buildResponseGroupElement(message, animate = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'response-group';

    const title = document.createElement('div');
    title.className = 'response-group__title';
    title.textContent = 'Compare model responses';

    const grid = document.createElement('div');
    grid.className = 'response-grid';
    message.responses.forEach(response => {
        grid.appendChild(buildResponseCard(response, animate));
    });

    wrapper.appendChild(title);
    wrapper.appendChild(grid);
    return wrapper;
}

function renderMessages(skipLastGroup = false) {
    const current = getActiveConversation();
    messages.innerHTML = '';

    if (!current) {
        return;
    }

    let conversationMessages = [...current.messages];
    if (skipLastGroup) {
        const last = conversationMessages[conversationMessages.length - 1];
        if (last && last.type === 'model-group') {
            conversationMessages = conversationMessages.slice(0, -1);
        }
    }

    if (!conversationMessages.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-chat-state';
        empty.textContent = 'Start a conversation to compare three model responses.';
        messages.appendChild(empty);
        return;
    }

    conversationMessages.forEach(message => {
        if (message.type === 'model-group') {
            messages.appendChild(buildResponseGroupElement(message, false));
            return;
        }

        const bubble = document.createElement('div');
        bubble.className = `bubble ${message.type}`;
        bubble.textContent = message.text;
        messages.appendChild(bubble);
    });

    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addTypingBubble() {
    const id = `typing-${Date.now()}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble ai-bubble';
    bubble.id = id;
    bubble.innerHTML = `
        <div class="typing">
            <span>${getPersonaName()} is thinking</span>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    messages.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return id;
}

function removeTypingBubble(id) {
    const bubble = document.getElementById(id);
    if (bubble) {
        bubble.remove();
    }
}

function typeText(element, text, speed = 8) {
    return new Promise(resolve => {
        let index = 0;

        function step() {
            if (index >= text.length) {
                resolve();
                return;
            }

            element.textContent += text.charAt(index);
            index += 1;
            chatWindow.scrollTop = chatWindow.scrollHeight;
            window.setTimeout(step, speed);
        }

        step();
    });
}

async function appendAnimatedResponseGroup(responses) {
    const wrapper = buildResponseGroupElement({ responses }, true);
    messages.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const textNodes = wrapper.querySelectorAll('.response-text');
    for (let index = 0; index < textNodes.length; index += 1) {
        await typeText(textNodes[index], responses[index].text);
    }
}

async function initOllamaStatus() {
    if (!useServerApi) {
        state.ollamaOnline = true;
        ollamaWarning.style.display = 'none';
        chatInput.disabled = false;
        sendButton.disabled = false;
        return;
    }

    try {
        const payload = await fetchJson('/api/ollama-status');
        state.ollamaOnline = Boolean(payload.ok);

        if (!state.ollamaOnline) {
            ollamaWarning.style.display = 'block';
            chatInput.disabled = true;
            sendButton.disabled = true;
            setStatus('Ollama is offline. The chat input is disabled until it becomes available.', 'error');
            return;
        }

        ollamaWarning.style.display = 'none';
        chatInput.disabled = false;
        sendButton.disabled = false;
        await fetchJson('/api/warmup');
    } catch (error) {
        state.ollamaOnline = false;
        ollamaWarning.style.display = 'block';
        chatInput.disabled = true;
        sendButton.disabled = true;
        setStatus('Unable to check Ollama status.', 'error');
    }
}

async function savePreferences() {
    state.preferences = {
        boldText: boldToggle.checked,
        highContrast: highContrastToggle.checked,
        fontScale: clampFontScale(state.preferences.fontScale)
    };
    applyPreferences();

    if (!useServerApi) {
        saveLocalPreferences();
        setStatus('Accessibility settings saved.', 'success');
        return;
    }

    try {
        const response = await fetchJson('/api/preferences', {
            method: 'PUT',
            body: JSON.stringify({ preferences: state.preferences })
        });

        state.preferences = response.preferences;
        applyPreferences();
        setStatus('Accessibility settings saved.', 'success');
    } catch (error) {
        setStatus(error.message, 'error');
    }
}

async function adjustFontScale(delta) {
    state.preferences.fontScale = clampFontScale(state.preferences.fontScale + delta);
    await savePreferences();
}

async function sendMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt) {
        setStatus('Please type a message before sending.', 'error');
        return;
    }

    if (useServerApi && !state.ollamaOnline) {
        setStatus('Ollama is offline. Start it before sending a prompt.', 'error');
        return;
    }

    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';

    try {
        await persistMessage('user-bubble', { text: prompt });
        chatInput.value = '';

        const typingId = addTypingBubble();
        const responses = useServerApi
            ? await persistMessage('model-group', {})
            : await addLocalMessage('model-group', { responses: buildLocalResponses(prompt) });

        removeTypingBubble(typingId);
        renderMessages(true);
        await appendAnimatedResponseGroup(responses);
        setStatus('Three responses generated successfully.', 'success');
    } catch (error) {
        setStatus(error.message || 'Unable to generate a response.', 'error');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
    }
}

async function logout() {
    if (useServerApi) {
        try {
            await fetchJson('/api/logout', {
                method: 'POST'
            });
        } catch (error) {}
    }

    window.location.href = '/';
}

async function loadWorkspace() {
    applyPreferences();
    updatePersonaLabel();

    if (!useServerApi) {
        loadConversationsFromLocal();
        const current = getActiveConversation();
        if (current && current.persona) {
            state.persona = current.persona;
        }

        if (state.pendingPersona) {
            await applyPersonaSelection(state.pendingPersona, { syncServer: false });
        } else {
            updatePersonaLabel();
            updatePersonaUrl();
            renderConversationList();
            renderMessages();
        }
        sessionEmail.textContent = state.email;
        await initOllamaStatus();
        return;
    }

    try {
        const [sessionPayload, preferencesPayload] = await Promise.all([
            fetchJson('/api/session'),
            fetchJson('/api/preferences')
        ]);

        state.email = sessionPayload.session.email;
        state.preferences = preferencesPayload.preferences;
        sessionEmail.textContent = state.email;

        applyPreferences();
        await syncConversationsFromServer();
        if (state.pendingPersona) {
            await applyPersonaSelection(state.pendingPersona);
        } else {
            updatePersonaLabel();
            updatePersonaUrl();
        }
        await initOllamaStatus();
    } catch (error) {
        if (error.status === 401) {
            window.location.href = '/';
            return;
        }

        setStatus(error.message, 'error');
    }
}

window.createNewConversation = createNewConversation;
window.togglePin = togglePin;
window.deleteConversation = deleteConversation;
window.renderConversationList = renderConversationList;
window.renderMessages = renderMessages;
window.addMessage = addLocalMessage;
window.sendMessage = sendMessage;
window.applyPersonaSelection = applyPersonaSelection;

boldToggle.addEventListener('change', savePreferences);
highContrastToggle.addEventListener('change', savePreferences);
increaseTextButton.addEventListener('click', () => adjustFontScale(TEXT_SCALE_STEP));
decreaseTextButton.addEventListener('click', () => adjustFontScale(-TEXT_SCALE_STEP));
historySearch.addEventListener('input', event => {
    state.historySearchQuery = event.target.value.trim().toLowerCase();
    renderConversationList();
});
newChatButton.addEventListener('click', createNewConversation);
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
logoutButton.addEventListener('click', logout);

loadWorkspace();
