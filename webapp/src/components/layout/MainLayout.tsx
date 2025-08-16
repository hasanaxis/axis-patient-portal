import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import Breadcrumb from './Breadcrumb'
import { cn } from '@/utils'
import type { BreadcrumbItem } from '@/types'

interface MainLayoutProps {
  breadcrumbs?: BreadcrumbItem[]
  className?: string
  fullWidth?: boolean
  noPadding?: boolean
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  breadcrumbs = [], 
  className,
  fullWidth = false,
  noPadding = false
}) => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      
      <main 
        id="main-content"
        className={cn(
          'flex-1',
          !noPadding && 'py-6',
          className
        )}
      >
        {!fullWidth ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {breadcrumbs.length > 0 && (
              <div className="mb-6">
                <Breadcrumb items={breadcrumbs} />
              </div>
            )}
            <Outlet />
          </div>
        ) : (
          <>
            {breadcrumbs.length > 0 && (
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
                <Breadcrumb items={breadcrumbs} />
              </div>
            )}
            <Outlet />
          </>
        )}
      </main>
      
      <Footer />
    </div>
  )
}

export default MainLayout