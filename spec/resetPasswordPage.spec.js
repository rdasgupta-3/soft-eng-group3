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

    // Short password is a distinct branch between the token check and the mismatch check
    it('shows an error when password is shorter than 8 characters', async () => {
        const win = loadPage('reset-password.html', 'http://localhost/reset-password?token=abc123');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('new-password').value = 'short';
        win.document.getElementById('confirm-password').value = 'short';

        await win.submitReset();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
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

    // Successful reset shows the success div (redirect happens after a timeout)
    it('shows the success message on a valid reset', async () => {
        const win = loadPage('reset-password.html', 'http://localhost/reset-password?token=valid123');
        win.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({})
        });
        win.setTimeout = jasmine.createSpy('setTimeout'); // prevent actual redirect

        win.document.getElementById('new-password').value = 'ValidPass123!';
        win.document.getElementById('confirm-password').value = 'ValidPass123!';

        await win.submitReset();

        const success = win.document.getElementById('success-message');
        expect(success.style.display).toBe('block');
    });
});
