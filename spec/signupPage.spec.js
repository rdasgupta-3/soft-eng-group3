const { loadPage } = require('./helpers/pageLoader');

describe('signup.html', () => {
    it('shows an error for invalid email before signup API call', async () => {
        const win = loadPage('signup.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('new-email').value = 'bad-email';
        win.document.getElementById('new-password').value = 'ValidPass123!';

        await win.createAccount();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
