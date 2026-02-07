const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const playAudioWithContext = async (url) => {
  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (e) {
    console.error("AudioContext 播放失敗:", e);
    // Fallback to HTML5 Audio if AudioContext fails (though it might interrupt)
    new Audio(url).play().catch(err => console.error("Fallback 播放失敗:", err));
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
