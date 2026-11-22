#!/usr/bin/env bash
# Prueba de instalabilidad: instala, compila y prueba Operación Remi en un contenedor
# Linux limpio (imagen node:22), a partir del código fuente y sin node_modules ni .env.
set -u
cd /

echo "=============================================================="
echo " Operación Remi - prueba de instalación en Linux"
echo " Sistema: $(. /etc/os-release && echo "$PRETTY_NAME")  |  Node $(node --version)  |  npm $(npm --version)"
echo "=============================================================="

declare -a PASOS RESULTADOS TIEMPOS

paso() {
  local nombre="$1"; shift
  echo
  echo ">>> $nombre"
  local inicio=$SECONDS
  if "$@"; then RESULTADOS+=("OK"); else RESULTADOS+=("FALLÓ"); fi
  PASOS+=("$nombre"); TIEMPOS+=($((SECONDS - inicio)))
}

copiar() {
  mkdir -p /app
  tar -C /origen --exclude=node_modules --exclude=dist --exclude='.env' \
      -cf - backend frontend | tar -C /app -xf -
  ls /app/backend /app/frontend | head -40
}

paso "1. Copiar el código fuente (sin node_modules ni .env)" copiar
paso "2. Backend: npm ci" bash -c "cd /app/backend && npm ci --no-audit --no-fund"
paso "3. Backend: npm run build" bash -c "cd /app/backend && npm run build"
paso "4. Backend: pruebas unitarias (Jest)" bash -c "cd /app/backend && npx jest --ci"
paso "5. Frontend: npm ci" bash -c "cd /app/frontend && npm ci --no-audit --no-fund"
paso "6. Frontend: npm run build" bash -c "cd /app/frontend && npm run build"

echo
echo "=============================================================="
echo " RESUMEN"
fallos=0
for i in "${!PASOS[@]}"; do
  printf "  %-55s %-6s %4ss\n" "${PASOS[$i]}" "${RESULTADOS[$i]}" "${TIEMPOS[$i]}"
  [ "${RESULTADOS[$i]}" = "OK" ] || fallos=$((fallos + 1))
done
echo "  Pasos fallidos: $fallos de ${#PASOS[@]}"
echo "=============================================================="
exit $fallos
