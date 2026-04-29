(function (root) {
    const personaSettings = {
        professional: { rate: 0.9, pitch: 0.9, volume: 1 },
        sweetheart: { rate: 0.95, pitch: 1.15, volume: 1 },
        silly: { rate: 1.08, pitch: 1.25, volume: 1 }
    };

    const likelyMaleVoiceNames = [
        'male', 'man', 'david', 'mark', 'daniel', 'george', 'james', 'john',
        'michael', 'paul', 'richard', 'ryan', 'thomas', 'william', 'alex'
    ];
    const likelyFemaleVoiceNames = [
        'female', 'woman', 'zira', 'samantha', 'susan', 'victoria', 'karen',
        'moira', 'tessa', 'fiona', 'amy', 'emma', 'joanna', 'salli', 'ava'
    ];

    const initialState = {
        isSpeaking: false,
        isPaused: false,
        activeMessageId: null,
        activePersonaId: null,
        currentChunkIndex: 0,
        totalChunks: 0,
        utterance: null
    };

    let state = { ...initialState };
    let activeChunks = [];
    let activeText = '';
    let manualStop = false;
    let listeners = [];

    function isSupported(targetWindow = root) {
        return Boolean(targetWindow && targetWindow.speechSynthesis && targetWindow.SpeechSynthesisUtterance);
    }

    function getTtsSettingsForPersona(personaId) {
        return { ...(personaSettings[personaId] || personaSettings.professional) };
    }

    function isEnglishVoice(voice) {
        return /^en/i.test(voice.lang || '') || /english/i.test(voice.name || '');
    }

    function voiceKey(voice) {
        return voice ? (voice.voiceURI || `${voice.name || ''}|${voice.lang || ''}`) : '';
    }

    function voiceNameMatches(voice, names) {
        const name = (voice.name || '').toLowerCase();
        return names.some(candidate => name.includes(candidate));
    }

    function isAssigned(voice, alreadyAssignedVoices = []) {
        const assignedKeys = alreadyAssignedVoices.map(voiceKey).filter(Boolean);
        return assignedKeys.includes(voiceKey(voice));
    }

    function chooseDistinct(candidates, alreadyAssignedVoices) {
        return candidates.find(voice => !isAssigned(voice, alreadyAssignedVoices)) || null;
    }

    function selectVoiceForPersona(personaId, voices = [], alreadyAssignedVoices = []) {
        const availableVoices = Array.isArray(voices) ? voices : [];
        if (!availableVoices.length) {
            return null;
        }

        const englishVoices = availableVoices.filter(isEnglishVoice);
        const usableVoices = englishVoices.length ? englishVoices : availableVoices;
        let idealVoices = [];

        if (personaId === 'sweetheart') {
            idealVoices = englishVoices.filter(voice => voiceNameMatches(voice, likelyFemaleVoiceNames));
        } else if (personaId === 'silly') {
            idealVoices = englishVoices.filter(voice =>
                /^en-GB/i.test(voice.lang || '') && voiceNameMatches(voice, likelyMaleVoiceNames)
            );
            if (!idealVoices.length) {
                idealVoices = englishVoices.filter(voice => /^en-GB/i.test(voice.lang || ''));
            }
            if (!idealVoices.length) {
                idealVoices = englishVoices.filter(voice => voiceNameMatches(voice, likelyMaleVoiceNames));
            }
        } else {
            idealVoices = englishVoices.filter(voice => voiceNameMatches(voice, likelyMaleVoiceNames));
        }

        return chooseDistinct(idealVoices, alreadyAssignedVoices) ||
            chooseDistinct(usableVoices, alreadyAssignedVoices) ||
            idealVoices[0] ||
            usableVoices[0] ||
            null;
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
            lang: voice.lang || '',
            voiceURI: voice.voiceURI || ''
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
        synth.onvoiceschanged = () => {
            debugVoiceList(targetWindow);
            notifyStateChange();
        };
    }

    function splitTextIntoChunks(text) {
        const normalized = String(text || '').replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return [''];
        }

        const chunks = normalized.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g) || [normalized];
        return chunks.map(chunk => chunk.trim()).filter(Boolean);
    }

    function getState() {
        return { ...state };
    }

    function notifyStateChange() {
        const snapshot = getState();
        listeners.forEach(listener => listener(snapshot));
    }

    function onStateChange(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }

        listeners.push(listener);
        return () => {
            listeners = listeners.filter(entry => entry !== listener);
        };
    }

    function onSpeakingChange(listener) {
        return onStateChange(nextState => listener(Boolean(nextState.isSpeaking)));
    }

    function resetState() {
        state = { ...initialState };
        activeChunks = [];
        activeText = '';
        manualStop = false;
        notifyStateChange();
    }

    function selectVoiceForCurrentPersona(targetWindow) {
        const voices = getAvailableVoices(targetWindow);
        const assigned = Object.entries(root.__triadTtsVoiceAssignments || {})
            .filter(([personaId]) => personaId !== state.activePersonaId)
            .map(([, voice]) => voice)
            .filter(Boolean);
        const voice = selectVoiceForPersona(state.activePersonaId, voices, assigned);

        root.__triadTtsVoiceAssignments = root.__triadTtsVoiceAssignments || {};
        if (voice) {
            root.__triadTtsVoiceAssignments[state.activePersonaId] = voice;
        }
        return voice;
    }

    function speakCurrentChunk(targetWindow = root) {
        if (!isSupported(targetWindow) || !activeChunks.length) {
            resetState();
            return { supported: isSupported(targetWindow), utterance: null };
        }

        const synth = targetWindow.speechSynthesis;
        const Utterance = targetWindow.SpeechSynthesisUtterance;
        const settings = getTtsSettingsForPersona(state.activePersonaId);
        const utterance = new Utterance(activeChunks[state.currentChunkIndex] || '');
        const voice = selectVoiceForCurrentPersona(targetWindow);

        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onstart = () => {
            state = { ...state, isSpeaking: true, isPaused: false, utterance };
            notifyStateChange();
        };
        utterance.onend = () => {
            if (manualStop || state.isPaused) {
                return;
            }

            const nextIndex = state.currentChunkIndex + 1;
            if (nextIndex >= state.totalChunks) {
                resetState();
                return;
            }

            state = { ...state, currentChunkIndex: nextIndex, utterance: null };
            notifyStateChange();
            speakCurrentChunk(targetWindow);
        };
        utterance.onerror = () => resetState();

        state = { ...state, isSpeaking: true, isPaused: false, utterance };
        synth.speak(utterance);
        notifyStateChange();
        return { supported: true, utterance };
    }

    function startSpeaking(text, personaId, targetWindow = root, options = {}) {
        if (!isSupported(targetWindow)) {
            resetState();
            return { supported: false, utterance: null };
        }

        setupVoiceChangeHandler(targetWindow);
        manualStop = true;
        targetWindow.speechSynthesis.cancel();
        manualStop = false;

        activeText = String(text || '');
        activeChunks = splitTextIntoChunks(activeText);
        state = {
            ...initialState,
            isSpeaking: true,
            activeMessageId: options.messageId || null,
            activePersonaId: personaId,
            currentChunkIndex: Math.max(0, Math.min(options.startChunkIndex || 0, activeChunks.length - 1)),
            totalChunks: activeChunks.length
        };
        notifyStateChange();

        return speakCurrentChunk(targetWindow);
    }

    function speakText(text, personaId, targetWindow = root, options = {}) {
        return startSpeaking(text, personaId, targetWindow, options);
    }

    function pauseSpeaking(targetWindow = root) {
        if (isSupported(targetWindow) && state.isSpeaking && !state.isPaused) {
            targetWindow.speechSynthesis.pause();
            state = { ...state, isPaused: true };
            notifyStateChange();
        }
    }

    function resumeSpeaking(targetWindow = root) {
        if (isSupported(targetWindow) && state.isSpeaking && state.isPaused) {
            targetWindow.speechSynthesis.resume();
            state = { ...state, isPaused: false };
            notifyStateChange();
        }
    }

    function stopSpeaking(targetWindow = root) {
        if (isSupported(targetWindow)) {
            manualStop = true;
            targetWindow.speechSynthesis.cancel();
        }
        resetState();
    }

    function seekToChunk(chunkIndex, targetWindow = root) {
        if (!isSupported(targetWindow) || !activeChunks.length) {
            return { supported: isSupported(targetWindow), utterance: null };
        }

        const boundedIndex = Math.max(0, Math.min(Number(chunkIndex) || 0, activeChunks.length - 1));
        manualStop = true;
        targetWindow.speechSynthesis.cancel();
        manualStop = false;
        state = {
            ...state,
            isSpeaking: true,
            isPaused: false,
            currentChunkIndex: boundedIndex,
            totalChunks: activeChunks.length,
            utterance: null
        };
        notifyStateChange();
        return speakCurrentChunk(targetWindow);
    }

    function togglePlayback(text, personaId, messageId, targetWindow = root) {
        const sameMessage = state.activeMessageId === messageId && state.activePersonaId === personaId;
        if (sameMessage && state.isSpeaking && state.isPaused) {
            resumeSpeaking(targetWindow);
            return { supported: isSupported(targetWindow), utterance: state.utterance };
        }
        if (sameMessage && state.isSpeaking) {
            pauseSpeaking(targetWindow);
            return { supported: isSupported(targetWindow), utterance: state.utterance };
        }

        return startSpeaking(text, personaId, targetWindow, { messageId });
    }

    function isSpeaking() {
        return state.isSpeaking;
    }

    const api = {
        getTtsSettingsForPersona,
        selectVoiceForPersona,
        splitTextIntoChunks,
        listAvailableVoices,
        speakText,
        togglePlayback,
        pauseSpeaking,
        resumeSpeaking,
        stopSpeaking,
        seekToChunk,
        isSupported,
        isSpeaking,
        getState,
        onStateChange,
        onSpeakingChange
    };

    root.TriadTts = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
