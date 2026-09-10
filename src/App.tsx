import { Routes, Route } from 'react-router'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import './App.css'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </ErrorBoundary>
  )
}
