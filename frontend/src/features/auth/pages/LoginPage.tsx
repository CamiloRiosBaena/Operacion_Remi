import { type FormEvent, useState } from 'react';
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

const DEMO_ACCOUNTS = [
  { rol: 'Admin',        correo: 'admin@remi.com',     contrasena: 'admin123',     emoji: '⚙️' },
  { rol: 'Cocina',       correo: 'cocina@remi.com',     contrasena: 'cocina123',    emoji: '👨‍🍳' },
  { rol: 'Domiciliario', correo: 'domicilio@remi.com',  contrasena: 'domicilio123', emoji: '🛵' },
  { rol: 'Cliente',      correo: 'cliente@remi.com',    contrasena: 'cliente123',   emoji: '👤' },
];


export function LoginPage() {
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (isAuthenticated && user) {
    navigate(ROLE_HOME[user.rol], { replace: true });
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

  function fillDemo(c: string, p: string) {
    setCorreo(c);
    setContrasena(p);
    setErrorMsg('');
  }

  return (
    <div className={styles.page}>
      <AnimatedBg />

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
          ¿Eres cliente? {' '}
          <Link to="/registro" className={styles.registerLink}>Crea tu cuenta gratis</Link>
        </p>

        {/* Demo */}
        <div className={styles.demoSection}>
          <p className={styles.demoTitle}>Acceso rápido (demo)</p>
          <div className={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.correo}
                type="button"
                className={styles.demoChip}
                onClick={() => fillDemo(acc.correo, acc.contrasena)}
                disabled={isLoading}
              >
                <span>{acc.emoji}</span>
                <span>{acc.rol}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
