# 📋 TurnosApp — Gestión de Turnos Laborales 3x3

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-✓-5A0FC8)](https://web.dev/progressive-web-apps/)
[![Supabase](https://img.shields.io/badge/Supabase-✓-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-000?logo=vercel)](https://turnos-chile.vercel.app/)

Aplicación web progresiva (PWA) para gestionar turnos laborales con sistema **3x3** (día/noche/descanso), control de vacaciones, días administrativos, y sincronización en la nube.

---

## ✨ Características

### 📅 Calendario de Turnos
- Visualización mensual con sistema 3x3 real (18 días): 3 de día → 3 de descanso → 3 de noche → 3 de descanso → 3 de noche → 3 de descanso
- Ciclos disponibles: **"3x3 Real"** (Día-Desc-Noche-Desc-Noche-Desc, 18 días) y **"4x4"** (Día-Descanso-Noche, 12 días)
- Asignación rápida de turnos: **DÍA**, **NOCHE**, **EXTRA DÍA**, **EXTRA NOCHE**
- Auto-generación del mes siguiente con el mismo patrón
- Días administrativos con contador y bloqueo automático
- Días de vacaciones con estado aprobado/pendiente

### 🏖️ Vacaciones
- Registro de períodos por rango de fechas
- Cálculo automático de días hábiles (excluye fines de semana y feriados chilenos)
- Generador de carta de vacaciones (copiar al portapapeles)
- Historial de ausencias agrupado por período
- Progreso visual con barras de uso

### ⚙️ Panel de Administración
- Configuración detallada de días:
  - **Días Administrativos** — total disponible
  - **Vacaciones por Ley** — default 15 días
  - **Vacaciones del Sindicato** — default 2 días adicionales
- Cálculo automático del total (Ley + Sindicato)
- Seguimiento visual: usados vs restantes

### 🔐 Autenticación
- Registro e inicio de sesión con email/contraseña (Supabase Auth)
- Datos sincronizados en la nube entre dispositivos
- Modo offline con cola de sincronización automática

### 🌓 Temas
- Modo oscuro y claro con persistencia
- Transiciones suaves entre temas

### 📱 PWA
- Instalable como aplicación en Android, iOS, Windows y Mac
- Service Worker con Workbox para carga instantánea
- Persistencia local con cola de sincronización offline
- Auto-actualización al desplegar nueva versión

---

## 🚀 Demo

**URL:** [https://turnos-chile.vercel.app](https://turnos-chile.vercel.app)

> Crea una cuenta gratis para empezar. Los datos se sincronizan automáticamente en la nube.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19 + TypeScript |
| **Bundler** | Vite 6 |
| **Estilos** | Tailwind CSS v4 |
| **Autenticación** | Supabase Auth |
| **Base de datos** | Supabase (PostgreSQL) |
| **PWA** | vite-plugin-pwa + Workbox |
| **Iconos** | Lucide React |
| **Deploy** | Vercel |

---

## 📦 Instalación

### Requisitos
- Node.js 18+
- npm o pnpm

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tuusuario/turnos.git
cd turnos

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev
```

La app estará disponible en **http://localhost:5173**

### Build de producción

```bash
npm run build
npm run preview
```

---

## 🗺️ Estructura del Proyecto

```
turnos/
├── index.html              # HTML principal con meta tags PWA
├── vite.config.ts          # Configuración Vite + PWA + Tailwind
├── package.json            # Dependencias
├── tsconfig.json           # TypeScript config
├── vercel.json             # Configuración de deploy Vercel
├── public/
│   ├── favicon.svg         # Favicon SVG
│   ├── pwa-192x192.png     # Icono PWA 192px
│   ├── pwa-512x512.png     # Icono PWA 512px
│   └── manifest.json       # Web App Manifest (generado por el plugin)
└── src/
    ├── main.tsx            # Entry point
    ├── App.tsx             # Componente principal
    ├── index.css           # Estilos globales + Tailwind
    ├── vite-env.d.ts       # Tipos de Vite
    ├── types/
    │   └── index.ts        # Tipos TypeScript
    ├── lib/
    │   ├── supabase.ts     # Cliente Supabase
    │   ├── feriados.ts     # Cálculo de feriados chilenos
    │   └── turnos.ts       # Lógica de turnos, persistencia, stats
    ├── hooks/
    │   ├── useAuth.ts      # Autenticación
    │   ├── useCalendar.ts  # Estado del calendario
    │   ├── useTheme.ts     # Tema oscuro/claro
    │   ├── useInstallPWA.ts # Instalación PWA
    │   └── useOfflineSync.ts # Sincronización offline
    └── components/
        ├── LoginPage.tsx       # Pantalla de inicio de sesión
        ├── Layout.tsx          # Layout principal con header
        ├── Dashboard.tsx       # Dashboard con stats de usuario
        ├── CalendarGrid.tsx    # Grid del calendario mensual
        ├── TurnoModal.tsx      # Modal para asignar/quitar turnos
        ├── ProfileModal.tsx    # Modal de edición de perfil
        ├── Planificador.tsx    # Generador de ciclo 3x3
        ├── VacacionesForm.tsx  # Formulario de registro de vacaciones
        ├── AusenciasList.tsx   # Historial de ausencias
        └── AdminConfigPanel.tsx # Panel de configuración de días
```

---

## 🎯 Uso

### 1. Crear cuenta
Ingresa tu email y contraseña en la pantalla de inicio de sesión. Los datos se guardan automáticamente en la nube.

### 2. Configurar perfil
Haz clic en tu avatar > **Editar Perfil** para configurar:
- Nombre, cargo y empresa
- Días administrativos disponibles
- Vacaciones por Ley y del Sindicato

O ve al tab **Admin** para una configuración más detallada con controles +/−.

### 3. Generar ciclo 3x3
En el tab **Planificar**:
1. Selecciona el tipo de ciclo (ej: D-N-D, D-D-N, etc.)
2. Elige la fecha de inicio del ciclo
3. Haz clic en **Aplicar Ciclo**

### 4. Gestionar turnos
En el calendario:
- Haz clic en cualquier día para abrir el modal de turnos
- Asigna **DÍA**, **NOCHE**, **EXTRA DÍA**, **EXTRA NOCHE**
- Marca **DÍA ADMIN** para días administrativos

### 5. Registrar vacaciones
En el tab **Ausencias**:
1. Selecciona el rango de fechas (Desde / Hasta)
2. Marca "Ya están aprobadas" si corresponde
3. Haz clic en **Guardar Periodo**
4. Usa el botón **📩 Carta** para generar y copiar la carta de vacaciones

---

## 🔒 Privacidad y Datos

- Los datos se almacenan localmente en el navegador (**LocalStorage**)
- Si inicias sesión, se sincronizan con **Supabase** para backup multidispositivo
- Puedes usar la app sin conexión: los cambios se sincronizarán cuando vuelvas a estar online
- No compartimos ni vendemos datos personales

---

## 🚀 Deploy

### Vercel (recomendado)

```bash
npm i -g vercel
vercel
```

O conecta tu repositorio de GitHub directamente en [vercel.com](https://vercel.com).

### Build manual

```bash
npm run build
# El output está en ./dist
```

---

## 📄 Licencia

MIT

---

## 🚀 Generar APK Firmada (Release)

### Requisitos
- Java JDK 17+ instalado (`java -version`)
- Una cuenta en GitHub con el repositorio configurado

### 1️⃣ Generar el Keystore

Ejecuta el script correspondiente a tu sistema operativo:

**Windows:**
```bash
scripts\generate-keystore.bat
```

**Linux / macOS / Git Bash:**
```bash
bash scripts/generate-keystore.sh
```

El script te pedirá:
- **Contraseña del keystore** — guárdala en un lugar seguro
- **Contraseña de la key** — puede ser la misma o diferente
- **Datos del propietario** — puedes dejar vacío (usa valores por defecto)

Esto generará un archivo `turnos-keystore.jks` en la raíz del proyecto.

### 2️⃣ Codificar el Keystore para GitHub

Convierte el keystore a base64 para poder subirlo como Secret:

**Windows:**
```bash
certutil -encode turnos-keystore.jks keystore_base64.txt
type keystore_base64.txt
```

**macOS:**
```bash
base64 -i turnos-keystore.jks | pbcopy
```

**Linux / Git Bash:**
```bash
base64 -w0 turnos-keystore.jks > keystore_base64.txt
cat keystore_base64.txt
```

Copia todo el contenido del archivo (o el texto del portapapeles).

### 3️⃣ Crear GitHub Secrets

Ve a tu repositorio en GitHub:
1. **Settings** → **Secrets and variables** → **Actions**
2. Haz clic en **New repository secret**
3. Crea estos 4 secrets:

| Secret | Valor |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | Todo el contenido del archivo base64 (texto largo) |
| `KEYSTORE_PASSWORD` | La contraseña del keystore que ingresaste |
| `KEY_ALIAS` | `turnosapp` (o el alias que pusiste) |
| `KEY_PASSWORD` | La contraseña de la key que ingresaste |

![GitHub Secrets](https://docs.github.com/assets/cb-24647/mw-1440/images/help/repository/actions-secrets-settings.webp)

### 4️⃣ ¡APK Firmada Automática!

Cada vez que hagas **push a `main`**, GitHub Actions:
1. Construye la app web
2. Sincroniza con Capacitor
3. Genera **APK Debug** (para pruebas)
4. Si hay keystore configurado, genera:
   - **APK Release firmada** (lista para instalar en cualquier dispositivo)
   - **AAB Release** (para subir a Google Play Store)

Para descargar:
1. Ve a **Actions** → **Build Android APK**
2. Selecciona el workflow más reciente
3. Baja los artifacts:
   - `TurnosApp-Debug` → para pruebas directas
   - `TurnosApp-Release` → APK firmada lista para distribuir
   - `TurnosApp-Release-AAB` → Para Google Play Store

### ⚠️ Seguridad
- **NUNCA** subas el archivo `.jks` al repositorio (está en `.gitignore`)
- **NUNCA** compartas tus contraseñas del keystore
- Guarda el archivo `.jks` en un lugar seguro (USB, gestor de contraseñas)
- Si pierdes el keystore, **no podrás actualizar tu app en Play Store**

---

## 👨‍💻 Autor

**Gustavo Soto** — [@whustafree](https://github.com/whustafree)

Hecho con ❤️ para facilitar la gestión de turnos laborales en Chile.
