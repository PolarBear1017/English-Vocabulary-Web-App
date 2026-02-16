let audioContext = null;
let currentSource = null; // Track the currently playing source
let currentAudioElement = null; // Track HTML5 Audio fallback

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

  const { onEnd } = options;

  try {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Determine if we need to proxy the request
    // If it's an external URL (starts with http), use the proxy
    let fetchUrl = url;
    if (url.startsWith('http')) {
      fetchUrl = `/api/proxy-audio?url=${encodeURIComponent(url)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn("Proxy endpoint not found (404). If running locally, ensure API is available or use 'vercel dev'. Falling back to direct playback.");
      }
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Fix for "The buffer passed to decodeAudioData contains an unknown content type"
    // sometimes empty or invalid responses can cause this
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("Empty audio buffer received");
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Check if we were stopped while decoding
    if (!audioBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    source.onended = () => {
      if (currentSource === source) {
        currentSource = null;
        if (onEnd) onEnd();
      }
    };

    currentSource = source;
    source.start(0);
  } catch (e) {
    console.warn("AudioContext playback failed, attempting fallback:", e);

    // Fallback to HTML5 Audio if AudioContext fails
    // Use the proxy URL for fallback too if possible to avoid CORS issues,
    // unless it was a fetch error on the proxy itself.
    // We'll try the original URL for fallback as a last resort.
    const fallbackUrl = url;

    try {
      const audio = new Audio(fallbackUrl);
      currentAudioElement = audio;

      // Add error listener for fallback
      audio.onerror = (err) => {
        console.error("Fallback playback failed:", err);
        currentAudioElement = null;
        if (onEnd) onEnd(); // Still call onEnd to continue loop
      };

      audio.onended = () => {
        if (currentAudioElement === audio) {
          currentAudioElement = null;
          if (onEnd) onEnd();
        }
      };

      await audio.play();
    } catch (err) {
      console.error("All playback methods failed:", err);
      if (onEnd) onEnd(); // Ensure loop continues even if playback fails
    }
  }
};

const speak = (text, audioUrl = null, options = {}) => {
  const { lang = 'en-US', rate = 1.0, onEnd } = options;

  if (audioUrl) {
    playAudioWithContext(audioUrl, { onEnd });
    return;
  }

  // Stop previous audio before synthesis
  stopAudio();

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

export { speak, stopAudio, getAudioUrl };
