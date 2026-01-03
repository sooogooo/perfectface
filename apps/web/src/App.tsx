import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/home'
import { LoginPage } from './pages/auth/login'
import { RegisterPage } from './pages/auth/register'
import { UploadPage } from './pages/analysis/upload'
import { ResultPage } from './pages/analysis/result'
import { ARPreviewPage } from './pages/ar-preview'
import { DoctorsListPage } from './pages/doctors/list'
import { DoctorDetailPage } from './pages/doctors/[id]'
import { BookingPage } from './pages/appointments/booking'
import { ProfilePage } from './pages/profile'
import { useAuthStore } from './stores/authStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/analysis/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/result/:id"
          element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ar-preview/:analysisId"
          element={
            <ProtectedRoute>
              <ARPreviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctors"
          element={<DoctorsListPage />}
        />
        <Route
          path="/doctors/:id"
          element={<DoctorDetailPage />}
        />
        <Route
          path="/appointments/book/:doctorId"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
