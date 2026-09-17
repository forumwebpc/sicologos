# Sistema de Gestión y Reserva de Salas para Sicólogos & Jefa

Aplicación web profesional con backend en Node.js/Express e integración con **Google Calendar API** para la reserva exclusiva de salas en bloques de 1 hora. 

Garantiza la estricta **confidencialidad de datos clínicos/pacientes** entre los sicólogos del equipo y proporciona una **visión completa y supervisora a la Jefa**.

---

## 🌟 Características Principales

* **Control de Privacidad por Roles**:
  * **Sicólogos**: Ven el detalle completo de sus propias sesiones (Paciente, Notas, Hora, Sala). El resto de reservas de otros sicólogos se muestran únicamente como **OCUPADO** (sin revelar el nombre del paciente ni del profesional).
  * **Jefa de Equipo**: Ve el calendario completo de todas las salas con todos los datos detallados (Sicólogo asignado, Paciente y Notas).
* **Bloques de 1 Hora Exclusivos**: Prevención automática de doble reserva o colisión en la misma sala y franja horaria.
* **Integración Dual (Google Calendar API & Modo Simulación)**:
  * Funciona conectándose en tiempo real a Google Calendar API (vía Service Account).
  * Si no hay credenciales configuradas en `.env`, se activa automáticamente el **Modo Simulación Local** para poder probar y utilizar la app de inmediato.
* **Selector Rápido de Rol (Demo)**: Permite alternar en tiempo real entre perfiles de sicólogos y la Jefa para validar la diferencia de privacidad.

---

## 🛠️ Instalación y Uso Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar la aplicación en modo desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir el navegador en `http://localhost:3000`.

---

## 🔑 Configuración de Google Calendar API (Opcional)

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilitar la **Google Calendar API**.
3. Crear una **Service Account (Cuenta de Servicio)** y descargar la clave en formato JSON.
4. Crear calendarios independientes en Google Calendar para cada sala (ej: *Sala 1*, *Sala 2*, *Sala 3*, *Sala 4*).
5. Compartir cada calendario con el email de la Service Account otorgándole permiso **"Realizar cambios en eventos"**.
6. Copiar `.env.example` a `.env` y configurar los `CALENDAR_ID_SALA_X` y la ruta del archivo JSON.
