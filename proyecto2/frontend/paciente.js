const API_URL = 'http://localhost:8001';
let usuario = null;
let citasGlobales = [];

// Verificar autenticación y cargar datos
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    cargarDatosIniciales();
});

function verificarAutenticacion() {
    const usuarioData = localStorage.getItem('usuario');
    
    if (!usuarioData) {
        window.location.href = 'login.html';
        return;
    }
    
    usuario = JSON.parse(usuarioData);
    
    // Verificar que sea paciente
    if (usuario.tipo !== 'paciente') {
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar nombre del usuario
    document.getElementById('userName').textContent = usuario.nombre;
}

function cerrarSesion() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}

async function cargarDatosIniciales() {
    cargarCentros();
    cargarEspecialidades();
    cargarCitasPaciente();
    cargarExamenesPaciente();
    configurarFechaMinima();
}

function configurarFechaMinima() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').min = hoy;
}

// Cargar centros de salud
async function cargarCentros() {
    try {
        const response = await fetch(`${API_URL}/centros`);
        const data = await response.json();
        const select = document.getElementById('centro_salud');
        
        data.centros.forEach(centro => {
            const option = document.createElement('option');
            option.value = centro;
            option.textContent = centro;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar centros:', error);
    }
}

// Cargar especialidades
async function cargarEspecialidades() {
    try {
        const response = await fetch(`${API_URL}/especialidades`);
        const data = await response.json();
        const select = document.getElementById('especialidad');
        
        data.especialidades.forEach(especialidad => {
            const option = document.createElement('option');
            option.value = especialidad;
            option.textContent = especialidad;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar especialidades:', error);
    }
}

// Variable para prevenir envíos múltiples
let enviandoCita = false;

// Agendar cita
document.getElementById('formCita').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Prevenir envíos múltiples
    if (enviandoCita) return;
    enviandoCita = true;
    
    const cita = {
        paciente: usuario.nombre,
        cedula: usuario.cedula,
        telefono: usuario.telefono || '',
        centro_salud: document.getElementById('centro_salud').value,
        especialidad: document.getElementById('especialidad').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        motivo: document.getElementById('motivo').value,
        estado: 'Pendiente'
    };
    
    try {
        const response = await fetch(`${API_URL}/citas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cita)
        });
        
        if (response.ok) {
            mostrarToast('¡Cita agendada exitosamente!', 'success');
            
            // Agregar notificación en tiempo real
            agregarNotificacionPaciente(
                'success',
                'calendar-check',
                'Cita agendada exitosamente',
                `Tu cita para ${cita.especialidad} en ${cita.centro_salud} ha sido registrada`
            );
            
            document.getElementById('formCita').reset();
            await cargarCitasPaciente();
            
            // Cambiar a sección de citas después de un pequeño delay
            setTimeout(() => {
                const event = new Event('click');
                const seccionCitas = Array.from(document.querySelectorAll('.nav-item')).find(
                    item => item.textContent.includes('Mis Citas')
                );
                if (seccionCitas) {
                    seccionCitas.click();
                }
            }, 500);
        } else {
            mostrarToast('Error al agendar la cita', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión con el servidor', 'error');
    } finally {
        // Permitir nuevos envíos después de 2 segundos
        setTimeout(() => {
            enviandoCita = false;
        }, 2000);
    }
});

// Cargar citas del paciente
async function cargarCitasPaciente() {
    try {
        const response = await fetch(`${API_URL}/citas?cedula=${usuario.cedula}`);
        const data = await response.json();
        citasGlobales = data.citas;
        
        console.log('Citas cargadas:', citasGlobales); // DEBUG
        
        actualizarEstadisticas();
        
        // Si no hay citas en absoluto, mostrar mensaje especial
        const listaCitas = document.getElementById('listaCitas');
        if (data.citas.length === 0) {
            listaCitas.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #9CA3AF;">
                    <i class="fas fa-calendar-times" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p style="font-size: 18px; font-weight: 600;">No tienes citas agendadas</p>
                    <button onclick="mostrarSeccion('agendar')" style="margin-top: 20px; padding: 12px 24px; background: #4F46E5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-plus-circle"></i> Agendar Mi Primera Cita
                    </button>
                </div>
            `;
        } else {
            mostrarCitas(data.citas);
        }
        
        mostrarProximasCitas(data.citas);
        mostrarHistorial(data.citas);
        cargarNotificacionesPaciente();
    } catch (error) {
        console.error('Error al cargar citas:', error);
    }
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const total = citasGlobales.length;
    const activas = citasGlobales.filter(c => c.estado === 'Pendiente' || c.estado === 'Confirmada');
    const completadas = citasGlobales.filter(c => c.estado === 'Completada');
    
    document.getElementById('total-citas').textContent = total;
    document.getElementById('citas-completadas').textContent = completadas.length;
    
    // Próxima cita (buscar en Pendientes o Confirmadas)
    if (activas.length > 0) {
        const proxima = activas
            .filter(c => new Date(c.fecha) >= new Date())
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
        
        if (proxima) {
            const fecha = new Date(proxima.fecha + 'T00:00:00');
            document.getElementById('proxima-cita').textContent = fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        } else {
            document.getElementById('proxima-cita').textContent = 'N/A';
        }
    } else {
        document.getElementById('proxima-cita').textContent = 'N/A';
    }
}

// Mostrar próximas citas en el inicio
function mostrarProximasCitas(citas) {
    const container = document.getElementById('proximas-citas');
    
    // Filtrar citas activas (Pendientes o Confirmadas) y futuras
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const citasActivas = citas
        .filter(c => (c.estado === 'Pendiente' || c.estado === 'Confirmada') && new Date(c.fecha) >= hoy)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        .slice(0, 3);
    
    if (citasActivas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9CA3AF; padding: 40px;">No tienes citas próximas</p>';
        return;
    }
    
    container.innerHTML = citasActivas.map(cita => `
        <div style="padding: 15px; border-left: 3px solid ${cita.estado === 'Confirmada' ? '#10B981' : '#4F46E5'}; background: #F9FAFB; border-radius: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <p style="font-weight: 600; color: #1F2937;">
                    <i class="fas fa-stethoscope"></i> ${cita.especialidad}
                </p>
                <span class="estado ${cita.estado.toLowerCase()}" style="position: static; padding: 4px 12px; font-size: 11px;">${cita.estado}</span>
            </div>
            <p style="font-size: 13px; color: #6B7280;">
                <i class="fas fa-hospital"></i> ${cita.centro_salud}
            </p>
            <p style="font-size: 13px; color: #6B7280; margin-top: 5px;">
                <i class="fas fa-calendar"></i> ${formatearFecha(cita.fecha)} - ${cita.hora}
            </p>
        </div>
    `).join('');
}

// Mostrar citas
function mostrarCitas(citas) {
    const listaCitas = document.getElementById('listaCitas');
    
    if (citas.length === 0) {
        listaCitas.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #9CA3AF;">
                <i class="fas fa-calendar-times" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p style="font-size: 18px; font-weight: 600;">No hay citas con este estado</p>
                <p style="font-size: 14px; margin-top: 8px;">Intenta con otro filtro</p>
            </div>
        `;
        return;
    }
    
    listaCitas.innerHTML = '';
    
    citas.forEach(cita => {
        const citaCard = document.createElement('div');
        citaCard.className = 'cita-card';
        citaCard.innerHTML = `
            <h3><i class="fas fa-calendar-check"></i> Cita #${cita.id}</h3>
            <span class="estado ${cita.estado.toLowerCase()}">${cita.estado}</span>
            <div class="cita-info">
                <p><strong><i class="fas fa-hospital"></i> Centro:</strong> ${cita.centro_salud}</p>
                <p><strong><i class="fas fa-stethoscope"></i> Especialidad:</strong> ${cita.especialidad}</p>
                <p><strong><i class="fas fa-calendar-alt"></i> Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong><i class="fas fa-clock"></i> Hora:</strong> ${cita.hora}</p>
            </div>
            <p style="margin-top: 15px;"><strong><i class="fas fa-notes-medical"></i> Motivo:</strong> ${cita.motivo}</p>
            ${cita.estado === 'Pendiente' ? `
            <div class="cita-actions">
                <button class="btn-cancelar" onclick="cancelarCita(${cita.id})">
                    <i class="fas fa-times-circle"></i> Cancelar Cita
                </button>
            </div>
            ` : ''}
        `;
        listaCitas.appendChild(citaCard);
    });
}

// Filtrar citas
function filtrarCitas(estado) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (estado === 'todas') {
        mostrarCitas(citasGlobales);
    } else {
        const citasFiltradas = citasGlobales.filter(c => c.estado === estado);
        mostrarCitas(citasFiltradas);
    }
}

// Mostrar historial
function mostrarHistorial(citas) {
    const container = document.getElementById('historialCitas');
    const todasCitas = citas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (todasCitas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9CA3AF; padding: 40px;">No tienes historial de citas</p>';
        return;
    }
    
    container.innerHTML = todasCitas.map(cita => `
        <div class="cita-card">
            <h3><i class="fas fa-calendar-check"></i> ${cita.especialidad}</h3>
            <span class="estado ${cita.estado.toLowerCase()}">${cita.estado}</span>
            <div class="cita-info">
                <p><strong>Centro:</strong> ${cita.centro_salud}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong>Hora:</strong> ${cita.hora}</p>
            </div>
            <p style="margin-top: 10px;"><strong>Motivo:</strong> ${cita.motivo}</p>
        </div>
    `).join('');
}

// Cancelar cita
async function cancelarCita(id) {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/citas/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarToast('Cita cancelada exitosamente', 'success');
            cargarCitasPaciente();
        } else {
            mostrarToast('Error al cancelar la cita', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Cargar exámenes
async function cargarExamenesPaciente() {
    try {
        const response = await fetch(`${API_URL}/examenes/${usuario.cedula}`);
        const data = await response.json();
        
        document.getElementById('total-examenes').textContent = data.total;
        mostrarExamenes(data.examenes);
    } catch (error) {
        console.error('Error al cargar exámenes:', error);
    }
}

// Mostrar exámenes
function mostrarExamenes(examenes) {
    const container = document.getElementById('listaExamenes');
    
    if (examenes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #9CA3AF;">
                <i class="fas fa-flask" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p style="font-size: 18px; font-weight: 600;">No tienes exámenes registrados</p>
                <p style="font-size: 14px; margin-top: 8px;">Los resultados de tus exámenes aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = examenes.map(examen => `
        <div class="cita-card">
            <h3><i class="fas fa-flask"></i> ${examen.tipo_examen}</h3>
            <div class="cita-info">
                <p><strong>Fecha:</strong> ${formatearFecha(examen.fecha)}</p>
                <p><strong>Resultado:</strong> ${examen.resultado}</p>
            </div>
            ${examen.archivo_url ? `
            <button style="margin-top: 15px; padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-download"></i> Descargar Resultado
            </button>
            ` : ''}
        </div>
    `).join('');
}

// Formatear fecha
function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', opciones);
}

// Mostrar toast
function mostrarToast(mensaje, tipo) {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const icon = tipo === 'success' ? 'check-circle' : 'exclamation-circle';
    const title = tipo === 'success' ? 'Éxito' : 'Error';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Cambiar entre secciones
function mostrarSeccion(seccionId) {
    const titulos = {
        'inicio': { titulo: 'Inicio', subtitulo: 'Bienvenido a tu portal de salud' },
        'agendar': { titulo: 'Agendar Cita', subtitulo: 'Complete el formulario para agendar' },
        'mis-citas': { titulo: 'Mis Citas', subtitulo: 'Gestiona tus citas médicas' },
        'historial': { titulo: 'Historial', subtitulo: 'Todas tus citas pasadas' },
        'examenes': { titulo: 'Mis Exámenes', subtitulo: 'Resultados de exámenes médicos' }
    };
    
    document.getElementById('page-title').textContent = titulos[seccionId].titulo;
    document.getElementById('page-subtitle').textContent = titulos[seccionId].subtitulo;
    
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(seccionId).classList.add('active');
    
    // Solo intentar activar el botón si existe un evento
    if (event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    } else {
        // Activar el nav-item correcto basado en el seccionId
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const onclick = item.getAttribute('onclick');
            if (onclick && onclick.includes(seccionId)) {
                item.classList.add('active');
            }
        });
    }
}

// Sistema de Notificaciones para Paciente
let notificaciones = [];

function calcularTiempoTranscurrido(timestamp) {
    const ahora = new Date();
    const entonces = new Date(timestamp);
    const diferencia = Math.floor((ahora - entonces) / 1000);
    
    if (diferencia < 60) {
        return 'Ahora mismo';
    } else if (diferencia < 3600) {
        const minutos = Math.floor(diferencia / 60);
        return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    } else if (diferencia < 86400) {
        const horas = Math.floor(diferencia / 3600);
        return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    } else {
        const dias = Math.floor(diferencia / 86400);
        return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }
}

function cargarNotificacionesPaciente() {
    const nuevasNotificaciones = [];
    
    const hoy = new Date();
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    citasGlobales.forEach(cita => {
        const fechaCita = new Date(cita.fecha + 'T00:00:00');
        
        // Notificación: Cita para mañana (Pendiente o Confirmada)
        if (fechaCita.toDateString() === mañana.toDateString() && (cita.estado === 'Pendiente' || cita.estado === 'Confirmada')) {
            const timestamp = new Date(Date.now() - 1 * 60 * 60 * 1000);
            nuevasNotificaciones.push({
                id: `cita-${cita.id}`,
                tipo: 'warning',
                icon: 'calendar-check',
                titulo: 'Recordatorio de cita',
                mensaje: `Tienes una cita mañana: ${cita.especialidad} en ${cita.centro_salud} a las ${cita.hora}`,
                timestamp: timestamp,
                leida: false
            });
        }
        
        // Notificación: Cita confirmada
        if (cita.estado === 'Confirmada') {
            const timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000);
            nuevasNotificaciones.push({
                id: `confirmada-${cita.id}`,
                tipo: 'success',
                icon: 'check-circle',
                titulo: 'Cita confirmada',
                mensaje: `Tu cita de ${cita.especialidad} ha sido confirmada para el ${formatearFecha(cita.fecha)}`,
                timestamp: timestamp,
                leida: false
            });
        }
    });
    
    // Notificación de bienvenida
    if (citasGlobales.length === 0) {
        nuevasNotificaciones.push({
            id: 'bienvenida',
            tipo: 'info',
            icon: 'hand-wave',
            titulo: '¡Bienvenido a MediCitas!',
            mensaje: 'Agenda tu primera cita médica de forma rápida y sencilla.',
            timestamp: new Date(),
            leida: false
        });
    }
    
    // Combinar sin duplicar
    nuevasNotificaciones.forEach(nueva => {
        const existe = notificaciones.find(n => n.id === nueva.id);
        if (!existe) {
            notificaciones.unshift(nueva);
        }
    });
    
    // Ordenar por timestamp
    notificaciones.sort((a, b) => b.timestamp - a.timestamp);
    
    actualizarBadgeNotificaciones();
}

function agregarNotificacionPaciente(tipo, icon, titulo, mensaje) {
    const nuevaNotif = {
        id: `notif-${Date.now()}`,
        tipo: tipo,
        icon: icon,
        titulo: titulo,
        mensaje: mensaje,
        timestamp: new Date(),
        leida: false
    };
    
    notificaciones.unshift(nuevaNotif);
    actualizarBadgeNotificaciones();
    
    const panel = document.getElementById('notifications-panel-paciente');
    if (panel && panel.classList.contains('show')) {
        renderizarNotificaciones();
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notifications-panel-paciente');
    panel.classList.toggle('show');
    
    if (panel.classList.contains('show')) {
        renderizarNotificaciones();
        setTimeout(() => {
            document.addEventListener('click', cerrarNotificacionesClick);
        }, 100);
    } else {
        document.removeEventListener('click', cerrarNotificacionesClick);
    }
}

function cerrarNotificacionesClick(e) {
    const panel = document.getElementById('notifications-panel-paciente');
    const btn = document.querySelector('.notification-btn');
    
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('show');
        document.removeEventListener('click', cerrarNotificacionesClick);
    }
}

function renderizarNotificaciones() {
    const container = document.getElementById('notifications-list-paciente');
    
    if (notificaciones.length === 0) {
        container.innerHTML = `
            <div class="notifications-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No tienes notificaciones</p>
            </div>
        `;
        return;
    }
    
    const notificacionesOrdenadas = [...notificaciones].sort((a, b) => b.timestamp - a.timestamp);
    
    container.innerHTML = notificacionesOrdenadas.map(notif => `
        <div class="notification-item ${notif.leida ? '' : 'unread'}" onclick="marcarComoLeida('${notif.id}')">
            <div class="notification-icon ${notif.tipo}">
                <i class="fas fa-${notif.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notif.titulo}</div>
                <div class="notification-message">${notif.mensaje}</div>
                <div class="notification-time"><i class="fas fa-clock"></i> ${calcularTiempoTranscurrido(notif.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function marcarComoLeida(id) {
    const notif = notificaciones.find(n => n.id === id);
    if (notif) {
        notif.leida = true;
        actualizarBadgeNotificaciones();
        renderizarNotificaciones();
    }
}

function markAllRead() {
    notificaciones.forEach(n => n.leida = true);
    actualizarBadgeNotificaciones();
    renderizarNotificaciones();
}

function actualizarBadgeNotificaciones() {
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    const badge = document.getElementById('notif-badge-paciente');
    
    if (badge) {
        if (noLeidas > 0) {
            badge.textContent = noLeidas;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Actualizar tiempos cada minuto
setInterval(() => {
    const panel = document.getElementById('notifications-panel-paciente');
    if (panel && panel.classList.contains('show')) {
        renderizarNotificaciones();
    }
}, 60000);

// Auto-recargar citas cada 30 segundos para detectar cambios
setInterval(() => {
    cargarCitasPaciente();
}, 30000);