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
            pause: jasmine.createSpy('pause'),
            resume: jasmine.createSpy('resume'),
            speak: jasmine.createSpy('speak'),
            getVoices: () => voices || [
                { name: 'English Test Voice', lang: 'en-US' },
                { name: 'Spanish Test Voice', lang: 'es-ES' }
            ]
        }
    };
}

describe('Personality-aware TTS helper', () => {
    afterEach(() => {
        tts.stopSpeaking(makeSpeechWindow());
    });

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

    it('avoids duplicate voices when distinct English voices are available', () => {
        const voices = [
            { name: 'Daniel', lang: 'en-GB', voiceURI: 'voice-daniel' },
            { name: 'Samantha', lang: 'en-US', voiceURI: 'voice-samantha' },
            { name: 'Neutral English', lang: 'en-US', voiceURI: 'voice-neutral' }
        ];
        const professionalVoice = tts.selectVoiceForPersona('professional', voices, []);
        const sweetheartVoice = tts.selectVoiceForPersona('sweetheart', voices, [professionalVoice]);
        const sillyVoice = tts.selectVoiceForPersona('silly', voices, [professionalVoice, sweetheartVoice]);

        expect(new Set([professionalVoice.voiceURI, sweetheartVoice.voiceURI, sillyVoice.voiceURI]).size).toBe(3);
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

    it('pauses and resumes without restarting the utterance', () => {
        const win = makeSpeechWindow();
        tts.speakText('First sentence. Second sentence.', 'professional', win, { messageId: 'm1' });
        const speakCalls = win.speechSynthesis.speak.calls.count();

        tts.pauseSpeaking(win);
        expect(tts.getState().isPaused).toBeTrue();
        expect(win.speechSynthesis.pause).toHaveBeenCalled();

        tts.resumeSpeaking(win);
        expect(tts.getState().isPaused).toBeFalse();
        expect(win.speechSynthesis.resume).toHaveBeenCalled();
        expect(win.speechSynthesis.speak.calls.count()).toBe(speakCalls);
    });

    it('stopSpeaking calls speechSynthesis.cancel', () => {
        const win = makeSpeechWindow();
        tts.speakText('Reset this.', 'professional', win, { messageId: 'm1' });
        tts.stopSpeaking(win);

        expect(win.speechSynthesis.cancel).toHaveBeenCalled();
        expect(tts.getState().isSpeaking).toBeFalse();
    });

    it('scrubbing updates the chunk index and restarts from the selected chunk', () => {
        const win = makeSpeechWindow();
        tts.speakText('Alpha one. Beta two. Gamma three.', 'silly', win, { messageId: 'm1' });

        tts.seekToChunk(1, win);
        const state = tts.getState();
        const latestUtterance = win.speechSynthesis.speak.calls.mostRecent().args[0];

        expect(state.currentChunkIndex).toBe(1);
        expect(latestUtterance.text).toBe('Beta two.');
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
