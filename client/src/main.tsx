import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Disable StrictMode for multiplayer games to avoid duplicate WebSocket connections
// in development. StrictMode's double-mounting can cause networking issues.
createRoot(rootElement).render(<App />)
