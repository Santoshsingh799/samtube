import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  List,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Copy,
  Search,
  Star,
  Trash2,
  Upload,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import { useToast } from './Toast';
import EmptyState from './EmptyState';

const MODE_LABEL = { strict: 'Strict', balanced: 'Balanced', discovery: 'Discovery', custom: 'Custom' };

export default function SectionsPage() {
  const [sections, setSections] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [view, setView] = useState('grid');
  const [dragId, setDragId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);
  const notify = useToast();

  const load = useCallback(async () => {
    try {
      setStatus('loading');
      setError('');
      const data = await api.sections.list();
      setSections(data.sections || []);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!confirmDeleteId) return undefined;
    const timer = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const visible = sections.filter(section => {
    if (!showHidden && section.hidden) return false;
    if (!search.trim()) return true;
    const hay = `${section.name} ${section.description} ${(section.includeTopics || []).join(' ')}`.toLowerCase();
    return hay.includes(search.trim().toLowerCase());
  });

  async function patch(section, patchBody) {
    try {
      const data = await api.sections.patch(section.id, patchBody);
      setSections(current => current.map(item => (item.id === section.id ? data.section : item)));
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function duplicate(section) {
    try {
      const data = await api.sections.duplicate(section.id);
      setSections(current => [...current, data.section]);
      notify(`"${data.section.name}" ban gaya.`, 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function remove(section) {
    try {
      await api.sections.remove(section.id);
      setSections(current => current.filter(item => item.id !== section.id));
      setConfirmDeleteId(null);
      notify('Section delete ho gaya.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = await api.sections.import(parsed);
      setSections(current => [...current, data.section]);
      notify(`"${data.section.name}" import ho gaya.`, 'success');
    } catch (err) {
      notify(err.message || 'Import file galat hai (JSON expected).', 'error');
    }
  }

  function exportSection(section) {
    const link = document.createElement('a');
    link.href = api.sections.exportUrl(section.id);
    link.download = `samtube-section-${section.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function onDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    setSections(current => {
      const from = current.findIndex(item => item.id === dragId);
      const to = current.findIndex(item => item.id === targetId);
      if (from === -1 || to === -1) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      api.sections.reorder(next.map(item => item.id)).catch(err => notify(err.message, 'error'));
      return next;
    });
    setDragId(null);
  }

  return (
    <div className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">My Sections</p>
          <h1>Your permanent sections</h1>
          <p className="page-sub">
            Sections are saved in the <strong>database</strong> — refresh, logout ya redeploy, kuch nahi hatega. Delete button se hi delete hoga.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost small" onClick={load} aria-label="Refresh sections">
            <RefreshCw size={15} />
          </button>
          <button className="btn btn-ghost small" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> Import
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={importFile} />
          <button className="btn btn-primary small" onClick={() => navigate('/sections/new')}>
            <Plus size={16} /> Create section
          </button>
        </div>
      </section>

      <div className="sections-toolbar">
        <label className="search-inline">
          <Search size={16} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search sections…" aria-label="Search sections" />
        </label>
        <div className="toolbar-right">
          <button className={`btn btn-ghost small ${showHidden ? 'on' : ''}`} onClick={() => setShowHidden(value => !value)}>
            {showHidden ? <Eye size={15} /> : <EyeOff size={15} />} {showHidden ? 'Hidden shown' : 'Show hidden'}
          </button>
          <button className="icon-btn" onClick={() => setView(v => (v === 'grid' ? 'list' : 'grid'))} aria-label="Toggle layout" title={view === 'grid' ? 'List view' : 'Grid view'}>
            {view === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="error-panel">
          <div>
            <strong>Sections load nahi ho paye</strong>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={load}>Try again</button>
          </div>
        </div>
      ) : null}

      {status === 'ready' && !sections.length ? (
        <EmptyState
          icon={<BookOpenCheck size={30} />}
          title="Abhi koi section nahi hai"
          message="Pehla permanent section banao — jaise 'Trading Academy', 'B.Tech CSE Semester 6' ya 'Mahabharat'. Filters ek baar set karo, hamesha khulege."
          actionLabel="Create your first section"
          onAction={() => navigate('/sections/new')}
        />
      ) : null}

      {status === 'ready' && sections.length > 0 && visible.length === 0 ? (
        <EmptyState icon={<Search size={28} />} title="Match nahi mili" message="Search badal ke dekho ya hidden sections toggle karke dekho." />
      ) : null}

      <div className={view === 'grid' ? 'sections-grid' : 'sections-list'}>
        {visible.map(section => (
          <article
            key={section.id}
            className={`section-card ${section.hidden ? 'is-hidden' : ''} ${view === 'list' ? 'list' : ''}`}
            draggable
            onDragStart={() => setDragId(section.id)}
            onDragOver={event => event.preventDefault()}
            onDrop={() => onDrop(section.id)}
          >
            <div className="section-card-main" onClick={() => navigate(`/sections/${section.id}`)} role="link" tabIndex={0} onKeyDown={event => event.key === 'Enter' && navigate(`/sections/${section.id}`)}>
              <span className="section-drag" title="Drag to reorder">
                <GripVertical size={16} />
              </span>
              <span className="section-icon">{section.icon}</span>
              <div className="section-meta">
                <h3>
                  {section.name}
                  {section.pinned ? <Pin size={13} className="pin-flag" aria-label="Pinned" /> : null}
                  {section.favorite ? <Star size={13} className="fav-flag" aria-label="Favorite" /> : null}
                </h3>
                {section.description ? <p>{section.description}</p> : null}
                <div className="section-chips">
                  <span className="mini-chip mode">{MODE_LABEL[section.mode] || section.mode}</span>
                  <span className="mini-chip">{section.language === 'all' ? 'हिं+EN' : section.language === 'hi' ? 'हिंदी' : 'English'}</span>
                  {section.includeTopics.length ? <span className="mini-chip">{section.includeTopics.length} topics</span> : null}
                  {section.excludeKeywords.length ? <span className="mini-chip dim">{section.excludeKeywords.length} excluded</span> : null}
                </div>
              </div>
              <ChevronRight size={18} className="section-open-arrow" />
            </div>

            <div className="section-card-actions">
              <button className="icon-btn small" title={section.pinned ? 'Unpin' : 'Pin'} onClick={() => patch(section, { pinned: !section.pinned })} aria-pressed={section.pinned}>
                {section.pinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
              <button className="icon-btn small" title={section.favorite ? 'Unfavorite' : 'Favorite'} onClick={() => patch(section, { favorite: !section.favorite })} aria-pressed={section.favorite}>
                <Star size={16} fill={section.favorite ? 'currentColor' : 'none'} />
              </button>
              <button className="icon-btn small" title={section.hidden ? 'Restore (unhide)' : 'Hide'} onClick={() => patch(section, { hidden: !section.hidden })} aria-pressed={section.hidden}>
                {section.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button className="icon-btn small" title="Edit filters" onClick={() => navigate(`/sections/${section.id}/edit`)}>
                <Pencil size={16} />
              </button>
              <button className="icon-btn small" title="Duplicate" onClick={() => duplicate(section)}>
                <Copy size={16} />
              </button>
              <button className="icon-btn small" title="Export JSON" onClick={() => exportSection(section)}>
                <Download size={16} />
              </button>
              {confirmDeleteId === section.id ? (
                <button className="icon-btn small danger confirm" title="Confirm delete" onClick={() => remove(section)}>
                  <Trash2 size={16} /> Sure?
                </button>
              ) : (
                <button className="icon-btn small danger" title="Delete" onClick={() => setConfirmDeleteId(section.id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
