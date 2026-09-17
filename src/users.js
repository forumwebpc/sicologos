const bcrypt = require('bcryptjs');

// Hash por defecto para contraseñas de demostración (ejemplo: "123456" y "jefa123" para la Jefa)
const DEFAULT_HASH = bcrypt.hashSync('123456', 10);
const JEFA_HASH = bcrypt.hashSync('jefa123', 10);

/**
 * Lista de usuarios (Sicólogos y Jefa) con sus roles y credenciales.
 */
const USERS = [
    {
        id: 'user-jefa',
        name: 'Dra. Elena Ruiz',
        title: 'Directora & Sicóloga Clínica',
        email: 'elena.ruiz@centro-psicologia.com',
        username: 'elena',
        passwordHash: JEFA_HASH,
        role: 'JEFA',
        avatar: 'ER',
        badge: 'Jefa de Equipo',
        color: '#6366f1' // Indigo
    },
    {
        id: 'user-psico-1',
        name: 'Dr. Carlos García',
        title: 'Sicólogo Cognitivo-Conductual',
        email: 'carlos.garcia@centro-psicologia.com',
        username: 'carlos',
        passwordHash: DEFAULT_HASH,
        role: 'SICOLOGO',
        avatar: 'CG',
        badge: 'Sicólogo',
        color: '#0d9488' // Teal
    },
    {
        id: 'user-psico-2',
        name: 'Dra. Marta Martínez',
        title: 'Sicóloga Infanto-Juvenil',
        email: 'marta.martinez@centro-psicologia.com',
        username: 'marta',
        passwordHash: DEFAULT_HASH,
        role: 'SICOLOGO',
        avatar: 'MM',
        badge: 'Sicóloga',
        color: '#d97706' // Amber
    },
    {
        id: 'user-psico-3',
        name: 'Dr. Javier López',
        title: 'Sicólogo Terapeuta de Pareja',
        email: 'javier.lopez@centro-psicologia.com',
        username: 'javier',
        passwordHash: DEFAULT_HASH,
        role: 'SICOLOGO',
        avatar: 'JL',
        badge: 'Sicólogo',
        color: '#2563eb' // Blue
    }
];

function getUsers() {
    // Retorna usuarios sin exponer sus passwordHashes
    return USERS.map(({ passwordHash, ...user }) => user);
}

function getUserById(id) {
    const user = USERS.find(u => u.id === id);
    if (!user) return null;
    const { passwordHash, ...userWithoutHash } = user;
    return userWithoutHash;
}

function getUserByLogin(usernameOrEmail) {
    const term = usernameOrEmail.trim().toLowerCase();
    return USERS.find(u => u.email.toLowerCase() === term || u.username.toLowerCase() === term);
}

module.exports = {
    USERS,
    getUsers,
    getUserById,
    getUserByLogin
};
