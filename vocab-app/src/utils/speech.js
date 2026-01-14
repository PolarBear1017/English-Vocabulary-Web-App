const speak = (text, audioUrl = null) => {
  if (audioUrl) {
    // 如果有真人發音檔，優先播放
    new Audio(audioUrl).play().catch(e => console.error("播放失敗:", e));
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } else {
    alert("瀏覽器不支援語音");
  }
};

export { speak };
