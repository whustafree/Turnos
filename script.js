let turnos = JSON.parse(localStorage.getItem('turnos')) || {};
let diaSeleccionado = null;

const FERIADOS = {
    'Año Nuevo': y => new Date(y, 0, 1),
    'Día del Trabajo': y => new Date(y, 4, 1),
    'Glorias Navales': y => new Date(y, 4, 21),
    'Fiestas Patrias': y => new Date(y, 8, 18),
    'Navidad': y => new Date(y, 11, 25)
};

function actualizarCalendario() {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const grid = document.getElementById('calendar');
    grid.innerHTML = '';

    const diasMes = new Date(año, parseInt(mes) + 1, 0).getDate();
    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;

    // Headers
    ['Lu','Ma','Mi','Ju','Vi','Sa','Do'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'day-header';
        h.textContent = d;
        grid.appendChild(h);
    });

    // Vacíos
    for(let i=0; i<primerDia; i++) grid.appendChild(document.createElement('div'));

    // Días
    for(let d=1; d<=diasMes; d++) {
        const div = document.createElement('div');
        div.className = 'day';
        div.innerHTML = `<span class="text-sm font-bold">${d}</span>`;
        
        const data = turnos[año]?.[mes]?.[d];
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                const badge = document.createElement('div');
                badge.className = `turno ${t}`;
                badge.textContent = t.toUpperCase();
                div.appendChild(badge);
            });
        }

        div.onclick = () => abrirModal(d);
        grid.appendChild(div);
    }
    actualizarEstadisticas();
}

function abrirModal(dia) {
    diaSeleccionado = dia;
    document.getElementById('turnoModal').classList.add('active');
}

function cerrarModal() {
    document.getElementById('turnoModal').classList.remove('active');
}

function agregarTurno() {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const tipo = document.getElementById('turnoSelect').value;

    if(!turnos[año]) turnos[año] = {};
    if(!turnos[año][mes]) turnos[año][mes] = {};
    if(!turnos[año][mes][diaSeleccionado]) turnos[año][mes][diaSeleccionado] = { turnos: [] };

    if(!turnos[año][mes][diaSeleccionado].turnos.includes(tipo)) {
        turnos[año][mes][diaSeleccionado].turnos.push(tipo);
        guardarYRefrescar();
    }
    cerrarModal();
}

function quitarTurno() {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    if(turnos[año]?.[mes]?.[diaSeleccionado]) {
        delete turnos[año][mes][diaSeleccionado];
        guardarYRefrescar();
    }
    cerrarModal();
}

function completarCalendario() {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const patron = document.getElementById('patronSelect').value; // Ej: "3x3"
    const [t, d] = patron.split('x').map(Number);
    
    if(!turnos[año]) turnos[año] = {};
    turnos[año][mes] = {};

    const diasMes = new Date(año, parseInt(mes) + 1, 0).getDate();
    let trabajando = true;
    let contador = 0;

    for(let dia=1; dia<=diasMes; dia++) {
        if(trabajando) {
            turnos[año][mes][dia] = { turnos: ['dia'] };
            contador++;
            if(contador >= t) { trabajando = false; contador = 0; }
        } else {
            contador++;
            if(contador >= d) { trabajando = true; contador = 0; }
        }
    }
    guardarYRefrescar();
}

function guardarYRefrescar() {
    localStorage.setItem('turnos', JSON.stringify(turnos));
    actualizarCalendario();
}

function cambiarPestaña(id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab, .mobile-nav-item').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    document.querySelector(`[onclick="cambiarPestaña('${id}')"]`).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const ySel = document.getElementById('yearSelect');
    const actual = new Date().getFullYear();
    for(let i=actual-1; i<=actual+2; i++) {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = i;
        ySel.appendChild(opt);
    }
    ySel.value = actual;
    document.getElementById('monthSelect').value = new Date().getMonth();
    actualizarCalendario();
});