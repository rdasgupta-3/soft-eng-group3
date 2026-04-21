const { loadPage } = require('./helpers/pageLoader');

describe('Accessibility Controls', () => {

    let win, chatContainer;

    beforeEach(() => {
        win = loadPage('chat.html', 'http://localhost/chat');
        chatContainer = win.document.getElementById('chat-container');
    });

    it('toggles bold formatting on the chat container', () => {
        expect(chatContainer.classList.contains('bold')).toBeFalse();

        win.toggleBold();
        expect(chatContainer.classList.contains('bold')).toBeTrue();

        win.toggleBold();
        expect(chatContainer.classList.contains('bold')).toBeFalse();
    });

    it('increases text size when the button is clicked', () => {
        const initialSize = chatContainer.style.fontSize || '16px';

        win.increaseTextSize();
        const newSize = chatContainer.style.fontSize;

        expect(newSize).not.toBe(initialSize);
    });

    it('applies formatting to new messages', async () => {
        win.toggleBold();
        win.increaseTextSize();

        await win.addMessage('user-bubble', 'Hello');

        const lastMessage = chatContainer.querySelector('.message:last-child');

        expect(lastMessage.classList.contains('bold')).toBeTrue();
        expect(lastMessage.style.fontSize).toBe(chatContainer.style.fontSize);
    });

});