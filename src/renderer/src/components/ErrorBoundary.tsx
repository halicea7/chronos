import React from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Chronos] Render error:', error.message, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="chr-error-card" style={{ margin: '12px' }}>
          <div className="chr-error-head">Render error</div>
          <div className="chr-error-msg">{this.state.error.message}</div>
          <button
            className="chr-error-code"
            style={{ cursor: 'pointer', marginTop: 6 }}
            onClick={() => this.setState({ error: null })}
          >
            Dismiss
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
