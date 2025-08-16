import React from 'react'

interface AxisLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero'
  variant?: 'color' | 'white'
  alt?: string
}

const AxisLogo: React.FC<AxisLogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'color',
  alt = 'Axis Imaging Logo'
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12', 
    lg: 'h-16',
    xl: 'h-20',
    '2xl': 'h-24',
    hero: 'h-32'
  }

  return (
    <img
      src={variant === 'white' ? '/assets/logos/axis-logo-white.png' : '/assets/logos/axis-logo-color.png'}
      alt={alt}
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
      loading="lazy"
    />
  )
}

export default AxisLogo