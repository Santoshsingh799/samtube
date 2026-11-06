import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Save,
  Search,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { useToast } from './Toast';

const ICON_CHOICES = ['📚','🎓','💻','🤖','📊','📈','📉','💹','🧠','🔬','🧬','⚛️','📜','🕉️','🙏','🎬','🎥','🍿','🎵','🎮','⚽','🏏','💼','🚀','🌍','🔥','⭐','🏆','💡','🛠️','📱','☁️','🔐','🏦','🪙','❤️','🎯','📁'];

const DURATION_PRESETS = [
  { id: 'any', label: 'Any duration', min: null, max: null },
  { id: 'short', label: '< 4 min', min: 0, max: 240 },
  { id: 'medium', label: '4–20 min', min: 240, max: 1200 },
  { id: 'long', label: '20–60 min', min: 1200, max: 3600 },
  { id: 'xlong', label: '> 60 min', min: 3600, max: null }
];

const MODES = [
  { id: 'strict', label: 'Strict', desc: 'Sirf exact selected topics — kuch bhi extra nahi.' },
  { id: 'balanced', label: 'Balanced', desc: 'Selected + closely related. Recommended default.' },
  { id: 'discovery', label: 'Discovery', desc: 'Selected topics ke saath exploratory content bhi.' },
  { id: 'custom', label: 'Custom', desc: 'Tumhara apna relevance threshold.' }
];

function ChipInput({ value, onChange, placeholder, id }) {
  const [text, setText] = useState('');
  function addFromText() {
    const parts = text.split(',').map(part => part.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const part of parts) {
      if (!next.some(item => item.toLowerCase() === part.toLowerCase()) && next.length < 80) next.push(part);
    }
    onChange(next);
    setText('');
  }
  return (
    <div className="chip-input" id={id}>
      <div className="chip-input-chips">
        {value.map(item => (
          <span key={item} className="keyword-chip">
            {item}
            <button type="button" onClick={() => onChange(value.filter(x => x !== item))} aria-label={`Remove ${item}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={text}
          placeholder={value.length ? '' : placeholder}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addFromText();
            } else if (event.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={addFromText}
        />
      </div>
    </div>
  );
}

export default function SectionBuilder({ id }) {
  const isEdit = Boolean(id);
  const notify = useToast();

  const [status, setStatus] = useState(isEdit ? 'loading' : 'ready');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');
  const [mode, setMode] = useState('balanced');
  const [relevanceThreshold, setRelevanceThreshold] = useState(45);
  const [language, setLanguage] = useState('all');
  const [difficulty, setDifficulty] = useState('any');
  const [durationPreset, setDurationPreset] = useState('any');
  const [sort, setSort] = useState('smart');
  const [includeTopics, setIncludeTopics] = useState([]);
  const [excludeTopics, setExcludeTopics] = useState([]);
  const [includeKeywords, setIncludeKeywords] = useState([]);
  const [excludeKeywords, setExcludeKeywords] = useState([]);
  const [preferredChannels, setPreferredChannels] = useState([]);
  const [blockedChannels, setBlockedChannels] = useState([]);

  const [categories, setCategories] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [topicSearch, setTopicSearch] = useState('');

  const [previewStatus, setPreviewStatus] = useState('idle'); // idle | loading | ready | error
  const [previewVideos, setPreviewVideos] = useState([]);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    let active = true;
    api.filters().then(data => {
      if (!active) return;
      setCategories(data.categories || []);
      setOpenCategory(data.categories?.[0]?.id || null);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    api.sections.get(id).then(data => {
      if (!active) return;
      const section = data.section;
      setName(section.name);
      setDescription(section.description || '');
      setIcon(section.icon || '📁');
      setMode(section.mode);
      setRelevanceThreshold(section.relevanceThreshold ?? 45);
      setLanguage(section.language);
      setDifficulty(section.difficulty);
      setSort(section.sort);
      setIncludeTopics(section.includeTopics || []);
      setExcludeTopics(section.excludeTopics || []);
      setIncludeKeywords(section.includeKeywords || []);
      setExcludeKeywords(section.excludeKeywords || []);
      setPreferredChannels(section.preferredChannels || []);
      setBlockedChannels(section.blockedChannels || []);
      const min = section.minDurationSec;
      const max = section.maxDurationSec;
      const match = DURATION_PRESETS.find(preset => preset.min === min && preset.max === max);
      setDurationPreset(match ? match.id : min || max ? 'custom-' : 'any');
      setStatus('ready');
    }).catch(err => {
      if (!active) return;
      setError(err.message);
      setStatus('error');
    });
    return () => { active = false; };
  }, [id, isEdit]);

  const durationConfig = useMemo(() => {
    const preset = DURATION_PRESETS.find(item => item.id === durationPreset);
    return preset || { min: null, max: null };
  }, [durationPreset]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const term = topicSearch.trim().toLowerCase();
    if (!term) return categories;
    return categories
      .map(category => ({
        ...category,
        options: (category.options || []).filter(option => option.label.toLowerCase().includes(term))
      }))
      .filter(category => category.options.length || category.label.toLowerCase().includes(term));
  }, [categories, topicSearch]);

  const toggleTopic = useCallback((list, setList, topic) => {
    setList(current => (current.includes(topic) ? current.filter(item => item !== topic) : [...current, topic]));
  }, []);

  const selectedCount = includeTopics.length + includeKeywords.length;

  async function runPreview() {
    setPreviewStatus('loading');
    setPreviewError('');
    setPreviewVideos([]);
    try {
      // Preview uses the not-yet-saved config client-side against the feed endpoint by
      // temporarily saving is NOT allowed — instead we search with the include terms.
      const query = [...includeKeywords, ...includeTopics].slice(0, 4).join(' ');
      if (!query) {
        setPreviewError('Topics ya keywords add karo, phir preview dikhega.');
        setPreviewStatus('error');
        return;
      }
      const data = await api.search({ q: query, language, sort: 'smart', limit: 8, topic: 'general' });
      setPreviewVideos(data.videos || []);
      setPreviewStatus('ready');
    } catch (err) {
      setPreviewError(err.message);
      setPreviewStatus('error');
    }
  }

  function buildPayload() {
    return {
      name: name.trim(),
      description: description.trim(),
      icon,
      mode,
      relevanceThreshold: Number(relevanceThreshold) || 0,
      language,
      difficulty,
      minDurationSec: durationConfig.min,
      maxDurationSec: durationConfig.max,
      sort,
      includeTopics,
      excludeTopics,
      includeKeywords,
      excludeKeywords,
      preferredChannels,
      blockedChannels
    };
  }

  async function save(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Section ka naam zaroori hai (1-80 characters).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      const data = isEdit ? await api.sections.update(id, payload) : await api.sections.create(payload);
      notify(isEdit ? 'Section update ho gaya.' : 'Section ban gaya — ab feed kholo!', 'success');
      navigate(`/sections/${data.section.id}`);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="page">
        <p className="page-sub">Section load ho raha hai…</p>
      </div>
    );
  }

  return (
    <div className="page builder-page">
      <button className="btn btn-ghost small back-btn" onClick={() => navigate('/sections')}>
        <ArrowLeft size={16} /> My Sections
      </button>

      <section className="page-head">
        <div>
          <p className="eyebrow">{isEdit ? 'Edit Section' : 'Create Section'}</p>
          <h1>{isEdit ? 'Edit your section' : 'Build a permanent section'}</h1>
          <p className="page-sub">Filters ek baar set karo — section hamesha wahi feed dikhayega. Har section apne config se independent hai.</p>
        </div>
      </section>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <form onSubmit={save} className="builder-grid">
        {/* ------------------------------ LEFT: form ------------------------------ */}
        <div className="builder-col">
          <div className="builder-card">
            <h2><span className="builder-step">1</span> Basics</h2>
            <label className="field">
              <span>Section name *</span>
              <input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Trading Academy, B.Tech CSE Sem 6, Mahabharat" maxLength={80} required autoFocus={!isEdit} />
            </label>
            <label className="field">
              <span>Description <small>(optional)</small></span>
              <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Kya milega is section me…" maxLength={300} rows={2} />
            </label>
            <div className="field">
              <span>Icon / emoji</span>
              <div className="icon-picker">
                {ICON_CHOICES.map(choice => (
                  <button key={choice} type="button" className={`icon-choice ${icon === choice ? 'selected' : ''}`} onClick={() => setIcon(choice)} aria-pressed={icon === choice}>
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="builder-card">
            <h2><span className="builder-step">2</span> Topics <small>{includeTopics.length ? `${includeTopics.length} selected` : ''}</small></h2>
            <label className="topic-search">
              <Search size={15} />
              <input value={topicSearch} onChange={event => setTopicSearch(event.target.value)} placeholder="Filter topics — e.g. 'machine learning', 'nifty', 'physics'…" aria-label="Filter topics" />
              {topicSearch ? <button type="button" onClick={() => setTopicSearch('')} aria-label="Clear"><X size={14} /></button> : null}
            </label>

            {includeTopics.length ? (
              <div className="selected-topics">
                {includeTopics.map(topic => (
                  <span key={topic} className="keyword-chip topic-chip">
                    {topic}
                    <button type="button" onClick={() => setIncludeTopics(current => current.filter(item => item !== topic))} aria-label={`Remove ${topic}`}><X size={12} /></button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="builder-hint">Neeche se topics chuno. Kuch nahi chunoge to section "sab kuch" mode me chalega (discovery).</p>
            )}

            {!categories ? <p className="builder-hint">Topic registry load ho rahi hai…</p> : null}
            <div className="topic-accordion">
              {filteredCategories.map(category => {
                const selected = category.options.filter(option => includeTopics.includes(option.label)).length;
                const open = openCategory === category.id;
                return (
                  <div key={category.id} className={`topic-category ${open ? 'open' : ''}`}>
                    <button type="button" className="topic-category-head" onClick={() => setOpenCategory(open ? null : category.id)} aria-expanded={open}>
                      <span>
                        {category.label}
                        {selected ? <span className="cat-count">{selected}</span> : null}
                      </span>
                      <ChevronDown size={16} className="cat-chevron" />
                    </button>
                    {open ? (
                      <div className="topic-options">
                        {(category.options || []).map(option => {
                          const active = includeTopics.includes(option.label);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              role="checkbox"
                              aria-checked={active}
                              className={`topic-option ${active ? 'selected' : ''}`}
                              onClick={() => toggleTopic(includeTopics, setIncludeTopics, option.label)}
                            >
                              {active ? <Check size={12} /> : null}
                              {option.label}
                            </button>
                          );
                        })}
                        {!(category.options || []).length ? <p className="builder-hint">Is category me matching topic nahi.</p> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="builder-card">
            <h2><span className="builder-step">3</span> Custom keywords</h2>
            <label className="field">
              <span>Include keywords <small>(comma ya Enter se add karo)</small></span>
              <ChipInput value={includeKeywords} onChange={setIncludeKeywords} placeholder="e.g. agile, mit opencourseware" id="include-keywords" />
            </label>
            <label className="field">
              <span>Exclude keywords</span>
              <ChipInput value={excludeKeywords} onChange={setExcludeKeywords} placeholder="e.g. comedy, gaming, reaction, podcast" id="exclude-keywords" />
            </label>
            <label className="field">
              <span>Preferred channels</span>
              <ChipInput value={preferredChannels} onChange={setPreferredChannels} placeholder="e.g. pranjal kamra, zerodha varsity" id="preferred-channels" />
            </label>
            <label className="field">
              <span>Blocked channels</span>
              <ChipInput value={blockedChannels} onChange={setBlockedChannels} placeholder="Channel naam jise kabhi nahi dikhana" id="blocked-channels" />
            </label>
          </div>

          <div className="builder-card">
            <h2><span className="builder-step">4</span> Language, duration & difficulty</h2>
            <div className="field-row">
              <div className="field">
                <span>Language</span>
                <div className="seg seg-full" role="group" aria-label="Language">
                  {[{ v: 'all', l: 'All' }, { v: 'hi', l: 'हिंदी' }, { v: 'en', l: 'English' }].map(option => (
                    <button key={option.v} type="button" className={language === option.v ? 'on' : ''} onClick={() => setLanguage(option.v)} aria-pressed={language === option.v}>{option.l}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Sort by</span>
                <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort">
                  <option value="smart">Smart (best match first)</option>
                  <option value="popular">Most views</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
            <div className="field">
              <span>Duration</span>
              <div className="seg seg-full wrap" role="group" aria-label="Duration">
                {DURATION_PRESETS.map(preset => (
                  <button key={preset.id} type="button" className={durationPreset === preset.id ? 'on' : ''} onClick={() => setDurationPreset(preset.id)} aria-pressed={durationPreset === preset.id}>{preset.label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Difficulty <small>(stored abhi — YouTube difficulty metadata nahi deta; AI classification phase me activate hoga)</small></span>
              <select value={difficulty} onChange={event => setDifficulty(event.target.value)} aria-label="Difficulty">
                <option value="any">Any</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="builder-card">
            <h2><span className="builder-step">5</span> Relevance mode</h2>
            <div className="mode-cards">
              {MODES.map(option => (
                <button key={option.id} type="button" className={`mode-card ${mode === option.id ? 'selected' : ''}`} onClick={() => setMode(option.id)} aria-pressed={mode === option.id}>
                  <strong>{option.label}</strong>
                  <small>{option.desc}</small>
                </button>
              ))}
            </div>
            <label className="field">
              <span>Relevance threshold <strong>{relevanceThreshold}</strong></span>
              <input type="range" min={0} max={100} step={5} value={relevanceThreshold} onChange={event => setRelevanceThreshold(Number(event.target.value))} aria-label="Relevance threshold" />
              <small className="builder-hint">Discovery mode isse 30 points neeche tak jaata hai. Strict mode ratio se kaam karta hai.</small>
            </label>
          </div>
        </div>

        {/* --------------------------- RIGHT: preview --------------------------- */}
        <div className="builder-col builder-side">
          <div className="builder-card preview-card">
            <h2><Eye size={16} /> Preview</h2>
            <p className="builder-hint">Yeh preview include terms pe based quick search hai — asli filter rules save karne ke baad feed me apply honge.</p>
            <button type="button" className="btn btn-ghost small" onClick={runPreview} disabled={previewStatus === 'loading'}>
              {previewStatus === 'loading' ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
              {previewStatus === 'loading' ? 'Searching…' : 'Preview matching videos'}
            </button>
            {previewStatus === 'error' ? <p className="auth-error">{previewError}</p> : null}
            {previewStatus === 'ready' && !previewVideos.length ? <p className="builder-hint">Kuch nahi mila — topics/keywords badal ke dekho.</p> : null}
            <div className="preview-grid">
              {previewVideos.map(video => (
                <figure key={video.id} className="preview-item">
                  <img src={video.thumbnail} alt={video.title} loading="lazy" onError={event => { event.currentTarget.style.opacity = '0.3'; }} />
                  <figcaption>{video.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="builder-card summary-card">
            <h2>Summary</h2>
            <ul className="summary-list">
              <li><span>Name</span><strong>{icon} {name.trim() || '—'}</strong></li>
              <li><span>Mode</span><strong>{MODES.find(item => item.id === mode)?.label}</strong></li>
              <li><span>Language</span><strong>{language === 'all' ? 'Hindi + English' : language === 'hi' ? 'हिंदी only' : 'English only'}</strong></li>
              <li><span>Topics</span><strong>{includeTopics.length || '—'}</strong></li>
              <li><span>Keywords</span><strong>{includeKeywords.length ? includeKeywords.join(', ') : '—'}</strong></li>
              <li><span>Excluded</span><strong>{[...excludeKeywords, ...excludeTopics].join(', ') || '—'}</strong></li>
              <li><span>Selection</span><strong>{selectedCount ? `${selectedCount} include terms` : 'Open (sab allowed)'}</strong></li>
            </ul>
          </div>

          <div className="builder-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/sections')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={17} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create section'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
