const { google } = require('googleapis');
const { ROOMS } = require('./rooms');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

class CalendarService {
    constructor() {
        this.calendar = null;
        this.isMock = true;
        this.mockStorage = [];
        this.initMockData();
        this.initGoogleAuth();
    }

    initGoogleAuth() {
        try {
            let authOptions = { scopes: SCOPES };

            if (process.env.GOOGLE_CREDS_JSON) {
                try {
                    let rawCreds = process.env.GOOGLE_CREDS_JSON.trim();
                    if ((rawCreds.startsWith("'") && rawCreds.endsWith("'")) || (rawCreds.startsWith('"') && rawCreds.endsWith('"'))) {
                        rawCreds = rawCreds.slice(1, -1);
                    }

                    const parsedCreds = JSON.parse(rawCreds);

                    // Formatear la clave privada
                    if (parsedCreds.private_key) {
                        parsedCreds.private_key = parsedCreds.private_key.replace(/\\n/g, '\n');
                    }

                    authOptions.credentials = parsedCreds;
                    const auth = new google.auth.GoogleAuth(authOptions);
                    this.calendar = google.calendar({ version: 'v3', auth });
                    this.isMock = false;
                    console.log(`[CalendarService] ✅ Conectado exitosamente a Google Calendar API con la Service Account (${parsedCreds.client_email || 'Service Account'}).`);
                } catch (jsonErr) {
                    console.error('[CalendarService] ⚠️ Error leyendo el JSON de credenciales:', jsonErr.message);
                    this.isMock = true;
                    this.calendar = null;
                }
            } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                try {
                    authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
                    const auth = new google.auth.GoogleAuth(authOptions);
                    this.calendar = google.calendar({ version: 'v3', auth });
                    this.isMock = false;
                    console.log('[CalendarService] ✅ Conectado exitosamente con GOOGLE_APPLICATION_CREDENTIALS.');
                } catch (fileErr) {
                    console.error('[CalendarService] ⚠️ Error leyendo archivo de credenciales Google:', fileErr.message);
                    this.isMock = true;
                    this.calendar = null;
                }
            } else {
                console.log('[CalendarService] ℹ️ No se configuró GOOGLE_CREDS_JSON en el entorno. Ejecutando en MODO SIMULACIÓN.');
                this.isMock = true;
            }
        } catch (error) {
            console.error('[CalendarService] ⚠️ Error general al inicializar Google Calendar Auth:', error.message);
            this.isMock = true;
            this.calendar = null;
        }
    }

    /**
     * Datos iniciales de demostración para el modo simulación
     */
    initMockData() {
        const todayStr = new Date().toISOString().split('T')[0];
        
        this.mockStorage = [
            {
                id: 'mock-evt-101',
                roomId: 'sala-1',
                psychologistId: 'user-psico-1',
                psychologistName: 'Dr. Carlos García',
                patientName: 'Ana María Gómez',
                notes: 'Evaluación inicial de ansiedad social.',
                startTime: `${todayStr}T09:00:00.000Z`,
                endTime: `${todayStr}T10:00:00.000Z`
            },
            {
                id: 'mock-evt-102',
                roomId: 'sala-2',
                psychologistId: 'user-psico-2',
                psychologistName: 'Dra. Marta Martínez',
                patientName: 'Lucas Fernández (8 años)',
                notes: 'Sesión de juego diagnóstico.',
                startTime: `${todayStr}T10:00:00.000Z`,
                endTime: `${todayStr}T11:00:00.000Z`
            },
            {
                id: 'mock-evt-103',
                roomId: 'sala-3',
                psychologistId: 'user-jefa',
                psychologistName: 'Dra. Elena Ruiz',
                patientName: 'Pareja Morales-Sánchez',
                notes: 'Terapia familiar de comunicación.',
                startTime: `${todayStr}T11:00:00.000Z`,
                endTime: `${todayStr}T12:00:00.000Z`
            },
            {
                id: 'mock-evt-104',
                roomId: 'sala-1',
                psychologistId: 'user-psico-3',
                psychologistName: 'Dr. Javier López',
                patientName: 'Roberto Medina',
                notes: 'Seguimiento de terapia de pareja.',
                startTime: `${todayStr}T12:00:00.000Z`,
                endTime: `${todayStr}T13:00:00.000Z`
            },
            {
                id: 'mock-evt-105',
                roomId: 'sala-4',
                psychologistId: 'user-psico-1',
                psychologistName: 'Dr. Carlos García',
                patientName: 'Beatriz Navarro',
                notes: 'Aplicación de batería de tests WAIS-IV.',
                startTime: `${todayStr}T16:00:00.000Z`,
                endTime: `${todayStr}T17:00:00.000Z`
            }
        ];
    }

    getCalendarIdForRoom(roomId) {
        const room = ROOMS.find(r => r.id === roomId);
        if (room && room.calendarEnvVar && process.env[room.calendarEnvVar]) {
            return process.env[room.calendarEnvVar];
        }
        return process.env.CALENDAR_ID || 'primary';
    }

    async getEventsForRange(startDateISO, endDateISO) {
        if (this.isMock || !this.calendar) {
            const start = new Date(startDateISO);
            const end = new Date(endDateISO);

            return this.mockStorage.filter(evt => {
                const evtStart = new Date(evt.startTime);
                const evtEnd = new Date(evt.endTime);
                return (evtStart >= start && evtStart < end) || (evtEnd > start && evtEnd <= end);
            });
        }

        const allEvents = [];

        // Consultamos de forma resiliente cada sala individualmente
        for (const room of ROOMS) {
            const calId = this.getCalendarIdForRoom(room.id);
            try {
                const response = await this.calendar.events.list({
                    calendarId: calId,
                    timeMin: startDateISO,
                    timeMax: endDateISO,
                    singleEvents: true,
                    orderBy: 'startTime'
                });

                if (response.data.items) {
                    for (const item of response.data.items) {
                        const props = item.extendedProperties?.private || {};
                        allEvents.push({
                            id: item.id,
                            roomId: props.roomId || room.id,
                            psychologistId: props.psychologistId || 'unknown',
                            psychologistName: props.psychologistName || item.summary || 'Sicólogo',
                            patientName: props.patientName || 'Paciente',
                            notes: props.notes || item.description || '',
                            startTime: item.start.dateTime || item.start.date,
                            endTime: item.end.dateTime || item.end.date,
                            htmlLink: item.htmlLink
                        });
                    }
                }
            } catch (roomErr) {
                console.warn(`[CalendarService] ⚠️ Aviso para ${room.name} (${calId}): ${roomErr.message}. Verifica que el ID del calendario sea válido y esté compartido con la Service Account.`);
            }
        }

        return allEvents;
    }

    async checkRoomOccupied(roomId, startTimeISO, endTimeISO, excludeEventId = null) {
        const start = new Date(startTimeISO);
        const end = new Date(endTimeISO);

        if (this.isMock || !this.calendar) {
            return this.mockStorage.some(evt => {
                if (excludeEventId && evt.id === excludeEventId) return false;
                if (evt.roomId !== roomId) return false;

                const evtStart = new Date(evt.startTime);
                const evtEnd = new Date(evt.endTime);
                return (start < evtEnd && end > evtStart);
            });
        }

        try {
            const calId = this.getCalendarIdForRoom(roomId);
            const response = await this.calendar.events.list({
                calendarId: calId,
                timeMin: startTimeISO,
                timeMax: endTimeISO,
                singleEvents: true
            });

            const items = response.data.items || [];
            return items.some(item => {
                if (excludeEventId && item.id === excludeEventId) return false;
                const evtStart = new Date(item.start.dateTime || item.start.date);
                const evtEnd = new Date(item.end.dateTime || item.end.date);
                return (start < evtEnd && end > evtStart);
            });
        } catch (error) {
            console.warn(`[CalendarService] ⚠️ Aviso al comprobar ocupación para ${roomId}: ${error.message}`);
            return false;
        }
    }

    async createBooking({ roomId, psychologistId, psychologistName, patientName, notes, startTimeISO, endTimeISO }) {
        const isOccupied = await this.checkRoomOccupied(roomId, startTimeISO, endTimeISO);
        if (isOccupied) {
            const error = new Error('La sala seleccionada ya está reservada en esta franja horaria.');
            error.statusCode = 409;
            throw error;
        }

        if (this.isMock || !this.calendar) {
            const newEvt = {
                id: 'mock-evt-' + Date.now(),
                roomId,
                psychologistId,
                psychologistName,
                patientName,
                notes: notes || '',
                startTime: startTimeISO,
                endTime: endTimeISO
            };
            this.mockStorage.push(newEvt);
            console.log('[CalendarService] Creada reserva en MODO SIMULACIÓN:', newEvt);
            return newEvt;
        }

        try {
            const calId = this.getCalendarIdForRoom(roomId);
            const timeZone = process.env.TIMEZONE || 'Europe/Madrid';
            const eventResource = {
                summary: `Sesión: ${patientName} (${psychologistName})`,
                description: `Paciente: ${patientName}\nSicólogo: ${psychologistName}\nNotas: ${notes || 'Sin notas'}`,
                start: { 
                    dateTime: startTimeISO,
                    timeZone: timeZone
                },
                end: { 
                    dateTime: endTimeISO,
                    timeZone: timeZone
                },
                extendedProperties: {
                    private: {
                        roomId,
                        psychologistId,
                        psychologistName,
                        patientName,
                        notes: notes || ''
                    }
                }
            };

            const response = await this.calendar.events.insert({
                calendarId: calId,
                resource: eventResource
            });

            return {
                id: response.data.id,
                roomId,
                psychologistId,
                psychologistName,
                patientName,
                notes,
                startTime: startTimeISO,
                endTime: endTimeISO,
                htmlLink: response.data.htmlLink
            };
        } catch (error) {
            console.error('[CalendarService] Error creando evento en Google Calendar:', error.message);
            throw new Error(`No se pudo crear la reserva en Google Calendar (${error.message})`);
        }
    }

    async deleteBooking(eventId, roomId) {
        if (this.isMock || !this.calendar) {
            const index = this.mockStorage.findIndex(evt => evt.id === eventId);
            if (index !== -1) {
                const deleted = this.mockStorage.splice(index, 1);
                console.log('[CalendarService] Eliminada reserva en MODO SIMULACIÓN:', deleted[0]);
                return true;
            }
            return false;
        }

        try {
            const calId = this.getCalendarIdForRoom(roomId);
            await this.calendar.events.delete({
                calendarId: calId,
                eventId: eventId
            });
            return true;
        } catch (error) {
            console.error('[CalendarService] Error eliminando evento en Google Calendar:', error.message);
            throw new Error(`No se pudo cancelar el evento en Google Calendar (${error.message})`);
        }
    }
}

module.exports = new CalendarService();
