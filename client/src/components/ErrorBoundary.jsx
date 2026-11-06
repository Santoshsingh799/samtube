import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[SamTube] render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <h1>Kuch galat ho gaya</h1>
          <p>{this.state.error.message || 'Unknown error'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
