const { loadPage } = require('./helpers/pageLoader');

describe('forgot-password.html', () => {
    it('shows an error for invalid email before forgot-password API call', async () => {
        const win = loadPage('forgot-password.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = 'no-at-sign';
        await win.requestReset();

        expect(win.document.getElementById('error-message').style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows the preview reset link when the forgot-password API succeeds', async () => {
        const win = loadPage('forgot-password.html');
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({
                success: true,
                message: 'Reset link generated.',
                previewResetLink: 'http://localhost/reset-password?token=demo-token'
            })
        });
        win.fetch = fetchSpy;

        win.document.getElementById('email').value = 'student@example.com';
        await win.requestReset();

        expect(fetchSpy).toHaveBeenCalled();
        expect(win.document.getElementById('success-message').style.display).toBe('block');
        expect(win.document.getElementById('preview-link').textContent).toContain('demo-token');
    });
});
