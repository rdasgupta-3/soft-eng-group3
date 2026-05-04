const { loadPage } = require('./helpers/pageLoader');

describe('chat.html', () => {
    it('creates an initial empty conversation', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        await new Promise(resolve => setTimeout(resolve, 0));
        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const messagesEl = win.document.getElementById('messages');

        expect(stored.length).toBe(1);
        expect(stored[0].messages.length).toBe(0);
        expect(stored[0].selectedModelIds).toEqual(['ollama-gemma3-1b']);
        expect(messagesEl.children.length).toBe(0);
    });

    it('does not create another conversation when active chat is empty', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        await new Promise(resolve => setTimeout(resolve, 0));
        win.confirm = () => true;

        win.createNewConversation();
        let stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(1);

        await win.addMessage('user-bubble', 'Hello world');
        win.createNewConversation();
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(2);

        const idToPin = stored[0].id;
        win.togglePin(idToPin);
        win.renderConversationList();

        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const pinnedConversation = stored.find(c => c.id === idToPin);
        expect(pinnedConversation.pinned).toBeTrue();

        win.deleteConversation(idToPin);
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(1);
    });

    it('renders selected model pills without the latest-response panel', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat?models=ollama-gemma3-1b,ollama-phi3-mini,ollama-qwen2.5-3b,anthropic-claude-3-5-haiku');
        await new Promise(resolve => setTimeout(resolve, 0));
        const selectedPills = win.document.querySelectorAll('#selected-models .selected-model-pill');

        expect(win.document.querySelector('.latest-responses-wrap')).toBeNull();
        expect(selectedPills.length).toBe(4);
        expect(selectedPills[0].textContent).toContain('Local Gemma 3 1B');
        expect(selectedPills[1].textContent).toContain('Local Phi-3 Mini');
        expect(selectedPills[2].textContent).toContain('Local Qwen 2.5 3B');
        expect(selectedPills[3].textContent).toContain('Claude 3.5 Haiku');
    });

    it('preserves selected local models when server conversations contain old public defaults', async () => {
        const win = loadPage(
            'chat.html',
            'http://localhost/chat?models=ollama-gemma3-1b,ollama-phi3-mini',
            {
                beforeParse(window) {
                    window.fetch = url => {
                        if (url === '/api/me') {
                            return Promise.resolve({
                                ok: true,
                                status: 200,
                                json: async () => ({ email: 'test@test.com' })
                            });
                        }
                        if (url === '/api/models') {
                            return Promise.resolve({
                                ok: true,
                                status: 200,
                                json: async () => ({
                                    models: [
                                        { id: 'openai-gpt-4o-mini', name: 'GPT-4o Mini', access: 'public', provider: 'openai' },
                                        { id: 'google-gemini-2.0-flash', name: 'Gemini 2.0 Flash', access: 'public', provider: 'google' }
                                    ],
                                    defaultModelIds: ['openai-gpt-4o-mini', 'google-gemini-2.0-flash']
                                })
                            });
                        }
                        if (url === '/api/conversations') {
                            return Promise.resolve({
                                ok: true,
                                status: 200,
                                json: async () => ({
                                    conversations: [{
                                        id: 'conv-old',
                                        title: 'Old public conversation',
                                        pinned: false,
                                        updatedAt: Date.now(),
                                        selectedModelIds: ['openai-gpt-4o-mini', 'google-gemini-2.0-flash'],
                                        messages: []
                                    }]
                                })
                            });
                        }
                        return Promise.resolve({
                            ok: true,
                            status: 200,
                            json: async () => ({})
                        });
                    };
                }
            }
        );
        await new Promise(resolve => setTimeout(resolve, 10));

        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const active = stored.find(conversation => conversation.id === win.localStorage.getItem('llmActiveConversationId'));

        expect(active.selectedModelIds).toEqual(['ollama-gemma3-1b', 'ollama-phi3-mini']);
        expect(win.document.getElementById('selected-models').textContent).toContain('Local Gemma 3 1B');
        expect(win.document.getElementById('selected-models').textContent).toContain('Local Phi-3 Mini');
        expect(win.document.getElementById('selected-models').textContent).not.toContain('GPT-4o Mini');
    });

    it('renders the selected persona name and avatar path in the chat header', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=sweetheart');
        await new Promise(resolve => setTimeout(resolve, 0));
        const personaName = win.document.getElementById('current-persona-name').textContent;
        const avatar = win.document.querySelector('#current-persona-avatar img');

        expect(personaName).toBe('Miss Sweetheart');
        expect(avatar).not.toBeNull();
        expect(avatar.getAttribute('src')).toBe('/images/image_4.png');
    });

    it('falls back to initials when a persona avatar image fails to load', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=professional');
        await new Promise(resolve => setTimeout(resolve, 0));
        const avatar = win.createAvatar('/images/missing.png', 'Mr. Professional', 'persona-avatar');
        const img = avatar.querySelector('img');

        img.dispatchEvent(new win.Event('error'));

        expect(avatar.textContent).toBe('M');
        expect(avatar.classList.contains('default-avatar')).toBeTrue();
    });

    it('uses corrected persona avatar metadata for assistant messages', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=silly');
        await new Promise(resolve => setTimeout(resolve, 0));

        await win.addMessage('ai-bubble', 'A royal answer appears.', {
            modelName: 'Gemini 2.0 Flash',
            personaId: 'silly',
            personaName: 'Lord Silly the Ninth',
            personaAvatar: 'images/silly.jpg'
        });

        const avatar = win.document.querySelector('.ai-message-row .persona-avatar img');
        expect(avatar).not.toBeNull();
        expect(avatar.getAttribute('src')).toBe('/images/image_5.png');
    });
});
