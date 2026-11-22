import { expect, test, type Page } from '@playwright/test';

/** Tarjetas de los platos: el botón es la tarjeta completa y su nombre incluye el precio. */
const tarjetaPlato = (page: Page) => page.getByRole('button', { name: /\$\s?\d/ }).first();

/** Errores de la consola y excepciones no controladas durante la prueba. */
function vigilarErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    // React en modo desarrollo avisa por consola del botón anidado (observación conocida)
    if (m.type() === 'error' && !m.text().includes('cannot be a descendant of') && !m.text().includes('cannot contain a nested')) {
      errores.push(m.text());
    }
  });
  return errores;
}

async function sinDesbordeHorizontal(page: Page) {
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: window.innerWidth,
  }));
  expect(ancho, 'la página no debe tener desplazamiento horizontal').toBeLessThanOrEqual(visible);
}

test('POR-01 La página de inicio carga sin errores y se ajusta al ancho', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/.+/);
  await sinDesbordeHorizontal(page);
  expect(errores).toEqual([]);
});

test('POR-02 El menú muestra los platos que entrega la API', async ({ page }) => {
  const respuesta = page.waitForResponse((r) => r.url().includes('/api/menu/platos') && r.status() === 200);
  await page.goto('/menu?mesa=1');
  await respuesta;
  await expect(page.getByText('Estás en')).toBeVisible();
  await expect(tarjetaPlato(page)).toBeVisible();
  await sinDesbordeHorizontal(page);
});

test('POR-03 Agregar un plato al carrito y abrir Finalizar pedido', async ({ page }) => {
  await page.goto('/menu?mesa=1');
  await tarjetaPlato(page).click();
  await page.getByRole('button', { name: /Agregar al pedido/ }).click();
  await page.getByRole('button', { name: /Carrito — 1 productos/ }).click();
  await page.getByRole('button', { name: /Proceder al pago/ }).click();
  await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible();
  await expect(page.getByText(/Mesa 1/).last()).toBeVisible();
  // No se confirma el pedido: la prueba no crea datos
});

test('POR-04 El registro explica el error de un nombre corto', async ({ page }) => {
  let peticiones = 0;
  page.on('request', (r) => { if (r.url().includes('/api/auth/registro')) peticiones++; });
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill('Ana');
  await page.getByLabel('Correo electrónico').fill('ana@gmail.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234');
  await page.getByLabel('Confirmar').fill('Clave1234');
  await page.getByRole('button', { name: /Crear cuenta gratis/ }).click();
  await expect(page.getByText('El nombre debe tener entre 10 y 30 caracteres')).toBeVisible();
  expect(peticiones, 'no se debe llamar al backend').toBe(0);
});

test('POR-05 El inicio de sesión se ve completo dentro de la ventana', async ({ page }) => {
  await page.goto('/login');
  const boton = page.getByRole('button', { name: /Ingresar|Iniciar sesión/ }).first();
  await expect(page.getByLabel('Correo electrónico')).toBeInViewport();
  await expect(boton).toBeInViewport();
  await sinDesbordeHorizontal(page);
});
