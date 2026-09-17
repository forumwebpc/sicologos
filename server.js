require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check para monitoreo
app.get(['/health', '/sesiones/health'], (req, res) => {
    res.status(200).json({ status: 'OK', service: 'Reserva de Salas Sicólogos', timestamp: new Date() });
});

// Rutas API (soporta /api y /sesiones/api)
app.use('/api', routes);
app.use('/sesiones/api', routes);

// Fallback SPA para ambas rutas
app.get(['/', '/sesiones', '/sesiones/*'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback genérico
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
    console.error('[ServerError]', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Servidor de Reserva de Salas escuchando en:`);
    console.log(` http://localhost:${PORT}`);
    console.log(` Subruta soportada: http://localhost:${PORT}/sesiones`);
    console.log(`====================================================`);
});
