import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

// Utility function to combine Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export const dateUtils = {
  // Australian date format
  formatDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    return format(d, 'dd/MM/yyyy')
  },
  
  formatDateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    return format(d, 'dd/MM/yyyy HH:mm')
  },
  
  formatTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid time'
    return format(d, 'HH:mm')
  },
  
  formatRelative: (date: Date | string): string => {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return 'Invalid date'
    
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  },
  
  isToday: (date: Date | string): boolean => {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return false
    
    const today = new Date()
    return d.toDateString() === today.toDateString()
  },
  
  isRecent: (date: Date | string, days: number = 7): boolean => {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return false
    
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays <= days
  }
}

// Medical data formatting
export const medicalUtils = {
  formatMedicareNumber: (number: string): string => {
    if (!number) return ''
    // Format as #### ### ###
    const cleaned = number.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{4})(\d{3})(\d{3})/)
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`
    }
    return number
  },
  
  formatPhoneNumber: (number: string): string => {
    if (!number) return ''
    // Format Australian phone numbers
    const cleaned = number.replace(/\D/g, '')
    
    // Mobile: 04XX XXX XXX
    if (cleaned.startsWith('04') && cleaned.length === 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
    }
    
    // Landline: (0X) XXXX XXXX
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`
    }
    
    return number
  },
  
  formatBodyPart: (bodyPart: string): string => {
    return bodyPart
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  },
  
  getModalityName: (modality: string): string => {
    const modalityNames: Record<string, string> = {
      CT: 'CT Scan',
      MR: 'MRI',
      DX: 'X-Ray',
      US: 'Ultrasound',
      MG: 'Mammography',
      NM: 'Nuclear Medicine',
      PT: 'PET Scan',
      RF: 'Fluoroscopy',
      XA: 'Angiography',
      OT: 'Other'
    }
    return modalityNames[modality] || modality
  },
  
  getPriorityColor: (priority: string): string => {
    switch (priority) {
      case 'EMERGENCY':
        return 'text-red-600 bg-red-100'
      case 'STAT':
        return 'text-orange-600 bg-orange-100'
      case 'URGENT':
        return 'text-yellow-600 bg-yellow-100'
      case 'ROUTINE':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-neutral-600 bg-neutral-100'
    }
  },
  
  getStatusColor: (status: string): string => {
    switch (status) {
      case 'COMPLETED':
      case 'FINAL':
        return 'text-green-600 bg-green-100'
      case 'IN_PROGRESS':
      case 'IN_REVIEW':
        return 'text-blue-600 bg-blue-100'
      case 'PENDING':
      case 'SCHEDULED':
        return 'text-yellow-600 bg-yellow-100'
      case 'CANCELLED':
        return 'text-red-600 bg-red-100'
      case 'AMENDED':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-neutral-600 bg-neutral-100'
    }
  }
}

// Form validation utilities
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },
  
  australianMobile: (number: string): boolean => {
    const cleaned = number.replace(/\D/g, '')
    return cleaned.startsWith('04') && cleaned.length === 10
  },
  
  medicareNumber: (number: string): boolean => {
    const cleaned = number.replace(/\D/g, '')
    return cleaned.length === 10
  },
  
  required: (value: any): boolean => {
    if (typeof value === 'string') return value.trim().length > 0
    return value != null && value !== undefined
  },
  
  minLength: (value: string, min: number): boolean => {
    return value.trim().length >= min
  },
  
  maxLength: (value: string, max: number): boolean => {
    return value.trim().length <= max
  }
}

// Storage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error)
      return defaultValue || null
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error)
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }
}

// URL utilities
export const urlUtils = {
  getSearchParams: (): URLSearchParams => {
    return new URLSearchParams(window.location.search)
  },
  
  setSearchParam: (key: string, value: string): void => {
    const url = new URL(window.location.href)
    url.searchParams.set(key, value)
    window.history.replaceState({}, '', url.toString())
  },
  
  removeSearchParam: (key: string): void => {
    const url = new URL(window.location.href)
    url.searchParams.delete(key)
    window.history.replaceState({}, '', url.toString())
  },
  
  buildQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') {
        searchParams.set(key, String(value))
      }
    })
    return searchParams.toString()
  }
}

// Accessibility utilities
export const a11y = {
  announceToScreenReader: (message: string): void => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  },
  
  trapFocus: (element: HTMLElement): (() => void) => {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    ) as NodeListOf<HTMLElement>
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }
    
    element.addEventListener('keydown', handleTabKey)
    firstElement?.focus()
    
    return () => {
      element.removeEventListener('keydown', handleTabKey)
    }
  }
}

// Error handling utilities
export const errorUtils = {
  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.data?.message) return error.data.message
    if (error?.response?.data?.message) return error.response.data.message
    return 'An unexpected error occurred'
  },
  
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('network') ||
           error?.message?.includes('fetch')
  },
  
  isValidationError: (error: any): boolean => {
    return error?.status === 400 || error?.status === 422
  },
  
  isUnauthorizedError: (error: any): boolean => {
    return error?.status === 401
  },
  
  isForbiddenError: (error: any): boolean => {
    return error?.status === 403
  },
  
  isNotFoundError: (error: any): boolean => {
    return error?.status === 404
  }
}