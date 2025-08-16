import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/utils'
import type { BreadcrumbItem } from '@/types'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav 
      className={cn('flex', className)} 
      aria-label="Breadcrumb"
    >
      <ol role="list" className="flex items-center space-x-2">
        {/* Home link */}
        <li>
          <div>
            <Link 
              to="/" 
              className="text-neutral-500 hover:text-neutral-700 transition-colors"
              aria-label="Go to dashboard"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </li>

        {/* Breadcrumb items */}
        {items.map((item, index) => (
          <li key={item.label}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-neutral-400 mx-2" />
              {item.href && !item.current ? (
                <Link
                  to={item.href}
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className={cn(
                    'text-sm font-medium',
                    item.current 
                      ? 'text-neutral-900' 
                      : 'text-neutral-500'
                  )}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb