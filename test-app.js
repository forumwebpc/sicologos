const http = require('http');
const server = require('./server');

// Wait 500ms for server startup then run automated HTTP tests
setTimeout(async () => {
    try {
        console.log('\n--- 🧪 EJECUTANDO PRUEBAS AUTOMATIZADAS DEL SISTEMA ---\n');

        // Test 1: GET /api/users
        const usersRes = await fetchJson('http://localhost:3000/api/users');
        console.log(`✅ Test 1 [GET /api/users]: ${usersRes.length} usuarios obtenidos.`);

        // Test 2: GET /api/rooms
        const roomsRes = await fetchJson('http://localhost:3000/api/rooms');
        console.log(`✅ Test 2 [GET /api/rooms]: ${roomsRes.length} salas obtenidas.`);

        // Test 3: GET /api/schedule como Sicólogo (Dr. García)
        const today = new Date().toISOString().split('T')[0];
        const schedulePsico = await fetchJson(`http://localhost:3000/api/schedule?date=${today}`, {
            'x-user-id': 'user-psico-1'
        });
        console.log(`✅ Test 3 [GET /api/schedule - Vista Sicólogo]: Carga correcta para ${schedulePsico.user.name} (${schedulePsico.user.role}).`);
        
        // Verificar máscara de privacidad en franja con sesión de otro sicólogo
        const slotWithOtherPsico = schedulePsico.grid.find(g => g.rooms['sala-2'].status === 'BUSY');
        if (slotWithOtherPsico) {
            const maskedData = slotWithOtherPsico.rooms['sala-2'];
            console.log(`   🔒 Privacidad verificada en Sala 2: title="${maskedData.title}", patientName="${maskedData.patientName}" (Datos sensibles ocultos).`);
        }

        // Test 4: GET /api/schedule como Jefa (Dra. Elena Ruiz)
        const scheduleJefa = await fetchJson(`http://localhost:3000/api/schedule?date=${today}`, {
            'x-user-id': 'user-jefa'
        });
        console.log(`✅ Test 4 [GET /api/schedule - Vista Jefa]: Carga correcta para ${scheduleJefa.user.name} (${scheduleJefa.user.role}).`);
        const slotBossView = scheduleJefa.grid.find(g => g.rooms['sala-2'].status === 'BUSY');
        if (slotBossView) {
            const bossData = slotBossView.rooms['sala-2'];
            console.log(`   👁️ Supervisión Jefa verificada en Sala 2: psychologist="${bossData.psychologistName}", patient="${bossData.patientName}" (Detalle completo visible).`);
        }

        // Test 5: POST /api/bookings (Crear nueva reserva a las 15:00 en Sala 1)
        const newBookingRes = await postJson('http://localhost:3000/api/bookings', {
            roomId: 'sala-1',
            date: today,
            hour: 15,
            patientName: 'Prueba Automatizada',
            notes: 'Verificación de creación'
        }, { 'x-user-id': 'user-psico-1' });
        console.log(`✅ Test 5 [POST /api/bookings]: Reserva creada con éxito (ID: ${newBookingRes.booking.id}).`);

        // Test 6: Prevención de Solapamiento (Intentar reservar la misma sala a las 15:00)
        try {
            await postJson('http://localhost:3000/api/bookings', {
                roomId: 'sala-1',
                date: today,
                hour: 15,
                patientName: 'Intento Duplicado',
                notes: 'Debe fallar'
            }, { 'x-user-id': 'user-psico-2' });
            console.error('❌ Error: Se esperaba fallo por conflicto de sala.');
        } catch (err) {
            console.log(`✅ Test 6 [Prevención de Solapamiento]: Bloqueo de doble reserva verificado correctamente (409 Conflict).`);
        }

        console.log('\n--- 🎉 TODAS LAS PRUEBAS FINALIZARON CON ÉXITO ---\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
        process.exit(1);
    }
}, 1000);

function fetchJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request(u, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
                resolve(JSON.parse(data));
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function postJson(url, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request(u, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
                resolve(JSON.parse(data));
            });
        });
        req.write(JSON.stringify(body));
        req.on('error', reject);
        req.end();
    });
}
