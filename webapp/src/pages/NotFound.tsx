import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Search } from 'lucide-react'
import AxisLogo from '@/components/common/AxisLogo'

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="medical-card">
          {/* Logo */}
          <div className="mb-6">
            <AxisLogo size="7rem" className="mx-auto" />
          </div>

          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-primary-500 mb-2">404</div>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-500 to-primary-600 mx-auto rounded-full"></div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-neutral-600 mb-8 leading-relaxed">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, 
            deleted, or you may have entered the URL incorrectly.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/"
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="btn-outline w-full flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-neutral-200">
            <p className="text-sm text-neutral-500 mb-4">
              Need help finding what you're looking for?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/help"
                className="btn-ghost flex items-center justify-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Search Help</span>
              </Link>
              <a
                href="mailto:support@axisimaging.com.au"
                className="btn-ghost flex items-center justify-center space-x-2"
              >
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">
            Error Code: 404 - Page Not Found
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound