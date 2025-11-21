const API_URL = 'http://localhost:8001';
let citasGlobales = [];

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarCentros();
    cargarEspecialidades();
    cargarCitas();
    configurarFechaMinima();
    actualizarDashboard();
});

// Configurar fecha mínima (hoy)
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
        mostrarToast('Error al cargar centros de salud', 'error');
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
        mostrarToast('Error al cargar especialidades', 'error');
    }
}

// Manejar envío del formulario
document.getElementById('formCita').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const cita = {
        paciente: document.getElementById('paciente').value,
        telefono: document.getElementById('telefono').value,
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
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('Cita agendada exitosamente', 'success');
            document.getElementById('formCita').reset();
            cargarCitas();
            actualizarDashboard();
        } else {
            mostrarToast('Error al agendar la cita', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión con el servidor', 'error');
    }
});

// Cargar todas las citas
async function cargarCitas() {
    try {
        const response = await fetch(`${API_URL}/citas`);
        const data = await response.json();
        citasGlobales = data.citas;
        
        const listaCitas = document.getElementById('listaCitas');
        
        if (data.citas.length === 0) {
            listaCitas.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #9CA3AF;">
                    <i class="fas fa-calendar-times" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p style="font-size: 18px; font-weight: 600;">No hay citas agendadas</p>
                    <p style="font-size: 14px; margin-top: 8px;">Las citas que agendes aparecerán aquí</p>
                </div>
            `;
            return;
        }
        
        mostrarCitas(data.citas);
        actualizarDashboard();
        cargarEstadisticas();
    } catch (error) {
        console.error('Error al cargar citas:', error);
        mostrarToast('Error al cargar las citas', 'error');
    }
}

// Mostrar citas en la lista
function mostrarCitas(citas) {
    const listaCitas = document.getElementById('listaCitas');
    listaCitas.innerHTML = '';
    
    citas.forEach(cita => {
        const citaCard = document.createElement('div');
        citaCard.className = 'cita-card';
        citaCard.innerHTML = `
            <h3><i class="fas fa-calendar-check"></i> Cita #${cita.id}</h3>
            <span class="estado ${cita.estado.toLowerCase()}">${cita.estado}</span>
            <div class="cita-info">
                <p><strong><i class="fas fa-user"></i> Paciente:</strong> ${cita.paciente}</p>
                <p><strong><i class="fas fa-phone"></i> Teléfono:</strong> ${cita.telefono}</p>
                <p><strong><i class="fas fa-hospital"></i> Centro:</strong> ${cita.centro_salud}</p>
                <p><strong><i class="fas fa-stethoscope"></i> Especialidad:</strong> ${cita.especialidad}</p>
                <p><strong><i class="fas fa-calendar-alt"></i> Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong><i class="fas fa-clock"></i> Hora:</strong> ${cita.hora}</p>
            </div>
            <p style="margin-top: 15px;"><strong><i class="fas fa-notes-medical"></i> Motivo:</strong> ${cita.motivo}</p>
            <div class="cita-actions">
                <button class="btn-cancelar" onclick="cancelarCita(${cita.id})">
                    <i class="fas fa-times-circle"></i> Cancelar Cita
                </button>
            </div>
        `;
        listaCitas.appendChild(citaCard);
    });
}

// Filtrar citas por estado
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

// Cancelar una cita
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
            cargarCitas();
            actualizarDashboard();
        } else {
            mostrarToast('Error al cancelar la cita', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Actualizar dashboard
async function actualizarDashboard() {
    try {
        const response = await fetch(`${API_URL}/estadisticas`);
        const data = await response.json();
        
        document.getElementById('dash-total').textContent = data.total_citas;
        document.getElementById('dash-especialidades').textContent = Object.keys(data.por_especialidad).length;
        document.getElementById('dash-centros').textContent = Object.keys(data.por_centro).length;
        document.getElementById('dash-pendientes').textContent = data.por_estado['Pendiente'] || 0;
        
        // Mostrar citas recientes
        const recentContainer = document.getElementById('recent-appointments');
        if (citasGlobales.length > 0) {
            const recientes = citasGlobales.slice(-5).reverse();
            recentContainer.innerHTML = recientes.map(cita => `
                <div style="padding: 15px; border-left: 3px solid #4F46E5; background: #F9FAFB; border-radius: 8px; margin-bottom: 12px;">
                    <p style="font-weight: 600; color: #1F2937; margin-bottom: 8px;">
                        <i class="fas fa-user"></i> ${cita.paciente}
                    </p>
                    <p style="font-size: 13px; color: #6B7280;">
                        <i class="fas fa-stethoscope"></i> ${cita.especialidad} - ${formatearFecha(cita.fecha)} ${cita.hora}
                    </p>
                </div>
            `).join('');
        } else {
            recentContainer.innerHTML = '<p style="text-align: center; color: #9CA3AF; padding: 40px;">No hay citas recientes</p>';
        }
    } catch (error) {
        console.error('Error al actualizar dashboard:', error);
    }
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        const response = await fetch(`${API_URL}/estadisticas`);
        const data = await response.json();
        
        document.getElementById('totalCitas').textContent = data.total_citas;
        
        const chartEsp = document.getElementById('chartEspecialidades');
        const chartCentros = document.getElementById('chartCentros');
        
        chartEsp.innerHTML = generarGraficoBarras(data.por_especialidad);
        chartCentros.innerHTML = generarGraficoBarras(data.por_centro);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Generar gráfico de barras
function generarGraficoBarras(datos) {
    if (Object.keys(datos).length === 0) {
        return '<p style="text-align: center; color: #9CA3AF; padding: 40px;">No hay datos disponibles</p>';
    }
    
    const maxValor = Math.max(...Object.values(datos));
    let html = '<div style="padding: 20px 0;">';
    
    const colores = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    let colorIndex = 0;
    
    for (const [clave, valor] of Object.entries(datos)) {
        const porcentaje = (valor / maxValor) * 100;
        const color = colores[colorIndex % colores.length];
        colorIndex++;
        
        html += `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: #1F2937; font-size: 14px;">${clave}</span>
                    <span style="color: ${color}; font-weight: 700; font-size: 16px;">${valor}</span>
                </div>
                <div style="background: #F3F4F6; height: 12px; border-radius: 6px; overflow: hidden;">
                    <div style="background: ${color}; height: 100%; width: ${porcentaje}%; 
                                transition: width 0.8s ease; border-radius: 6px;"></div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Formatear fecha
function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', opciones);
}

// Mostrar toast notifications
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
    // Actualizar títulos
    const titulos = {
        'dashboard': { titulo: 'Dashboard', subtitulo: 'Resumen general del sistema' },
        'agendar': { titulo: 'Agendar Cita', subtitulo: 'Complete el formulario para agendar' },
        'consultar': { titulo: 'Mis Citas', subtitulo: 'Gestiona tus citas agendadas' },
        'estadisticas': { titulo: 'Reportes', subtitulo: 'Análisis y estadísticas del sistema' }
    };
    
    document.getElementById('page-title').textContent = titulos[seccionId].titulo;
    document.getElementById('page-subtitle').textContent = titulos[seccionId].subtitulo;
    
    // Ocultar todas las secciones
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.classList.remove('active');
    });
    
    // Desactivar todos los botones del nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    document.getElementById(seccionId).classList.add('active');
    
    // Activar botón correspondiente
    event.target.closest('.nav-item').classList.add('active');
    
    // Recargar datos según la sección
    if (seccionId === 'estadisticas') {
        cargarEstadisticas();
    } else if (seccionId === 'consultar') {
        cargarCitas();
    } else if (seccionId === 'dashboard') {
        actualizarDashboard();
    }
}

// Función para exportar datos (placeholder)
function exportarDatos() {
    mostrarToast('Función de exportación en desarrollo', 'success');
}

// Animación para slideOut
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);