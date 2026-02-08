const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentSource = null; // Track the currently playing source
let currentAudioElement = null; // Track HTML5 Audio fallback

const stopAudio = () => {
  // Stop Web Audio API source
  if (currentSource) {
    try {
      currentSource.stop();
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

const playAudioWithContext = async (url) => {
  // Stop any currently playing audio first
  stopAudio();

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
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

    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Check if we were stopped while decoding
    if (!audioBuffer) return;

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      if (currentSource === source) {
        currentSource = null;
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
      };

      audio.onended = () => {
        if (currentAudioElement === audio) {
          currentAudioElement = null;
        }
      };

      await audio.play();
    } catch (err) {
      console.error("All playback methods failed:", err);
    }
  }
};

const speak = (text, audioUrl = null) => {
  if (audioUrl) {
    playAudioWithContext(audioUrl);
    return;
  }

  // Stop previous audio before synthesis
  stopAudio();

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // You might want to make this configurable based on preference
    window.speechSynthesis.speak(utterance);
  } else {
    console.error("Browser does not support speech synthesis");
    alert("瀏覽器不支援語音功能");
  }
};

export { speak, stopAudio };
