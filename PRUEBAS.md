# Pruebas de Operación Remi en otro PC

Todas las pruebas del documento se pueden repetir y modificar en cualquier PC con Windows desde un menú, con las mismas herramientas y la misma configuración que se documentaron.

## 1. Requisitos (una sola vez)

| Programa | Para qué | Cómo comprobarlo |
|---|---|---|
| Docker Desktop | Base de datos de prueba, OWASP ZAP, SonarQube e instalación en Linux | Abrirlo y esperar a que diga *Engine running* |
| Node.js 22 | Backend, frontend, Jest y Playwright | `node -v` |
| Java 17 o más | JMeter | `java -version` |
| Apache JMeter 5.6.3 | Rendimiento, fiabilidad, capacidad y ráfaga | Descargar el `.zip` *Binaries* de jmeter.apache.org y descomprimirlo, por ejemplo en `C:\tools` |
| Google Chrome | Lighthouse y Selenium IDE | Con la extensión **Selenium IDE** instalada desde la Chrome Web Store |
| Git (opcional) | Clonar el repositorio | Si no está, descargar el ZIP de la rama **UIv2** desde GitHub |

## 2. Primer uso

1. Clonar o descomprimir el repositorio (rama **UIv2**) y abrir la carpeta `Operacion_Remi`.
2. Copiar desde la USB `backend\.env` y `frontend\.env`, que no están en el repositorio porque tienen claves. Solo los necesitan las opciones 3 (para escanear también el frontend), 5, 6 y 10.
3. Doble clic en **`ejecutar-pruebas.bat`** y elegir **0. Preparar este PC**. Instala las dependencias, crea la base de datos de prueba, busca JMeter y ofrece descargar las imágenes de ZAP, SonarQube y Linux (unos 9 GB). La primera vez tarda varios minutos.

## 3. Menú: cada prueba del documento con su herramienta

| Opción | Sección | Prueba | Herramienta | Figuras del documento | Necesita |
|---|---|---|---|---|---|
| 1 | 2.3 | Unitarias (148) | Jest | 30, 31, 34, 35, 38 a 41, 44, 45, 48, 49 | — |
| 2 | 2.4 | Integración incremental y por hilos (62) | Jest + PostgreSQL | 63 a 68 | — |
| 3 | 2.5.1 | Seguridad: escaneo activo de la API y rastreo del frontend | OWASP ZAP (interfaz o automático) | 69 a 79 | `frontend\.env` opcional |
| 4 | 2.5.2 | Rendimiento: E1 con 50 clientes y E2 con 200 | JMeter | 80 a 96 | — |
| 5 | 2.5.3 | Usabilidad y accesibilidad | Lighthouse (Chrome) | 97 a 115 | los dos `.env` |
| 6 | 2.5.4 | Portabilidad en Chrome, Firefox y Safari | Playwright | 116 a 119 | `frontend\.env` |
| 7 | 2.5.4 | Instalación desde cero en Linux | Docker (node:22) | 120 a 122 | — |
| 8 | 2.5.5 | Fiabilidad: carga continua con corte de la base | JMeter + guion de corte | 123 a 133 | — |
| 9 | 2.5.6 | Mantenibilidad | SonarQube | 134 a 139 | — |
| 10 | 2.6 | Aceptación (8 casos de negocio) | Selenium IDE | 140 y 141 | los dos `.env` |
| 11 | 3.2.1 | Tamaño del código | Compilador de TypeScript | 142 y 143 | — |
| 12 | 3.2.2 | Métricas orientadas a clases | Script CK | 147 | — |
| 13 | 3.3.6 | Barrido de seguridad de las 66 rutas (EISA y TEV-RBAC) | Jest | 159 | — |
| 14 | 3.3.2 | Capacidad y recursos: 5 escalones de 200 a 3200 clientes | JMeter + monitor | 150 a 157 | — |
| 15 | 3.3.6 | Ráfaga de ataque (TOMA) | JMeter | 160 y 161 | — |
| 16 | 3.3.7 | Mantenibilidad con cobertura | SonarQube + Jest | 162 a 167 | — |
| H | — | Dashboard HTML de la última corrida de JMeter (Apdex, percentiles, códigos por segundo) | JMeter | 85 a 88, 126 a 128 | — |
| D | — | Detener los contenedores para liberar memoria | Docker | — | — |

**Rendimiento (opción 4) y capacidad (opción 14) son pruebas distintas.** La 4 repite la prueba de sistema de la sección 2.5.2 (50 y 200 clientes con un número fijo de consultas). La 14 es la medición de la sección 3.3.2: cinco escalones que suben de 200 a 3200 clientes, uno después del otro, para encontrar hasta dónde llega el backend y cuánta CPU y memoria usa.

Las opciones que necesitan el backend o el frontend los abren en ventanas aparte que **no se deben cerrar** durante la prueba. Las opciones 5 y 10 usan el backend real (Supabase y las cuentas del restaurante); las demás, el backend de prueba con la base de datos en Docker.

## 4. Resultados en otro equipo

Las pruebas funcionales (opciones 1, 2, 6, 7, 10 y 13) dan el mismo resultado en cualquier equipo. Las de JMeter (4, 8, 14 y 15) miden el equipo donde corren: los números del documento son del equipo de la Tabla 28 (Ryzen 7 5700G de 16 hilos y 32 GB de RAM). En un equipo más pequeño, el backend y JMeter compiten por la misma CPU y la misma memoria, así que los tiempos suben y la saturación llega con menos clientes. Lo que se debe mantener es el comportamiento: el RNF-02 se cumple con la carga normal, el tiempo crece con la carga, la ráfaga no recibe ningún 429 y la API se recupera sola del corte de la base.

**Equipos con 8 GB de RAM o menos:**

- En la opción 14 el menú ofrece escalones reducidos (50, 100, 200, 400 y 800 clientes), que muestran el mismo comportamiento sin agotar la memoria.
- Antes de cada prueba de JMeter, usar la opción **D** para apagar SonarQube y ZAP, que consumen entre 2 y 3 GB cada uno.
- Correr una sola prueba a la vez y cerrar JMeter al terminar.

## 5. Cómo cambiar los parámetros

### Pruebas de JMeter (opciones 4, 8, 14 y 15)

En JMeter, hacer clic en el **nodo raíz del plan** (el primero del árbol, a la izquierda). En la tabla **User Defined Variables**, escribir el nuevo número en la columna *Value* (reemplazando todo el texto de la celda) y presionar **Start** (botón verde).

| Plan | Variable | Por defecto | Qué cambia |
|---|---|---|---|
| Rendimiento (2.5.2) | `E1_CLIENTES`, `E1_ITERACIONES` | 50, 20 | Escenario de carga normal |
| Rendimiento (2.5.2) | `E2_CLIENTES`, `E2_ITERACIONES` | 200, 10 | Escenario de estrés |
| Rendimiento (2.5.2) | `RAMPA_S`, `PAUSA_MS`, `LIMITE_MS` | 10, 300, 2000 | Arranque, pausa entre peticiones y tiempo máximo aceptado |
| Fiabilidad (2.5.5) | `F1_CLIENTES`, `F2_HILOS` | 30, 5 | Clientes normales e hilos con entradas inválidas |
| Fiabilidad (2.5.5) | `DURACION_S`, `F1_PAUSA_MS`, `F2_PAUSA_MS` | 600, 500, 1000 | Duración y pausas (la duración y el segundo del corte se preguntan en el menú) |
| Capacidad (3.3.2) | `CLIENTES_1` a `CLIENTES_5` | 200, 400, 800, 1600, 3200 | Clientes de cada escalón |
| Capacidad (3.3.2) | `DURACION_S`, `RAMPA_S`, `PAUSA_MS` | 45, 10, 300 | Duración de cada escalón, arranque y pausa |
| Capacidad (3.3.2) | `LIMITE_MS` | 2000 | Tiempo máximo aceptado (RNF-02). Con 1 casi todas las peticiones fallan la aserción |
| Ráfaga (3.3.6) | `HILOS`, `ITERACIONES` | 100, 50 | Tamaño del ataque |
| Todos | `HOST`, `PUERTO` | localhost, 3000 | Servidor que se prueba |

Si JMeter pregunta qué hacer con un archivo de resultados que ya existe, elegir **Append**, nunca *Overwrite*. Al terminar, la opción **H** genera el dashboard HTML de esa corrida.

### OWASP ZAP (opción 3)

Con la interfaz gráfica, ZAP se abre en el navegador (http://localhost:8080/zap/):

1. En la ventana inicial, elegir *No, I do not want to persist this session* y **Start**.
2. Abrir la pestaña de automatización: menú **View → Show Tab → Automation Tab**. Si aparece un aviso, presionar *Show Automation and Output Panels*.
3. Botón **Load Plan** (el icono de carpeta) y escribir `/zap/wrk/plan-demo.yaml`.
4. **Run Plan** (el triángulo). El plan importa la API desde Swagger, rastrea el frontend, hace el escaneo activo y genera el reporte. Las alertas aparecen en la pestaña **Alerts**.

El reporte queda en `security-tests\octubre\corrida\zap-reporte.html`. Para cambiar la prueba se edita `security-tests\octubre\plan-demo.yaml` (por ejemplo, `maxScanDurationInMins` o las rutas excluidas). En modo automático, el menú ejecuta el mismo plan sin interfaz y abre el reporte al terminar.

### Pruebas con Jest (opciones 1, 2 y 13)

Los casos están en archivos de texto que se pueden editar con cualquier editor; al volver a elegir la opción, se ejecutan con el cambio.

- Unitarias: `backend\src\**\*.spec.ts` (por ejemplo, los valores límite de `backend\src\pruebas-taller\plato.spec.ts`).
- Integración: `backend\test\integracion\ascendente.int-spec.ts`, `descendente.int-spec.ts` y `hilos.int-spec.ts`.
- Seguridad: `backend\test\integracion\seguridad-rutas.sec-spec.ts`.

Una forma rápida de ver que una prueba detecta un error es cambiar el código esperado de un caso (por ejemplo, `.expect(201)` por `.expect(400)` en `ascendente.int-spec.ts`) y volver a ejecutarla: Jest la marca en rojo y muestra la diferencia.

### Playwright y Selenium IDE (opciones 6 y 10)

- La primera vez, la opción 6 pregunta si descargar los navegadores de Playwright (unos 500 MB) y los baja uno por uno mostrando el detalle; si la descarga se corta, se repite y retoma lo que falte.
- Playwright abre su interfaz (UI mode): se elige el navegador y el caso, y se ve cada paso con su captura. Los casos están en `portability-tests\tests\portabilidad.spec.ts`.
- En Selenium IDE, cada caso se puede abrir, cambiar un paso o un valor y volver a reproducirlo. La suite está en `acceptance-tests\remi-aceptacion.side`.

### SonarQube (opciones 9 y 16)

La primera vez, entrar a http://localhost:9000 con usuario `admin` y contraseña `admin`, cambiar la contraseña y crear un token en **My Account → Security → Generate Tokens** de tipo **User Token**. El guion lo pide al empezar; no se guarda en ningún archivo. Las metas de las métricas M1 a M5 están en la sección 3.3.7 del documento.

## 6. Problemas comunes

| Mensaje | Solución |
|---|---|
| *Docker no está encendido* | Abrir Docker Desktop y esperar a *Engine running* |
| *running scripts is disabled* | Usar `ejecutar-pruebas.bat`, que ya incluye `-ExecutionPolicy Bypass` |
| JMeter se congela o se pone muy lento | Cerrar JMeter, usar la opción D y repetir la prueba con menos clientes |
| El puerto 3000, 3001, 8080, 55432 o 9000 está ocupado | Cerrar el programa o la ventana que lo usa, o reiniciar Docker Desktop |
| *Hay un backend 'prueba' abierto y esta prueba necesita el backend 'real'* | Cerrar la ventana del backend y volver a elegir la opción |
| Playwright no encuentra los navegadores | En `portability-tests`, ejecutar `npx playwright install` |
| JMeter no abre | Revisar `java -version`; JMeter 5.6.3 necesita Java 8 o más (se recomienda 17) |
