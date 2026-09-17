/**
 * Configuración de Salas del Centro de Psicología.
 * Cada sala puede mapearse a un CALENDAR_ID distinto en Google Calendar.
 */
const ROOMS = [
    {
        id: 'sala-1',
        name: 'Sala 1 - Psicoterapia Individual',
        shortName: 'Sala 1',
        capacity: 3,
        description: 'Espacio acogedor equipado para sesiones individuales de adultos.',
        icon: 'fa-user-doctor',
        calendarEnvVar: 'CALENDAR_ID_SALA_1'
    },
    {
        id: 'sala-2',
        name: 'Sala 2 - Infanto-Juvenil',
        shortName: 'Sala 2',
        capacity: 4,
        description: 'Equipada con material lúdico y de diagnóstico infantojuvenil.',
        icon: 'fa-child-reaching',
        calendarEnvVar: 'CALENDAR_ID_SALA_2'
    },
    {
        id: 'sala-3',
        name: 'Sala 3 - Terapia de Pareja y Familia',
        shortName: 'Sala 3',
        capacity: 6,
        description: 'Sofás amplios para sesiones familiares y mediaciones de pareja.',
        icon: 'fa-people-roof',
        calendarEnvVar: 'CALENDAR_ID_SALA_3'
    },
    {
        id: 'sala-4',
        name: 'Sala 4 - Multiusos / Evaluación',
        shortName: 'Sala 4',
        capacity: 8,
        description: 'Mesa de trabajo y herramientas psicométricas completas.',
        icon: 'fa-clipboard-check',
        calendarEnvVar: 'CALENDAR_ID_SALA_4'
    }
];

function getRooms() {
    return ROOMS;
}

function getRoomById(id) {
    return ROOMS.find(r => r.id === id);
}

module.exports = {
    ROOMS,
    getRooms,
    getRoomById
};
