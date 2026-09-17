# Plan de Implementación: Sistema de Reserva de Salas y Calendario para Sicólogos y Jefa

Sistema web completo con backend en Node.js/Express e integración con Google Calendar API para gestionar reservas de salas por bloques de 1 hora. Implementa control de acceso basado en roles para asegurar la confidencialidad de los pacientes entre sicólogos y dar visibilidad global a la Jefa.

## User Review Required

> [!IMPORTANT]
> **Privacidad y Control de Acceso por Roles**:
> - **Sicólogo**: Ve los detalles completos de **sus propias sesiones** (Paciente, Notas, Sala y Hora) y ve el resto de la rejilla de salas/horas como **Disponible** u **Ocupado** (sin nombres de pacientes ni otros sicólogos).
> - **Jefa**: Ve el **calendario completo** con todos los detalles de todos los sicólogos (quién reservó, qué paciente atiende, qué sala y hora).
> - **Duración**: Reservas exclusivas por bloques de 1 hora exacta.

> [!TIP]
> **Modo Demo Integrado**: El sistema incluirá un selector de rol rápido en la cabecera ("Cambiar Usuario") para poder probar al instante la experiencia tanto de un sicólogo como de la Jefa, funcionando tanto con credenciales reales de Google Calendar como en modo simulado local si no se han configurado aún las claves `.env`.

---

## Arquitectura Propuesta

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND WEB                                 │
│  - Rejilla interactiva de Salas vs. Horas (Visión diaria y semanal)     │
│  - Modal de Nueva Reserva (Selección de Sala, Hora, Paciente y Notas)    │
│  - Selector de Usuario / Rol (Dr. García, Dra. Martínez, Dra. Elena-Jefa)│
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ HTTP / REST API (JWT/Header Auth)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            BACKEND NODE.JS                               │
│  - server.js (Servidor Express)                                          │
│  - routes.js (Endpoints /api/rooms, /api/schedule, /api/bookings)        │
│  - authMiddleware.js (Validación de rol: SICOLOGO vs JEFA)              │
│  - calendarService.js (Integración con Google Calendar API)              │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Google API (Service Account JSON)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE CALENDAR API                              │
│  - Calendario por Sala (Sala 1, Sala 2, Sala 3...)                       │
│  - Metadatos del evento (extendedProperties: psychologistId, patient)    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Crear

### 1. Backend (`c:/Google/Proyectos/Sicólogos`)

#### [NEW] [package.json](file:///c:/Google/Proyectos/Sic%C3%B3logos/package.json)
Configuración del proyecto con dependencias: `express`, `cors`, `dotenv`, `googleapis`.

#### [NEW] [server.js](file:///c:/Google/Proyectos/Sic%C3%B3logos/server.js)
Servidor de Express con soporte para estáticos, API y manejo centralizado de errores.

#### [NEW] [src/users.js](file:///c:/Google/Proyectos/Sic%C3%B3logos/src/users.js)
Directorio de usuarios preconfigurados (Sicólogos estándar y Jefa) para autenticación y demo.

#### [NEW] [src/rooms.js](file:///c:/Google/Proyectos/Sic%C3%B3logos/src/rooms.js)
Configuración de las salas del centro (ej: Sala 1 - Psicoterapia, Sala 2 - Infantil, Sala 3 - Parejas, Sala 4 - Individual).

#### [NEW] [src/calendarService.js](file:///c:/Google/Proyectos/Sic%C3%B3logos/src/calendarService.js)
Servicio de comunicación con Google Calendar API:
- Lectura de eventos y disponibilidad por sala.
- Inserción de eventos con metadatos extendidos (`psychologistId`, `patientName`).
- Cancelación y modificación de reservas.
- Fallback a modo simulación si no hay claves `.env`.

#### [NEW] [src/routes.js](file:///c:/Google/Proyectos/Sic%C3%B3logos/src/routes.js)
Rutas API:
- `GET /api/users`: Lista de usuarios para el selector de demo.
- `GET /api/rooms`: Lista de salas disponibles.
- `GET /api/schedule?date=YYYY-MM-DD`: Retorna la rejilla de horas/salas aplicando la máscara de privacidad según el rol del usuario actual.
- `POST /api/bookings`: Crea una reserva de 1 hora asegurando exclusividad de sala.
- `DELETE /api/bookings/:id`: Cancela una reserva previa verificación de permisos.

### 2. Frontend Web

#### [NEW] [public/index.html](file:///c:/Google/Proyectos/Sic%C3%B3logos/public/index.html)
Interfaz de usuario moderna y responsiva:
- Header con branding del Centro de Sicología y Selector de Perfil (Sicólogo / Jefa).
- Rejilla de programación en matriz (Salas en columnas, Horas en filas).
- Modales para realizar reservas y ver detalles de sesión.

#### [NEW] [public/css/style.css](file:///c:/Google/Proyectos/Sic%C3%B3logos/public/css/style.css)
Diseño cuidado con tipografía moderna (Outfit/Plus Jakarta Sans), paleta de colores relajante (tonos azul slate, verde mente y grises neutros), badges de estado y animaciones suaves.

#### [NEW] [public/js/app.js](file:///c:/Google/Proyectos/Sic%C3%B3logos/public/js/app.js)
Lógica de cliente SPA:
- Cambio dinámico de usuario/rol sin recargar.
- Renderizado interactivo del cuadrante de salas y horas.
- Control de modales y envío de reservas al backend.

### 3. Configuración y Documentación

#### [NEW] [.env.example](file:///c:/Google/Proyectos/Sic%C3%B3logos/.env.example)
Plantilla de variables de entorno para vincular las credenciales de Google Calendar API y los IDs de las salas.

#### [NEW] [README.md](file:///c:/Google/Proyectos/Sic%C3%B3logos/README.md)
Guía paso a paso para ejecutar la aplicación en local y configurar Google Cloud Console / Service Account.

---

## Verificación y Pruebas

1. **Instalación de Dependencias**: Ejecutar `npm install` e iniciar el servidor con `npm run dev`.
2. **Prueba de Rol Sicólogo**:
   - Iniciar como Dr. García.
   - Crear una reserva a las 10:00 en Sala 1 para el paciente "Carlos Ruiz".
   - Verificar que Dr. García ve sus propios datos.
   - Cambiar de usuario a Dra. Martínez (otra sicóloga).
   - Verificar que a las 10:00 en Sala 1 se muestra como **OCUPADO** sin revelar el nombre del cliente ni del sicólogo.
3. **Prueba de Rol Jefa**:
   - Cambiar de usuario a Dra. Elena Ruiz (Jefa).
   - Verificar que ve la reserva de las 10:00 en Sala 1 mostrando "Dr. García - Paciente: Carlos Ruiz".
4. **Prevención de Doble Reserva**:
   - Intentar reservar la Sala 1 a las 10:00 como Dra. Martínez.
   - Verificar que el backend rechaza la reserva por solapamiento de sala.
