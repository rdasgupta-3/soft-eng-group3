const { loadPage } = require('./helpers/pageLoader');

describe('reset-password.html', () => {
    it('shows an error when the passwords do not match', async () => {
        const win = loadPage('reset-password.html', 'http://localhost/reset-password?token=test-token');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        win.document.getElementById('new-password').value = 'Password123';
        win.document.getElementById('confirm-password').value = 'Different123';
        await win.submitReset();

        expect(win.document.getElementById('error-message').style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('submits the new password when the reset form is valid', async () => {
        const win = loadPage('reset-password.html', 'http://localhost/reset-password?token=test-token');
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ success: true })
        });
        win.fetch = fetchSpy;
        win.setTimeout = jasmine.createSpy('setTimeout');

        win.document.getElementById('new-password').value = 'Password123';
        win.document.getElementById('confirm-password').value = 'Password123';
        await win.submitReset();

        expect(fetchSpy).toHaveBeenCalled();
        expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/reset-password');
        expect(win.document.getElementById('success-message').style.display).toBe('block');
    });
});
