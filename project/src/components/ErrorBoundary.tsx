import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <div className="text-4xl">⚠️</div>
          <p className="text-muted-foreground text-sm">
            Algo salió mal. Intenta recargar la página.
          </p>
<button
            className="text-xs text-primary underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
