const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getUserByLogin, getUserById } = require('./users');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_sicologos_2026_super_safe_key_99';
const COOKIE_NAME = 'session_token';

/**
 * Middleware para requerir autenticación en rutas protegidas
 */
function requireAuth(req, res, next) {
    let token = req.cookies ? req.cookies[COOKIE_NAME] : null;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'No autenticado. Por favor inicia sesión.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado o sesión inválida.' });
        }

        req.currentUser = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
    }
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Por favor introduce usuario/email y contraseña.' });
    }

    const userWithHash = getUserByLogin(username);
    if (!userWithHash) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const isMatch = bcrypt.compareSync(password, userWithHash.passwordHash);
    if (!isMatch) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Generar token JWT
    const token = jwt.sign(
        { userId: userWithHash.id, role: userWithHash.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Guardar token en cookie HttpOnly
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'lax',
        path: '/'
    });

    const { passwordHash, ...userClean } = userWithHash;

    res.json({
        message: 'Inicio de sesión exitoso',
        user: userClean,
        token
    });
});

/**
 * GET /api/auth/me
 * Retorna el usuario actualmente autenticado
 */
router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.currentUser });
});

/**
 * POST /api/auth/logout
 * Cierra la sesión borrando la cookie
 */
router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ message: 'Sesión cerrada correctamente' });
});

module.exports = {
    router,
    requireAuth
};
