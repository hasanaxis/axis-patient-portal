import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Import new design components
import SplashScreen from '@/components/auth/SplashScreen'
import OnboardingScreen from '@/components/auth/OnboardingScreen'
import LoginScreen from '@/components/auth/LoginScreen'
import CleanDashboard from '@/pages/CleanDashboard'
import ScanDetailView from '@/pages/ScanDetailView'
import DicomViewer from '@/pages/DicomViewer'

// Lazy load remaining pages
const BookAppointment = React.lazy(() => import('@/pages/BookAppointment'))
const ContactUs = React.lazy(() => import('@/pages/ContactUs'))
const Profile = React.lazy(() => import('@/pages/Profile'))
const NotFound = React.lazy(() => import('@/pages/NotFound'))

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-64">
    <LoadingSpinner size="lg" />
  </div>
)

function App() {
  return (
    <Routes>
      {/* Auth Flow Routes */}
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/onboarding" element={<OnboardingScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      
      {/* Main Dashboard */}
      <Route path="/dashboard" element={<CleanDashboard />} />
      
      {/* Scan Routes */}
      <Route path="/scans/:scanId" element={<ScanDetailView />} />
      <Route path="/scans/:scanId/viewer" element={<DicomViewer />} />
      
      {/* Other Routes */}
      <Route 
        path="/book" 
        element={
          <React.Suspense fallback={<PageLoader />}>
            <BookAppointment />
          </React.Suspense>
        } 
      />
      
      <Route 
        path="/profile" 
        element={
          <React.Suspense fallback={<PageLoader />}>
            <Profile />
          </React.Suspense>
        } 
      />
      
      <Route 
        path="/contact" 
        element={
          <React.Suspense fallback={<PageLoader />}>
            <ContactUs />
          </React.Suspense>
        } 
      />

      {/* Root redirect based on auth status */}
      <Route path="/" element={<SplashScreen />} />
      
      {/* Redirect old URLs */}
      <Route path="/scans" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 Not Found */}
      <Route 
        path="*" 
        element={
          <React.Suspense fallback={<PageLoader />}>
            <NotFound />
          </React.Suspense>
        } 
      />
    </Routes>
  )
}

export default App