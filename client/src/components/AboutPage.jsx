import { CheckCircle2, Database, KeyRound, Languages, ListVideo, Search, Server, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Smart search',
    text: 'YouTube se real results, suggestions ke saath — Hindi ya English preference.'
  },
  {
    icon: Languages,
    title: 'Hindi + English',
    text: 'relevanceLanguage preference se apni language ke videos pehle.'
  },
  {
    icon: ListVideo,
    title: 'Playlists',
    text: 'Apni collections banao, videos save karo, play all se dekho.'
  },
  {
    icon: Sparkles,
    title: 'Liked + history',
    text: 'Like karo, history dekho — sab kuch locally, bina login.'
  }
];

export default function AboutPage({ health }) {
  const mode = health == null ? 'checking' : !health.ok ? 'offline' : health.mode;

  return (
    <div className="page about-page">
      <section className="about-hero">
        <p className="eyebrow">About</p>
        <h1>
          Sam<span>Tube</span>
        </h1>
        <p>
          Ek YouTube video discovery app — Hindi aur English content, embedded playback, likes, history aur
          playlists. Koi login nahi, koi database nahi: tumhara data tumhare browser me rehta hai.
        </p>
        <div className="about-status">
          <span
            className={`status-dot ${
              health == null ? '' : health.ok ? (health.mode === 'live' ? 'live' : 'public') : 'off'
            }`}
          />
          {mode === 'checking'
            ? 'Server status check ho raha hai…'
            : mode === 'live'
              ? 'YouTube Data API key detected — live mode'
              : mode === 'public'
                ? 'Key-free public mode — bina API key chal raha hai'
                : 'Backend offline — `npm run dev` chalao'}
        </div>
      </section>

      <section className="feature-grid">
        {features.map(feature => {
          const Icon = feature.icon;
          return (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon">
                <Icon size={20} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          );
        })}
      </section>

      <section className="about-block">
        <div className="about-block-head">
          <KeyRound size={20} />
          <h2>Optional: API key add karo</h2>
        </div>
        <p>
          App bina key ke bhi chalta hai (public mode). Official quota aur zyada reliability ke liye Google Cloud
          se free YouTube Data API v3 key lo:
        </p>
        <ol className="steps">
          <li>Google Cloud Console me project banao aur “YouTube Data API v3” enable karo.</li>
          <li>Credentials → API key create karo.</li>
          <li>
            Root folder ke <code>.env</code> file me paste karo:
            <pre>
              <code>YOUTUBE_API_KEY=your_key_here</code>
            </pre>
          </li>
          <li>Server restart karo — sidebar me “Live YouTube API” dikhega.</li>
        </ol>
        <p className="muted small">
          Key sirf server par rehti hai, browser tak kabhi nahi jaati. <code>.env</code> gitignored hai.
        </p>
      </section>

      <section className="about-block">
        <div className="about-block-head">
          <Database size={20} />
          <h2>Data &amp; privacy</h2>
        </div>
        <p>
          History, likes aur playlists browser ke <code>localStorage</code> me save hote hain. Browser data clear
          karne par ye bhi chale jayenge. Koi account, koi tracking, koi server-side user data nahi.
        </p>
      </section>

      <section className="about-block">
        <div className="about-block-head">
          <Server size={20} />
          <h2>Tech &amp; scripts</h2>
        </div>
        <div className="tech-table">
          <div>
            <span>Frontend</span>
            <strong>React 18 + Vite</strong>
          </div>
          <div>
            <span>Backend</span>
            <strong>Express (Node.js)</strong>
          </div>
          <div>
            <span>Commands</span>
            <strong>
              <code>npm run dev</code> · <code>npm run build</code> · <code>npm start</code>
            </strong>
          </div>
          <div>
            <span>Health</span>
            <strong>
              <CheckCircle2 size={14} /> {health?.ok ? `API up (${health.mode})` : 'offline'}
            </strong>
          </div>
        </div>
      </section>

      <p className="legal-footer">
        SamTube is a learning/demo project. Videos are embedded from YouTube; all rights belong to their owners.
      </p>
    </div>
  );
}
