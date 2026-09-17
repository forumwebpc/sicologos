require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const routes = require('./src/routes');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos del frontend tanto en raíz '/' como en '/sesiones'
app.use(express.static(path.join(__dirname, 'public')));
app.use('/sesiones', express.static(path.join(__dirname, 'public')));

// Health check para EasyPanel / Traefik / Monitoreo en cualquier ruta
app.get(['/', '/health', '/sesiones/health', '/api/health'], (req, res, next) => {
    // Si la petición acepta HTML y es la raíz, servir index.html, de lo contrario JSON
    if (req.path === '/' && req.accepts('html')) {
        return next();
    }
    res.status(200).json({ status: 'OK', service: 'Reserva de Salas Sicólogos', timestamp: new Date() });
});

// Rutas API (soporta /api y /sesiones/api)
app.use('/api', routes);
app.use('/sesiones/api', routes);

// Fallback SPA para todas las rutas de navegación
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
    console.error('[ServerError]', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
});

// Escuchar en el puerto principal
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Servidor de Reserva de Salas escuchando en puerto ${PORT}`);
    console.log(`====================================================`);
});

// Escuchar adicionalmente en el puerto 80 para compatibilidad total con Traefik / EasyPanel
if (PORT !== 80) {
    try {
        app.listen(80, '0.0.0.0', () => {
            console.log(` Servidor escuchando también en el puerto 80 para Traefik / EasyPanel.`);
        });
    } catch (err) {
        // Ignorar si el puerto 80 ya estuviese ocupado
    }
}
