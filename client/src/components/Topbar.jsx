import { useEffect, useRef, useState } from 'react';
import { Languages, Menu, Search, X } from 'lucide-react';
import { api } from '../lib/api';

export default function Topbar({
  searchText,
  onSearchTextChange,
  onSubmitSearch,
  language,
  topic = 'general',
  onLanguageChange,
  onMenuClick
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const term = searchText.trim();
    if (!open || term.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .suggest(term, language, topic, { signal: controller.signal })
        .then(data => setSuggestions(data.suggestions || []))
        .catch(() => {});
    }, 260);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, language, topic, open]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = event => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function submit(event, value) {
    event?.preventDefault();
    setOpen(false);
    setActive(-1);
    onSubmitSearch(String(value ?? searchText).trim());
  }

  function onKeyDown(event) {
    if (!open || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(current => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(current => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const value = suggestions[active];
      onSearchTextChange(value);
      submit(event, value);
    }
  }

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Toggle sidebar">
        <Menu size={22} />
      </button>

      <a className="brand" href="#/" aria-label="SamTube home">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>
          Sam<span>Tube</span>
        </span>
      </a>

      <form
        className="search-box"
        onSubmit={submit}
        role="search"
        ref={wrapperRef}
      >
        {searchText ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              onSearchTextChange('');
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}
        <input
          ref={inputRef}
          value={searchText}
          onChange={event => {
            onSearchTextChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={topic === 'bhagwan' ? 'Mahabharat, Ramayan, Geeta खोजें…' : topic === 'audiobook' ? 'Audiobook खोजें — human voice only…' : topic === 'trading' ? 'Trading खोजें — share market, analysis, options…' : language === 'hi' ? 'वीडियो खोजें…' : 'Search videos…'}
          aria-label="Search videos"
          autoComplete="off"
        />
        <button className="search-submit" type="submit" aria-label="Search">
          <Search size={19} />
        </button>

        {open && suggestions.length ? (
          <ul className="suggest-list">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion}-${index}`}>
                <button
                  type="button"
                  className={index === active ? 'active' : ''}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    onSearchTextChange(suggestion);
                    submit(null, suggestion);
                  }}
                >
                  <Search size={14} />
                  <span>{suggestion}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <div className="top-actions">
        <label className="language-control" title="Preferred video language">
          <Languages size={16} />
          <span className="language-label">Language</span>
          <select value={language} onChange={event => onLanguageChange(event.target.value)} aria-label="Language">
            <option value="all">All</option>
            <option value="hi">हिंदी</option>
            <option value="en">English</option>
          </select>
        </label>
        <a className="icon-btn help-btn" href="#/about" aria-label="About SamTube" title="About SamTube">
          ?
        </a>
      </div>
    </header>
  );
}
