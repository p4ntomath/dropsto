import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Homepage from './pages/Homepage'
import LandingPage from './pages/LandingPage'
import BucketView from './pages/BucketView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Homepage />} />
        <Route path="/bucket/:bucketId" element={<BucketView />} />
      </Routes>
    </Router>
  )
}

export default App
