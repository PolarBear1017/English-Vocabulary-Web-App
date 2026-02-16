let audioContext = null;
let currentSource = null; // Track the currently playing source
let currentAudioElement = null; // Track HTML5 Audio fallback

// Event system
const listeners = new Set();

const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = (event, data) => {
  listeners.forEach(callback => callback(event, data));
};
const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Handle visibility change to resume audio context on mobile
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    // Aggressive reset: Destroy context when backgrounded to avoid stale/interrupted states on mobile
    if (document.hidden && audioContext) {
      // Don't close if we are actively playing (to support background play)
      if (currentSource || currentAudioElement || (window.speechSynthesis && window.speechSynthesis.speaking)) {
        // do nothing, let it run
      } else {
        audioContext.close().catch(err => console.warn("Error closing AudioContext:", err));
        audioContext = null;
      }
    }
  });

  // Also try to resume on touch/click events as a backup if it exists but is suspended
  const resumeAudio = () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => { });
    }
  };
  document.addEventListener('touchstart', resumeAudio, { passive: true });
  document.addEventListener('click', resumeAudio, { passive: true });
}

const stopAudio = () => {
  // Stop Web Audio API source
  if (currentSource) {
    try {
      currentSource.stop();
      if (currentSource.onended) currentSource.onended = null; // Prevent callback
    } catch (e) {
      // Ignore errors if already stopped
    }
    currentSource = null;
  }

  // Stop HTML5 Audio fallback
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.onended = null; // Prevent callback
    } catch (e) {
      // Ignore errors
    }
    currentAudioElement = null;
  }

  // Cancel speech synthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

const playAudioWithContext = async (url, options = {}) => {
  // Stop any currently playing audio first
  stopAudio();

  const { onEnd, onPlaybackFailed, source: audioSource, rate = 1.0 } = options;

  // Notify that playback is starting
  notifyListeners('play', { source: audioSource });

  // Use HTML5 Audio by default for pitch preservation
  // This is much simpler and supports changing speed without changing pitch
  try {
    // Determine if we need to proxy the request
    // If it's an external URL (starts with http), use the proxy
    let playUrl = url;
    if (url.startsWith('http')) {
      playUrl = `/api/proxy-audio?url=${encodeURIComponent(url)}`;
    }

    const audio = new Audio(playUrl);

    // Resume AudioContext if suspended (for mobile rules)
    // Even if we use HTML5 Audio, having the context running helps on some mobile browsers
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    currentAudioElement = audio;

    audio.playbackRate = rate;
    // explicit preservation (default is true usually)
    if (audio.preservesPitch !== undefined) {
      audio.preservesPitch = true;
    } else if (audio.mozPreservesPitch !== undefined) {
      audio.mozPreservesPitch = true;
    } else if (audio.webkitPreservesPitch !== undefined) {
      audio.webkitPreservesPitch = true;
    }

    // Add error listener
    audio.onerror = (err) => {
      console.error("Audio playback failed:", err);
      currentAudioElement = null;
      if (onPlaybackFailed) {
        onPlaybackFailed();
      } else {
        if (onEnd) onEnd();
      }
    };

    audio.onended = () => {
      if (currentAudioElement === audio) {
        currentAudioElement = null;
        if (onEnd) onEnd();
      }
    };

    await audio.play();
  } catch (err) {
    console.error("Playback error:", err);
    if (onPlaybackFailed) {
      onPlaybackFailed();
    } else {
      if (onEnd) onEnd();
    }
  }
};

const speak = (text, audioUrl = null, options = {}) => {
  const { lang = 'en-US', rate = 1.0, onEnd, source } = options;

  if (audioUrl) {
    playAudioWithContext(audioUrl, { onEnd, source, rate });
    return;
  }

  // Try to use Google TTS for short sentences first
  // Limit is usually around 200 chars for this unofficial API
  const canUseGoogleTTS = text && text.length < 200;

  if (canUseGoogleTTS) {
    // Generate Google Translate TTS URL
    let googleLang = 'en';
    if (lang.startsWith('zh')) {
      googleLang = 'zh-TW';
    } else if (lang.startsWith('en')) {
      googleLang = 'en';
    }

    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${googleLang}&client=tw-ob`;

    // Play with Google TTS, fallback to browser synthesis on failure
    playAudioWithContext(googleUrl, {
      onEnd,
      onPlaybackFailed: () => {
        console.warn("Google TTS failed, falling back to browser synthesis");
        speakWithBrowser(text, lang, rate, onEnd, source);
      },
      source,
      rate
    });
    return;
  }

  // Fallback or long text: use browser synthesis
  speakWithBrowser(text, lang, rate, onEnd, source);
};

const speakWithBrowser = (text, lang, rate, onEnd, source) => {
  // Stop previous audio before synthesis
  stopAudio();

  // Notify that playback is starting
  notifyListeners('play', { source });

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      console.error("Speech synthesis error", err);
      if (onEnd) onEnd(); // Ensure loop continues
    };

    // iOS Safari background playback hack/fix
    // Ensure the audio session is active
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
  } else {
    console.error("Browser does not support speech synthesis");
    alert("瀏覽器不支援語音功能");
    if (onEnd) onEnd();
  }
};

const getAudioUrl = (word, priorityList = ['us', 'uk', 'google', 'general']) => {
  if (!word) return null;

  for (const source of priorityList) {
    switch (source) {
      case 'us':
        if (word.usAudioUrl || word.us_audio_url) return word.usAudioUrl || word.us_audio_url;
        break;
      case 'uk':
        if (word.ukAudioUrl || word.uk_audio_url) return word.ukAudioUrl || word.uk_audio_url;
        break;
      case 'general':
        if (word.audioUrl || word.audio_url) return word.audioUrl || word.audio_url;
        break;
      case 'google':
        // Generate Google Translate TTS URL
        // Using the public API endpoint often used by third-party tools
        // client=tw-ob is a common parameter for this unofficial usage
        if (word.word) {
          return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word.word)}&tl=en&client=tw-ob`;
        }
        break;
      case 'yahoo':
        // Yahoo audio might be in audioUrl if source was Yahoo, 
        // OR we can construct it dynamically if not present but needed
        if (word.source === 'Yahoo' && word.audioUrl) {
          return word.audioUrl;
        }
        // Fallback: construct it dynamically if we just have the word
        if (word.word) {
          return `https://s.yimg.com/bg/dict/dreye/live/f/${encodeURIComponent(word.word).toLowerCase()}.mp3`;
        }
        break;
      default:
        break;
    }
  }

  return null;
};

export { speak, stopAudio, getAudioUrl, subscribe };
