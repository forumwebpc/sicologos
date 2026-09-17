/**
 * Frontend SPA Application Logic
 * Centro de Psicología - Reserva de Salas & Gestión de Sesiones
 */

document.addEventListener('DOMContentLoaded', () => {
    // Detectar si estamos bajo la subruta /sesiones o en raíz
    const BASE_PATH = window.location.pathname.startsWith('/sesiones') ? '/sesiones' : '';
    const API_BASE = `${BASE_PATH}/api`;

    // --- Application State ---
    let currentUser = null;
    let roomsList = [];
    let currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let currentScheduleData = null;

    // --- Helper de Cabeceras con Bearer Token ---
    function getAuthHeaders(extraHeaders = {}) {
        const token = localStorage.getItem('auth_token');
        const headers = { ...extraHeaders };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    // --- DOM Elements ---
    const userHeaderCard = document.getElementById('user-header-card');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const currentUserName = document.getElementById('current-user-name');
    const currentUserBadge = document.getElementById('current-user-badge');
    const currentUserEmail = document.getElementById('current-user-email');

    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnLogout = document.getElementById('btn-logout');

    const datePicker = document.getElementById('schedule-date-picker');
    const displayFormattedDate = document.getElementById('display-formatted-date');
    const btnPrevDay = document.getElementById('btn-prev-day');
    const btnNextDay = document.getElementById('btn-next-day');
    const btnToday = document.getElementById('btn-today');

    const modeBadge = document.getElementById('mode-badge');
    const privacyBanner = document.getElementById('privacy-banner');
    const privacyTitle = document.getElementById('privacy-title');
    const privacyDesc = document.getElementById('privacy-desc');

    const loadingSpinner = document.getElementById('loading-spinner');
    const matrixContainer = document.getElementById('matrix-container');
    const matrixTbody = document.getElementById('matrix-tbody');

    // Modals
    const modalLogin = document.getElementById('modal-login');
    const formLogin = document.getElementById('form-login');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const loginErrorText = document.getElementById('login-error-text');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');

    const modalBooking = document.getElementById('modal-booking');
    const modalDetail = document.getElementById('modal-detail');
    const formBooking = document.getElementById('form-booking');

    const bookingPsychologistDisplay = document.getElementById('booking-psychologist-display');
    const bookingRoomSelect = document.getElementById('booking-room-select');
    const bookingHourSelect = document.getElementById('booking-hour-select');
    const bookingPatientInput = document.getElementById('booking-patient');
    const bookingNotesInput = document.getElementById('booking-notes');

    const btnDeleteBooking = document.getElementById('btn-delete-booking');
    let activeDetailBooking = null;

    // --- Initialization ---
    async function init() {
        setupDateControls();
        setupEventListeners();
        await checkAuthStatus();
        await loadRooms();
    }

    // --- 1. Autenticación y Estado de Sesión ---
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                updateUserUI(data.user);
                modalLogin.classList.add('hidden');
                await fetchAndRenderSchedule();
            } else {
                updateUserUI(null);
                renderLoggedOutState();
                modalLogin.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error comprobando sesión:', error);
            updateUserUI(null);
            renderLoggedOutState();
        }
    }

    function updateUserUI(user) {
        currentUser = user;
        if (!user) {
            currentUserAvatar.textContent = '?';
            currentUserAvatar.style.background = '#94a3b8';
            currentUserName.textContent = 'No autenticado';
            currentUserBadge.textContent = 'Invitado';
            currentUserBadge.className = 'user-role-badge';
            currentUserEmail.textContent = 'Inicia sesión para continuar';

            btnOpenLogin.classList.remove('hidden');
            btnLogout.classList.add('hidden');

            privacyBanner.className = 'privacy-notice';
            privacyTitle.textContent = 'Acceso Restringido:';
            privacyDesc.textContent = 'Inicia sesión con tu usuario y contraseña para ver y reservar salas.';
            return;
        }

        currentUserAvatar.textContent = user.avatar || user.name.substring(0, 2).toUpperCase();
        currentUserAvatar.style.background = user.color || '#6366f1';
        currentUserName.textContent = user.name;
        currentUserEmail.textContent = user.email;

        currentUserBadge.textContent = user.badge || user.role;
        if (user.role === 'JEFA') {
            currentUserBadge.className = 'user-role-badge jefa';
        } else {
            currentUserBadge.className = 'user-role-badge';
        }

        btnOpenLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');

        if (user.role === 'JEFA') {
            privacyBanner.className = 'privacy-notice jefa-banner';
            privacyTitle.textContent = `Vista Directora (${user.name}):`;
            privacyDesc.textContent = 'Acceso total y supervisión del cuadrante. Puedes ver el sicólogo y paciente de cada reserva en todas las salas.';
        } else {
            privacyBanner.className = 'privacy-notice';
            privacyTitle.textContent = `Vista de Sicólogo (${user.name}):`;
            privacyDesc.textContent = 'Ves los detalles completos de tus propias sesiones. Las reservas de otros profesionales se muestran como "Ocupado" para garantizar la confidencialidad médica.';
        }
    }

    function renderLoggedOutState() {
        matrixTbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #64748b; padding: 3rem;">
                    <i class="fa-solid fa-user-lock fa-3x" style="margin-bottom: 1rem; color: #94a3b8;"></i><br>
                    <strong style="font-size: 1.1rem; color: #334155;">Debes iniciar sesión para consultar la agenda de salas</strong><br>
                    <small>Haz clic en "Entrar" en la esquina superior derecha o completa el formulario de acceso.</small>
                </td>
            </tr>
        `;
    }

    // --- 2. Room Management ---
    async function loadRooms() {
        try {
            const response = await fetch(`${API_BASE}/rooms`, {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (response.ok) {
                roomsList = await response.json();
                populateRoomSelectOptions();
            }
        } catch (error) {
            console.error('Error cargando salas:', error);
        }
    }

    function populateRoomSelectOptions() {
        bookingRoomSelect.innerHTML = roomsList.map(r => `
            <option value="${r.id}">${r.name}</option>
        `).join('');
    }

    // --- 3. Date Controls ---
    function setupDateControls() {
        datePicker.value = currentDate;
        updateFormattedDateDisplay();

        datePicker.addEventListener('change', (e) => {
            currentDate = e.target.value;
            updateFormattedDateDisplay();
            fetchAndRenderSchedule();
        });

        btnPrevDay.addEventListener('click', () => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            currentDate = d.toISOString().split('T')[0];
            datePicker.value = currentDate;
            updateFormattedDateDisplay();
            fetchAndRenderSchedule();
        });

        btnNextDay.addEventListener('click', () => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            currentDate = d.toISOString().split('T')[0];
            datePicker.value = currentDate;
            updateFormattedDateDisplay();
            fetchAndRenderSchedule();
        });

        btnToday.addEventListener('click', () => {
            currentDate = new Date().toISOString().split('T')[0];
            datePicker.value = currentDate;
            updateFormattedDateDisplay();
            fetchAndRenderSchedule();
        });
    }

    function updateFormattedDateDisplay() {
        const todayStr = new Date().toISOString().split('T')[0];
        if (currentDate === todayStr) {
            displayFormattedDate.textContent = 'Hoy';
            return;
        }

        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const d = new Date(currentDate + 'T00:00:00');
        const formatted = d.toLocaleDateString('es-ES', options);
        displayFormattedDate.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    // --- 4. Fetch & Render Matrix Schedule ---
    async function fetchAndRenderSchedule() {
        if (!currentUser) {
            renderLoggedOutState();
            return;
        }

        showLoading(true);

        try {
            const response = await fetch(`${API_BASE}/schedule?date=${currentDate}`, {
                headers: getAuthHeaders(),
                credentials: 'include'
            });

            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                updateUserUI(null);
                renderLoggedOutState();
                modalLogin.classList.remove('hidden');
                return;
            }

            if (!response.ok) {
                throw new Error('Error al cargar la programación.');
            }

            currentScheduleData = await response.json();

            if (currentScheduleData.isMockMode) {
                modeBadge.className = 'mode-badge';
                modeBadge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Modo Simulación';
            } else {
                modeBadge.className = 'mode-badge google';
                modeBadge.innerHTML = '<i class="fa-solid fa-cloud-check"></i> Google Calendar API Conectado';
            }

            renderMatrixTable(currentScheduleData.grid);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            matrixTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">
                        <i class="fa-solid fa-triangle-exclamation fa-2x"></i><br>
                        <strong>No se pudo cargar el cuadrante.</strong> ${error.message}
                    </td>
                </tr>
            `;
        } finally {
            showLoading(false);
        }
    }

    function renderMatrixTable(grid) {
        if (!grid || grid.length === 0) {
            matrixTbody.innerHTML = '<tr><td colspan="5">No hay franjas disponibles.</td></tr>';
            return;
        }

        let html = '';

        grid.forEach(row => {
            const slot = row.slotInfo;
            const roomsData = row.rooms;

            html += `<tr>`;
            html += `<td class="time-cell"><i class="fa-regular fa-clock"></i> ${slot.timeLabel}</td>`;

            roomsList.forEach(room => {
                const roomSlot = roomsData[room.id];

                if (!roomSlot || roomSlot.status === 'FREE') {
                    html += `
                        <td>
                            <div class="slot-card free" onclick="window.appOpenBookingModal('${room.id}', ${slot.hour})">
                                <div class="slot-free-content">
                                    <span class="slot-free-text"><i class="fa-solid fa-check"></i> Disponible</span>
                                    <span class="btn-add-mini"><i class="fa-solid fa-plus"></i></span>
                                </div>
                            </div>
                        </td>
                    `;
                } else if (roomSlot.isMine) {
                    html += `
                        <td>
                            <div class="slot-card mine" onclick="window.appOpenDetailModal('${roomSlot.eventId}', '${room.id}')">
                                <div class="slot-header-row">
                                    <span class="slot-badge-mine">Mi Sesión</span>
                                    <i class="fa-solid fa-calendar-check"></i>
                                </div>
                                <div class="slot-patient">${escapeHtml(roomSlot.patientName)}</div>
                                <div class="slot-notes-preview">${escapeHtml(roomSlot.notes || 'Sin notas')}</div>
                            </div>
                        </td>
                    `;
                } else if (roomSlot.viewMode === 'FULL_BOSS_VIEW') {
                    html += `
                        <td>
                            <div class="slot-card occupied boss-view" onclick="window.appOpenDetailModal('${roomSlot.eventId}', '${room.id}')">
                                <div class="slot-header-row">
                                    <span class="slot-badge-boss">Sesión de Equipo</span>
                                    <i class="fa-solid fa-user-doctor"></i>
                                </div>
                                <div class="slot-psychologist-name">${escapeHtml(roomSlot.psychologistName)}</div>
                                <div class="slot-patient">Paciente: ${escapeHtml(roomSlot.patientName)}</div>
                            </div>
                        </td>
                    `;
                } else {
                    html += `
                        <td>
                            <div class="slot-card occupied">
                                <div class="slot-header-row">
                                    <span style="font-size: 0.7rem; font-weight: 700; color: #64748b;"><i class="fa-solid fa-lock"></i> MÁSCARA PRIVADA</span>
                                </div>
                                <div class="slot-patient" style="color: #64748b;">Sala Ocupada</div>
                                <div class="slot-notes-preview">Confidencialidad Clínica</div>
                            </div>
                        </td>
                    `;
                }
            });

            html += `</tr>`;
        });

        matrixTbody.innerHTML = html;
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingSpinner.classList.remove('hidden');
            matrixContainer.classList.add('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
            matrixContainer.classList.remove('hidden');
        }
    }

    // --- 5. Modal Handlers ---
    window.appOpenBookingModal = function(roomId, hour) {
        if (!currentUser) {
            modalLogin.classList.remove('hidden');
            return;
        }

        bookingPsychologistDisplay.value = `${currentUser.name} (${currentUser.title})`;
        bookingRoomSelect.value = roomId;

        bookingHourSelect.innerHTML = '';
        for (let h = 9; h < 20; h++) {
            const label = `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
            const selected = h === hour ? 'selected' : '';
            bookingHourSelect.innerHTML += `<option value="${h}" ${selected}>${label}</option>`;
        }

        bookingPatientInput.value = '';
        bookingNotesInput.value = '';

        modalBooking.classList.remove('hidden');
    };

    window.appOpenDetailModal = function(eventId, roomId) {
        if (!currentScheduleData) return;

        let foundSlot = null;
        let foundRoomData = null;

        for (const row of currentScheduleData.grid) {
            const rData = row.rooms[roomId];
            if (rData && rData.eventId === eventId) {
                foundSlot = row.slotInfo;
                foundRoomData = rData;
                break;
            }
        }

        if (!foundRoomData) return;

        activeDetailBooking = { eventId, roomId };

        const roomObj = roomsList.find(r => r.id === roomId);
        document.getElementById('detail-room-name').textContent = roomObj ? roomObj.name : roomId;
        document.getElementById('detail-time-label').textContent = foundSlot ? foundSlot.timeLabel : '1 hora';
        
        const ownerBadge = document.getElementById('detail-owner-badge');
        if (foundRoomData.isMine) {
            ownerBadge.textContent = 'Mi Sesión';
            ownerBadge.className = 'detail-pill badge-mine';
        } else {
            ownerBadge.textContent = 'Sesión de Equipo (Supervisión Jefa)';
            ownerBadge.className = 'detail-pill';
        }

        document.getElementById('detail-psychologist').textContent = foundRoomData.psychologistName;
        document.getElementById('detail-patient').textContent = foundRoomData.patientName;
        document.getElementById('detail-notes').textContent = foundRoomData.notes || 'Sin notas ingresadas.';

        if (foundRoomData.canCancel) {
            btnDeleteBooking.classList.remove('hidden');
        } else {
            btnDeleteBooking.classList.add('hidden');
        }

        modalDetail.classList.remove('hidden');
    };

    // Global Event Listeners
    function setupEventListeners() {
        btnOpenLogin.addEventListener('click', () => {
            loginErrorMsg.classList.add('hidden');
            modalLogin.classList.remove('hidden');
        });

        btnLogout.addEventListener('click', async () => {
            if (!confirm('¿Seguro que deseas cerrar la sesión?')) return;
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    credentials: 'include'
                });
            } catch (err) {
                console.error('Error al cerrar sesión:', err);
            } finally {
                localStorage.removeItem('auth_token');
                updateUserUI(null);
                renderLoggedOutState();
                modalLogin.classList.remove('hidden');
            }
        });

        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!username || !password) return;

            loginErrorMsg.classList.add('hidden');

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    loginErrorText.textContent = data.error || 'Credenciales incorrectas';
                    loginErrorMsg.classList.remove('hidden');
                    return;
                }

                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                }

                updateUserUI(data.user);
                modalLogin.classList.add('hidden');
                loginUsernameInput.value = '';
                loginPasswordInput.value = '';
                await fetchAndRenderSchedule();
            } catch (err) {
                console.error('Error en login:', err);
                loginErrorText.textContent = 'Error de conexión con el servidor.';
                loginErrorMsg.classList.remove('hidden');
            }
        });

        document.getElementById('btn-close-login-modal').addEventListener('click', () => modalLogin.classList.add('hidden'));

        document.getElementById('btn-close-booking-modal').addEventListener('click', () => modalBooking.classList.add('hidden'));
        document.getElementById('btn-cancel-booking-modal').addEventListener('click', () => modalBooking.classList.add('hidden'));

        document.getElementById('btn-close-detail-modal').addEventListener('click', () => modalDetail.classList.add('hidden'));
        document.getElementById('btn-close-detail-modal-2').addEventListener('click', () => modalDetail.classList.add('hidden'));

        formBooking.addEventListener('submit', async (e) => {
            e.preventDefault();

            const roomId = bookingRoomSelect.value;
            const hour = parseInt(bookingHourSelect.value, 10);
            const patientName = bookingPatientInput.value.trim();
            const notes = bookingNotesInput.value.trim();

            if (!patientName) return;

            try {
                const response = await fetch(`${API_BASE}/bookings`, {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    credentials: 'include',
                    body: JSON.stringify({
                        roomId,
                        date: currentDate,
                        hour,
                        patientName,
                        notes
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.error || 'No se pudo crear la reserva.');
                    return;
                }

                modalBooking.classList.add('hidden');
                await fetchAndRenderSchedule();
            } catch (error) {
                console.error('Error creando reserva:', error);
                alert('Error de conexión al guardar la reserva.');
            }
        });

        btnDeleteBooking.addEventListener('click', async () => {
            if (!activeDetailBooking) return;
            if (!confirm('¿Estás seguro de que deseas cancelar esta reserva de sala?')) return;

            try {
                const response = await fetch(`${API_BASE}/bookings/${activeDetailBooking.eventId}?roomId=${activeDetailBooking.roomId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                    credentials: 'include'
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.error || 'No se pudo cancelar la reserva.');
                    return;
                }

                modalDetail.classList.add('hidden');
                await fetchAndRenderSchedule();
            } catch (error) {
                console.error('Error eliminando reserva:', error);
                alert('Error al conectar con el servidor.');
            }
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    init();
});
