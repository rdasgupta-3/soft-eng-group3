const { loadPage } = require('./helpers/pageLoader');

describe('login.html', () => {
    it('shows an error and does not call login API when fields are empty', async () => {
        const win = loadPage('login.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        await win.attemptLogin();

        expect(win.document.getElementById('error-message').style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('submits the login API request when valid credentials are entered', async () => {
        const win = loadPage('login.html');
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ success: true })
        });
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = 'student@example.com';
        win.document.getElementById('password').value = 'StudyPass123!';

        await win.attemptLogin();

        expect(fetchSpy).toHaveBeenCalled();
        expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/login');
    });
});
