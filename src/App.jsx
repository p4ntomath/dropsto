import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Homepage from './pages/Homepage'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import BucketView from './pages/BucketView'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Homepage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bucket/:bucketId" 
            element={
              <ProtectedRoute>
                <BucketView />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
