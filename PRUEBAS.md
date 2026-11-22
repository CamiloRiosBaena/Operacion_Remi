# Pruebas de Operación Remi en otro PC

Todas las pruebas del documento se pueden ejecutar y modificar en cualquier PC con Windows desde un menú.

## 1. Requisitos (una sola vez)

| Programa | Para qué | Cómo comprobarlo |
|---|---|---|
| Docker Desktop | Base de datos de prueba y SonarQube | Abrirlo y esperar a que diga *Engine running* |
| Node.js 22 | Backend, pruebas con Jest y Playwright | `node -v` |
| Java 17 o más | JMeter | `java -version` |
| Apache JMeter 5.6.3 | Capacidad, ráfaga y fiabilidad | Descargar el `.zip` *Binaries* de jmeter.apache.org y descomprimirlo, por ejemplo en `C:\tools` |
| Git (opcional) | Clonar el repositorio | Si no está, descargar el ZIP desde GitHub (*Code → Download ZIP*) |

## 2. Primer uso

1. Clonar o descomprimir el repositorio y abrir la carpeta `Operacion_Remi`.
2. Doble clic en **`ejecutar-pruebas.bat`**. Se abre el menú.
3. Elegir **0. Preparar este PC**. Instala las dependencias, crea los contenedores de Docker y busca JMeter. Si no lo encuentra, pide la ruta de la carpeta `apache-jmeter-5.6.3`. La primera vez tarda varios minutos, porque descarga las dependencias y las imágenes.

Las pruebas 1 a 8 **no necesitan claves**: usan la base de datos de prueba en Docker y, si no hay `backend\.env`, el backend arranca con claves de prueba. Solo la opción 9 (Playwright) necesita `frontend\.env`, que no está en el repositorio porque tiene claves de Supabase; se copia aparte desde una USB.

## 3. Menú

| Opción | Prueba | Dónde se ve el resultado |
|---|---|---|
| 1 | Unitarias (148 pruebas, Jest) | En la consola |
| 2 | Integración incremental y por hilos (62 pruebas) contra PostgreSQL | En la consola |
| 3 | Barrido de seguridad de las 66 rutas (EISA y TEV-RBAC) | Consola y `backend\test\integracion\seguridad-rutas.json` |
| 4 | Capacidad, tiempo de respuesta y recursos | JMeter (Summary, Aggregate, Response Time Graph), ventana del monitor y `metricas-externas\recursos.csv` |
| 5 | Ráfaga de ataque (TOMA) | JMeter |
| 6 | Fiabilidad: 10 minutos con corte de la base de datos | JMeter y `reliability-tests\eventos.csv` / `memoria.csv` |
| 7 | Mantenibilidad con cobertura (SonarQube) | http://localhost:9000 y `metricas-externas\sonar\` |
| 8 | Métricas orientadas a clases (CK) | Consola y `metrics\metricas-clases.json` |
| 9 | Portabilidad en Chrome, Firefox y Safari (Playwright) | Ventana de Playwright UI |
| B | Solo levantar el backend de prueba | http://localhost:3000/docs (Swagger) |

Las opciones 4, 5, 6 y 9 abren el backend en otra ventana. Esa ventana **no se debe cerrar** mientras se hace la prueba.

## 4. Cómo cambiar los parámetros

### Pruebas de JMeter (opciones 4, 5 y 6)

En JMeter, hacer clic en el **nodo raíz del plan** (el primero del árbol, a la izquierda). En la tabla **User Defined Variables**, cambiar la columna *Value* y presionar **Start** (botón verde). Los valores por defecto son los del documento.

| Plan | Variable | Por defecto | Qué cambia |
|---|---|---|---|
| Capacidad | `CLIENTES_1` a `CLIENTES_5` | 200, 400, 800, 1600, 3200 | Clientes concurrentes de cada escalón |
| Capacidad | `DURACION_S` | 45 | Segundos de cada escalón |
| Capacidad | `RAMPA_S` | 10 | Segundos para arrancar a todos los clientes |
| Capacidad | `PAUSA_MS` | 300 | Pausa entre peticiones de cada cliente |
| Capacidad | `LIMITE_MS` | 2000 | Tiempo máximo aceptado (RNF-02). Con 1 casi todas las peticiones fallan la aserción |
| Ráfaga | `HILOS`, `ITERACIONES` | 100, 50 | Tamaño del ataque |
| Fiabilidad | `F1_CLIENTES`, `F2_HILOS` | 30, 5 | Clientes normales e hilos con entradas inválidas |
| Fiabilidad | `DURACION_S` | 600 | Duración total (el menú también pregunta este valor para el corte de la base) |
| Todos | `HOST`, `PUERTO` | localhost, 3000 | Servidor que se prueba |

Si JMeter pregunta qué hacer con un archivo de resultados que ya existe, elegir **Append**, nunca *Overwrite*.

También se pueden pasar al abrir JMeter desde la consola: `jmeter -t metricas-externas\remi-capacidad.jmx -Jclientes1=50 -Jduracion=20`.

### Pruebas con Jest (opciones 1, 2 y 3)

Los casos están en archivos de texto que se pueden editar con cualquier editor; al volver a elegir la opción, se ejecutan con el cambio.

- Unitarias: `backend\src\**\*.spec.ts` (por ejemplo, los valores límite de `backend\src\pruebas-taller\plato.spec.ts`).
- Integración: `backend\test\integracion\ascendente.int-spec.ts`, `descendente.int-spec.ts` y `hilos.int-spec.ts`.
- Seguridad: `backend\test\integracion\seguridad-rutas.sec-spec.ts`.

Una forma rápida de ver que una prueba detecta un error es cambiar el código esperado de un caso (por ejemplo, `.expect(201)` por `.expect(400)` en `ascendente.int-spec.ts`) y volver a ejecutarla: Jest la marca en rojo y muestra la diferencia.

### SonarQube (opción 7)

La primera vez, entrar a http://localhost:9000 con usuario `admin` y contraseña `admin`, cambiar la contraseña y crear un token en **My Account → Security → Generate Tokens** de tipo **User Token**. El guion lo pide al empezar; no se guarda en ningún archivo. Las metas de las métricas M1 a M5 están en la sección 3.3.7 del documento.

## 5. Problemas comunes

| Mensaje | Solución |
|---|---|
| *Docker no está encendido* | Abrir Docker Desktop y esperar a *Engine running* |
| *running scripts is disabled* | Usar `ejecutar-pruebas.bat`, que ya incluye `-ExecutionPolicy Bypass` |
| El puerto 3000, 55432 o 9000 está ocupado | Cerrar el programa que lo usa o reiniciar Docker Desktop |
| Playwright no encuentra los navegadores | En `portability-tests`, ejecutar `npx playwright install` |
| JMeter no abre | Revisar `java -version`; JMeter 5.6.3 necesita Java 8 o más (se recomienda 17) |
