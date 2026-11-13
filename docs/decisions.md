# Registro de Decisiones de Arquitectura — Civora

Este documento recopila las decisiones de arquitectura y diseño tomadas para la plataforma **Civora** (anteriormente referida como AlertaVecinal), en cumplimiento con la sección 0 y 11 de la especificación técnica.

---

## 1. Nombre del producto y alcance inicial
- **Decisión:** El producto se denomina **Civora**.
- **Repositorio:** `https://github.com/PonchoSaldana/Civora-Neighborhood-Alert.git`
- **Alcance:** Piloto comunitario para reporte rápido de desperfectos urbanos (baches, fugas de agua, luminarias, basura, daños a infraestructura) con flujo completo de principio a fin, roles (`REPORTER`, `MANAGER`, `ADMIN`) y detección explicable de duplicados.

---

## 2. PWA y diseño de interfaz (Liquid Glass sobrio)
- **Decisión:** PWA construida con React + Vite + TypeScript y Workbox (`vite-plugin-pwa`).
- **Diseño visual:** Estética **Liquid Glass sobrio** conforme a la sección 10 del documento maestro:
  - Vidrio translúcido (`backdrop-filter: blur(24px)`) restringido a capas de navegación (barra superior, barra inferior flotante en forma de píldora, hojas modales `BottomSheet` y tarjetas de duplicado).
  - Contenido denso sobre superficies opacas (`--surface`) para garantizar contraste AA en texto y legibilidad en dispositivos de gama media/baja.
  - Paleta con base neutra y un solo acento desaturado (`--accent: #3F5F8F` en claro, `#86A6D4` en oscuro).
  - Tema claro y oscuro de primera clase con script inline en `<head>` para evitar parpadeo (*flash of unstyled theme*).
  - Estados comunicados con indicador visual (punto de 8px) + texto visible, nunca solo por color.

---

## 3. Modelo de datos (DynamoDB Tabla Única)
- **Decisión:** Tabla única `CivoraIncidents` con facturación On-Demand (`PAY_PER_REQUEST`).
- **Estructura de partición:**
  - `PK=INCIDENT#{id}`, `SK=META`: metadatos del incidente.
  - `PK=INCIDENT#{id}`, `SK=EVENT#{timestamp}#{eventId}`: historial cronológico inmutable.
  - `PK=INCIDENT#{id}`, `SK=CONFIRM#{userSub}`: confirmaciones vecinales. La clave previene duplicar la confirmación del mismo usuario.
- **Índices Globales Secundarios (GSI):**
  - **GSI1:** `STATUS#{status}` / `{createdAt}#{id}`: bandeja del gestor y listas por estado.
  - **GSI2:** `USER#{createdBy}` / `{createdAt}#{id}`: consulta eficiente de mis reportes.
  - **GSI3:** `AREA#{areaId}#CAT#{category}` / `{createdAt}#{id}`: búsqueda de candidatos sin requerir escaneo de tabla.

---

## 4. Orquestación serverless asíncrona (Step Functions)
- **Decisión:** `POST /incidents` responde inmediatamente con **`202 Accepted`**, retornando `incidentId` y `executionArn`.
- **Justificación:** La creación del incidente no bloquea al usuario mientras se valida la imagen en S3 y se calculan candidatos a duplicados. La PWA muestra el estado *"Procesando"* de forma transparente mientras Step Functions Standard ejecuta la verificación.

---

## 5. Detección explicable de duplicados y revisión humana
- **Decisión:** Algoritmo determinista y explicable (no IA de caja negra) con umbral inicial de **65 puntos sobre 100**:
  - Misma categoría: 40 pts.
  - Distancia geográfica (Haversine/geohash <= 150m): hasta 30 pts (o 20 pts por misma área).
  - Ventana temporal (máximo 7 días): hasta 15 pts.
  - Similitud textual (título y descripción): hasta 15 pts.
- **Regla humana:** **Nunca** se fusiona automáticamente. El gestor tiene la decisión final mediante los botones *"Vincular"* o *"No es duplicado"*. Al vincular, ambos reportes, autores y evidencias se conservan intactos en el sistema.

---

## 6. Manejo offline y privacidad
- **Decisión:** Almacenamiento local mediante **IndexedDB** (`idb`).
- **Política de sincronización:** Offline significa "borrador local", nunca "enviado". Al reconectar, la app ofrece reintento explícito o sincronización asistida.
- **Seguridad:** Los tokens, URLs presignadas y datos autenticados nunca se guardan en caché pública de Service Worker ni en logs estructurados de CloudWatch.

