const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const playAudioWithContext = async (url) => {
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

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (e) {
    console.error("AudioContext 播放失敗:", e);
    // Fallback to HTML5 Audio if AudioContext fails
    // Note: This fallback might interrupt background audio on iOS
    const audio = new Audio(url);
    audio.play().catch(err => console.error("Fallback 播放失敗:", err));
  }
};

const speak = (text, audioUrl = null) => {
  if (audioUrl) {
    playAudioWithContext(audioUrl);
    return;
  }

  if ('speechSynthesis' in window) {
    // Try to avoid cancelling if we can, but usually we need to cancel previous speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    // Attempt to verify if this specific call interrupts, but generally TTS does.
    window.speechSynthesis.speak(utterance);
  } else {
    alert("瀏覽器不支援語音");
  }
};

export { speak };
