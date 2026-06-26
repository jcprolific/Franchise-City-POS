import HomePage from './pages/HomePage'
import FranchisingPage from './pages/FranchisingPage'
import './App.css'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/franchising') {
    return <FranchisingPage />
  }
  return <HomePage />
}
