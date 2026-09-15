import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import './App.css'

export default function App() {
  return (
    <ErrorBoundary>
      <Home />
    </ErrorBoundary>
  )
}
