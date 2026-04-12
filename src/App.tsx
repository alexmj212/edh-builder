import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DeckList } from './components/DeckList'
import { DeckWorkspace } from './components/DeckWorkspace'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout>
        <Routes>
          <Route path="/" element={<DeckList />} />
          <Route path="/decks/:id" element={<DeckWorkspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
export default App
