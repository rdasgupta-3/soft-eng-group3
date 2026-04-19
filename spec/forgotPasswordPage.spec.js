const { loadPage } = require('./helpers/pageLoader');

describe('forgot-password.html', () => {
    it('shows an error for invalid email before forgot-password API call', async () => {
        const win = loadPage('forgot-password.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = 'no-at-sign';

        await win.requestReset();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    // Empty email is a separate branch that fires before email format validation
    it('shows an error and skips fetch when email is empty', async () => {
        const win = loadPage('forgot-password.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = '';

        await win.requestReset();

        const error = win.document.getElementById('error-message');
        expect(error.style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    // Dev preview link has its own rendering branch — must appear in the DOM when returned
    it('renders the preview reset link when the server returns one', async () => {
        const win = loadPage('forgot-password.html');
        win.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({
                message: 'Reset link sent.',
                previewResetLink: 'http://localhost/reset-password?token=abc123'
            })
        });

        win.document.getElementById('email').value = 'user@example.com';

        await win.requestReset();

        const previewDiv = win.document.getElementById('preview-link');
        expect(previewDiv.style.display).toBe('block');
        expect(previewDiv.innerHTML).toContain('abc123');
    });
});
