import { motion } from 'framer-motion'
import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="auth-frame">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="auth-stack"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
      >
        <header className="auth-brand">
          <Link to="/login">Nouri</Link>
          <p>Team access</p>
        </header>
        <section className="auth-form-panel">
          <Outlet />
        </section>
      </motion.div>
    </main>
  )
}
