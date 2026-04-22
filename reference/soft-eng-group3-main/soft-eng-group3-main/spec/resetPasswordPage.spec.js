const { loadPage } = require('./helpers/pageLoader');

describe('reset-password.html', () => {
    it('shows an error when token is missing', async () => {
        const win = loadPage('reset-password.html', 'http://localhost/reset-password');

        win.document.getElementById('new-password').value = 'ValidPass123!';
        win.document.getElementById('confirm-password').value = 'ValidPass123!';

        await win.submitReset();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(error.innerText).toContain('Reset token missing');
    });

    it('shows an error when passwords do not match', async () => {
        const win = loadPage('reset-password.html', 'http://localhost/reset-password?token=abc123');

        win.document.getElementById('new-password').value = 'ValidPass123!';
        win.document.getElementById('confirm-password').value = 'DifferentPass123!';

        await win.submitReset();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(error.innerText).toContain('Passwords do not match');
    });
});
