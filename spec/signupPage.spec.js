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

    // The empty-fields check is a separate branch that fires before email validation
    it('shows an error and skips fetch when fields are empty', async () => {
        const win = loadPage('signup.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('new-email').value = '';
        win.document.getElementById('new-password').value = '';

        await win.createAccount();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    // Server error response must surface in the error div
    it('shows the server error message when signup fails', async () => {
        const win = loadPage('signup.html');
        win.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: false,
            json: async () => ({ error: 'Email already in use.' })
        });

        win.document.getElementById('new-email').value = 'taken@example.com';
        win.document.getElementById('new-password').value = 'ValidPass123!';

        await win.createAccount();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(error.innerText).toContain('Email already in use.');
    });

    // Success path renders the success div (redirect happens after a timeout)
    it('shows the success message when account is created', async () => {
        const win = loadPage('signup.html');
        win.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({})
        });
        win.setTimeout = jasmine.createSpy('setTimeout'); // prevent actual redirect

        win.document.getElementById('new-email').value = 'new@example.com';
        win.document.getElementById('new-password').value = 'ValidPass123!';

        await win.createAccount();

        const success = win.document.getElementById('success-message');
        expect(success.style.display).toBe('block');
    });
});
