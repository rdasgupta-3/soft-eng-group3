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
});
