import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // You could send this to a logging service
    // logErrorToService(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="medical-card text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="medical-header">Something went wrong</h1>
                <p className="medical-text">
                  We're sorry, but something unexpected happened. Our team has been notified.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 rounded-medical border border-red-200">
                  <p className="text-sm font-mono text-red-800 text-left">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button 
                  onClick={this.handleRetry}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try again</span>
                </button>
                
                <button 
                  onClick={this.handleGoHome}
                  className="btn-outline w-full flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Go to dashboard</span>
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">
                  If this problem persists, please contact{' '}
                  <a 
                    href="mailto:support@axisimaging.com.au" 
                    className="text-primary-600 hover:text-primary-700 underline"
                  >
                    support@axisimaging.com.au
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary