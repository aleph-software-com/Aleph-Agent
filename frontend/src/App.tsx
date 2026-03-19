import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import AgentsPage from './pages/AgentsPage'
import PipelinesPage from './pages/PipelinesPage'
import ApiKeysPageWrapper from './pages/ApiKeysPageWrapper'
import DocPageWrapper from './pages/DocPageWrapper'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/agents/*" element={<AgentsPage />} />
          <Route path="/pipelines/*" element={<PipelinesPage />} />

          <Route path="/api" element={<ApiKeysPageWrapper />} />

          <Route path="/doc" element={<DocPageWrapper />} />

          <Route path="/" element={<Navigate to="/agents" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
