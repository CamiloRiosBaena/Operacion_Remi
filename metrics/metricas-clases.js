// Métricas orientadas a clases (Chidamber y Kemerer) del backend de Remi.
// Usa la API del compilador de TypeScript instalado en backend/node_modules.
// Uso: node metrics/metricas-clases.js  → imprime la tabla y guarda metrics/metricas-clases.json
const path = require('node:path');
const fs = require('node:fs');
const ts = require(path.join(__dirname, '..', 'backend', 'node_modules', 'typescript'));

const raiz = path.join(__dirname, '..', 'backend');
const cfg = ts.getParsedCommandLineOfConfigFile(path.join(raiz, 'tsconfig.build.json'), {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: () => {},
});
const programa = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = programa.getTypeChecker();
const propios = programa
  .getSourceFiles()
  .filter((f) => !f.isDeclarationFile && f.fileName.includes('/backend/src/') && !f.fileName.endsWith('.spec.ts'));

// --- Complejidad ciclomática de McCabe: 1 + puntos de decisión ---
function complejidad(nodo) {
  let c = 1;
  (function visitar(n) {
    switch (n.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
        c++;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = n.operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        )
          c++;
        break;
      }
    }
    ts.forEachChild(n, visitar);
  })(nodo);
  return c;
}

// --- Recolección de clases ---
const clases = [];
for (const sf of propios) {
  ts.forEachChild(sf, function visitar(n) {
    if (ts.isClassDeclaration(n) && n.name) clases.push({ nodo: n, archivo: sf });
    ts.forEachChild(n, visitar);
  });
}
const simbolosPropios = new Map(); // símbolo -> nombre de clase
for (const { nodo } of clases) simbolosPropios.set(checker.getSymbolAtLocation(nodo.name), nodo.name.text);

function resolver(simbolo) {
  if (simbolo && simbolo.flags & ts.SymbolFlags.Alias) return checker.getAliasedSymbol(simbolo);
  return simbolo;
}

// --- DIT: profundidad en el árbol de herencia (0 = no hereda) ---
function dit(nodo, visto = new Set()) {
  const ext = (nodo.heritageClauses || []).find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
  if (!ext) return 0;
  const expr = ext.types[0].expression;
  // PartialType(X) crea una clase intermedia que hereda de X
  if (ts.isCallExpression(expr)) {
    const base = resolver(checker.getSymbolAtLocation(expr.arguments[0]));
    const decl = base?.declarations?.find(ts.isClassDeclaration);
    return 1 + (decl ? 1 + dit(decl, visto) : 0);
  }
  const base = resolver(checker.getSymbolAtLocation(expr));
  const decl = base?.declarations?.find(ts.isClassDeclaration);
  if (!decl || visto.has(decl)) return 1;
  visto.add(decl);
  // Clase de la librería (p. ej. BaseExceptionFilter): se cuenta su propia profundidad declarada
  return 1 + dit(decl, visto);
}

// --- Uso de otras clases propias (para CBO) ---
function clasesUsadas(nodo, propia) {
  const usadas = new Set();
  (function visitar(n) {
    if (ts.isIdentifier(n)) {
      const s = resolver(checker.getSymbolAtLocation(n));
      const nombre = s && simbolosPropios.get(s);
      if (nombre && nombre !== propia) usadas.add(nombre);
    }
    ts.forEachChild(n, visitar);
  })(nodo);
  return usadas;
}

// --- Cohesión: LCOM de Henderson-Sellers (0 = muy cohesiva, 1 = nada cohesiva) ---
function cohesion(nodo, metodos) {
  const atributos = new Set();
  for (const m of nodo.members) {
    if (ts.isPropertyDeclaration(m) && m.name && !m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword))
      atributos.add(m.name.getText());
    if (ts.isConstructorDeclaration(m))
      for (const p of m.parameters)
        if (p.modifiers?.some((x) => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(x.kind)))
          atributos.add(p.name.getText());
  }
  const a = atributos.size;
  const m = metodos.length;
  if (a === 0 || m < 2) return { lcom: null, atributos: a };
  const usos = new Map([...atributos].map((x) => [x, 0]));
  for (const met of metodos) {
    const vistos = new Set();
    (function visitar(n) {
      if (ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword && usos.has(n.name.text))
        vistos.add(n.name.text);
      ts.forEachChild(n, visitar);
    })(met);
    for (const v of vistos) usos.set(v, usos.get(v) + 1);
  }
  const promedio = [...usos.values()].reduce((s, x) => s + x, 0) / a;
  return { lcom: Math.max(0, (promedio - m) / (1 - m)), atributos: a };
}

function tipo(archivo) {
  const f = archivo.fileName;
  if (f.endsWith('.controller.ts')) return 'Controlador';
  if (f.endsWith('.service.ts')) return 'Servicio';
  if (f.endsWith('.module.ts')) return 'Módulo Nest';
  if (f.includes('/dto/')) return 'DTO';
  if (f.includes('/entities/')) return 'Entidad';
  return 'Otra (guard, pipe, filtro, caché)';
}

const filas = clases.map(({ nodo, archivo }) => {
  const nombre = nodo.name.text;
  const metodos = nodo.members.filter(
    (m) => ts.isMethodDeclaration(m) || ts.isGetAccessor(m) || ts.isSetAccessor(m),
  );
  const ctor = nodo.members.filter(ts.isConstructorDeclaration);
  const wmc = [...metodos, ...ctor].reduce((s, m) => s + complejidad(m), 0);
  const { lcom, atributos } = cohesion(nodo, metodos);
  return {
    clase: nombre,
    archivo: path.relative(raiz, archivo.fileName).replace(/\\/g, '/'),
    tipo: tipo(archivo),
    metodos: metodos.length,
    atributos,
    wmc,
    dit: dit(nodo),
    usa: [...clasesUsadas(nodo, nombre)],
  };
});

// CBO bidireccional: clases propias que usa + clases propias que la usan
for (const f of filas) {
  const acopladas = new Set(f.usa);
  for (const g of filas) if (g.usa.includes(f.clase)) acopladas.add(g.clase);
  f.cbo = acopladas.size;
  f.acopladas = [...acopladas].sort();
}
for (const f of filas) {
  const { nodo } = clases.find((c) => c.nodo.name.text === f.clase);
  const metodos = nodo.members.filter((m) => ts.isMethodDeclaration(m) || ts.isGetAccessor(m) || ts.isSetAccessor(m));
  f.lcom = cohesion(nodo, metodos).lcom;
  delete f.usa;
}

fs.writeFileSync(path.join(__dirname, 'metricas-clases.json'), JSON.stringify(filas, null, 2));

const fmt = (x) => (x === null ? '—' : x.toFixed(2));
console.log('Clase'.padEnd(30), 'Tipo'.padEnd(14), 'NOM WMC DIT CBO LCOM');
for (const f of filas)
  console.log(
    f.clase.padEnd(30),
    f.tipo.slice(0, 14).padEnd(14),
    String(f.metodos).padStart(3),
    String(f.wmc).padStart(3),
    String(f.dit).padStart(3),
    String(f.cbo).padStart(3),
    fmt(f.lcom).padStart(5),
  );
const tot = (k) => filas.reduce((s, f) => s + f[k], 0);
console.log(`\nClases: ${filas.length}  NOM: ${tot('metodos')}  WMC: ${tot('wmc')}  DIT máx: ${Math.max(...filas.map((f) => f.dit))}  CBO total: ${tot('cbo')}`);
