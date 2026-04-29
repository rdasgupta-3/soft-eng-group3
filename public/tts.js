(function (root) {
    const personaSettings = {
        professional: {
            rate: 0.9,
            pitch: 0.9,
            volume: 1
        },
        sweetheart: {
            rate: 0.95,
            pitch: 1.15,
            volume: 1
        },
        silly: {
            rate: 1.08,
            pitch: 1.25,
            volume: 1
        }
    };

    const likelyMaleVoiceNames = [
        'male', 'man', 'david', 'mark', 'daniel', 'george', 'james', 'john',
        'michael', 'paul', 'richard', 'ryan', 'thomas', 'william'
    ];
    const likelyFemaleVoiceNames = [
        'female', 'woman', 'zira', 'samantha', 'susan', 'victoria', 'karen',
        'moira', 'tessa', 'fiona', 'amy', 'emma', 'joanna', 'salli'
    ];

    let speaking = false;
    let listeners = [];

    function isSupported(targetWindow = root) {
        return Boolean(
            targetWindow &&
            targetWindow.speechSynthesis &&
            targetWindow.SpeechSynthesisUtterance
        );
    }

    function getTtsSettingsForPersona(personaId) {
        const settings = personaSettings[personaId] || personaSettings.professional;
        return { ...settings };
    }

    function isEnglishVoice(voice) {
        return /^en/i.test(voice.lang || '') || /english/i.test(voice.name || '');
    }

    function voiceNameMatches(voice, names) {
        const name = (voice.name || '').toLowerCase();
        return names.some(candidate => name.includes(candidate));
    }

    function firstEnglishVoice(voices) {
        return voices.find(isEnglishVoice) || null;
    }

    function selectVoiceForPersona(personaId, voices = []) {
        const availableVoices = Array.isArray(voices) ? voices : [];
        if (!availableVoices.length) {
            return null;
        }

        if (personaId === 'silly') {
            return availableVoices.find(voice => /^en-GB/i.test(voice.lang || '')) ||
                firstEnglishVoice(availableVoices);
        }

        if (personaId === 'sweetheart') {
            return availableVoices.find(voice => isEnglishVoice(voice) && voiceNameMatches(voice, likelyFemaleVoiceNames)) ||
                firstEnglishVoice(availableVoices);
        }

        if (personaId === 'professional') {
            return availableVoices.find(voice => isEnglishVoice(voice) && voiceNameMatches(voice, likelyMaleVoiceNames)) ||
                firstEnglishVoice(availableVoices);
        }

        return firstEnglishVoice(availableVoices);
    }

    function getAvailableVoices(targetWindow = root) {
        const synth = targetWindow && targetWindow.speechSynthesis;
        if (!synth || typeof synth.getVoices !== 'function') {
            return [];
        }

        return synth.getVoices() || [];
    }

    function listAvailableVoices(targetWindow = root) {
        return getAvailableVoices(targetWindow).map(voice => ({
            name: voice.name || '',
            lang: voice.lang || ''
        }));
    }

    function debugVoiceList(targetWindow = root) {
        const shouldLog = targetWindow &&
            targetWindow.localStorage &&
            targetWindow.localStorage.getItem('triadTtsDebug') === 'true';

        if (shouldLog && targetWindow.console && typeof targetWindow.console.table === 'function') {
            targetWindow.console.table(listAvailableVoices(targetWindow));
        }
    }

    function setupVoiceChangeHandler(targetWindow = root) {
        const synth = targetWindow && targetWindow.speechSynthesis;
        if (!synth || synth.__triadVoicesChangedConfigured) {
            return;
        }

        synth.__triadVoicesChangedConfigured = true;
        synth.onvoiceschanged = () => debugVoiceList(targetWindow);
    }

    function notifySpeakingChange(isSpeaking) {
        speaking = isSpeaking;
        listeners.forEach(listener => listener(speaking));
    }

    function onSpeakingChange(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }

        listeners.push(listener);
        return () => {
            listeners = listeners.filter(entry => entry !== listener);
        };
    }

    function speakText(text, personaId, targetWindow = root) {
        if (!isSupported(targetWindow)) {
            notifySpeakingChange(false);
            return { supported: false, utterance: null };
        }

        const synth = targetWindow.speechSynthesis;
        const Utterance = targetWindow.SpeechSynthesisUtterance;
        const utterance = new Utterance(text || '');
        const settings = getTtsSettingsForPersona(personaId);
        setupVoiceChangeHandler(targetWindow);

        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        const voice = selectVoiceForPersona(personaId, getAvailableVoices(targetWindow));
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onstart = () => notifySpeakingChange(true);
        utterance.onend = () => notifySpeakingChange(false);
        utterance.onerror = () => notifySpeakingChange(false);

        synth.cancel();
        synth.speak(utterance);
        notifySpeakingChange(true);

        return { supported: true, utterance };
    }

    function stopSpeaking(targetWindow = root) {
        if (isSupported(targetWindow)) {
            targetWindow.speechSynthesis.cancel();
        }
        notifySpeakingChange(false);
    }

    function isSpeaking() {
        return speaking;
    }

    const api = {
        getTtsSettingsForPersona,
        selectVoiceForPersona,
        listAvailableVoices,
        speakText,
        stopSpeaking,
        isSupported,
        isSpeaking,
        onSpeakingChange
    };

    root.TriadTts = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
