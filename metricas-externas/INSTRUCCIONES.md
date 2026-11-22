# Pruebas puntuales para las métricas externas (sección 3.3)

Requisitos: Docker Desktop encendido (contenedores `remi-test-db` y `sonarqube`).
Todos los comandos son de PowerShell y se ejecutan desde la carpeta `Operacion_Remi`.

## A. Corrección funcional: corrida completa de pruebas (≈ 2 min)

```powershell
cd backend; npx jest --verbose=false
```
📸 Foto 1: el resumen final (148 pruebas unitarias aprobadas).

```powershell
npm run test:integracion
```
📸 Foto 2: el resumen final (62 pruebas de integración aprobadas).

## C. Seguridad: barrido de todas las rutas (≈ 1 min)

```powershell
npx jest --config ./test/integracion/jest-integracion.json --testRegex "sec-spec.ts$" --verbose
```
📸 Foto 3: las tres pruebas en verde y las líneas `EISA sin token: 43 de 43`, `EISA token falso: 43 de 43`
y `TEV-RBAC: 41 de 41`. El detalle de cada ruta queda en `backend/test/integracion/seguridad-rutas.json`.

## D. Mantenibilidad: SonarQube con cobertura (≈ 5 min)

Primero, en http://localhost:9000 → **My Account → Security → Generate Tokens**, crear un token de tipo
**User Token** (el de análisis no sirve para leer las medidas por la API). Luego:

```powershell
cd ..; .\metricas-externas\mantenibilidad.ps1
```
Pega el token cuando lo pida (no se ve al escribir y no se guarda). Al terminar, en SonarQube:
- 📸 Foto 4: **Overview** del proyecto (calificaciones y cobertura).
- 📸 Foto 5: **Measures → Coverage** (cobertura total y por carpeta backend/frontend).
- 📸 Foto 6: **Measures → Complexity** (complejidad ciclomática y cognitiva).
- 📸 Foto 7: **Issues** filtrado por la regla **S3776** (funciones con complejidad cognitiva mayor a 15).
- 📸 Foto 8: **Measures → Maintainability** (deuda técnica y ratio de deuda).

## B. Eficiencia de desempeño: capacidad, recursos y ráfaga (≈ 10 min)

1. **Terminal 1** (dejarla abierta todo el tiempo):
   ```powershell
   .\metricas-externas\backend-prueba.ps1
   ```
   Carga la semilla en la base de prueba, compila y deja el backend en http://localhost:3000.

2. Borrar resultados de corridas anteriores (JMeter agrega al final si el archivo existe):
   ```powershell
   Remove-Item .\metricas-externas\*.jtl, .\metricas-externas\recursos.csv -ErrorAction SilentlyContinue
   ```

3. **Terminal 2** (el monitor espera a que arranque JMeter):
   ```powershell
   .\metricas-externas\recursos.ps1
   ```

4. Abrir JMeter con el plan de capacidad y darle **Start** (▶):
   ```powershell
   & "$env:USERPROFILE\tools\apache-jmeter-5.6.3\bin\jmeter.bat" -t .\metricas-externas\remi-capacidad.jmx
   ```
   Son 5 escalones de 45 s (200, 400, 800, 1600 y 3200 clientes), unos 5 minutos. Al terminar:
   - 📸 Foto 9: el árbol del plan con los cinco grupos.
   - 📸 Foto 10: **Summary Report**.
   - 📸 Foto 11: **Aggregate Report** (percentiles 90, 95 y 99).
   - 📸 Foto 12: **Response Time Graph**.
   - 📸 Foto 13: **View Results Tree** (solo muestra las peticiones que fallaron, si las hay).
   - 📸 Foto 14: la Terminal 2 con el monitor de CPU y memoria.

5. En el mismo JMeter: **File → Open** → `metricas-externas\remi-rafaga.jmx` y **Start**
   (dura unos 10 s). La aserción espera 429: cada petición que la API **no** frena queda en rojo.
   - 📸 Foto 15: **Summary Report** de la ráfaga.
   - 📸 Foto 16: **View Results Tree** con una petición seleccionada (pestaña Response data / código).

6. Detener el backend con Ctrl+C en la Terminal 1.

Cuando terminen, avisar: yo leo `capacidad.jtl`, `recursos.csv`, `rafaga.jtl` y la carpeta `sonar/`,
calculo las métricas y escribo la sección 3.3.
