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
- Visualización mensual con sistema 3x3 (3 días trabajo + 3 días descanso)
- 9 configuraciones de ciclo disponibles (D-D-D, N-N-N, D-N-D, etc.)
- Asignación rápida de turnos: **DÍA**, **NOCHE**, **EXTRA DÍA**, **EXTRA NOCHE**
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
- Cache de API de Supabase para funcionamiento offline parcial
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

## 👨‍💻 Autor

**Gustavo Soto** — [@whustafree](https://github.com/whustafree)

Hecho con ❤️ para facilitar la gestión de turnos laborales en Chile.
