# AlertaVecinal — Guía de construcción para agente de IA

> PWA serverless en AWS para reportar y dar seguimiento a incidentes comunitarios, con detección **explicable** de duplicados y decisión humana.
> Documento consolidado a partir de dos planes previos (13 nov 2026). Donde ambos difieren, este archivo manda.
> **Este documento es un plan. No implica que exista infraestructura desplegada.**

---

## 0. Cómo usar este archivo (instrucciones para el agente)

1. **Inspecciona el repositorio** antes de escribir nada. Conserva el trabajo válido y construye de forma incremental.
2. Trabaja por fases (sección 12). Ejecuta `lint`, `typecheck` y `test` al terminar cada fase y corrige antes de avanzar.
3. **No despliegues, no crees recursos facturables, no aceptes permisos IAM amplios y no borres recursos** sin autorización explícita del propietario. Si faltan credenciales AWS, deja la IaC lista y documenta los comandos exactos.
4. Pregunta solo si un bloqueo real impide avanzar. Para todo lo demás elige defaults simples y **documéntalos** en `docs/decisions.md`.
5. Usa **datos sintéticos**. No inventes credenciales, dominios, IDs ni recursos existentes. Mantén `.env.example` sin secretos.
6. **No declares éxito sin evidencia.** Distingue siempre: *probado localmente*, *desplegado* y *no verificado*. Nunca afirmes un despliegue exitoso sin comprobar CloudFormation y los recursos.
7. No simules servicios AWS en la entrega final sin etiquetarlo claramente como simulación.

---

## 1. Producto

**AlertaVecinal** permite reportar baches, fugas de agua, luminarias apagadas, basura acumulada o daños de infraestructura. Cada reporte lleva categoría, descripción, ubicación aproximada y evidencia opcional. Los usuarios consultan el estado; los gestores revisan, asignan y actualizan.

**Diferenciador:** si varias personas reportan el mismo problema en zona y periodo cercanos, el sistema sugiere candidatos a duplicado **con las razones de coincidencia**. Nunca fusiona automáticamente ni elimina reportes originales.

**Alcance inicial:** una universidad, colonia o comunidad piloto. El MVP debe demostrar un flujo real de principio a fin, no resolver todos los problemas municipales.

### Roles

| Rol | Puede |
|---|---|
| `REPORTER` | Crear reportes, adjuntar evidencia, consultar sus reportes, confirmar incidentes. |
| `MANAGER` | Todo lo anterior + revisar, priorizar, asignar, vincular duplicados, cambiar estados. |
| `ADMIN` | Todo lo anterior + gestionar usuarios, roles y categorías. |

---

## 2. Alcance del MVP

| Incluido (imprescindible) | Fuera del MVP |
|---|---|
| Autenticación y roles; crear/listar/detallar reportes; foto opcional; zona manual y GPS opt-in; estados; historial; panel gestor; confirmaciones; candidatos duplicados; PWA instalable; borrador offline | Chat en vivo; app nativa; IA generativa/visión; push notifications; mapas avanzados; integración gubernamental; multi-organización; analítica predictiva; comentarios públicos abiertos; pagos |

### Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| US-01 | Reportante crea un incidente con categoría y descripción. | P0 |
| US-02 | Reportante adjunta foto y elige zona sin revelar su domicilio exacto. | P0 |
| US-03 | Reportante consulta estado e historial de su reporte. | P0 |
| US-04 | Reportante confirma un incidente cercano en vez de crear otro idéntico. | P1 |
| US-05 | Gestor revisa, asigna y actualiza incidentes. | P0 |
| US-06 | Gestor ve por qué dos reportes parecen duplicados y decide si los vincula. | P1 |
| US-07 | Usuario móvil instala la PWA y guarda un borrador sin conexión. | P1 |

### Estados

`RECIBIDO → EN_REVISION → ASIGNADO → EN_PROCESO → RESUELTO`
Estado alternativo: `NO_PROCEDENTE`, **siempre con motivo visible**. Cada cambio registra actor, fecha y transición en el historial. Las transiciones inválidas se rechazan con `409`.

### Regla de corte (si falta tiempo)

Orden estricto: **crear → guardar → consultar → gestionar → evidencia → Step Functions visible → duplicados → offline.** Terminar primero US-01, US-02, US-03 y US-05. No sacrificar seguridad ni autorización de roles por funciones decorativas.

---

## 3. Stack obligatorio

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript, `vite-plugin-pwa` / Workbox |
| Hosting | S3 privado + CloudFront (HTTPS) |
| Auth | Amazon Cognito (User Pool, Authorization Code + PKCE) |
| API | API Gateway **HTTP API** con JWT authorizer |
| Backend | AWS Lambda, Node.js + TypeScript, una función pequeña por caso de uso |
| Datos | DynamoDB (tabla única, on-demand) |
| Evidencias | S3 privado (bucket distinto al de hosting) |
| Orquestación | Step Functions **Standard** |
| Observabilidad | CloudWatch (logs estructurados, métricas, alarmas básicas) |
| IaC | **AWS SAM** (o CDK si ya existe en el repo) |

**Prohibido:** EC2, servidores persistentes, backend Express, NAT Gateway, WAF, provisioned concurrency, DynamoDB provisioned con autoscaling, SMS y servicios de IA en el MVP.

---

## 4. Arquitectura y flujo end-to-end

1. La PWA inicia sesión con Cognito.
2. Solicita carga: `POST /uploads/presign` → Lambda devuelve un **presigned POST** de corta duración.
3. El navegador sube la imagen **directamente** al bucket S3 privado.
4. La PWA envía `POST /incidents` con la `objectKey` y un header `Idempotency-Key`.
5. Lambda inicia Step Functions y responde **`202 Accepted`** con `incidentId` y `executionId`.
6. Step Functions: valida el objeto (`HeadObject`: existencia, tamaño, metadatos) → persiste en DynamoDB → calcula candidatos duplicados → registra resultado.
7. La PWA consulta `GET /incidents/{id}` y muestra **“Procesando”** hasta que el workflow termine.

> La API de creación **no espera** la orquestación completa. Esto hace visible el uso real de Step Functions.

---

## 5. Autenticación, autorización y carga segura

### Auth
- Grupos Cognito: `REPORTER`, `MANAGER`, `ADMIN`.
- API Gateway valida issuer y audience del JWT; **cada Lambda** valida grupo y propietario antes de operaciones sensibles.
- **Nunca** confiar en un rol enviado en el JSON. Tomar `sub` y grupos de claims verificados.
- Un usuario ve por defecto solo sus reportes; el gestor ve los de la comunidad piloto.

### Carga de fotografías

| Paso | Implementación |
|---|---|
| Solicitud | `POST /uploads/presign` con `filename`, `contentType`, `sizeBytes`; JWT obligatorio. |
| Validación | Solo JPEG / PNG / WebP; máximo **5 MB**; nombre aleatorio; prefijo por Cognito `sub`. **Sin SVG ni ejecutables.** |
| URL | Presigned POST con `content-length-range`, `content-type` y expiración ≈ 5 min. |
| Carga | Directa a S3. Block Public Access, cifrado, CORS limitado al dominio de la PWA. |
| Confirmación | `POST /incidents` referencia `objectKey`; Step Functions ejecuta `HeadObject`. |
| Lectura | Lambda verifica permisos y genera URL GET firmada breve. No guardar URLs permanentes. |

MIME y extensión del cliente no son prueba suficiente; validar contenido real si el riesgo lo exige. Escaneo antimalware = evolución futura.

### Privacidad
- Guardar coordenadas aproximadas o `areaId`; reducir precisión pública si puede revelar domicilios.
- No mostrar correo, teléfono ni identidad del reportante en vistas públicas.
- Moderación, reporte de abuso y política de retención/eliminación definidas antes de un piloto real.
- **No registrar** tokens, URLs firmadas ni PII en logs, analytics o errores.
- IAM de mínimo privilegio por Lambda y por la state machine. CORS exacto (nunca `*` con credenciales).

---

## 6. Modelo de datos (DynamoDB, tabla única `AlertaVecinal`)

| Entidad | Clave | Atributos esenciales |
|---|---|---|
| Incidente | `PK=INCIDENT#{id}` `SK=META` | title, description, category, status, createdBy, createdAt, updatedAt, areaId, geohash, photoKeys[], assignedTo, duplicateOf, confirmationCount, idempotencyKey |
| Evento | `PK=INCIDENT#{id}` `SK=EVENT#{timestamp}#{eventId}` | actorId, eventType, fromStatus, toStatus, publicNote, createdAt |
| Confirmación | `PK=INCIDENT#{id}` `SK=CONFIRM#{userSub}` | createdAt (la clave impide confirmar dos veces) |
| Perfil | `PK=USER#{sub}` `SK=PROFILE` | displayName, metadatos mínimos (el rol efectivo se valida con Cognito) |

| Índice | Claves | Uso |
|---|---|---|
| GSI1 | `STATUS#{status}` / `{createdAt}#{id}` | Bandeja del gestor por estado y fecha |
| GSI2 | `USER#{createdBy}` / `{createdAt}#{id}` | Mis reportes |
| GSI3 | `AREA#{areaId}#CAT#{category}` / `{createdAt}#{id}` | Candidatos por zona/categoría sin GPS |

Reglas: **sin `Scan`** en rutas de usuario; no guardar imágenes en DynamoDB (solo `objectKey`); usar `TransactWriteItems` o condiciones para evitar confirmaciones duplicadas y transiciones inválidas.

---

## 7. Detección explicable de duplicados

- **Candidatos:** misma categoría + ventana de 7 días + 100–150 m (geohash actual y celdas vecinas). Sin GPS: comparar `areaId` y categoría.
- **Puntaje (0–100):** categoría 40 · distancia 30 · tiempo 15 · similitud de título/descripción 15. **Umbral inicial: 65.** Ajustar tras pruebas.
- **Mostrar al gestor** score y razones: “misma categoría”, “a 42 m”, “hace 2 días”, “título similar”.
- **Nunca fusionar automáticamente.** Al vincular: conservar ambos reportes, autores y evidencias; marcar `duplicateOf` en el secundario; sumar confirmaciones de forma trazable.
- Es una regla de producto, no IA. No afirmar que usa IA ni que detecta todos los duplicados.

---

## 8. API

| Método y ruta | Permiso | Función |
|---|---|---|
| `POST /uploads/presign` | REPORTER+ | Genera política de carga segura |
| `POST /incidents` | REPORTER+ | Inicia workflow; `202` + `incidentId` + `executionId` |
| `GET /incidents` | Autenticado | Lista paginada; filtros estado/categoría/zona |
| `GET /incidents/{id}` | Propietario o gestor | Detalle e historial |
| `GET /me/incidents` | Autenticado | Reportes propios |
| `POST /incidents/{id}/confirm` | REPORTER+ | Confirma una vez por usuario |
| `PATCH /incidents/{id}/status` | MANAGER+ | Actualiza estado y agrega evento |
| `POST /incidents/{id}/link-duplicate` | MANAGER+ | Vincula candidato a incidente principal |
| `GET /incidents/{id}/evidence/{key}` | Autorizado | URL GET firmada de evidencia |

**Códigos:** `200/201` ok · `202` workflow iniciado · `400` validación · `401` sin sesión · `403` rol/propietario insuficiente · `404` inexistente · `409` conflicto/idempotencia · `413` archivo grande · `429` límite excedido · `500` error con `requestId`.
Formato de error consistente: `{ "error": { "code", "message", "requestId" } }`. Incluir paginación (`limit`, `nextToken`) y validación con esquemas compartidos (`packages/shared`).

---

## 9. Requisitos PWA y offline

- **Manifest:** `name`, `short_name`, `start_url`, `scope`, `display=standalone`, `theme_color`, `background_color`, iconos 192×192 y 512×512 (incluir *maskable*).
- **Service worker:** precachea solo el *shell* (HTML, CSS, JS, iconos). HTTPS obligatorio.
- **IndexedDB:** borradores (categoría, texto, `areaId`, foto pendiente) y cola de reintentos.
- **Insignias de estado:** `Borrador local` · `Pendiente de enviar` · `Enviado` · `Error`.
- Al reconectar: ofrecer **reintento explícito** (Background Sync es mejora opcional).
- **Nunca** marcar un reporte como recibido antes de la confirmación del servidor. Offline = borrador, no envío.
- **No cachear** respuestas autenticadas, endpoints privados, URLs firmadas ni imágenes privadas. Borrar borradores al cerrar sesión u ofrecer opción clara de eliminarlos.

---

## 10. Interfaz de usuario — Liquid Glass sobrio

### 10.1 Principios

1. **Simple y profesional.** Pocas pantallas, formularios cortos, una acción principal por pantalla.
2. **Liquid glass con contención.** El vidrio (translúcido, desenfocado, con borde de luz) se usa en la **capa de navegación y superficies flotantes**: barra superior, barra inferior, hojas modales, tarjetas destacadas y paneles laterales. El contenido denso (listas largas, formularios, tablas) va sobre superficies más opacas para mantener legibilidad.
3. **Poco color.** Base neutra + **un solo acento** desaturado. El color comunica estado, no decora. Sin degradados llamativos ni neones.
4. **Claro y oscuro** de primera clase: seguir el sistema por defecto, con selector manual (Sistema / Claro / Oscuro).
5. **Estado nunca solo por color:** siempre punto + texto (y, si ayuda, icono).
6. **Movimiento mínimo:** transiciones breves (150–250 ms) que respondan a una acción del usuario (abrir hoja, confirmar). Respetar `prefers-reduced-motion`.

### 10.2 Tokens de diseño

Implementar como variables CSS en `:root` y redefinir en oscuro. Evitar valores sueltos en componentes.

```css
:root {
  color-scheme: light dark;

  /* Tipografía */
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --text-xs: 12px; --text-sm: 14px; --text-md: 16px; --text-lg: 20px; --text-xl: 28px;
  --weight-regular: 400; --weight-medium: 500; --weight-semibold: 600;

  /* Espaciado (base 4) y radios */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px;
  --radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px; --radius-pill: 999px;

  /* Vidrio */
  --glass-blur: 24px;
  --glass-saturate: 140%;
  --motion-fast: 150ms; --motion-base: 220ms;
  --ease: cubic-bezier(.2, .8, .2, 1);
}

/* ---------- CLARO ---------- */
:root, :root[data-theme="light"] {
  --bg:            #EDEFF3;
  --bg-glow-1:     rgba(120, 140, 175, .22);   /* manchas de fondo muy suaves */
  --bg-glow-2:     rgba(160, 170, 190, .18);

  --surface:       rgba(255, 255, 255, .86);   /* contenido denso: casi opaco */
  --glass:         rgba(255, 255, 255, .58);   /* barras, hojas, tarjetas flotantes */
  --glass-strong:  rgba(255, 255, 255, .74);
  --glass-border:  rgba(255, 255, 255, .70);   /* borde de luz */
  --hairline:      rgba(15, 23, 42, .08);
  --glass-shadow:  0 8px 30px rgba(15, 23, 42, .10);
  --glass-inset:   inset 0 1px 0 rgba(255, 255, 255, .80);

  --text:          #0F172A;
  --text-muted:    #556070;
  --accent:        #3F5F8F;                    /* azul acero desaturado */
  --accent-hover:  #34507A;
  --on-accent:     #FFFFFF;
  --focus-ring:    #3F5F8F;

  --st-recibido:   #6B7482;
  --st-revision:   #4F7399;
  --st-asignado:   #7A6FA3;
  --st-proceso:    #A87F2E;
  --st-resuelto:   #3F8062;
  --st-no-proced:  #A35858;
  --danger:        #A35858;
}

/* ---------- OSCURO ---------- */
:root[data-theme="dark"] {
  --bg:            #0D1015;
  --bg-glow-1:     rgba(90, 115, 160, .20);
  --bg-glow-2:     rgba(70, 80, 100, .22);

  --surface:       rgba(28, 32, 40, .88);
  --glass:         rgba(34, 39, 49, .52);
  --glass-strong:  rgba(40, 46, 58, .68);
  --glass-border:  rgba(255, 255, 255, .10);
  --hairline:      rgba(255, 255, 255, .08);
  --glass-shadow:  0 10px 36px rgba(0, 0, 0, .45);
  --glass-inset:   inset 0 1px 0 rgba(255, 255, 255, .08);

  --text:          #E8EBF0;
  --text-muted:    #9AA4B2;
  --accent:        #86A6D4;
  --accent-hover:  #9DB8DE;
  --on-accent:     #0D1015;
  --focus-ring:    #9DB8DE;

  --st-recibido:   #9AA4B2;
  --st-revision:   #7FA3CC;
  --st-asignado:   #A599CC;
  --st-proceso:    #CDA45A;
  --st-resuelto:   #6FB08F;
  --st-no-proced:  #C98080;
  --danger:        #C98080;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="dark"]) { /* duplicar tokens oscuros */ }
}
```

> Si el agente prefiere generar la paleta oscura una sola vez, definirla en un bloque compartido y reutilizarla para `data-theme="dark"` y `prefers-color-scheme`.

### 10.3 Receta del vidrio

```css
.glass {
  background: var(--glass);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
          backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--glass-inset);
  border-radius: var(--radius-lg);
}

/* Fondo de la app: neutro con dos manchas difusas, sin colores saturados */
body {
  background:
    radial-gradient(60% 40% at 15% 0%,  var(--bg-glow-1), transparent 70%),
    radial-gradient(50% 40% at 90% 100%, var(--bg-glow-2), transparent 70%),
    var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
}

/* Fallbacks obligatorios */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { background: var(--surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

**Reglas de uso del vidrio**
- Máximo **2 capas de vidrio apiladas** por pantalla (p. ej. barra inferior + hoja modal). No poner vidrio sobre vidrio sobre vidrio.
- Texto sobre vidrio: contraste mínimo **4.5:1** (3:1 para texto grande). Si el fondo detrás varía, usar `--glass-strong` o `--surface`.
- El desenfoque es costoso en móviles de gama baja: limitar a elementos fijos/pequeños, no a listas que se desplazan; no animar `backdrop-filter`.
- Una sola sombra suave y un borde de luz de 1 px. Nada de brillos, reflejos animados ni degradados arcoíris.

### 10.4 Modo claro/oscuro

- Valor guardado: `"system" | "light" | "dark"` (por defecto `"system"`). Es una preferencia de interfaz, no un dato privado.
- Aplicar `data-theme` con un script **inline en `<head>`** antes del primer render para evitar parpadeo.
- Actualizar `<meta name="theme-color">` (y `theme_color` del manifest como valor base) según el tema activo.
- Selector en **Ajustes** con tres opciones (control segmentado de vidrio). Un botón rápido sol/luna en la barra superior es opcional.
- Probar contraste y legibilidad en **ambos** temas antes de cerrar cada pantalla.

### 10.5 Tipografía y forma

- Una sola familia sans (Inter autohospedada o pila del sistema; **no** cargar fuentes desde CDN externo, para respetar CSP y offline).
- Escala: 12 / 14 / 16 / 20 / 28 px. Cuerpo 16 px, interlineado 1.5. Líneas de menos de 75 caracteres.
- Títulos con peso 600; sin MAYÚSCULAS sostenidas en etiquetas, sin subrayados decorativos ni palabras resaltadas dentro de un título.
- Radios jerárquicos: chips `pill`, controles `10 px`, tarjetas `16 px`, hojas y paneles `24 px`. No aplicar un mismo radio a todo.
- Iconos de línea (Lucide o similar), trazo de 1.5 px, tamaño 20 px, color `--text-muted` salvo acción activa.

### 10.6 Componentes

| Componente | Especificación |
|---|---|
| **Barra superior** | Vidrio, fija, título de pantalla a la izquierda, acción contextual a la derecha. Respetar `env(safe-area-inset-top)`. |
| **Barra inferior (móvil)** | Vidrio flotante con margen de 12 px y radio pill. 3 destinos: *Inicio*, *Nuevo reporte* (centro, acento), *Mis reportes*. Gestor: *Bandeja*, *Duplicados*, *Ajustes*. |
| **Botón primario** | Fondo `--accent`, texto `--on-accent`, alto 48 px, radio 12 px. Un solo primario por pantalla. |
| **Botón secundario** | Vidrio + borde `--hairline`, texto `--text`. |
| **Campo de formulario** | Fondo `--surface`, borde `--hairline`, radio 10 px, etiqueta siempre visible encima, error en texto bajo el campo (con icono, no solo color). |
| **Tarjeta de reporte** | `--surface`, radio 16 px: título, categoría (icono), zona, fecha relativa, **chip de estado**, contador de confirmaciones. Sin imágenes grandes en la lista; miniatura 56 px opcional. |
| **Chip de estado** | Punto 8 px con color `--st-*` + etiqueta en texto; fondo `--glass`. Colores definidos en 10.2. |
| **Hoja modal (bottom sheet)** | Vidrio fuerte, radio 24 px arriba, asa de arrastre, cierre con gesto y botón. |
| **Línea de tiempo (historial)** | Línea vertical `--hairline`, puntos con color de estado, actor/fecha en `--text-muted`. Es una secuencia real, por lo que puede llevar orden. |
| **Tarjeta de duplicado** | Muestra score (p. ej. `78/100`), lista de razones en texto (“misma categoría”, “a 42 m”, “hace 2 días”) y dos acciones: *Vincular* / *No es duplicado*. |
| **Insignia de sincronización** | `Borrador local` · `Pendiente de enviar` · `Enviado` · `Error`, con icono + texto. Banner de vidrio superior cuando no hay conexión. |
| **Toasts** | Vidrio, 4 s, mismo verbo que el botón que los originó (“Guardar” → “Guardado”). |
| **Estados vacíos y de carga** | Esqueletos (no spinners a pantalla completa); vacío con una frase y un botón de acción. |

### 10.7 Pantallas

**Reportante**

```
┌─────────────────────────┐   Inicio
│ ▓ Barra superior (vidrio)│   · Lista de reportes cercanos con chip de estado
├─────────────────────────┤   · Botón "Confirmar" en incidentes de su zona
│  [tarjeta de reporte]   │
│  [tarjeta de reporte]   │
│  [tarjeta de reporte]   │
│   ╭───────────────────╮ │
│   │ Inicio ⊕ Mis rep. │ │   ← barra inferior flotante (vidrio)
└───┴───────────────────┴─┘
```

- **Nuevo reporte** (un solo formulario corto, en este orden): categoría → descripción → foto (opcional) → zona (selector; botón “Usar mi ubicación” solo con permiso, nunca obligatorio) → **Enviar**. Tras enviar: folio + estado “Procesando”.
- **Mis reportes:** lista con filtros por estado.
- **Detalle:** estado actual, fecha de actualización, notas públicas, confirmaciones, línea de tiempo y evidencia (URL firmada breve).
- **Ajustes:** tema (Sistema/Claro/Oscuro), estado de conexión, borradores locales (eliminar), cerrar sesión.

**Gestor**

```
┌──────────────┬──────────────────────────────┐
│ Bandeja      │ Detalle del incidente        │   Escritorio: dos columnas
│  · Recibido  │  evidencia · historial       │   Móvil: lista → detalle (pantalla completa)
│  · En revisión│ ┌─ Duplicados sugeridos ───┐│
│  · Asignado  │ │ 78/100 · a 42 m · hace 2d ││
│  · En proceso│ │ [Vincular] [No es dup.]   ││
│  · Resuelto  │ └──────────────────────────┘│
│              │ [Asignar]  [Cambiar estado]  │
└──────────────┴──────────────────────────────┘
```

- Bandeja por estado con filtros (categoría, zona). Cambiar estado en hoja modal con nota pública; `NO_PROCEDENTE` exige motivo.

### 10.8 Responsive y accesibilidad

- **Mobile-first.** Breakpoints: 640 px (tablet), 1024 px (escritorio, panel de dos columnas para gestor).
- Objetivos táctiles ≥ 44×44 px. Respetar `env(safe-area-inset-*)`.
- Foco visible en todo elemento interactivo (anillo de 2 px con `--focus-ring`, separado 2 px).
- HTML semántico, etiquetas `aria` en iconos sin texto, anuncios `aria-live` para toasts y cambios de estado.
- Navegable con teclado; orden de tabulación lógico; hojas modales con trampa de foco y cierre con `Esc`.
- Textos en español, voz activa, frases cortas, verbos claros: “Enviar reporte”, “Guardar borrador”, “Vincular duplicado”. Los errores explican qué pasó y cómo resolverlo, sin disculpas.

### 10.9 Criterios de aceptación de la interfaz

- [ ] Tema Sistema/Claro/Oscuro funciona y persiste, sin parpadeo al cargar.
- [ ] Todos los textos cumplen contraste AA en ambos temas, incluidos los que están sobre vidrio.
- [ ] El vidrio tiene fallback sólido (`@supports` y `prefers-reduced-transparency`).
- [ ] Ninguna pantalla usa más de un color de acento además de los colores de estado.
- [ ] El estado de un reporte se entiende sin depender del color.
- [ ] Se puede crear un reporte completo con una mano en un móvil de 360 px de ancho.
- [ ] Lighthouse: PWA instalable, Accesibilidad ≥ 90.

---

## 11. Estructura del repositorio

```
alertavecinal/
├── apps/pwa/                  # React + Vite + TypeScript (UI, manifest, service worker)
│   └── src/styles/            # tokens.css (sección 10.2), glass.css (10.3)
├── src/functions/             # Handlers Lambda (uploads, incidents, status, duplicates)
├── src/shared/                # Esquemas, auth, helpers, errores, logger
├── statemachine/incident.asl.json
├── template.yaml              # SAM: Cognito, HTTP API, Lambdas, DynamoDB, S3, Step Functions
├── samconfig.toml.example
├── tests/e2e/                 # Playwright
├── docs/                      # architecture.md, decisions.md, diagrama
├── .env.example               # Sin secretos
└── README.md
```

---

## 12. Plan de ejecución por fases

| Fase | Tareas y definición de terminado |
|---|---|
| **0. Preparar** (2–3 h) | Inspeccionar repo, elegir región, configurar SAM, lint/typecheck, wireframes, datos sintéticos. **No crear recursos.** |
| **1. PWA + UI** (3–4 h) | Vite/React, rutas, tokens de diseño, tema claro/oscuro, componentes de vidrio, manifest, service worker, pantallas vacías, formulario local. |
| **2. Infra y auth** (3–4 h) | SAM: Cognito, HTTP API + JWT, Lambdas, tabla DynamoDB, buckets, state machine. `sam validate --lint`. Despliegue **solo con autorización**. |
| **3. Reporte + evidencia** (4–5 h) | Presigned POST, carga directa a S3, `POST /incidents` (202 + idempotencia), workflow, lectura de detalle. |
| **4. Gestión** (3–4 h) | Bandeja, estados, autorización de gestor, historial, notas públicas. |
| **5. Duplicados + offline** (2–3 h) | Heurística explicable, borradores IndexedDB, insignias de sincronización. |
| **6. Cierre** (3–4 h) | Pruebas E2E, corrección de fallos, README final, diagrama, demo. |

### Comandos locales

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
sam validate --lint
sam build
```

### Despliegue (solo con autorización explícita)

```bash
sam deploy --guided --stack-name alertavecinal-dev --region us-east-1
# Revisar parámetros, permisos IAM y cambios antes de aceptar
aws cloudformation describe-stacks --stack-name alertavecinal-dev --region us-east-1
```

`us-east-1` es referencia de cálculo, no obligación. Para limpiar: vaciar buckets (incluidas versiones), luego `sam delete --stack-name alertavecinal-dev --region us-east-1` **solo con autorización**; verificar en CloudFormation, S3, Cognito y Step Functions que no queden recursos huérfanos.

---

## 13. Pruebas y criterios de aceptación

| Prueba | Resultado esperado |
|---|---|
| Reporte válido con foto | `202`; Step Functions termina; metadatos en DynamoDB; objeto privado en S3 |
| Misma `Idempotency-Key` repetida | No crea otro incidente; devuelve referencia al anterior |
| Falta categoría | `400`; no se crea incidente |
| Tipo no permitido o > 5 MB | Rechazo; no se adjunta |
| Reportante consulta reporte ajeno | `403` o `404` sin filtrar existencia |
| Reportante intenta cambiar estado | `403` |
| Gestor cambia estado | `200`; evento en historial |
| Incidente inexistente | `404` |
| Dos reportes próximos y similares | Candidato visible con score y razones; **no** se fusiona solo |
| Dos confirmaciones del mismo usuario | Solo una queda registrada |
| Evidencia sin autorización | Acceso denegado |
| Modo avión al redactar | Borrador local; estado “no enviado” |
| Volver online | Usuario reintenta; servidor confirma; la app actualiza |
| Cambio de tema | Claro/oscuro sin parpadeo y con contraste AA |

**Criterios de la demo**
- PWA instalable y abierta en modo `standalone`.
- Reporte creado, foto privada y detalle visible tras recargar.
- Ejecución de Step Functions abierta en consola con recorrido real.
- Gestor actualiza estado y el reportante lo ve.
- Candidato duplicado explicado; originales conservados.
- Logs rastreables por `requestId`/`incidentId`, sin tokens ni PII.

Tipos de prueba: unitarias (reglas de estado, puntuación de duplicados, validaciones), integración (Lambdas + DynamoDB/S3) y Playwright E2E (flujo principal, roles, carga, duplicados, offline, tema).

---

## 14. Costos orientativos (no es cotización)

Escenario: 100 usuarios, 300 reportes/mes, 1 foto de 1 MB por reporte, ≈ 10 000 llamadas HTTP/mes, ≈ 8 transiciones de workflow por reporte (≈ 2 400/mes).

| Servicio | Nota |
|---|---|
| API Gateway HTTP API | ≈ USD 1 / millón de solicitudes (us-east-1) |
| Lambda | USD 0.20 / millón + duración; nivel gratuito publicado |
| Step Functions Standard | USD 0.025 / 1 000 transiciones; 4 000 gratis/mes |
| DynamoDB on-demand | Bajo para cientos de reportes; depende de índices y lecturas |
| S3 | ≈ 300 MB de fotos; bajo, pero versiones y retención pueden crecer |
| Cognito / CloudFront | Franquicias gratuitas publicadas; confirmar elegibilidad |

Presupuesto de trabajo: **≈ USD 0–5/mes** con cuotas gratuitas aplicables (orden de magnitud, no garantía). **Antes de desplegar:** configurar alerta de facturación, revisar AWS Pricing Calculator, limitar tamaño de fotos, retención y logs.

---

## 15. Guion de demo (< 3 min)

| Tiempo | Mostrar |
|---|---|
| 0:00–0:20 | Problema: reportes dispersos, duplicados y sin seguimiento |
| 0:20–0:50 | Abrir PWA en móvil, iniciar sesión, crear reporte con foto y zona |
| 0:50–1:15 | Respuesta 202, ejecución Step Functions, registro en DynamoDB, objeto privado en S3 |
| 1:15–1:45 | Segundo reporte similar: score y razones de duplicado |
| 1:45–2:15 | Gestor asigna y cambia estado; el reportante ve el seguimiento |
| 2:15–2:40 | Instalación PWA, borrador offline (“offline no significa enviado”) y alternar claro/oscuro |
| 2:40–2:55 | Diagrama serverless, impacto del piloto, enlace al repositorio |

Usar cuentas y datos sintéticos. No mostrar credenciales, claves, correos reales ni imágenes de terceros.

---

## 16. Entregables y checklist final

- [ ] Código ejecutable y template SAM
- [ ] PWA instalable, responsive, con tema claro/oscuro y estética Liquid Glass sobria
- [ ] API Gateway, Lambda, DynamoDB, S3 y Step Functions conectados realmente (o claramente etiquetados si no)
- [ ] Bucket privado, permisos mínimos, autenticación y roles probados
- [ ] Panel gestor y duplicados explicables con revisión humana
- [ ] Pruebas unitarias, integración y E2E con evidencia
- [ ] README de proyecto con prerequisitos, configuración, despliegue, limpieza y costos; diagrama; limitaciones conocidas
- [ ] Datos sintéticos y guion de demo < 3 min
- [ ] Video público < 3 min enlazado en el campo de demo
- [ ] **No se desplegó ni generó costo sin autorización explícita**

---

## 17. Primera tarea para el agente

1. Inspecciona el repositorio y lista lo que existe.
2. Presenta un plan priorizado breve (máx. 15 líneas).
3. Comienza por las fases 0 y 1 (estructura, tokens de diseño, tema claro/oscuro, componentes de vidrio y pantallas base) **sin pedir aprobación archivo por archivo**.
4. Detente antes de cualquier despliegue con costo o acción irreversible y pide autorización.

> **Recomendación de producto:** lanzar primero un piloto en una comunidad concreta, medir cuántos reportes se resuelven y cuánto tarda su atención, y ampliar solo después de validar el uso real.
