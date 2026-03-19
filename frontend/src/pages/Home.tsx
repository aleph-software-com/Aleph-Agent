import { Link } from 'react-router-dom'
import { FiHome, FiGitBranch } from 'react-icons/fi'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
      <FiHome className="text-5xl mb-4" style={{ color: 'var(--primary)' }} />
      <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>Home</h1>
      <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Welcome to your React project.</p>
      <Link
        to="/flow"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition"
        style={{ background: 'var(--primary)', color: 'var(--bg-dark)' }}
      >
        <FiGitBranch />
        View Flow
      </Link>
    </div>
  )
}
