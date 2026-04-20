import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './features/auth/context/AuthContext.tsx';
import { CarritoProvider } from './features/carrito/context/CarritoContext.tsx';
import { PlatosProvider } from './features/menu/context/PlatosContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PlatosProvider>
        <CarritoProvider>
          <App />
        </CarritoProvider>
      </PlatosProvider>
    </AuthProvider>
  </StrictMode>,
);
