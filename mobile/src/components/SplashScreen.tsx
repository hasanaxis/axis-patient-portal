import React, { useEffect, useState } from 'react'

interface SplashScreenProps {
  onFinish?: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => onFinish?.(), 500)
          return 100
        }
        return prev + 2
      })
    }, 50)

    return () => clearInterval(interval)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Status Bar Area */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '44px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: '20px',
        paddingRight: '20px',
        color: 'white',
        fontSize: '17px',
        fontWeight: '600'
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Signal bars */}
          <div style={{ width: '18px', height: '10px', display: 'flex', alignItems: 'end', gap: '2px' }}>
            <div style={{ width: '2px', height: '4px', backgroundColor: 'white', borderRadius: '1px' }} />
            <div style={{ width: '2px', height: '6px', backgroundColor: 'white', borderRadius: '1px' }} />
            <div style={{ width: '2px', height: '8px', backgroundColor: 'white', borderRadius: '1px' }} />
            <div style={{ width: '2px', height: '10px', backgroundColor: 'white', borderRadius: '1px' }} />
          </div>
          {/* WiFi */}
          <div style={{ width: '15px', height: '11px', position: 'relative' }}>
            <div style={{ 
              width: '15px', 
              height: '15px', 
              border: '2px solid white', 
              borderRadius: '50% 50% 0 0',
              borderBottom: 'none',
              transform: 'rotate(45deg)'
            }} />
          </div>
          {/* Battery */}
          <div style={{ 
            width: '24px', 
            height: '12px', 
            border: '1px solid white', 
            borderRadius: '2px', 
            position: 'relative',
            backgroundColor: 'white'
          }}>
            <div style={{ 
              position: 'absolute', 
              right: '-3px', 
              top: '3px', 
              width: '2px', 
              height: '6px', 
              backgroundColor: 'white',
              borderRadius: '0 1px 1px 0'
            }} />
          </div>
        </div>
      </div>

      {/* Logo and Text */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '120px'
      }}>
        <div style={{
          color: 'white',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '300',
            letterSpacing: '2px',
            marginBottom: '-5px'
          }}>
            axis
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '300',
            letterSpacing: '1px'
          }}>
            imaging
          </div>
        </div>
      </div>

      {/* Loading Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '200px',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: 'white',
          borderRadius: '2px',
          transition: 'width 0.1s ease-out'
        }} />
      </div>
    </div>
  )
}