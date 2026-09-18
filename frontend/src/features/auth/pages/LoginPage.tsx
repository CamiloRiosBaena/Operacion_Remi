import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatedBg } from '../components/AnimatedBg';
import { RemiLogo } from '@/shared/components/RemiLogo';
import type { UserRole } from '../types/auth.types';
import styles from './LoginPage.module.css';

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  cocinero: '/cocina',
  domiciliario: '/domicilios',
  cliente: '/menu',
};


export function LoginPage() {
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_HOME[user.rol], { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    try {
      await login({ correo, contrasena });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  }

  return (
    <div className={styles.page}>
      <AnimatedBg />

      {/* ── Botón cerrar — volver al landing ── */}
      <button
        className={styles.closeBtn}
        onClick={() => navigate('/', { replace: true })}
        aria-label="Volver al inicio"
        title="Volver al inicio"
      >
        ✕
      </button>

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <RemiLogo size={110} />
          <p className={styles.subtitle}>Sistema de autoservicio para restaurante</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="correo" className={styles.label}>Correo electrónico</label>
            <div className={styles.inputWrap}>
              <input
                id="correo"
                type="email"
                className={styles.input}
                placeholder="usuario@remi.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="contrasena" className={styles.label}>Contraseña</label>
            <div className={styles.inputWrap}>
              <input
                id="contrasena"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {errorMsg && (
            <p className={styles.error} role="alert">
              ⚠ {errorMsg}
            </p>
          )}

          <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {isLoading ? 'Ingresando…' : 'Ingresar al sistema'}
          </button>
        </form>

        {/* Registro */}
        <p className={styles.registerRow}>
          ¿Eres cliente?{' '}
          <Link to="/registro" className={styles.registerLink}>Crea tu cuenta gratis</Link>
        </p>

      </div>
    </div>
  );
}
