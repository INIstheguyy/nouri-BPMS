import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="auth-frame">
      <section className="auth-intro" aria-label="Nouri Operations">
        <Link className="brand" to="/login">
          <span className="brand-mark">N</span>
          <span>
            <strong>Nouri</strong>
            <small>Operations</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Private staff workspace</p>
          <h1>Good operations grow trust.</h1>
          <p>Secure access for Nouri’s order, customer, delivery, and finance teams.</p>
        </div>
      </section>
      <section className="auth-form-panel">
        <Outlet />
      </section>
    </div>
  )
}
