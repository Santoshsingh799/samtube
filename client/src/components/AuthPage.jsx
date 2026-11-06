import { useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { setUser } from '../lib/store';
import { navigate } from '../lib/router';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload =
        mode === 'signup'
          ? await api.signup({ email: email.trim(), password, displayName: displayName.trim() })
          : await api.login({ email: email.trim(), password });
      setUser(payload.user);
      navigate('/sections');
    } catch (err) {
      setError(err.message || 'Kuch galat hua — phir se try karo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <div className="auth-icon">
          <ShieldCheck size={28} />
        </div>
        <h1>{mode === 'signup' ? 'Create your SamTube account' : 'Welcome back to SamTube'}</h1>
        <p className="auth-sub">
          {mode === 'signup'
            ? 'Your saved sections, filters and feeds stay permanently in the database — on every device.'
            : 'Login to open your permanent sections and personal feeds.'}
        </p>

        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>
            <LogIn size={15} /> Login
          </button>
          <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>
            <UserPlus size={15} /> Sign up
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' ? (
            <label className="field">
              <span><User size={14} /> Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                placeholder="Sam"
                autoComplete="name"
                maxLength={80}
              />
            </label>
          ) : null}

          <label className="field">
            <span><Mail size={14} /> Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span><Lock size={14} /> Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Login'}
          </button>
        </form>

        <p className="auth-note">
          Passwords are scrypt-hashed on the server. Sessions live in an httpOnly cookie — nothing sensitive in the browser.
        </p>
      </div>
    </div>
  );
}
