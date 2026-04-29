const tts = require('../public/tts');

function makeSpeechWindow(voices) {
    function SpeechSynthesisUtterance(text) {
        this.text = text;
    }

    return {
        localStorage: {
            getItem: () => null
        },
        console,
        SpeechSynthesisUtterance,
        speechSynthesis: {
            cancel: jasmine.createSpy('cancel'),
            speak: jasmine.createSpy('speak'),
            getVoices: () => voices || [
                { name: 'English Test Voice', lang: 'en-US' },
                { name: 'Spanish Test Voice', lang: 'es-ES' }
            ]
        }
    };
}

describe('Personality-aware TTS helper', () => {
    it('returns different settings for each persona', () => {
        const professional = tts.getTtsSettingsForPersona('professional');
        const sweetheart = tts.getTtsSettingsForPersona('sweetheart');
        const silly = tts.getTtsSettingsForPersona('silly');

        expect(professional).not.toEqual(sweetheart);
        expect(sweetheart).not.toEqual(silly);
        expect(professional.rate).toBeLessThan(silly.rate);
        expect(professional.pitch).toBeLessThan(sweetheart.pitch);
    });

    it('selects an en-GB voice for Lord Silly when available', () => {
        const voices = [
            { name: 'US English', lang: 'en-US' },
            { name: 'UK English', lang: 'en-GB' }
        ];

        expect(tts.selectVoiceForPersona('silly', voices)).toEqual(voices[1]);
    });

    it('selects a likely female English voice for Miss Sweetheart when available', () => {
        const voices = [
            { name: 'David', lang: 'en-US' },
            { name: 'Samantha', lang: 'en-US' }
        ];

        expect(tts.selectVoiceForPersona('sweetheart', voices)).toEqual(voices[1]);
    });

    it('selects a likely male English voice for Mr. Professional when available', () => {
        const voices = [
            { name: 'Zira', lang: 'en-US' },
            { name: 'Daniel', lang: 'en-GB' }
        ];

        expect(tts.selectVoiceForPersona('professional', voices)).toEqual(voices[1]);
    });

    it('falls back to any English voice when the preferred persona voice is unavailable', () => {
        const voices = [
            { name: 'French Voice', lang: 'fr-FR' },
            { name: 'Neutral English', lang: 'en-US' }
        ];

        expect(tts.selectVoiceForPersona('sweetheart', voices)).toEqual(voices[1]);
    });

    it('creates an utterance with the requested text', () => {
        const win = makeSpeechWindow();
        const result = tts.speakText('Read this response only.', 'professional', win);

        expect(result.supported).toBeTrue();
        expect(result.utterance.text).toBe('Read this response only.');
        expect(win.speechSynthesis.speak).toHaveBeenCalledWith(result.utterance);
    });

    it('applies persona-specific rate and pitch', () => {
        const win = makeSpeechWindow([{ name: 'UK English', lang: 'en-GB' }]);
        const result = tts.speakText('A cheerful royal reading.', 'silly', win);
        const settings = tts.getTtsSettingsForPersona('silly');

        expect(result.utterance.rate).toBe(settings.rate);
        expect(result.utterance.pitch).toBe(settings.pitch);
        expect(result.utterance.voice).toEqual({ name: 'UK English', lang: 'en-GB' });
    });

    it('stops current speech before starting a new response', () => {
        const win = makeSpeechWindow();
        tts.speakText('First response.', 'professional', win);
        tts.speakText('Second response.', 'sweetheart', win);

        expect(win.speechSynthesis.cancel).toHaveBeenCalledTimes(2);
        expect(win.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('stopSpeaking calls speechSynthesis.cancel', () => {
        const win = makeSpeechWindow();
        tts.stopSpeaking(win);

        expect(win.speechSynthesis.cancel).toHaveBeenCalled();
    });

    it('does not throw when browser speech support is unavailable', () => {
        expect(() => tts.speakText('Hello', 'professional', {})).not.toThrow();
        expect(() => tts.stopSpeaking({})).not.toThrow();

        const result = tts.speakText('Hello', 'professional', {});
        expect(result.supported).toBeFalse();
        expect(result.utterance).toBeNull();
    });

    it('does not crash when voices are empty', () => {
        const win = makeSpeechWindow([]);

        expect(() => tts.speakText('No voice list yet.', 'sweetheart', win)).not.toThrow();
        const result = tts.speakText('No voice list yet.', 'sweetheart', win);
        expect(result.supported).toBeTrue();
        expect(result.utterance.voice).toBeUndefined();
    });
});
