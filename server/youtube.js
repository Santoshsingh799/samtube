'use strict';

const { cached } = require('./cache');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const TTL = {
  search: 10 * 60 * 1000,
  suggestion: 60 * 60 * 1000,
  oembed: 24 * 60 * 60 * 1000,
  config: 6 * 60 * 60 * 1000,
  video: 60 * 60 * 1000
};

const DEFAULT_QUERY = {
  hi: 'हिंदी विज्ञान डॉक्यूमेंट्री',
  en: 'science technology documentary',
  all: 'science technology documentary explained'
};

// HackerTube-style curated lanes: one tap fetches several real YouTube lanes and interleaves them.
const BHAGWAN_QUERIES_HI = [
  'Mahabharat Ramayan हिंदी',
  'Bhagwan भजन कथा हिंदी',
  'Upanishad Ganga documentary हिंदी',
  'Bhagavad Geeta Krishna हिंदी',
  'Shiv Puran Hanuman हिंदी'
];

const BHAGWAN_QUERIES_EN = [
  'Mahabharat Ramayan documentary',
  'Bhagwan story documentary',
  'Upanishad Ganga documentary',
  'Bhagavad Geeta Krishna documentary',
  'Shiv Vishnu Hanuman documentary'
];

// Audiobooks: Hindi + English, 2026 tak (aaj tak ki sari), SIRF human voice.
// AI voice / AI-generated audiobooks are hard-blocked in rankVideos (isAiVoice).
const AUDIOBOOK_QUERIES_HI = [
  'Hindi audiobook full novel',
  'Hindi upanyas audiobook full',
  'Hindi kahani audiobook full',
  'Hindi classic novel audiobook',
  'Munshi Premchand audiobook Hindi',
  'Hindi sahitya audiobook full',
  'Hindi detective novel audiobook',
  'Hindi thriller novel audiobook',
  'Hindi history audiobook full',
  'Hindi biography audiobook',
  'Chanakya Neeti audiobook Hindi',
  'Panchtantra kahaniyan audiobook Hindi',
  'Akbar Birbal kahani audiobook Hindi',
  'Shivaji audiobook Hindi full',
  'Mahabharat audiobook Hindi narration full',
  'Ramayan audiobook Hindi full',
  'Geeta audiobook Hindi full',
  'Hindi upanyas part 1 audiobook',
  'Hindi audio book complete book',
  'हिंदी ऑडियो बुक उपन्यास पूर्ण',
  'हिंदी कहानी ऑडियो बुक पूर्ण',
  'हिंदी साहित्य ऑडियो बुक',
  'प्रेमचंद ऑडियो बुक हिंदी'
];

const AUDIOBOOK_QUERIES_EN = [
  'audiobook full novel unabridged',
  'audiobook full book human narration',
  'classic literature audiobook full',
  'Sherlock Holmes audiobook full',
  'Alice in Wonderland audiobook full',
  'Pride and Prejudice audiobook full',
  'Jane Austen audiobook full',
  'Charles Dickens audiobook full',
  'Mark Twain audiobook full',
  'Oscar Wilde audiobook full',
  'Edgar Allan Poe audiobook full',
  'Mystery audiobook full unabridged',
  'Thriller audiobook full',
  'Horror audiobook full',
  'Science fiction audiobook full',
  'Biography audiobook full',
  'Self help audiobook full',
  'History audiobook full',
  'Philosophy audiobook full',
  'English audiobook complete book',
  'English novel audiobook full',
  'Classic novel audiobook part 1'
];

// Trading lane: sirf trading-SIKHNE wali videos (share market education), Hindi + English,
// 2026 tak (aaj tak ki sari). Stock tips / paid-course / telegram spam are hard-blocked in rankVideos.
const TRADING_QUERIES_HI = [
  'share market kaise seekhe Hindi',
  'stock market basics Hindi full',
  'stock market for beginners Hindi',
  'trading kaise kare seekhe Hindi',
  'technical analysis Hindi full course',
  'fundamental analysis Hindi full',
  'candlestick pattern Hindi',
  'chart patterns Hindi',
  'intraday trading Hindi course',
  'swing trading Hindi',
  'options trading Hindi full',
  'futures trading Hindi explained',
  'Nifty Sensex kaise seekhe Hindi',
  'support and resistance Hindi',
  'moving average Hindi trading',
  'risk management trading Hindi',
  'stock investing vs trading Hindi',
  'share bazaar seekhen Hindi',
  'शेयर मार्केट सीखें हिंदी',
  'ट्रेडिंग सीखें हिंदी',
  'टेक्निकल एनालिसिस हिंदी',
  'कैंडलस्टिक चार्ट हिंदी'
];

const TRADING_QUERIES_EN = [
  'stock market for beginners full course',
  'technical analysis full course',
  'fundamental analysis full course',
  'how to read candlestick charts',
  'chart patterns explained',
  'day trading for beginners',
  'swing trading strategy full',
  'options trading for beginners full',
  'futures trading explained',
  'support and resistance trading',
  'moving average trading strategy',
  'risk management trading full',
  'technical analysis tutorial full',
  'stock market basics education',
  'investing vs trading explained',
  'how to start trading stocks',
  'volume analysis trading',
  'price action trading full course',
  'stock market education beginners',
  'options trading explained full'
];

const AUDIOBOOK_SUGGESTIONS = [
  'Hindi audiobook full novel',
  'Hindi upanyas audiobook',
  'Hindi kahani audiobook',
  'Premchand audiobook Hindi',
  'Munshi Premchand audiobook',
  'Chanakya audiobook Hindi',
  'Panchtantra audiobook',
  'Akbar Birbal audiobook',
  'Mahabharat audiobook Hindi',
  'Ramayan audiobook Hindi',
  'audiobook full novel',
  'audiobook full book',
  'classic literature audiobook',
  'Sherlock Holmes audiobook',
  'Jane Austen audiobook',
  'Mystery audiobook full',
  'Horror audiobook full',
  'Biography audiobook full'
];

const TRADING_SUGGESTIONS = [
  'share market basics Hindi',
  'stock market for beginners Hindi',
  'technical analysis Hindi',
  'fundamental analysis Hindi',
  'candlestick pattern Hindi',
  'chart patterns Hindi',
  'intraday trading Hindi',
  'swing trading Hindi',
  'options trading Hindi',
  'risk management trading Hindi',
  'stock market for beginners',
  'technical analysis tutorial',
  'fundamental analysis course',
  'candlestick charts explained',
  'options trading for beginners',
  'swing trading strategy'
];

// General home feed curated lanes (Hackertube-style): several old-leaning documentary lanes merged.
// Generic "science documentary" alone returns mostly recent videos, so we fan-out
// to channel/show queries whose back catalog has pre-2023 episodes.
const GENERAL_QUERIES_HI = [
  'NASA documentary Hindi full',
  'DW Documentary Hindi full',
  'Science documentary Hindi full episode',
  'Space documentary Hindi full',
  'History documentary Hindi full',
  'Discovery Hindi documentary full',
  'Cosmos documentary Hindi full',
  'Black Hole documentary Hindi full',
  'Solar System documentary Hindi',
  'Ancient India documentary Hindi',
  'Human Body documentary Hindi',
  'Vigyan Show Hindi',
  'Ocean documentary Hindi full',
  'Animal documentary Hindi full',
  'Inventions documentary Hindi',
  'Moon documentary Hindi full',
  'Earth documentary Hindi full',
  'Brain science Hindi documentary',
  'Ancient Egypt documentary Hindi',
  'War history documentary Hindi',
  'Dinosaurs documentary Hindi',
  'Volcano documentary Hindi',
  'River documentary Hindi',
  'Mountain documentary Hindi',
  'Evolution documentary Hindi',
  'Mind science Hindi documentary',
  'Soliders history Hindi documentary',
  'Desert documentary Hindi',
  'Rainforest documentary Hindi',
  'Deep sea documentary Hindi',
  'Human evolution Hindi documentary',
  'Tiger documentary Hindi full',
  'Elephant documentary Hindi',
  'Bird documentary Hindi full',
  'Fish documentary Hindi',
  'Forest documentary Hindi full',
  'Cave documentary Hindi',
  'Island documentary Hindi',
  'Water cycle Hindi documentary',
  'Climate science Hindi documentary',
  'Geography Hindi documentary full',
  'Astronomy Hindi documentary full',
  'Physics Hindi documentary full',
  'Biology Hindi documentary full',
  'Chemistry Hindi documentary',
  'Maths Hindi documentary full',
  'Geology Hindi documentary',
  'Weather documentary Hindi',
  'Fossil documentary Hindi',
  'Ice documentary Hindi full',
  'Tsunami documentary Hindi',
  'Earthquake Hindi documentary',
  'Space station Hindi documentary',
  'Mars Hindi documentary full',
  'Jupiter Hindi documentary',
  'Uranus Hindi documentary',
  'Neptune Hindi documentary',
  'Venus Hindi documentary',
  'Mercury Hindi documentary',
  'Comet Hindi documentary',
  'Asteroid Hindi documentary',
  'Galaxy Hindi documentary full',
  'Nebula Hindi documentary',
  'Star documentary Hindi full',
  'Light Hindi documentary',
  'Sound Hindi documentary',
  'Energy Hindi documentary',
  'Magnetism Hindi documentary',
  'Electricity Hindi documentary',
  'Computer science Hindi documentary'
];

const GENERAL_QUERIES_EN = [
  'NASA documentary full',
  'DW Documentary full',
  'Science documentary full',
  'History documentary full',
  'Space documentary full',
  'Universe documentary full',
  'Planet Earth documentary',
  'Cosmos documentary full',
  'Black Hole documentary full',
  'Ancient history documentary full',
  'Human Body documentary',
  'National Geographic documentary full',
  'Ocean documentary full',
  'Wildlife documentary full',
  'Inventions documentary full',
  'Moon documentary full',
  'Earth documentary full',
  'Brain science documentary',
  'Ancient Egypt documentary',
  'Apollo documentary full',
  'Dinosaurs documentary full',
  'Volcano documentary full',
  'Amazon River documentary',
  'Mountain documentary full',
  'Evolution documentary full',
  'Human mind documentary',
  'World War documentary full',
  'Desert documentary full',
  'Rainforest documentary',
  'Deep sea documentary',
  'Human evolution documentary',
  'Ancient Rome documentary',
  'Technology documentary full',
  'Psychology documentary full',
  'Geography documentary full',
  'Astronomy documentary full',
  'Physics documentary full',
  'Meteor documentary full',
  'Solar System documentary full 2022',
  'Solar System documentary full 2021',
  'Solar System documentary full 2020',
  'Science documentary full 2022',
  'Science documentary full 2021',
  'Science documentary full 2020',
  'Space documentary full 2022',
  'Space documentary full 2021',
  'History documentary full 2022',
  'History documentary full 2021',
  'Universe documentary full 2022',
  'Universe documentary full 2021',
  'Black Hole documentary full 2022',
  'Tiger documentary full',
  'Elephant documentary full',
  'Bird documentary full',
  'Ocean documentary full 2022',
  'Ocean documentary full 2021',
  'Animal documentary full 2022',
  'Planet documentary full',
  'Star documentary full',
  'Light documentary full',
  'Energy documentary full',
  'Computer documentary full',
  'Ancient India documentary full',
  'Ancient Civilization documentary',
  'Human evolution documentary full',
  'Deep sea documentary full 2022',
  'Rainforest documentary full 2022'
];

const BHAGWAN_SUGGESTIONS = [
  'Mahabharat Hindi',
  'Ramayan Hindi',
  'Upanishad Hindi',
  'Bhagavad Geeta Hindi',
  'Ganga documentary Hindi',
  'Krishna Leela Hindi',
  'Shiv Puran Hindi',
  'Ram Katha Hindi',
  'Hanuman Chalisa Hindi',
  'Bhagwan bhajan Hindi'
];

class YouTubeError extends Error {
  constructor(message, { status = 502, code = 'YOUTUBE_ERROR', details } = {}) {
    super(message);
    this.name = 'YouTubeError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function apiKey() {
  const key = (process.env.YOUTUBE_API_KEY || '').trim();
  if (!key || key.includes('PASTE_YOUR') || key.length < 20) return '';
  return key;
}

function hasApiKey() {
  return Boolean(apiKey());
}

function locale(language) {
  if (language === 'hi') return { hl: 'hi', gl: 'IN', relevanceLanguage: 'hi' };
  if (language === 'all') return { hl: 'en', gl: 'IN', relevanceLanguage: '' };
  return { hl: 'en', gl: 'IN', relevanceLanguage: 'en' };
}

function clean(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Content quality: language detection + educational / old-video bias */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEVANAGARI = /[\u0900-\u097F]/;

// Hard cutoff: user asked ONLY for videos before 2023 (pre-2023 / Hackertube-style old feed).
const BEFORE_2023_TS = Date.UTC(2023, 0, 1);
const BEFORE_2023_DAYS = Math.max(0, Math.floor((Date.now() - BEFORE_2023_TS) / DAY_MS));

// Audiobooks exception: 2026 tak (aaj tak ki sari books) — allow everything up to 2026-12-31.
const BEFORE_2027_TS = Date.UTC(2027, 0, 1);
const BEFORE_2027_DAYS = Math.max(0, Math.floor((Date.now() - BEFORE_2027_TS) / DAY_MS));

function isBefore2023(video) {
  const ts = video.publishedAt ? Date.parse(video.publishedAt) : NaN;
  if (Number.isFinite(ts)) return ts < BEFORE_2023_TS;
  if (video.ageDays !== null && video.ageDays !== undefined) return video.ageDays >= BEFORE_2023_DAYS;
  return false; // unknown date = cannot prove pre-2023, so exclude under strict rule
}

function isBefore2027(video) {
  const ts = video.publishedAt ? Date.parse(video.publishedAt) : NaN;
  if (Number.isFinite(ts)) return ts < BEFORE_2027_TS;
  if (video.ageDays !== null && video.ageDays !== undefined) return video.ageDays >= BEFORE_2027_DAYS;
  // Unknown date: allow for audiobooks (aaj tak ki sari) — ranking will deprioritize but not exclude.
  return true;
}

// Strict AI-voice markers (audiobooks + general): TTS, computer/robot/synthetic voice, AI reader/narrator.
const AI_VOICE_PATTERNS = [
  /\b(ai[\s\-]*voice|voice[\s\-]*by\s*ai|ai[\s\-]*narrat|ai[\s\-]*reader|ai\s+reader|ai\s+narrator|text[\s\-]*to[\s\-]*speech|\btts\b|computer[\s\-]*voice|robot\s+voice|synthetic\s+voice|machine\s+voice|generated\s+voice|voice\s+generated|ai\s+read)\b/i,
  /एआई\s*(आवाज|वॉइस|वाइस|नैरेशन)|कंप्यूटर\s*आवाज|रोबोट\s*आवाज|मशीन\s*आवाज|एआई\s*से\s*पढ़ी|एआई\s*द्वारा\s*पढ़ी/i
];

// Audiobook signals: strong = audiobook term, medium = full book / narration.
const AUDIOBOOK_PATTERNS = [
  /\b(audio[\s\-]*book|audio[\s\-]*books)\b/i,
  /ऑडियो\s*बुक/i,
  /\b(full\s+book|complete\s+book|full\s+novel|unabridged)\b/i,
  /\b(narrat(ed|ion|or)?|read\s+by|narrated\s+by)\b/i,
  /(उपन्यास|upanyas).*(full|पूरा|पूर्ण)/i,
  /(full|पूरा|पूर्ण).*(उपन्यास|upanyas)/i
];

const TRUSTED_AUDIOBOOK_CHANNEL =
  /(librivox|audible|penguin|harpercollins|hachette|bbc\s*audio|storytel|juggernaut|kavach|katha\s*sagar|kathakar|lok\s*katha|sahitya|kahani\s*adda|story\s*time\s*hindi)/i;

const TRUSTED_HUMAN_NARRATOR =
  /(librivox|penguin|harpercollins|audible|hachette|bbc\s*audio|storytel|juggernaut|katha\s*sagar|kathakar|lok\s*katha|sahitya\s*kendra|deepak\s*ranjan|narrated\s+by|read\s+by|voice\s+of|human\s+voice|real\s+voice)/i;

// Known AI-voice audiobook farm channels (screenshot: Elite Audiobooks, BetterSelf,
// AudioBook Rise, Elite Audio Library, Audiobook Everyday + generic variants).
// These mass-produce TTS/audiobook spam — user wants HUMAN voice only, so hard-block.
const AI_FARM_CHANNEL =
  /(elite\s*audiobooks?|elite\s*audio\s*library|better\s*self\s*audiobooks?|betterself\s*audiobooks?|audiobooks?\s*rise|audiobooks?\s*everyday|audiobooks?\s*daily|audiobooks?\s*adda|audiobooks?\s*hub|audiobooks?\s*world\s*audiobooks?|audio\s*library\s*audiobooks?|audiobooks?\s*daily)/i;

function isAiFarmChannel(channel) {
  return AI_FARM_CHANNEL.test(String(channel || ''));
}

function parseDurationSeconds(text) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.trim().split(':').map(value => Number(value));
  if (parts.some(value => !Number.isFinite(value))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

// AI-generated / synthetic spam + editing templates, status/ringtone spam, logo/intro packs.
// NOTE: videos *about* AI (documentary, lecture, course on AI) are NOT blocked —
// only content that *is itself AI-generated/AI-made* is blocked.
const BLOCKED_PATTERNS = [
  // English: explicit AI-generated markers
  /\bai[\s\-_]*(generated|made|creation|creating|created|voice|narrator|narration|story|stories|kahani|katha|bhajan|bhajans|song|songs|shorts?|reel|status|animation|avatar|influencer|art|artist|image|images|picture|photo|film|movie|video|videos)\b/i,
  /\b(generated|made|created)\s+(by|with|using)\s+ai\b/i,
  /\bby\s+ai\b/i,
  /\b(chatgpt|openai|midjourney|dall[\s-]*e|sora|veo|runway[\s-]*ml|synthetic|deepfake|face\s*swap|text[\s-]*to[\s-]*video)\b/i,
  /\bai[\s\-_]*(prompt|prompting|se\s*bani|se\s*banai|se\s*banaya|se\s*bana)\b/i,
  /\b(ghibli[\s-]*style|ai[\s\-_]*style|ai[\s\-_]*version|ai[\s\-_]*animated|ai[\s\-_]*hindi[\s\-_]*story)\b/i,
  // AI + Bhagwan / mythological AI-generated stories (biggest spam lane)
  /\bai\b.*(mahabharat|ramayan|ramayana|krishna|shiva|shiv|vishnu|hanuman|bhagwan|bhagwaan|geeta|gita|katha|purana|puran)/i,
  /(mahabharat|ramayan|krishna|shiv|vishnu|hanuman|bhagwan|geeta|katha|purana).*\bai\b/i,
  /\b(templates?|intros?|outros?)\b/i,
  /\bgreen[\s-]*screen\b/i,
  /\bstock[\s-]*(footage|video)\b/i,
  /\b(no[\s-]*copyright|copyright[\s-]*free|royalty[\s-]*free)\b/i,
  /\bmotion[\s-]*graphics\b/i,
  /\b(after[\s-]*effects|premiere[\s-]*pro|alight[\s-]*motion|capcut|kinemaster|filmora)\b/i,
  /\blogo[\s-]*(animation|design|reveal|making)\b/i,
  /\b(whatsapp[\s-]*status|status[\s-]*video|ringtone|free[\s-]*download)\b/i,
  // Hindi: AI-generated / template / spam markers
  /(टेम्पलेट|टेम्प्लेट|इंट्रो|आउट्रो|मोशन ग्राफिक्स|ग्रीन स्क्रीन|स्टॉक फुटेज|कॉपीराइट फ्री|रॉयल्टी फ्री|व्हाट्सएप स्टेटस|स्टेटस वीडियो|रिंगटोन|लोगो एनिमेशन|फ्री डाउनलोड)/i,
  /(एआई|ए आई|चैटजीपीटी|चैट जीपीटी|ai).*(से\s*बनी|से\s*बना|से\s*बनाई|से\s*बनाया|द्वारा\s*बनी|द्वारा\s*बनाई|जनरेटेड|निर्मित|कहानी|कथा|भजन| kahani|katha|स्टोरी|सोरी|story)/i,
  /(एआई\s*से|एआई\s*द्वारा)/i,
  // AI voice: TTS / computer / robot / synthetic / AI reader — human voice only (audiobook strict)
  /\b(ai[\s\-]*voice|voice[\s\-]*by\s*ai|ai[\s\-]*narrat|ai[\s\-]*reader|ai\s+reader|ai\s+narrator|text[\s\-]*to[\s\-]*speech|\btts\b|computer[\s\-]*voice|robot\s+voice|synthetic\s+voice|machine\s+voice|generated\s+voice|voice\s+generated)\b/i,
  /एआई\s*(आवाज|वॉइस|वाइस|नैरेशन)|कंप्यूटर\s*आवाज|रोबोट\s*आवाज|मशीन\s*आवाज|एआई\s*से\s*पढ़ी|एआई\s*द्वारा\s*पढ़ी/i
];

// Signals that a video is educational / documentary style.
const EDU_PATTERNS = [
  /\b(documentary|docu|explained|explainer|education|educational|lecture|lesson|course|tutorial|masterclass)\b/i,
  /\b(science|physics|chemistry|biology|mathematics|maths|history|geography|technology|engineering|space|universe|astronomy|cosmos|philosophy|psychology|economics|research|study|facts|knowledge|upsc|ias|exam|gk)\b/i,
  /(डॉक्यूमेंट्री|विज्ञान|वैज्ञानिक|इतिहास|भूगोल|गणित|शिक्षा|ज्ञान|तथ्य|रहस्य|अंतरिक्ष|ब्रह्मांड|अध्ययन|परीक्षा|सामान्य ज्ञान|समझाए|समझिए|सीखें|क्या है|कैसे बन|कैसे काम)/i
];

// Channels that reliably publish educational content (small quality boost).
const TRUSTED_CHANNEL =
  /(nasa|esa|isro|national geographic|nat geo|bbc|dw|ted|ted-ed|khan academy|crash ?course|kurzgesagt|veritasium|vsauce|3blue1brown|mit |stanford|harvard|smithsonian|discovery|science channel|history channel|pbs|nova|dhruv rathee|khan gs|study iq|physics wallah|wifistudy|adda247|onlyias|drishti ias|vision ias|sarrthi|sleeping philosophy|science hub|vigyan|विज्ञान|ज्ञान|documentary|शिक्षा|study)/i;

// Hindu dharma / Bhagwan shows: Mahabharat, Ramayan, Upanishad, Gita, Krishna, Shiv etc.
const BHAGWAN_PATTERNS = [
  /\b(mahabharat|mahabharata|ramayan|ramayana|upanishad|upnishad|bhagavad|geeta|gita|krishna|leela|katha|puran|puraan|bhajan|mantra|dharm|ayodhya|vrindavan|haridwar|kedarnath|badrinath|jyotirling|char\s*dham|tirupati|sai\s*baba|aum|om\s*namah|shloka|bhagwan|bhagwaan|ishwar|prabhu|avatar|ram\s*leela|shiv\s*leela)\b/i,
  /(महाभारत|रामायण|उपनिषद|गीता|कृष्ण|राम कथा|शिव पुराण|विष्णु|हनुमान|दुर्गा|गणेश|लक्ष्मी|भगवान|भजन|कथा|पुराण|गंगा|यमुना|अयोध्या|वृन्दावन|हरिद्वार|तिरुपति|मंत्र|आरती|पूजा|मंदिर|धर्म|श्लोक|प्रभु|अवतार)/i
];

const BLOCKED_SUGGESTIONS =
  /(templates?|intros?|outros?|green screen|stock footage|copyright free|no copyright|royalty free|motion graphics|after effects|premiere pro|capcut|alight motion|kinemaster|ringtone|whatsapp status|status video|ai generated|ai video|ai story|ai kahani|ai katha|ai bhajan|ai se bani|made by ai|chatgpt|logo animation|free download|ai voice|ai narrator|ai reader|text to speech|tts|computer voice|robot voice|टेम्पलेट|इंट्रो|रिंगटोन|स्टेटस|मोशन ग्राफिक्स|ग्रीन स्क्रीन|कॉपीराइट फ्री|फ्री डाउनलोड|एआई से बनी|एआई कहानी|एआई आवाज|एआई वॉइस)/i;

function textOf(video) {
  return `${video.title || ''} ${video.channel || ''} ${video.description || ''}`;
}

function isAiVoice(video) {
  if (isAiFarmChannel(video.channel)) return true;
  const haystack = `${video.title || ''} ${video.channel || ''} ${video.description || ''}`;
  return AI_VOICE_PATTERNS.some(pattern => pattern.test(haystack));
}

function isAudiobook(video) {
  const haystack = textOf(video);
  return AUDIOBOOK_PATTERNS.some(pattern => pattern.test(haystack));
}

function audiobookScore(video) {
  let score = 0;
  if (isAudiobook(video)) score += 5;
  if (TRUSTED_AUDIOBOOK_CHANNEL.test(textOf(video))) score += 3;
  if (TRUSTED_HUMAN_NARRATOR.test(textOf(video))) score += 3;
  if (isAiFarmChannel(video.channel)) score -= 50; // hard deprioritize (kept blocked anyway)
  if (educationScore(video) > 0) score += 1;
  const secs = parseDurationSeconds(video.duration);
  if (secs !== null) {
    if (secs >= 3600) score += 3;
    else if (secs >= 1800) score += 2;
    else if (secs >= 900) score += 1;
    else if (secs < 300) score -= 2;
  }
  return score;
}

function audiobookAgeBonus(video) {
  const age = video.ageDays;
  if (age === null || age === undefined) return 0;
  if (age < 7) return 0; // new human-voice audiobooks (2026 tak) are welcome
  if (age < 30) return 1;
  if (age < 365) return 2;
  if (age < 1825) return 2;
  return 1;
}

function isBlocked(video, { category = '' } = {}) {
  if (isAiFarmChannel(video.channel)) return true;
  const haystack = `${video.title || ''} ${video.channel || ''}`;
  if (BLOCKED_PATTERNS.some(pattern => pattern.test(haystack))) return true;
  if (isAiVoice(video)) return true;
  // AI-channel farm: channel name itself advertises AI (e.g. "Sanatan Legends AI", "ai_ki_duniya")
  // Exempt the AI category pile — there users *want* educational videos about AI.
  if (!/^(ai|artificial intelligence)$/i.test(category)) {
    const channel = String(video.channel || '');
    if (/\b(ai)\b/i.test(channel) && /\b(ai|a\.i\.)\b/i.test(channel)) return true;
    if (/(_ai\b|\bai_|\bai\b)/i.test(channel) && /(story|kahani|katha|bhajan|hindi|legends|world|duniya|hub|voice|audiobook|book|read)/i.test(channel)) return true;
    if (/_ai(_|0|1|2|3)/i.test(channel)) return true;
  }
  // Strong AI disclosure hidden in description (e.g. "created with AI / ChatGPT")
  const desc = video.description || '';
  if (/\b(ai\s*generated|made\s*with\s*ai|created\s*with\s*ai|generated\s*by\s*ai|chatgpt|midjourney|deepfake|synthetic\s*media|text[\s\-]*to[\s\-]*speech|\btts\b)\b/i.test(desc)) return true;
  if (/एआई\s*(से\s*बनी|से\s*बना|द्वारा)/i.test(desc)) return true;
  return false;
}

function educationScore(video) {
  const haystack = textOf(video);
  let score = 0;
  for (const pattern of EDU_PATTERNS) {
    if (pattern.test(haystack)) score += 2;
  }
  if (TRUSTED_CHANNEL.test(haystack)) score += 3;
  return score;
}

// Trading-learning signals: only share-market EDUCATION content belongs here.
// Pure market news / price tickers / paid tips / guaranteed-profit spam is excluded or blocked.
const TRADING_PATTERNS = [
  /\b(trading|trader|stock\s*market|share\s*market|share\s*bazaar|technical\s*analysis|fundamental\s*analysis|candlestick|chart\s*pattern|intraday|swing\s*trad|options?\s*trading|futures?\s*trading|nifty|sensex|bank\s*nifty|support\s*and\s*resistance|moving\s*average|price\s*action|volume\s*analysis|stock\s*investing|investing\s+in\s+stocks?|demat|portfolio|risk\s*management|breakout|stock\s*pick(s|ing)?)\b/i,
  /(शेयर\s*बाजार|शेयर\s*मार्केट|शेयर\s*बाज़ार|ट्रेडिंग|इंट्राडे|कैंडलस्टिक|चार्ट\s*पैटर्न|निफ्टी|सेंसेक्स|तकनीकी\s*विश्लेषण|टेक्निकल\s*एनालिसिस|स्टॉक\s*मार्केट|स्टॉक\s*बाज़ार|शेयर\s*सीखना|निवेश)/i
];

// Obvious scam markers — "sure shot tips", guaranteed profit, paid telegram/WhatsApp groups.
const TRADING_SCAM_PATTERNS = [
  /\b(sure[\s\-]*shot|guaranteed?\s*(profit|return|money|income|paisa)|100\s*%\s*(profit|sure|return)|risk[\s\-]*free\s*(returns?|profit)|double\s*(money|paisa))\b/i,
  /\b(telegram|whatsapp|insta)\s*(channel|group)?[^\n]{0,40}(paid|premium|join|vip)\b/i,
  /(पक्का\s*मुनाफा|गारंटीड?\s*(मुनाफा|रिटर्न|कमाई)|डबल\s*पैसा|पैसा\s*डबल)/i
];

// Learning-style markers get a small boost; pure live market noise gets penalized.
const TRADING_LEARN_PATTERNS = [
  /\b(course|tutorial|beginner|basics?|learn|sikhe?n?|seekhe?n?|explained|education|masterclass|strategy|webinar|full\s*course|for\s*beginners)\b/i,
  /(सीखें|सिखा|बेसिक|सिखाओ|सिखाइए|समझें|समझिए|कोर्स|ट्यूटोरियल|स्ट्रेटेजी|शुरुआती)/i
];
const TRADING_NOISE_PATTERNS = [
  /\b(live\s*(market|trading|analysis|trade)|market\s*update|share\s*price\s*today|stock\s*price\s*today|today'?s?\s*(nifty|sensex|market)\s*(update|analysis|prediction)|live\s*bazaar)\b/i,
  /(लाइव\s*मार्केट|बाजार\s*अपडेट|शेयर\s*भाव\s*आज|निफ्टी\s*आज|सेंसेक्स\s*आज|मार्केट\s*टुडे)/i
];

const TRUSTED_TRADING_CHANNEL =
  /(zerodha|varsity|groww|upstox|angel\s*one|pranjal\s*kamra|ca\s*rachana\s*ranade|investyadnya|nikkhil|nikhil\s*(bajaj|p|investments)|pushkar\s*raj\s*thakur|prasad\s*sangele|nooresh\s*merani|subasish\s*panigrahi|trading\s*with\s*rajni|prntscr|marketfeed|elearnmarkets|chartink|kamal\s*lohia|somil\s*garg|sachin\s*sirohi|jee\s*sikhe|freefincal|valueresearch|tradingqna|stockedge|marketsmojo)/i;

function isTrading(video) {
  const haystack = textOf(video);
  return TRADING_PATTERNS.some(pattern => pattern.test(haystack));
}

function isTradingScam(video) {
  const haystack = `${video.title || ''} ${video.channel || ''}`;
  return TRADING_SCAM_PATTERNS.some(pattern => pattern.test(haystack));
}

function tradingScore(video) {
  let score = 0;
  if (isTrading(video)) score += 5;
  if (TRADING_LEARN_PATTERNS.some(pattern => pattern.test(textOf(video)))) score += 2;
  if (TRUSTED_TRADING_CHANNEL.test(textOf(video))) score += 3;
  if (TRADING_NOISE_PATTERNS.some(pattern => pattern.test(video.title || ''))) score -= 3;
  if (educationScore(video) > 0) score += 1;
  const secs = parseDurationSeconds(video.duration);
  if (secs !== null) {
    if (secs >= 3600) score += 2;
    else if (secs >= 1800) score += 1;
    else if (secs < 120) score -= 1;
  }
  return score;
}

function isBhagwan(video) {
  const haystack = textOf(video);
  return BHAGWAN_PATTERNS.some(pattern => pattern.test(haystack));
}

function bhagwanScore(video) {
  let score = 0;
  if (isBhagwan(video)) score += 5;
  if (educationScore(video) > 0) score += 1;
  return score;
}

function ageBonus(video) {
  const age = video.ageDays;
  if (age === null || age === undefined) return 0;
  if (age < 7) return -2; // brand-new uploads are usually the AI/template spam
  if (age < 30) return 0;
  if (age < 180) return 1;
  if (age < 365) return 2;
  if (age < 1825) return 3; // 1–5 years old: proven educational content
  return 2;
}

function detectLanguage(video) {
  const title = video.title || '';
  if (DEVANAGARI.test(title)) return 'hi';
  if (DEVANAGARI.test(video.channel || '')) return 'hi';
  if (/\b(hindi|हिंदी|हिन्दी)\b/i.test(`${title} ${video.channel || ''}`)) return 'hi';
  return 'en';
}

/**
 * Removes AI/template spam, keeps ONLY pre-2023 videos (audiobooks + trading: 2026 tak),
 * prefers educational + older videos, and enforces language (hi / en / all) and
 * optional Bhagwan / Audiobook / Trading topic. Ranking happens after the API cache,
 * so switching sort/filter is instant and never costs extra quota.
 */
function rankVideos(videos, { language = 'en', category = '', sort = 'smart', topic = 'general', relaxed = false } = {}) {
  const deduped = [];
  const seen = new Set();
  for (const video of videos) {
    if (!video?.id || seen.has(video.id)) continue;
    seen.add(video.id);
    deduped.push(video);
  }

  let list = deduped.filter(video => !isBlocked(video, { category }));
  // Trading: obvious scam markers (sure shot / guaranteed profit / paid telegram groups) are hard-blocked.
  if (topic === 'trading') {
    list = list.filter(video => !isTradingScam(video));
    if (!list.length) return [];
  }
  // Audiobooks: human voice ONLY — never fall back to AI-blocked results.
  if (topic === 'audiobook') {
    list = list.filter(video => !isAiVoice(video));
    if (!list.length) return [];
  } else if (!list.length) {
    list = deduped;
  }

  // HARD RULE: only before-2023 videos ("2023 se pehle wali hi video aye bas").
  // Audiobook + Trading exception: 2026 tak (aaj tak ki sari) — allow up to 2027-01-01.
  // Never fall back to post-cutoff — if nothing is old enough, result stays empty.
  const preCutoff = list.filter(video =>
    topic === 'audiobook' || topic === 'trading' ? isBefore2027(video) : isBefore2023(video)
  );
  list = preCutoff;
  if (!list.length) return [];

  if (topic === 'bhagwan') {
    const bhagwan = list.filter(video => isBhagwan(video));
    if (bhagwan.length >= 4) list = bhagwan;
  }

  if (topic === 'audiobook') {
    const audiobooks = list.filter(video => isAudiobook(video));
    if (audiobooks.length >= 4) list = audiobooks;
  }

  if (topic === 'trading') {
    // Trading lane: SIRF trading-SIKHNE wali videos — educational share-market content only.
    // LIVE market noise / price tickers are kept only if there aren't enough learning videos.
    const trading = list.filter(video => isTrading(video));
    if (trading.length >= 4) list = trading;
    else if (!trading.length) return [];
  }

  const categoryAllowsFun = /^(music|gaming)$/i.test(category);
  // Bhagwan / Audiobook / Trading lanes already curated — don't apply the generic educational cut there.
  if (topic !== 'bhagwan' && topic !== 'audiobook' && topic !== 'trading' && !relaxed && !categoryAllowsFun) {
    const educational = list.filter(video => educationScore(video) > 0);
    const needed = Math.min(10, Math.max(4, Math.ceil(list.length * 0.35)));
    if (educational.length >= needed) list = educational;
  }

  if (language === 'hi' || language === 'en') {
    const sameLanguage = list.filter(video => detectLanguage(video) === language);
    if (sameLanguage.length) list = sameLanguage;
  }

  const scored = list.map((video, index) => {
    const baseScore =
      topic === 'bhagwan'
        ? bhagwanScore(video) * 2
        : topic === 'audiobook'
          ? audiobookScore(video) * 2
          : topic === 'trading'
            ? tradingScore(video) * 2
            : educationScore(video) * 2;
    const age = topic === 'audiobook' || topic === 'trading' ? audiobookAgeBonus(video) : ageBonus(video);
    return { video, index, score: baseScore + age };
  });

  if (sort === 'oldest') {
    scored.sort((a, b) => (b.video.ageDays ?? -1) - (a.video.ageDays ?? -1) || a.index - b.index);
  } else if (sort === 'newest') {
    scored.sort((a, b) => (a.video.ageDays ?? 1e9) - (b.video.ageDays ?? 1e9) || a.index - b.index);
  } else {
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
  }

  return scored.map(entry => entry.video);
}

function parseRelativeAge(text) {
  const raw = clean(text);
  if (!raw) return null;
  const ascii = raw.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966));
  const match = /(\d+)\s*(second|sec|minute|min|hour|hr|day|week|month|year|सेकंड|मिनट|घंटे|घंटा|दिन|सप्ताह|हफ्ते|हफ़्ते|महीने|माह|महीना|साल|वर्ष|वर्षों|सालों)\s*(ago|पहले)?/i.exec(
    ascii
  );
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const daysByUnit = {
    second: 1 / 86400,
    sec: 1 / 86400,
    minute: 1 / 1440,
    min: 1 / 1440,
    hour: 1 / 24,
    hr: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
    year: 365,
    सेकंड: 1 / 86400,
    मिनट: 1 / 1440,
    घंटे: 1 / 24,
    घंटा: 1 / 24,
    दिन: 1,
    सप्ताह: 7,
    हफ्ते: 7,
    हफ़्ते: 7,
    महीने: 30,
    माह: 30,
    महीना: 30,
    साल: 365,
    वर्ष: 365,
    वर्षों: 365,
    सालों: 365
  };
  const days = amount * (daysByUnit[unit] || 0);
  if (!Number.isFinite(days) || days <= 0) return null;
  return { days, publishedAt: new Date(Date.now() - days * DAY_MS).toISOString() };
}

/* ------------------------------------------------------------------ */
/* Official YouTube Data API v3 (used when YOUTUBE_API_KEY is present) */
/* ------------------------------------------------------------------ */

function normalizeApiSearchItem(item) {
  const snippet = item.snippet || {};
  const videoId = item.id?.videoId || item.id;
  if (!videoId) return null;
  const publishedAt = snippet.publishedAt || '';
  return {
    id: videoId,
    title: clean(snippet.title),
    channel: clean(snippet.channelTitle),
    channelId: snippet.channelId || '',
    description: clean(snippet.description),
    publishedAt,
    publishedText: '',
    ageDays: publishedAt ? Math.max(0, Math.round((Date.now() - Date.parse(publishedAt)) / DAY_MS)) : null,
    thumbnail:
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: '',
    views: ''
  };
}

async function searchOfficial({ q, language, pageToken, limit, publishedBefore = '2023-01-01T00:00:00Z' }) {
  const key = apiKey();
  const { hl, gl, relevanceLanguage } = locale(language);
  const params = new URLSearchParams({
    key,
    part: 'snippet',
    type: 'video',
    maxResults: String(limit),
    q,
    regionCode: gl,
    safeSearch: 'moderate',
    videoEmbeddable: 'true'
  });
  if (relevanceLanguage) params.set('relevanceLanguage', relevanceLanguage);
  // Official API: ask YouTube itself for pre-2023 only, or 2026 tak for audiobooks
  // (defense in depth — rankVideos also hard-filters).
  params.set('publishedBefore', publishedBefore);
  // Stored tokens carry an "api:" prefix — strip it before sending to Google.
  const rawToken = typeof pageToken === 'string' && pageToken.startsWith('api:') ? pageToken.slice(4) : pageToken;
  if (rawToken) params.set('pageToken', rawToken);

  const response = await fetchWithTimeout(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `YouTube API request failed (${response.status}).`;
    throw new YouTubeError(message, {
      status: response.status === 400 ? 400 : 502,
      code: data?.error?.errors?.[0]?.reason || 'YOUTUBE_API_ERROR',
      details: data?.error
    });
  }

  const videos = (data.items || []).map(normalizeApiSearchItem).filter(Boolean);
  return {
    videos,
    nextPageToken: data.nextPageToken ? `api:${data.nextPageToken}` : null,
    mode: 'live'
  };
}

async function getOfficialVideo(id) {
  const params = new URLSearchParams({
    key: apiKey(),
    part: 'snippet,contentDetails,statistics',
    id
  });
  const response = await fetchWithTimeout(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new YouTubeError(data?.error?.message || 'Could not load video details.', { status: 502 });
  }
  const item = (data.items || [])[0];
  if (!item) return null;
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const publishedAt = snippet.publishedAt || '';
  return {
    id,
    title: clean(snippet.title),
    channel: clean(snippet.channelTitle),
    channelId: snippet.channelId || '',
    description: snippet.description || '',
    publishedAt,
    publishedText: '',
    ageDays: publishedAt ? Math.max(0, Math.round((Date.now() - Date.parse(publishedAt)) / DAY_MS)) : null,
    thumbnail:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: parseIsoDuration(item.contentDetails?.duration),
    views: stats.viewCount ? formatCount(Number(stats.viewCount)) : ''
  };
}

function parseIsoDuration(iso) {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!match) return '';
  const [, d, h, m, s] = match;
  const total = Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
  if (!total) return '';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatCount(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 1e9) return `${(value / 1e9).toFixed(value >= 1e10 ? 0 : 1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(value >= 1e7 ? 0 : 1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e4 ? 0 : 1)}K`;
  return String(value);
}

/* ------------------------------------------------------------------ */
/* Key-free public fallback (YouTube InnerTube, same API the web uses) */
/* ------------------------------------------------------------------ */

async function innerTubeConfig() {
  const { value } = await cached('innertube:config', TTL.config, async () => {
    const response = await fetchWithTimeout('https://www.youtube.com/', {
      headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9' }
    });
    if (!response.ok) throw new YouTubeError('Could not reach YouTube.', { status: 502 });
    const html = await response.text();
    const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    const version =
      html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20240101.00.00';
    if (!key) throw new YouTubeError('YouTube public API config not found.', { status: 502 });
    return { key, version };
  });
  return value;
}

function clientContext(version, language) {
  const { hl, gl } = locale(language);
  return {
    client: {
      clientName: 'WEB',
      clientVersion: version,
      hl,
      gl
    }
  };
}

function collectVideoRenderers(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out);
    return out;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'videoRenderer' && value && value.videoId) out.push(value);
    else if (key === 'reelItemRenderer' && value) continue; // skip shorts for a cleaner grid
    else collectVideoRenderers(value, out);
  }
  return out;
}

function findContinuationToken(node) {
  let token = null;
  (function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'continuationCommand' && child?.token) token = child.token;
      else walk(child);
    }
  })(node);
  return token;
}

function runsText(richText) {
  if (!richText) return '';
  if (typeof richText.simpleText === 'string') return richText.simpleText;
  if (Array.isArray(richText.runs)) return richText.runs.map(run => run.text || '').join('');
  return '';
}

function normalizePublicRenderer(renderer) {
  const id = renderer.videoId;
  if (!id) return null;
  const title = clean(runsText(renderer.title));
  if (!title) return null;
  const owner = renderer.ownerText?.runs?.[0] || renderer.longBylineText?.runs?.[0] || {};
  const description =
    clean(runsText(renderer.detailedMetadataSnippets?.[0]?.snippetText)) ||
    clean(runsText(renderer.descriptionSnippet));
  const thumbnails = renderer.thumbnail?.thumbnails || [];
  // hq720 is 1280px wide and slow across a full grid; hqdefault (480px) is stable and cached.
  // Custom/signed covers need their query string, so keep those as-is.
  const rawThumb = thumbnails[thumbnails.length - 1]?.url || '';
  const thumbnail =
    !rawThumb || /\/hq720\.jpg(\?|$)/.test(rawThumb)
      ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      : rawThumb;

  const publishedText = clean(runsText(renderer.publishedTimeText));
  const relative = parseRelativeAge(publishedText);

  return {
    id,
    title,
    channel: clean(owner.text) || 'YouTube',
    channelId: owner.navigationEndpoint?.browseEndpoint?.browseId || '',
    description,
    publishedAt: relative?.publishedAt || '',
    publishedText,
    ageDays: relative ? Math.round(relative.days) : null,
    thumbnail,
    duration: clean(runsText(renderer.lengthText)),
    views: clean(runsText(renderer.viewCountText))
  };
}

async function innerTubePost(endpoint, payload, language) {
  const config = await innerTubeConfig();
  const body = JSON.stringify({
    context: clientContext(config.version, language),
    ...payload
  });

  const response = await fetchWithTimeout(
    `https://www.youtube.com/youtubei/v1/${endpoint}?key=${config.key}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
        'accept-language': language === 'hi' ? 'hi-IN,hi;q=0.9' : 'en-US,en;q=0.9',
        'x-youtube-client-name': '1',
        'x-youtube-client-version': config.version,
        origin: 'https://www.youtube.com',
        referer: 'https://www.youtube.com/'
      },
      body
    },
    20000
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new YouTubeError(`YouTube public search failed (${response.status}).`, {
      status: 502,
      details: text.slice(0, 300)
    });
  }
  return response.json();
}

async function searchPublic({ q, language, pageToken, limit }) {
  const continuation = pageToken?.startsWith('public:') ? pageToken.slice(7) : '';
  const data = continuation
    ? await innerTubePost('search', { continuation }, language)
    : await innerTubePost('search', { query: q }, language);

  const seen = new Set();
  const videos = collectVideoRenderers(data)
    .map(normalizePublicRenderer)
    .filter(video => {
      if (!video || seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    })
    .slice(0, limit);

  const nextToken = findContinuationToken(data);
  return {
    videos,
    nextPageToken: nextToken ? `public:${nextToken}` : null,
    mode: 'public'
  };
}

async function getOembedVideo(id) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`
  )}&format=json`;
  const response = await fetchWithTimeout(url, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data) return null;
  return {
    id,
    title: clean(data.title),
    channel: clean(data.author_name),
    channelId: '',
    description: '',
    publishedAt: '',
    publishedText: '',
    ageDays: null,
    thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: '',
    views: ''
  };
}

/* ------------------------------------------------------------------ */
/* Public API surface                                                 */
/* ------------------------------------------------------------------ */

function buildQuery(q, category) {
  const search = clean(q).slice(0, 120);
  const cat = clean(category).slice(0, 40);
  const categoryPart = cat && cat.toLowerCase() !== 'all' ? cat : '';
  return [search, categoryPart].filter(Boolean).join(' ').trim();
}

async function fetchSearchPage({ lang, query, pageToken, max, publishedBefore = '2023-01-01T00:00:00Z' }) {
  const key = `search:${publishedBefore}:${lang}:${max}:${query}:${pageToken}`;
  const { value, cached: fromCache } = await cached(key, TTL.search, async () => {
    if (hasApiKey()) {
      try {
        const result = await searchOfficial({ q: query, language: lang, pageToken, limit: max, publishedBefore });
        activeMode = 'live';
        return result;
      } catch (error) {
        // Quota exhausted or invalid key: fall back instead of breaking the app.
        console.warn('[youtube] official API failed, using public fallback:', error.message);
        activeMode = 'public';
      }
    }
    return searchPublic({ q: query, language: lang, pageToken, limit: max });
  });
  return { ...value, cached: fromCache };
}

// One lane failing (YouTube hiccup / rate-limit) must not kill the whole feed.
async function fetchLaneSafe({ lang, query, pageToken, max, publishedBefore = '2023-01-01T00:00:00Z' }) {
  try {
    return await fetchSearchPage({ lang, query, pageToken, max, publishedBefore });
  } catch (error) {
    console.warn(`[youtube] lane failed (${query}): ${error.message}`);
    return { videos: [], nextPageToken: null, mode: 'public', cached: false };
  }
}

// Short pagination tokens: full YouTube continuations are ~1KB each, so the old
// inline token made URLs ~15KB (browsers/server truncate -> next page re-fetched
// page-1 forever, so scrolling never advanced). Store tokens server-side instead.
const tokenStore = new Map();
const TOKEN_TTL_MS = 30 * 60 * 1000;

function storeTokens(value) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  // prune expired / oversized store
  for (const [key, entry] of tokenStore) {
    if (entry.expires <= Date.now()) tokenStore.delete(key);
  }
  if (tokenStore.size > 2000) tokenStore.clear();
  tokenStore.set(id, { value, expires: Date.now() + TOKEN_TTL_MS });
  return id;
}

function loadTokens(id) {
  const entry = tokenStore.get(id);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    tokenStore.delete(id);
    return null;
  }
  return entry.value;
}

function encodeMixToken(hiToken, enToken, seen = []) {
  return `mix:${storeTokens({ hi: hiToken || '', en: enToken || '', seen: seen || [] })}`;
}

function decodeMixToken(token) {
  if (!token || !token.startsWith('mix:')) return null;
  const stored = loadTokens(token.slice(4));
  if (stored) return { hi: typeof stored.hi === 'string' ? stored.hi : '', en: typeof stored.en === 'string' ? stored.en : '', seen: Array.isArray(stored.seen) ? stored.seen : [] };
  // Legacy inline format (pre-fix clients) — try decode for one release.
  try {
    const parsed = JSON.parse(Buffer.from(token.slice(4), 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    return { hi: typeof parsed.hi === 'string' ? parsed.hi : '', en: typeof parsed.en === 'string' ? parsed.en : '', seen: [] };
  } catch {
    return null;
  }
}

function interleave(primary, secondary) {
  const out = [];
  const seen = new Set();
  const max = Math.max(primary.length, secondary.length);
  for (let index = 0; index < max; index += 1) {
    for (const video of [primary[index], secondary[index]]) {
      if (!video?.id || seen.has(video.id)) continue;
      seen.add(video.id);
      out.push(video);
    }
  }
  return out;
}

function encodeBhagwanToken(tokens, seen = []) {
  return `bhg:${storeTokens({ tokens: tokens || [], seen: seen || [] })}`;
}

function decodeBhagwanToken(token) {
  if (!token || !token.startsWith('bhg:')) return null;
  const stored = loadTokens(token.slice(4));
  if (stored) {
    if (Array.isArray(stored)) return { tokens: stored.map(v => (typeof v === 'string' ? v : '')), seen: [] };
    return { tokens: (stored.tokens || []).map(v => (typeof v === 'string' ? v : '')), seen: Array.isArray(stored.seen) ? stored.seen : [] };
  }
  try {
    const parsed = JSON.parse(Buffer.from(token.slice(4), 'base64url').toString('utf8'));
    if (!Array.isArray(parsed)) return null;
    return { tokens: parsed.map(value => (typeof value === 'string' ? value : '')), seen: [] };
  } catch {
    return null;
  }
}

function encodeMultiToken(tokens, seen = [], offset = 0) {
  return `multi:${storeTokens({ tokens: tokens || [], seen: seen || [], offset: offset || 0 })}`;
}

function decodeMultiToken(token) {
  if (!token || !token.startsWith('multi:')) return null;
  const stored = loadTokens(token.slice(6));
  if (stored) {
    if (Array.isArray(stored)) return { tokens: stored.map(v => (typeof v === 'string' ? v : '')), seen: [], offset: 0 };
    return { tokens: (stored.tokens || []).map(v => (typeof v === 'string' ? v : '')), seen: Array.isArray(stored.seen) ? stored.seen : [], offset: Number(stored.offset) || 0 };
  }
  try {
    const parsed = JSON.parse(Buffer.from(token.slice(6), 'base64url').toString('utf8'));
    if (!Array.isArray(parsed)) return null;
    return { tokens: parsed.map(value => (typeof value === 'string' ? value : '')), seen: [], offset: 0 };
  } catch {
    return null;
  }
}

// Single-query page token wrapper so scrolling can exclude already-shown IDs.
function encodePageToken(publicToken, seen = []) {
  return `pg:${storeTokens({ token: publicToken || '', seen: seen || [] })}`;
}

function decodePageToken(token) {
  if (!token) return { token: '', seen: [] };
  if (token.startsWith('pg:')) {
    const stored = loadTokens(token.slice(3));
    if (stored) return { token: typeof stored.token === 'string' ? stored.token : '', seen: Array.isArray(stored.seen) ? stored.seen : [] };
    return { token: '', seen: [] };
  }
  // Legacy raw public token
  if (token.startsWith('public:') || token.startsWith('api:')) return { token, seen: [] };
  return { token: '', seen: [] };
}

function interleaveMany(lists) {
  const out = [];
  const seen = new Set();
  const max = Math.max(0, ...lists.map(list => list.length));
  for (let index = 0; index < max; index += 1) {
    for (const list of lists) {
      const video = list[index];
      if (!video?.id || seen.has(video.id)) continue;
      seen.add(video.id);
      out.push(video);
    }
  }
  return out;
}

async function searchVideos({ q, language = 'en', category = '', pageToken = '', limit = 24, sort = 'smart', topic = 'general' }) {
  const lang = ['hi', 'en', 'all'].includes(language) ? language : 'en';
  const safeSort = ['smart', 'oldest', 'newest'].includes(sort) ? sort : 'smart';
  const safeTopic = topic === 'bhagwan' ? 'bhagwan' : topic === 'audiobook' ? 'audiobook' : topic === 'trading' ? 'trading' : 'general';
  const max = Math.min(Math.max(Number(limit) || 24, 1), 50);
  const baseQuery = buildQuery(q, category);
  const AUDIOBOOK_BEFORE = '2027-01-01T00:00:00Z'; // 2026 tak — aaj tak ki sari
  const TRADING_BEFORE = '2027-01-01T00:00:00Z'; // 2026 tak — aaj tak ki sari

  // Bhagwan lane: curated multi-query merge (Mahabharat, Ramayan, Upanishad, Ganga, Gita...).
  if (safeTopic === 'bhagwan') {
    // User typed something specific inside Bhagwan lane — search exactly that + bhagwan bias.
    if (baseQuery) {
      const query = DEVANAGARI.test(baseQuery) ? baseQuery : `${baseQuery} हिंदी`;
      const effectiveLang = lang === 'all' ? 'hi' : lang;
      const decoded = decodePageToken(pageToken);
      const seenSet = new Set(decoded.seen);
      let token = decoded.token;
      let raw = [];
      let videos = [];
      let lastValue = null;
      for (let round = 0; round < 5; round += 1) {
        lastValue = await fetchSearchPage({ lang: effectiveLang, query, pageToken: token, max: Math.min(50, Math.max(max, 48)) }).catch(() => ({ videos: [], nextPageToken: null, mode: 'public' }));
        raw.push(...(lastValue.videos || []));
        const unseen = raw.filter(video => !seenSet.has(video.id));
        videos = rankVideos(unseen, { language: lang, category, sort: safeSort, topic: 'bhagwan' });
        token = lastValue.nextPageToken || '';
        if (videos.length >= max || !token) break;
      }
      const nextSeen = [...decoded.seen, ...videos.map(video => video.id)];
      return {
        ...lastValue,
        videos,
        nextPageToken: token ? encodePageToken(token, nextSeen) : null,
        query,
        filters: { language: lang, sort: safeSort, category, topic: 'bhagwan' },
        stats: { fetched: raw.length, shown: videos.length }
      };
    }

    const queries = lang === 'en' ? BHAGWAN_QUERIES_EN : BHAGWAN_QUERIES_HI;
    const decoded = decodeBhagwanToken(pageToken);
    let tokens = decoded ? decoded.tokens : queries.map(() => '');
    if (tokens.length !== queries.length) tokens = queries.map((_, index) => tokens[index] || '');
    const seenSet = new Set(decoded ? decoded.seen : []);
    let raw = [];
    let videos = [];
    let pages = [];
    for (let round = 0; round < 5; round += 1) {
      pages = await Promise.all(
        queries.map((query, index) => fetchLaneSafe({ lang: lang === 'all' ? 'hi' : lang, query, pageToken: tokens[index] || '', max }))
      );
      raw.push(...pages.flatMap(page => page.videos || []));
      tokens = pages.map(page => page.nextPageToken || '');
      const unseen = raw.filter(video => !seenSet.has(video.id));
      videos = rankVideos(unseen, { language: lang, category: '', sort: safeSort, topic: 'bhagwan' });
      if (videos.length >= max || !tokens.some(Boolean)) break;
    }
    const nextSeen = [...(decoded ? decoded.seen : []), ...videos.map(video => video.id)];
    const hasMore = tokens.some(Boolean);

    return {
      videos,
      nextPageToken: hasMore ? encodeBhagwanToken(tokens, nextSeen) : null,
      mode: pages.find(page => page.mode)?.mode || 'public',
      query: queries.join(' + '),
      cached: pages.every(page => page.cached),
      filters: { language: lang, sort: safeSort, category: '', topic: 'bhagwan' },
      stats: { fetched: raw.length, shown: videos.length }
    };
  }

  // Audiobook lane: Hindi + English, 2026 tak (aaj tak ki sari), human voice ONLY.
  // AI voice / AI-generated audiobooks are hard-blocked in rankVideos (isAiVoice).
  if (safeTopic === 'audiobook') {
    // User typed something specific inside Audiobook lane — search exactly that + audiobook bias.
    if (baseQuery) {
      let audioQuery = baseQuery;
      if (!/audio[\s\-]*book|ऑडियो\s*बुक/i.test(audioQuery)) audioQuery = `${audioQuery} audiobook`;
      // "All" mode: Hindi pass + English pass interleaved (genuinely mixed).
      if (lang === 'all') {
        let mix = decodeMixToken(pageToken);
        const hindiQ = DEVANAGARI.test(audioQuery) || /\bhindi\b/i.test(audioQuery)
          ? audioQuery
          : `${audioQuery} हिंदी`;
        const englishQ = audioQuery;
        const seenSet = new Set(mix ? mix.seen : []);
        let raw = [];
        let videos = [];
        let hindiPage = null;
        let englishPage = null;
        for (let round = 0; round < 5; round += 1) {
          [hindiPage, englishPage] = await Promise.all([
            fetchLaneSafe({ lang: 'hi', query: hindiQ, pageToken: mix?.hi || '', max, publishedBefore: AUDIOBOOK_BEFORE }),
            fetchLaneSafe({ lang: 'en', query: englishQ, pageToken: mix?.en || '', max, publishedBefore: AUDIOBOOK_BEFORE })
          ]);
          raw = interleave(raw, hindhiSnake(hindiPage, englishPage));
          const unseen = raw.filter(video => !seenSet.has(video.id));
          videos = rankVideos(unseen, { language: 'all', category, sort: safeSort, topic: 'audiobook' });
          const nextHi = hindiPage.nextPageToken || '';
          const nextEn = englishPage.nextPageToken || '';
          mix = { hi: nextHi, en: nextEn, seen: mix?.seen || [] };
          if (videos.length >= max || (!nextHi && !nextEn)) break;
        }
        const hasMore = Boolean(mix && (mix.hi || mix.en));
        const nextSeen = [...(mix?.seen || []), ...videos.map(video => video.id)];
        return {
          videos,
          nextPageToken: hasMore ? encodeMixToken(mix.hi, mix.en, nextSeen) : null,
          mode: englishPage?.mode || hindiPage?.mode || 'public',
          query: audioQuery,
          cached: Boolean(hindiPage?.cached && englishPage?.cached),
          filters: { language: lang, sort: safeSort, category, topic: 'audiobook' },
          stats: { fetched: raw.length, shown: videos.length }
        };
      }
      const effectiveLang = lang;
      const decoded = decodePageToken(pageToken);
      const seenSet = new Set(decoded.seen);
      let token = decoded.token;
      let raw = [];
      let videos = [];
      let lastValue = null;
      const fetchLimit = Math.min(50, Math.max(max, 48));
      for (let round = 0; round < 6; round += 1) {
        lastValue = await fetchLaneSafe({ lang: effectiveLang, query: audioQuery, pageToken: token, max: fetchLimit, publishedBefore: AUDIOBOOK_BEFORE })
          .catch(() => ({ videos: [], nextPageToken: null, mode: 'public' }));
        raw.push(...(lastValue.videos || []));
        const unseen = raw.filter(video => !seenSet.has(video.id));
        videos = rankVideos(unseen, { language: lang, category, sort: safeSort, topic: 'audiobook' });
        token = lastValue.nextPageToken || '';
        if (videos.length >= max || !token) break;
      }
      const nextSeen = [...decoded.seen, ...videos.map(video => video.id)];
      return {
        ...lastValue,
        videos,
        nextPageToken: token ? encodePageToken(token, nextSeen) : null,
        query: audioQuery,
        filters: { language: lang, sort: safeSort, category, topic: 'audiobook' },
        stats: { fetched: raw.length, shown: videos.length }
      };
    }

    // Curated audiobook feed: batched lanes (Hindi / English / mix) so scrolling keeps finding new books.
    const audioLanes =
      lang === 'hi'
        ? AUDIOBOOK_QUERIES_HI.map(query => ({ query, lang: 'hi' }))
        : lang === 'en'
          ? AUDIOBOOK_QUERIES_EN.map(query => ({ query, lang: 'en' }))
          : [
              ...AUDIOBOOK_QUERIES_HI.map(query => ({ query, lang: 'hi' })),
              ...AUDIOBOOK_QUERIES_EN.map(query => ({ query, lang: 'en' }))
            ];
    const BATCH_SIZE = hasApiKey() ? 3 : 10;
    const decodedMulti = decodeMultiToken(pageToken);
    const batchStart = decodedMulti ? decodedMulti.offset || 0 : 0;
    let lanes = audioLanes.slice(batchStart, batchStart + BATCH_SIZE);
    if (!lanes.length) lanes = audioLanes.slice(0, BATCH_SIZE);
    const nextOffset = batchStart + BATCH_SIZE;
    if (nextOffset >= audioLanes.length) {
      // wrapped — keep paging through continuations; seen-filter will advance
    }
    let tokens = decodedMulti && (decodedMulti.offset || 0) === batchStart ? decodedMulti.tokens : lanes.map(() => '');
    if (tokens.length !== lanes.length) tokens = lanes.map((_, index) => tokens[index] || '');
    const seenSet = new Set(decodedMulti ? decodedMulti.seen : []);
    let raw = [];
    let ranked = [];
    let pages = [];
    let rounds = 0;
    const MAX_ROUNDS = 5;
    for (rounds = 0; rounds < MAX_ROUNDS; rounds += 1) {
      pages = await Promise.all(
        lanes.map((lane, index) =>
          fetchLaneSafe({ lang: lane.lang, query: lane.query, pageToken: tokens[index] || '', max, publishedBefore: AUDIOBOOK_BEFORE })
        )
      );
      for (const page of pages) raw.push(...(page.videos || []));
      tokens = pages.map(page => page.nextPageToken || '');
      const unseen = raw.filter(video => !seenSet.has(video.id));
      ranked = rankVideos(unseen, { language: lang, category: '', sort: safeSort, topic: 'audiobook' });
      const hasMore = tokens.some(Boolean);
      if (ranked.length >= max || !hasMore) {
        const nextSeen = [...(decodedMulti ? decodedMulti.seen : []), ...ranked.map(video => video.id)];
        return {
          videos: ranked,
          nextPageToken: encodeMultiToken(tokens, nextSeen, nextOffset),
          mode: pages.find(page => page.mode)?.mode || 'public',
          query: lanes.map(lane => lane.query).join(' + '),
          cached: pages.every(page => page.cached),
          filters: { language: lang, sort: safeSort, category: '', topic: 'audiobook' },
          stats: { fetched: raw.length, shown: ranked.length, rounds: rounds + 1, batch: batchStart }
        };
      }
    }
    const finalSeen = [...(decodedMulti ? decodedMulti.seen : []), ...ranked.map(video => video.id)];
    return {
      videos: ranked,
      nextPageToken: encodeMultiToken(tokens, finalSeen, nextOffset),
      mode: pages.find(page => page.mode)?.mode || 'public',
      query: lanes.map(lane => lane.query).join(' + '),
      cached: pages.every(page => page.cached),
      filters: { language: lang, sort: safeSort, category: '', topic: 'audiobook' },
      stats: { fetched: raw.length, shown: ranked.length, rounds, batch: batchStart }
    };
  }

  // Trading lane: SIRF trading-SIKHNE wali videos, Hindi + English, 2026 tak (aaj tak ki sari).
  // Live market noise / sure-shot / telegram-scam spam is filtered in rankVideos (trading topic).
  if (safeTopic === 'trading') {
    // User typed something specific inside Trading lane — search exactly that + trading bias.
    if (baseQuery) {
      let tradingQuery = baseQuery;
      if (!/trad/i.test(tradingQuery)) tradingQuery = `${tradingQuery} trading`;
      // "All" mode: Hindi pass + English pass interleaved (genuinely mixed).
      if (lang === 'all') {
        let mix = decodeMixToken(pageToken);
        const hindiQ = DEVANAGARI.test(tradingQuery) || /\bhindi\b/i.test(tradingQuery)
          ? tradingQuery
          : `${tradingQuery} हिंदी`;
        const englishQ = tradingQuery;
        const seenSet = new Set(mix ? mix.seen : []);
        let raw = [];
        let videos = [];
        let hindiPage = null;
        let englishPage = null;
        for (let round = 0; round < 5; round += 1) {
          [hindiPage, englishPage] = await Promise.all([
            fetchLaneSafe({ lang: 'hi', query: hindiQ, pageToken: mix?.hi || '', max, publishedBefore: TRADING_BEFORE }),
            fetchLaneSafe({ lang: 'en', query: englishQ, pageToken: mix?.en || '', max, publishedBefore: TRADING_BEFORE })
          ]);
          raw = interleave(raw, hindhiSnake(hindiPage, englishPage));
          const unseen = raw.filter(video => !seenSet.has(video.id));
          videos = rankVideos(unseen, { language: 'all', category, sort: safeSort, topic: 'trading' });
          const nextHi = hindiPage.nextPageToken || '';
          const nextEn = englishPage.nextPageToken || '';
          mix = { hi: nextHi, en: nextEn, seen: mix?.seen || [] };
          if (videos.length >= max || (!nextHi && !nextEn)) break;
        }
        const hasMore = Boolean(mix && (mix.hi || mix.en));
        const nextSeen = [...(mix?.seen || []), ...videos.map(video => video.id)];
        return {
          videos,
          nextPageToken: hasMore ? encodeMixToken(mix.hi, mix.en, nextSeen) : null,
          mode: englishPage?.mode || hindiPage?.mode || 'public',
          query: tradingQuery,
          cached: Boolean(hindiPage?.cached && englishPage?.cached),
          filters: { language: lang, sort: safeSort, category, topic: 'trading' },
          stats: { fetched: raw.length, shown: videos.length }
        };
      }
      const effectiveLang = lang;
      const decoded = decodePageToken(pageToken);
      const seenSet = new Set(decoded.seen);
      let token = decoded.token;
      let raw = [];
      let videos = [];
      let lastValue = null;
      const fetchLimit = Math.min(50, Math.max(max, 48));
      for (let round = 0; round < 6; round += 1) {
        lastValue = await fetchLaneSafe({ lang: effectiveLang, query: tradingQuery, pageToken: token, max: fetchLimit, publishedBefore: TRADING_BEFORE })
          .catch(() => ({ videos: [], nextPageToken: null, mode: 'public' }));
        raw.push(...(lastValue.videos || []));
        const unseen = raw.filter(video => !seenSet.has(video.id));
        videos = rankVideos(unseen, { language: lang, category, sort: safeSort, topic: 'trading' });
        token = lastValue.nextPageToken || '';
        if (videos.length >= max || !token) break;
      }
      const nextSeen = [...decoded.seen, ...videos.map(video => video.id)];
      return {
        ...lastValue,
        videos,
        nextPageToken: token ? encodePageToken(token, nextSeen) : null,
        query: tradingQuery,
        filters: { language: lang, sort: safeSort, category, topic: 'trading' },
        stats: { fetched: raw.length, shown: videos.length }
      };
    }

    // Curated trading feed: batched lanes (Hindi / English / mix) so scrolling keeps finding new learning videos.
    const tradingLanes =
      lang === 'hi'
        ? TRADING_QUERIES_HI.map(query => ({ query, lang: 'hi' }))
        : lang === 'en'
          ? TRADING_QUERIES_EN.map(query => ({ query, lang: 'en' }))
          : [
              ...TRADING_QUERIES_HI.map(query => ({ query, lang: 'hi' })),
              ...TRADING_QUERIES_EN.map(query => ({ query, lang: 'en' }))
            ];
    const BATCH_SIZE = hasApiKey() ? 3 : 10;
    const decodedMulti = decodeMultiToken(pageToken);
    const batchStart = decodedMulti ? decodedMulti.offset || 0 : 0;
    let lanes = tradingLanes.slice(batchStart, batchStart + BATCH_SIZE);
    if (!lanes.length) lanes = tradingLanes.slice(0, BATCH_SIZE);
    const nextOffset = batchStart + BATCH_SIZE;

    let tokens = decodedMulti && (decodedMulti.offset || 0) === batchStart ? decodedMulti.tokens : lanes.map(() => '');
    if (tokens.length !== lanes.length) tokens = lanes.map((_, index) => tokens[index] || '');
    const seenSet = new Set(decodedMulti ? decodedMulti.seen : []);
    let raw = [];
    let ranked = [];
    let pages = [];
    let rounds = 0;
    const MAX_ROUNDS = 5;
    for (rounds = 0; rounds < MAX_ROUNDS; rounds += 1) {
      pages = await Promise.all(
        lanes.map((lane, index) =>
          fetchLaneSafe({ lang: lane.lang, query: lane.query, pageToken: tokens[index] || '', max, publishedBefore: TRADING_BEFORE })
        )
      );
      for (const page of pages) raw.push(...(page.videos || []));
      tokens = pages.map(page => page.nextPageToken || '');
      const unseen = raw.filter(video => !seenSet.has(video.id));
      ranked = rankVideos(unseen, { language: lang, category: '', sort: safeSort, topic: 'trading' });
      const hasMore = tokens.some(Boolean);
      if (ranked.length >= max || !hasMore) {
        const nextSeen = [...(decodedMulti ? decodedMulti.seen : []), ...ranked.map(video => video.id)];
        return {
          videos: ranked,
          nextPageToken: encodeMultiToken(tokens, nextSeen, nextOffset),
          mode: pages.find(page => page.mode)?.mode || 'public',
          query: lanes.map(lane => lane.query).join(' + '),
          cached: pages.every(page => page.cached),
          filters: { language: lang, sort: safeSort, category: '', topic: 'trading' },
          stats: { fetched: raw.length, shown: ranked.length, rounds: rounds + 1, batch: batchStart }
        };
      }
    }
    const finalSeen = [...(decodedMulti ? decodedMulti.seen : []), ...ranked.map(video => video.id)];
    return {
      videos: ranked,
      nextPageToken: encodeMultiToken(tokens, finalSeen, nextOffset),
      mode: pages.find(page => page.mode)?.mode || 'public',
      query: lanes.map(lane => lane.query).join(' + '),
      cached: pages.every(page => page.cached),
      filters: { language: lang, sort: safeSort, category: '', topic: 'trading' },
      stats: { fetched: raw.length, shown: ranked.length, rounds, batch: batchStart }
    };
  }

  // General home feed (no user search): curated multi-lane merge so pre-2023 pool is full.
  const isHomeFeed = !clean(q);
  if (safeTopic === 'general' && isHomeFeed) {
    const categoryPrefix = category && category.toLowerCase() !== 'all' ? `${category} ` : '';
    const allLanes =
      lang === 'hi'
        ? GENERAL_QUERIES_HI.map(query => ({ query: `${categoryPrefix}${query}`, lang: 'hi' }))
        : lang === 'en'
          ? GENERAL_QUERIES_EN.map(query => ({ query: `${categoryPrefix}${query}`, lang: 'en' }))
          : [
              ...GENERAL_QUERIES_HI.map(query => ({ query: `${categoryPrefix}${query}`, lang: 'hi' })),
              ...GENERAL_QUERIES_EN.map(query => ({ query: `${categoryPrefix}${query}`, lang: 'en' }))
            ];
    // Each scroll batch uses FRESH queries (offset window), not just continuations,
    // so unlimited scrolling keeps surfacing new pre-2023 videos instead of repeats.
    // Official API (key present) has publishedBefore server-side, so 3 lanes are
    // enough and saves quota (100 units per search.list) — public mode needs 20.
    const BATCH_SIZE = hasApiKey() ? 3 : 20;
    const decodedMulti = decodeMultiToken(pageToken);
    const batchStart = decodedMulti ? decodedMulti.offset || 0 : 0;
    let lanes = allLanes.slice(batchStart, batchStart + BATCH_SIZE);
    if (!lanes.length) lanes = allLanes.slice(0, BATCH_SIZE);
    const nextOffset = batchStart + BATCH_SIZE;

    let tokens = decodedMulti && (decodedMulti.offset || 0) === batchStart ? decodedMulti.tokens : lanes.map(() => '');
    if (tokens.length !== lanes.length) tokens = lanes.map((_, index) => tokens[index] || '');
    const seenSet = new Set(decodedMulti ? decodedMulti.seen : []);

    let raw = [];
    let ranked = [];
    let pages = [];
    let rounds = 0;
    const MAX_ROUNDS = 5;
    for (rounds = 0; rounds < MAX_ROUNDS; rounds += 1) {
      pages = await Promise.all(
        lanes.map((lane, index) => fetchLaneSafe({ lang: lane.lang, query: lane.query, pageToken: tokens[index] || '', max }))
      );
      for (const page of pages) raw.push(...(page.videos || []));
      tokens = pages.map(page => page.nextPageToken || '');
      const unseen = raw.filter(video => !seenSet.has(video.id));
      ranked = rankVideos(unseen, { language: lang, category, sort: safeSort, topic: 'general' });
      const hasMore = tokens.some(Boolean);
      if (ranked.length >= max || !hasMore) {
        const nextSeen = [...(decodedMulti ? decodedMulti.seen : []), ...ranked.map(video => video.id)];
        return {
          videos: ranked,
          nextPageToken: encodeMultiToken(tokens, nextSeen, nextOffset),
          mode: pages.find(page => page.mode)?.mode || 'public',
          query: lanes.map(lane => lane.query).join(' + '),
          cached: pages.every(page => page.cached),
          filters: { language: lang, sort: safeSort, category, topic: 'general' },
          stats: { fetched: raw.length, shown: ranked.length, rounds: rounds + 1, batch: batchStart }
        };
      }
    }
    const finalSeen = [...(decodedMulti ? decodedMulti.seen : []), ...ranked.map(video => video.id)];
    return {
      videos: ranked,
      nextPageToken: encodeMultiToken(tokens, finalSeen, nextOffset),
      mode: pages.find(page => page.mode)?.mode || 'public',
      query: lanes.map(lane => lane.query).join(' + '),
      cached: pages.every(page => page.cached),
      filters: { language: lang, sort: safeSort, category, topic: 'general' },
      stats: { fetched: raw.length, shown: ranked.length, rounds, batch: batchStart }
    };
  }

  // "All" mode merges a Hindi pass and an English pass so the feed is genuinely mixed.
  // Loop pages internally so pre-2023 filter still leaves a full page.
  if (lang === 'all') {
    let mix = decodeMixToken(pageToken);
    const hindiQuery = `${baseQuery || DEFAULT_QUERY.hi}${baseQuery && !DEVANAGARI.test(baseQuery) ? ' हिंदी' : ''}`;
    const englishQuery = baseQuery || DEFAULT_QUERY.en;
    const seenSet = new Set(mix ? mix.seen : []);
    let raw = [];
    let videos = [];
    let hindiPage = null;
    let englishPage = null;
    for (let round = 0; round < 5; round += 1) {
      [hindiPage, englishPage] = await Promise.all([
        fetchLaneSafe({ lang: 'hi', query: hindiQuery, pageToken: mix?.hi || '', max }),
        fetchLaneSafe({ lang: 'en', query: englishQuery, pageToken: mix?.en || '', max })
      ]);
      raw = interleave(raw, hindhiSnake(hindiPage, englishPage));
      const unseen = raw.filter(video => !seenSet.has(video.id));
      videos = rankVideos(unseen, { language: 'all', category, sort: safeSort });
      const nextHi = hindiPage.nextPageToken || '';
      const nextEn = englishPage.nextPageToken || '';
      mix = { hi: nextHi, en: nextEn, seen: mix?.seen || [] };
      if (videos.length >= max || (!nextHi && !nextEn)) break;
    }

    const hasMore = Boolean(mix && (mix.hi || mix.en));
    const nextSeen = [...(mix?.seen || []), ...videos.map(video => video.id)];

    return {
      videos,
      nextPageToken: hasMore ? encodeMixToken(mix.hi, mix.en, nextSeen) : null,
      mode: englishPage?.mode || hindiPage?.mode,
      query: baseQuery || `${DEFAULT_QUERY.hi} / ${DEFAULT_QUERY.en}`,
      cached: Boolean(hindiPage?.cached && englishPage?.cached),
      filters: { language: 'all', sort: safeSort, category, topic: 'general' },
      stats: { fetched: raw.length, shown: videos.length }
    };
  }

  let query = baseQuery || DEFAULT_QUERY[lang];
  // Hindi mode + English query: nudge YouTube towards Hindi results.
  if (lang === 'hi' && !DEVANAGARI.test(query)) query = `${query} हिंदी`;

  // Over-fetch + loop pages so pre-2023 hard filter still leaves a full page.
  const fetchLimit = Math.min(50, Math.max(max, 48));
  const decodedPage = decodePageToken(pageToken);
  const seenSet = new Set(decodedPage.seen);
  let token = decodedPage.token;
  let raw = [];
  let videos = [];
  let lastValue = null;
  for (let round = 0; round < 6; round += 1) {
    lastValue = await fetchLaneSafe({ lang, query, pageToken: token, max: fetchLimit });
    raw.push(...(lastValue.videos || []));
    const unseen = raw.filter(video => !seenSet.has(video.id));
    videos = rankVideos(unseen, { language: lang, category, sort: safeSort });
    token = lastValue.nextPageToken || '';
    if (videos.length >= max || !token) break;
  }

  const nextSeen = [...decodedPage.seen, ...videos.map(video => video.id)];
  return {
    ...lastValue,
    videos,
    nextPageToken: token ? encodePageToken(token, nextSeen) : null,
    query,
    filters: { language: lang, sort: safeSort, category, topic: 'general' },
    stats: { fetched: raw.length, shown: videos.length }
  };
}

function hindhiSnake(hindiPage, englishPage) {
  return interleave(hindiPage?.videos || [], englishPage?.videos || []);
}

async function getVideo(id) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const { value } = await cached(`video:${id}`, TTL.video, async () => {
    if (hasApiKey()) {
      try {
        const video = await getOfficialVideo(id);
        if (video) return video;
      } catch (error) {
        console.warn('[youtube] video details failed, using oembed:', error.message);
      }
    }
    return getOembedVideo(id);
  });
  return value;
}

async function relatedVideos({ id, title, channel, language = 'en', limit = 12, topic = 'general' }) {
  const lang = ['hi', 'en', 'all'].includes(language) ? language : 'en';
  const safeTopic = topic === 'audiobook' ? 'audiobook' : topic === 'bhagwan' ? 'bhagwan' : topic === 'trading' ? 'trading' : 'general';
  const publishedBefore =
    safeTopic === 'audiobook' || safeTopic === 'trading' ? '2027-01-01T00:00:00Z' : '2023-01-01T00:00:00Z';
  let keywords = clean(title).split(' ').slice(0, 7).join(' ');
  // Keep related lane on-topic: audiobook -> bias query with audiobook so hits stay human-voice books.
  if (safeTopic === 'audiobook' && !/audio[\s\-]*book|ऑडियो\s*बुक/i.test(keywords)) {
    keywords = `${keywords} audiobook`;
  }
  // Trading -> bias query with trading so related stays share-market education.
  if (safeTopic === 'trading' && !/trad/i.test(keywords)) {
    keywords = `${keywords} trading`;
  }
  const query = clean(`${keywords} ${channel}`).slice(0, 120) || DEFAULT_QUERY[lang];
  const { value } = await cached(`related:${safeTopic}:${publishedBefore}:${lang}:${id}:${query}`, TTL.search, () =>
    hasApiKey()
      ? searchOfficial({ q: query, language: lang, limit, publishedBefore }).catch(() =>
          searchPublic({ q: query, language: lang, limit })
        )
      : searchPublic({ q: query, language: lang, limit })
  );

  const videos = rankVideos(value.videos || [], { language: lang, relaxed: true, topic: safeTopic })
    .filter(video => video.id !== id)
    .slice(0, limit);

  return { videos, mode: value.mode };
}

async function suggestions({ q, language = 'en', topic = 'general' }) {
  const term = clean(q);
  const lang = language === 'hi' ? 'hi' : 'en';
  if (topic === 'bhagwan') {
    const local = BHAGWAN_SUGGESTIONS.filter(text =>
      !term || text.toLowerCase().includes(term.toLowerCase()) || term.length < 3
    );
    if (!term) return local.slice(0, 8);
    if (local.length >= 3) return local.slice(0, 8);
    return local.slice(0, 3);
  }
  if (topic === 'audiobook') {
    const local = AUDIOBOOK_SUGGESTIONS.filter(text =>
      !term || text.toLowerCase().includes(term.toLowerCase()) || term.length < 3
    );
    if (!term) return local.slice(0, 8);
    if (local.length >= 3) return local.slice(0, 8);
    return local.slice(0, 3).concat([]);
  }
  if (topic === 'trading') {
    const local = TRADING_SUGGESTIONS.filter(text =>
      !term || text.toLowerCase().includes(term.toLowerCase()) || term.length < 3
    );
    if (!term) return local.slice(0, 8);
    if (local.length >= 3) return local.slice(0, 8);
    return local.slice(0, 3);
  }
  if (!term) return [];
  const { value } = await cached(`suggest:${lang}:${term}`, TTL.suggestion, async () => {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=${lang}&q=${encodeURIComponent(
      term
    )}`;
    const response = await fetchWithTimeout(url, { headers: { 'user-agent': USER_AGENT } });
    if (!response.ok) return [];
    const data = await response.json().catch(() => null);
    if (!Array.isArray(data?.[1])) return [];
    return data[1]
      .map(clean)
      .filter(text => text && !BLOCKED_SUGGESTIONS.test(text))
      .slice(0, 8);
  });
  return value;
}

let activeMode = null;

function mode() {
  if (!hasApiKey()) return 'public';
  return activeMode === 'public' ? 'public' : 'live';
}

// Raw lane fetch for the custom-section feed engine: searches YouTube WITHOUT the
// app-wide pre-2023 cutoff. The filter engine applies the section's own rules instead.
async function rawSearch({ q, language = 'en', max = 48, pageToken = '', publishedBefore = '2027-01-01T00:00:00Z' }) {
  const lang = language === 'hi' ? 'hi' : language === 'all' ? 'en' : 'en';
  return fetchLaneSafe({ lang, query: q, pageToken, max, publishedBefore });
}

module.exports = {
  searchVideos,
  getVideo,
  relatedVideos,
  suggestions,
  hasApiKey,
  mode,
  rawSearch,
  YouTubeError
};
