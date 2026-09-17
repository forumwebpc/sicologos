const express = require('express');
const router = express.Router();
const calendarService = require('./calendarService');
const { getUsers } = require('./users');
const { getRooms } = require('./rooms');
const { router: authRouter, requireAuth } = require('./auth');

// Montar las rutas de autenticación en /api/auth
router.use('/auth', authRouter);

// Horario de atención del centro (09:00 a 20:00)
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 20;

/**
 * GET /api/users
 * Retorna la lista de usuarios (públicos)
 */
router.get('/users', (req, res) => {
    res.json(getUsers());
});

/**
 * GET /api/rooms
 * Retorna las salas del centro
 */
router.get('/rooms', (req, res) => {
    res.json(getRooms());
});

/**
 * GET /api/schedule
 * Query params: date (YYYY-MM-DD)
 * Retorna la rejilla de horas/salas aplicando la máscara de privacidad según el rol del usuario autenticado
 */
router.get('/schedule', requireAuth, async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'El parámetro date es requerido (formato YYYY-MM-DD).' });
        }

        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD.' });
        }

        // Definir inicio y fin de la jornada laboral para el día solicitado
        const dayStart = new Date(targetDate);
        dayStart.setHours(WORK_START_HOUR, 0, 0, 0);

        const dayEnd = new Date(targetDate);
        dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

        // 1. Obtener todos los eventos guardados en Google Calendar / Simulación
        const rawEvents = await calendarService.getEventsForRange(dayStart.toISOString(), dayEnd.toISOString());

        // 2. Generar las franjas horarias de 1 hora (09:00-10:00, 10:00-11:00, etc.)
        const hourlySlots = [];
        for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
            const slotStart = new Date(targetDate);
            slotStart.setHours(hour, 0, 0, 0);

            const slotEnd = new Date(targetDate);
            slotEnd.setHours(hour + 1, 0, 0, 0);

            const timeLabel = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;

            hourlySlots.push({
                hour,
                timeLabel,
                startTimeISO: slotStart.toISOString(),
                endTimeISO: slotEnd.toISOString()
            });
        }

        // 3. Cruzar salas, franjas horarias y eventos con la MÁSCARA DE PRIVACIDAD
        const user = req.currentUser;
        const isBoss = user.role === 'JEFA';
        const rooms = getRooms();

        const grid = hourlySlots.map(slot => {
            const roomStatuses = {};

            rooms.forEach(room => {
                // Buscar si existe un evento en esta sala durante esta hora
                const event = rawEvents.find(evt => {
                    if (evt.roomId !== room.id) return false;
                    const evtStart = new Date(evt.startTime);
                    const evtEnd = new Date(evt.endTime);
                    const sStart = new Date(slot.startTimeISO);
                    const sEnd = new Date(slot.endTimeISO);
                    return (sStart < evtEnd && sEnd > evtStart);
                });

                if (!event) {
                    // Sala libre en esta hora
                    roomStatuses[room.id] = {
                        status: 'FREE',
                        isOccupied: false,
                        canBook: true
                    };
                } else {
                    const isMyEvent = event.psychologistId === user.id;

                    if (isBoss || isMyEvent) {
                        // La JEFA o el PROPIO SICÓLOGO ven los datos completos
                        roomStatuses[room.id] = {
                            status: 'BUSY',
                            isOccupied: true,
                            isMine: isMyEvent,
                            eventId: event.id,
                            psychologistId: event.psychologistId,
                            psychologistName: event.psychologistName,
                            patientName: event.patientName,
                            notes: event.notes,
                            canCancel: true,
                            viewMode: isBoss ? 'FULL_BOSS_VIEW' : 'OWNER_VIEW'
                        };
                    } else {
                        // OTROS SICÓLOGOS ven únicamente que la sala está OCUPADA (sin datos privados)
                        roomStatuses[room.id] = {
                            status: 'BUSY',
                            isOccupied: true,
                            isMine: false,
                            eventId: null, // Ocultar ID del evento a otros sicólogos
                            psychologistName: 'Reservado',
                            patientName: 'Confidencial',
                            title: 'Sala Ocupada',
                            canCancel: false,
                            viewMode: 'PRIVACY_MASKED'
                        };
                    }
                }
            });

            return {
                slotInfo: slot,
                rooms: roomStatuses
            };
        });

        res.json({
            date,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                title: user.title,
                badge: user.badge
            },
            isMockMode: calendarService.isMock,
            grid
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/bookings
 * Body: { roomId, date, hour, patientName, notes }
 */
router.post('/bookings', requireAuth, async (req, res, next) => {
    try {
        const { roomId, date, hour, patientName, notes } = req.body;
        const user = req.currentUser;

        if (!roomId || !date || hour === undefined || !patientName) {
            return res.status(400).json({ error: 'Faltan campos requeridos: roomId, date, hour, patientName.' });
        }

        const room = getRooms().find(r => r.id === roomId);
        if (!room) {
            return res.status(400).json({ error: 'La sala especificada no existe.' });
        }

        const intHour = parseInt(hour, 10);
        if (isNaN(intHour) || intHour < WORK_START_HOUR || intHour >= WORK_END_HOUR) {
            return res.status(400).json({ error: `La hora debe estar entre las ${WORK_START_HOUR}:00 y las ${WORK_END_HOUR - 1}:00.` });
        }

        // Construir rangos ISO de inicio y fin de 1 hora en formato local para evitar sesgos de servidor UTC
        const pad = n => String(n).padStart(2, '0');
        const startISO = `${date}T${pad(intHour)}:00:00`;
        const endISO = `${date}T${pad(intHour + 1)}:00:00`;

        // Crear la reserva llamando al servicio
        const booking = await calendarService.createBooking({
            roomId,
            psychologistId: user.id,
            psychologistName: user.name,
            patientName: patientName.trim(),
            notes: notes ? notes.trim() : '',
            startTimeISO: startISO,
            endTimeISO: endISO
        });

        res.status(201).json({
            message: 'Reserva creada exitosamente',
            booking
        });
    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({ error: error.message });
        }
        next(error);
    }
});

/**
 * DELETE /api/bookings/:id
 * Body/Query: roomId
 */
router.delete('/bookings/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const roomId = req.query.roomId || req.body.roomId || 'sala-1';
        const user = req.currentUser;

        // Comprobación de seguridad: Solo la jefa o el creador pueden borrar el evento
        const dayStart = new Date();
        dayStart.setMonth(dayStart.getMonth() - 1);
        const dayEnd = new Date();
        dayEnd.setMonth(dayEnd.getMonth() + 2);

        const events = await calendarService.getEventsForRange(dayStart.toISOString(), dayEnd.toISOString());
        const eventToDelete = events.find(e => e.id === id);

        if (eventToDelete && user.role !== 'JEFA' && eventToDelete.psychologistId !== user.id) {
            return res.status(403).json({ error: 'No tienes permisos para cancelar esta sesión de otro sicólogo.' });
        }

        await calendarService.deleteBooking(id, roomId);
        res.json({ message: 'Reserva cancelada correctamente' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
