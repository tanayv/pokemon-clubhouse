import { Game } from './components/Game'
import { AutotileMapper } from './components/AutotileMapper'
import './App.css'

function App() {
  // Simple routing based on URL path
  const path = window.location.pathname;

  if (path === '/autotile-mapper') {
    return <AutotileMapper />;
  }

  return (
    <div className="App">
      <Game />
    </div>
  )
}

export default App
