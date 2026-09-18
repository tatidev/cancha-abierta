# 🎾 Sistema de Gestión de Torneo de Pádel (Americano Individual)

Sistema web moderno, ágil y sencillo diseñado específicamente para clubes de pádel amateur. Permite organizar torneos en formato **Americano Individual** donde cada jugador suma puntos por diferencia de games y **no repite compañero nunca**.

---

## 🚀 Características Principales

1. **Gestión Dinámica de Canchas**:
   - Comienza con **5 canchas por defecto**, pero se puede sumar o restar canchas en cualquier momento con un clic (+ / -) según la disponibilidad del club.
2. **Algoritmo Inteligente de Cruces (Matchmaking)**:
   - **Regla estricta:** Un jugador **nunca repite pareja** en todo el torneo.
   - **Regla de balance:** Prioriza a los jugadores que tienen **menos partidos jugados** (ideal para personas que llegan tarde o se anotan con el torneo iniciado).
   - **Regla suave de rivales:** Intenta diversificar rivales para que no jueguen siempre contra los mismos.
3. **Carga Rápida de Resultados**:
   - Botones táctiles de 1 toque (`4-0`, `4-1`, `4-2`, `4-3`).
   - Cálculo automático de puntos por diferencia de games (ej. 4 a 2 otorga **+2 pts** a los ganadores y **-2 pts** a los perdedores).
4. **Doble Vista (Organizador y Jugadores en Vivo)**:
   - **Mesa de Control (Organizador):** Protegida con PIN simple (por defecto: `1234`). Permite anotar jugadores, armar cruces y cargar scores.
   - **Vista Pública (Jugadores):** Pantalla en vivo que se actualiza automáticamente cada 5 segundos. Incluye **código QR en pantalla** para que los jugadores lo escaneen desde su celular.
5. **Ficha Individual del Jugador**:
   - Al tocar cualquier jugador, se despliega su historial: con qué compañeros ya jugó, qué rivales enfrentó y el detalle de cada partido.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend:** Next.js 16 (App Router) + React 19 + TypeScript.
- **Estilos:** Tailwind CSS v4 (optimizado para celulares y tablets).
- **Base de Datos:** **Turso** (libSQL / SQLite distribuido en el edge).
  - *Fallback local:* Si no configuras credenciales de Turso, funciona de forma nativa e inmediata con un archivo local SQLite (`padel.db`).
- **Despliegue Gratuito:** Vercel o Netlify.

---

## 💻 Puesta en Marcha Local

1. Instalar dependencias (ya instaladas en este proyecto):
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abrir en el navegador:
   `http://localhost:3000`

> 💡 **Nota:** La aplicación ya funciona de forma inmediata en local sin necesidad de configurar ninguna variable de entorno gracias a su base de datos SQLite integrada.

---

## ☁️ Conexión con Turso (Base de Datos en la Nube Gratis)

Para que el torneo esté sincronizado en internet y los jugadores puedan verlo desde sus celulares:

1. Ingresa a [https://turso.tech](https://turso.tech) y crea una cuenta gratuita.
2. Crea una base de datos (desde la web o por terminal con `turso db create padel`).
3. Copia las credenciales a un archivo `.env.local`:
   ```env
   TURSO_DATABASE_URL=libsql://tu-base.turso.io
   TURSO_AUTH_TOKEN=tu-token-secreto
   ```
4. Al reiniciar la app, se conectará a Turso y creará las tablas automáticamente.

---

## 🌐 Despliegue Gratuito en Vercel

1. Sube este proyecto a un repositorio en **GitHub**.
2. Ve a [Vercel](https://vercel.com) y selecciona **"Add New Project"** -> Importar tu repositorio.
3. En la sección **Environment Variables**, agrega:
   - `TURSO_DATABASE_URL`: Tu URL de Turso (`libsql://...`)
   - `TURSO_AUTH_TOKEN`: Tu token de Turso
4. Haz clic en **Deploy**. ¡Listo! Tendrás un link público (ej: `https://torneo-padel.vercel.app`) listo para usar en la mesa de control y compartir por QR.

---

## 🔑 Credenciales por Defecto

- **PIN de Mesa de Control:** `1234` (configurable desde el botón de Ajustes dentro del panel).
