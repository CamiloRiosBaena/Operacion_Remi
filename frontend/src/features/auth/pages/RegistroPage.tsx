import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatedBg } from '../components/AnimatedBg';
import styles from './RegistroPage.module.css';

function PlateIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <ellipse cx="16" cy="23" rx="12" ry="3" />
      <path d="M4 23 Q4 13 16 11 Q28 13 28 23" />
      <path d="M10 11 Q16 4 22 11" />
    </svg>
  );
}

export function RegistroPage() {
  const { registrar, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Si ya está autenticado como cliente, ir al menú
  if (isAuthenticated && user?.rol === 'cliente') {
    navigate('/menu', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (contrasena !== confirmar) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }
    if (contrasena.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await registrar({ nombre, correo, contrasena });
      navigate('/menu', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear la cuenta');
    }
  }

  return (
    <div className={styles.page}>
      <AnimatedBg />
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logoWrap}><PlateIcon /></div>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>Accede a recomendaciones y seguimiento de tus pedidos</p>
        </div>

        {/* Beneficios */}
        <ul className={styles.beneficios}>
          <li>✅ Historial de pedidos y favoritos</li>
          <li>✅ Recomendaciones personalizadas</li>
          <li>✅ Seguimiento en tiempo real</li>
        </ul>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="nombre" className={styles.label}>Nombre completo</label>
            <input
              id="nombre"
              type="text"
              className={styles.input}
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="correo" className={styles.label}>Correo electrónico</label>
            <input
              id="correo"
              type="email"
              className={styles.input}
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="contrasena" className={styles.label}>Contraseña</label>
              <input
                id="contrasena"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="confirmar" className={styles.label}>Confirmar</label>
              <input
                id="confirmar"
                type="password"
                className={`${styles.input} ${confirmar && confirmar !== contrasena ? styles.inputError : ''}`}
                placeholder="••••••••"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {errorMsg && (
            <p className={styles.error} role="alert">{errorMsg}</p>
          )}

          <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>

        {/* Links */}
        <div className={styles.links}>
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className={styles.linkInline}>Inicia sesión</Link>
          </p>
          <p>
            <Link to="/menu" className={styles.linkMuted}>Continuar sin cuenta →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
