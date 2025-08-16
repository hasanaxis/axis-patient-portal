import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, User, LogOut, Settings, HelpCircle } from 'lucide-react'
import AxisLogo from '@/components/common/AxisLogo'
import { cn } from '@/utils'

interface NavigationItem {
  name: string
  href: string
  current: boolean
}

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', current: location.pathname === '/' },
    { name: 'My Scans', href: '/scans', current: location.pathname === '/scans' },
    { name: 'Book Appointment', href: '/book', current: location.pathname === '/book' },
    { name: 'Contact', href: '/contact', current: location.pathname === '/contact' },
    { name: 'Help', href: '/help', current: location.pathname === '/help' },
  ]

  const userMenuItems = [
    { name: 'My Profile', icon: User, href: '/profile' },
    { name: 'Settings', icon: Settings, href: '/settings' },
    { name: 'Help & Support', icon: HelpCircle, href: '/help' },
    { name: 'Sign out', icon: LogOut, href: '/logout' },
  ]

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen)
  }

  const handleSignOut = () => {
    // Implement sign out logic
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  // Mock user data - replace with actual user context
  const user = {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    avatar: null,
  }

  return (
    <header className="bg-white shadow-medical sticky top-0 z-40">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 md:h-32 justify-between items-center">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <AxisLogo size="7rem" className="hidden md:block" />
              <AxisLogo size="lg" className="md:hidden" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex space-x-8" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-medical transition-colors',
                  item.current
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop user menu */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Notifications */}
            <button
              type="button"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-medical transition-colors relative"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-3 p-2 text-sm rounded-medical hover:bg-neutral-50 transition-colors"
                onClick={handleUserMenuToggle}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <div className="font-medium text-neutral-900">{user.name}</div>
                  <div className="text-neutral-500 text-xs">{user.email}</div>
                </div>
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-medical shadow-medical-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        onClick={() => {
                          setUserMenuOpen(false)
                          if (item.name === 'Sign out') {
                            handleSignOut()
                          }
                        }}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="p-2 rounded-medical text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 pb-3 pt-4">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'block px-3 py-2 text-base font-medium rounded-medical transition-colors',
                    item.current
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Mobile user section */}
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center px-3 pb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="font-medium text-neutral-900">{user.name}</div>
                  <div className="text-sm text-neutral-500">{user.email}</div>
                </div>
              </div>

              <div className="space-y-1">
                {userMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center px-3 py-2 text-base font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-medical transition-colors"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      if (item.name === 'Sign out') {
                        handleSignOut()
                      }
                    }}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Close user menu when clicking outside */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setUserMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  )
}

export default Header