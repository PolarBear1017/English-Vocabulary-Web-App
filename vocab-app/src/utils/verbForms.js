import nlp from 'compromise';

// 常見不規則動詞補強表，確保三態 100% 精確
const IRREGULAR_VERBS = {
  be: { present: 'be', past: 'was/were', pastParticiple: 'been' },
  have: { present: 'have', past: 'had', pastParticiple: 'had' },
  do: { present: 'do', past: 'did', pastParticiple: 'done' },
  go: { present: 'go', past: 'went', pastParticiple: 'gone' },
  say: { present: 'say', past: 'said', pastParticiple: 'said' },
  get: { present: 'get', past: 'got', pastParticiple: 'gotten' },
  make: { present: 'make', past: 'made', pastParticiple: 'made' },
  know: { present: 'know', past: 'knew', pastParticiple: 'known' },
  think: { present: 'think', past: 'thought', pastParticiple: 'thought' },
  take: { present: 'take', past: 'took', pastParticiple: 'taken' },
  see: { present: 'see', past: 'saw', pastParticiple: 'seen' },
  come: { present: 'come', past: 'came', pastParticiple: 'come' },
  become: { present: 'become', past: 'became', pastParticiple: 'become' },
  overcome: { present: 'overcome', past: 'overcame', pastParticiple: 'overcome' },
  find: { present: 'find', past: 'found', pastParticiple: 'found' },
  give: { present: 'give', past: 'gave', pastParticiple: 'given' },
  tell: { present: 'tell', past: 'told', pastParticiple: 'told' },
  feel: { present: 'feel', past: 'felt', pastParticiple: 'felt' },
  leave: { present: 'leave', past: 'left', pastParticiple: 'left' },
  put: { present: 'put', past: 'put', pastParticiple: 'put' },
  bring: { present: 'bring', past: 'brought', pastParticiple: 'brought' },
  begin: { present: 'begin', past: 'began', pastParticiple: 'begun' },
  keep: { present: 'keep', past: 'kept', pastParticiple: 'kept' },
  hold: { present: 'hold', past: 'held', pastParticiple: 'held' },
  write: { present: 'write', past: 'wrote', pastParticiple: 'written' },
  stand: { present: 'stand', past: 'stood', pastParticiple: 'stood' },
  hear: { present: 'hear', past: 'heard', pastParticiple: 'heard' },
  let: { present: 'let', past: 'let', pastParticiple: 'let' },
  mean: { present: 'mean', past: 'meant', pastParticiple: 'meant' },
  set: { present: 'set', past: 'set', pastParticiple: 'set' },
  meet: { present: 'meet', past: 'met', pastParticiple: 'met' },
  run: { present: 'run', past: 'ran', pastParticiple: 'run' },
  pay: { present: 'pay', past: 'paid', pastParticiple: 'paid' },
  sit: { present: 'sit', past: 'sat', pastParticiple: 'sat' },
  speak: { present: 'speak', past: 'spoke', pastParticiple: 'spoken' },
  lie: { present: 'lie', past: 'lay', pastParticiple: 'lain' },
  lead: { present: 'lead', past: 'led', pastParticiple: 'led' },
  read: { present: 'read', past: 'read', pastParticiple: 'read' },
  grow: { present: 'grow', past: 'grew', pastParticiple: 'grown' },
  lose: { present: 'lose', past: 'lost', pastParticiple: 'lost' },
  fall: { present: 'fall', past: 'fell', pastParticiple: 'fallen' },
  send: { present: 'send', past: 'sent', pastParticiple: 'sent' },
  build: { present: 'build', past: 'built', pastParticiple: 'built' },
  understand: { present: 'understand', past: 'understood', pastParticiple: 'understood' },
  draw: { present: 'draw', past: 'drew', pastParticiple: 'drawn' },
  break: { present: 'break', past: 'broke', pastParticiple: 'broken' },
  spend: { present: 'spend', past: 'spent', pastParticiple: 'spent' },
  cut: { present: 'cut', past: 'cut', pastParticiple: 'cut' },
  rise: { present: 'rise', past: 'rose', pastParticiple: 'risen' },
  drive: { present: 'drive', past: 'drove', pastParticiple: 'driven' },
  buy: { present: 'buy', past: 'bought', pastParticiple: 'bought' },
  wear: { present: 'wear', past: 'wore', pastParticiple: 'worn' },
  choose: { present: 'choose', past: 'chose', pastParticiple: 'chosen' },
  swim: { present: 'swim', past: 'swam', pastParticiple: 'swum' },
  sing: { present: 'sing', past: 'sang', pastParticiple: 'sung' },
  fly: { present: 'fly', past: 'flew', pastParticiple: 'flown' },
  eat: { present: 'eat', past: 'ate', pastParticiple: 'eaten' },
  drink: { present: 'drink', past: 'drank', pastParticiple: 'drunk' },
  sleep: { present: 'sleep', past: 'slept', pastParticiple: 'slept' },
  hit: { present: 'hit', past: 'hit', pastParticiple: 'hit' },
  hurt: { present: 'hurt', past: 'hurt', pastParticiple: 'hurt' },
  cost: { present: 'cost', past: 'cost', pastParticiple: 'cost' },
  shut: { present: 'shut', past: 'shut', pastParticiple: 'shut' },
  quit: { present: 'quit', past: 'quit', pastParticiple: 'quit' },
  spread: { present: 'spread', past: 'spread', pastParticiple: 'spread' }
};

/**
 * 取得單字的動詞三態變化 (Present, Past, Past Participle)
 * @param {string} word - 要查詢的單字
 * @returns {{ present: string, past: string, pastParticiple: string } | null}
 */
export const getVerbForms = (word) => {
  if (!word || typeof word !== 'string') return null;
  const clean = word.trim().toLowerCase();
  if (clean.includes(' ') || clean.length < 2) return null;

  // 1. 優先比對不規則動詞表
  if (IRREGULAR_VERBS[clean]) {
    return IRREGULAR_VERBS[clean];
  }

  // 檢查是否查的是不規則動詞的過去式或過去分詞 (例如查 ate 找到 eat)
  const irregularEntry = Object.values(IRREGULAR_VERBS).find(
    (item) => item.past === clean || item.pastParticiple === clean
  );
  if (irregularEntry) {
    return irregularEntry;
  }

  // 2. 利用 compromise 分析與動詞變化
  try {
    const doc = nlp(clean);
    const conjList = doc.verbs().conjugate();
    if (!conjList || conjList.length === 0) return null;

    const conj = conjList[0];
    const present = conj.Infinitive || clean;

    // 若 present 在不規則動詞表中
    if (IRREGULAR_VERBS[present]) {
      return IRREGULAR_VERBS[present];
    }

    // 規則動詞推導
    let past = conj.PastTense;
    if (!past) {
      if (present.endsWith('e')) {
        past = `${present}d`;
      } else if (present.endsWith('y') && !/[aeiou]y$/.test(present)) {
        past = `${present.slice(0, -1)}ied`;
      } else {
        past = `${present}ed`;
      }
    }

    const pastParticiple = conj.Participle || past;

    return {
      present,
      past,
      pastParticiple
    };
  } catch (err) {
    console.warn('getVerbForms failed for:', clean, err);
    return null;
  }
};
