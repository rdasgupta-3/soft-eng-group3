const { loadPage } = require('./helpers/pageLoader');

describe('login.html', () => {
    it('shows an error for invalid email before calling backend', async () => {
        const win = loadPage('login.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = 'invalid-email';
        win.document.getElementById('password').value = 'ValidPass123!';

        await win.attemptLogin();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(error.innerText).toContain('valid email address');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('calls login API for valid email/password', async () => {
        const win = loadPage('login.html');
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: false,
            json: async () => ({ error: 'Error: Invalid credentials. Please try again.' })
        });
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = 'user@example.com';
        win.document.getElementById('password').value = 'ValidPass123!';

        await win.attemptLogin();

        expect(fetchSpy).toHaveBeenCalled();
        expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/login');
    });
});
