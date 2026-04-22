const { loadPage } = require('./helpers/pageLoader');

describe('signup.html', () => {
    it('shows an error and does not call signup API when fields are empty', async () => {
        const win = loadPage('signup.html');
        const fetchSpy = jasmine.createSpy('fetch');
        win.fetch = fetchSpy;

        await win.createAccount();

        expect(win.document.getElementById('error-message').style.display).toBe('block');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows a success message after the signup API accepts the new account', async () => {
        const win = loadPage('signup.html');
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ success: true })
        });
        win.fetch = fetchSpy;
        win.setTimeout = jasmine.createSpy('setTimeout');

        win.document.getElementById('new-email').value = 'student@example.com';
        win.document.getElementById('new-password').value = 'StudyPass123!';

        await win.createAccount();

        expect(fetchSpy).toHaveBeenCalled();
        expect(win.document.getElementById('success-message').style.display).toBe('block');
    });
});
