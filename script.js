let turnos = {};
let diaSeleccionado = null;
let feriadosCache = {};

// --- FERIADOS DE CHILE ---
const FERIADOS = {
    'Año Nuevo': y => new Date(y, 0, 1),
    'Día del Trabajo': y => new Date(y, 4, 1),
    'Glorias Navales': y => new Date(y, 4, 21),
    'Virgen del Carmen': y => new Date(y, 6, 16),
    'Asunción': y => new Date(y, 7, 15),
    'Fiestas Patrias': y => new Date(y, 8, 18),
    'Glorias del Ejército': y => new Date(y, 8, 19),
    'Encuentro Dos Mundos': y => new Date(y, 9, 12),
    'Inmaculada': y => new Date(y, 11, 8),
    'Navidad': y => new Date(y, 11, 25)
};

function esFeriado(fecha) {
    const y = fecha.getFullYear();
    if (!feriadosCache[y]) {
        feriadosCache[y] = {};
        Object.entries(FERIADOS).forEach(([nombre, fn]) => {
            feriadosCache[y][fn(y).toDateString()] = nombre;
        });
    }
    return feriadosCache[y][fecha.toDateString()] || false;
}

// --- GESTIÓN DE SESIÓN ---
async function revisarSesion() {
    const { data: { session } } = await window.supabase.auth.getSession();
    const loginScreen = document.getElementById('loginScreen');
    const appContent = document.getElementById('appContent');

    if (session) {
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        await cargarDatosSupabase(session.user.id);
    } else {
        loginScreen.classList.remove('hidden');
        appContent.classList.add('hidden');
    }
}

window.supabase.auth.onAuthStateChange(() => revisarSesion());

window.login = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
};

window.registro = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    const { error } = await window.supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("¡Registro exitoso! Ya puedes entrar.");
};

window.cerrarSesion = () => window.supabase.auth.signOut();

// --- BASE DE DATOS ---
async function guardarDatosSupabase() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
        await window.supabase.from('usuarios_turnos').upsert({ 
            user_id: user.id, 
            datos_turnos: turnos,
            updated_at: new Date() 
        }, { onConflict: 'user_id' });
    }
}

async function cargarDatosSupabase(userId) {
    const { data } = await window.supabase
        .from('usuarios_turnos')
        .select('datos_turnos')
        .eq('user_id', userId)
        .maybeSingle();

    if (data) {
        turnos = data.datos_turnos || {};
        window.actualizarCalendario();
    }
}

// --- LÓGICA CALENDARIO ---
window.actualizarCalendario = () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const grid = document.getElementById('calendar');
    const mesTxt = document.getElementById('monthYear');
    if (!grid) return;
    grid.innerHTML = '';

    const fechaHeader = new Date(año, mes);
    mesTxt.innerText = fechaHeader.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;
    const totalDias = new Date(año, parseInt(mes) + 1, 0).getDate();

    // Headers
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(h => {
        const div = document.createElement('div');
        div.className = 'text-center text-gray-500 font-bold text-xs py-2';
        div.innerText = h;
        grid.appendChild(div);
    });

    for(let i=0; i<primerDia; i++) grid.appendChild(document.createElement('div'));

    for(let d=1; d<=totalDias; d++) {
        const date = new Date(año, mes, d);
        const feriado = esFeriado(date);
        const div = document.createElement('div');
        div.className = `day bg-gray-900 border ${feriado ? 'border-red-900' : 'border-gray-800'} rounded-lg p-1 min-h-[70px] flex flex-col items-center cursor-pointer hover:bg-gray-800`;
        
        let html = `<span class="text-xs ${feriado ? 'text-red-500' : 'text-gray-500'} font-bold">${d}</span>`;
        if (feriado) html += `<div class="w-1 h-1 bg-red-500 rounded-full"></div>`;
        div.innerHTML = html;

        const data = turnos[año]?.[mes]?.[d];
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                const badge = document.createElement('div');
                const color = t.includes('noche') ? 'bg-indigo-600' : 'bg-yellow-500';
                badge.className = `${color} w-full text-[8px] rounded mt-1 text-white text-center font-bold uppercase py-0.5`;
                badge.innerText = t.replace('extra-', 'E-');
                div.appendChild(badge);
            });
        }
        div.onclick = () => abrirModal(d);
        grid.appendChild(div);
    }
    window.calcularEstadisticas();
};

// --- ESTADÍSTICAS ---
window.calcularEstadisticas = () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const diasMes = new Date(año, parseInt(mes) + 1, 0).getDate();
    
    let hNormales = 0;
    let hExtras = 0;
    let trabajados = 0;
    let detalle = [];

    if(turnos[año]?.[mes]) {
        Object.entries(turnos[año][mes]).forEach(([dia, obj]) => {
            trabajados++;
            obj.turnos.forEach(t => {
                if(t.includes('extra')) hExtras += 12;
                else hNormales += 12;
                detalle.push(`Día ${dia}: ${t.toUpperCase()}`);
            });
        });
    }

    document.getElementById('diasTrabajados').innerText = trabajados;
    document.getElementById('diasLibres').innerText = diasMes - trabajados;
    document.getElementById('horasNormales').innerText = hNormales;
    document.getElementById('horasExtras').innerText = hExtras;
    document.getElementById('diasNormales').value = detalle.join('\n');
};

// --- MODAL ---
function abrirModal(dia) {
    diaSeleccionado = dia;
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const data = turnos[año]?.[mes]?.[dia];
    document.getElementById('nota').value = data?.nota || '';
    const modal = document.getElementById('turnoModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.cerrarModal = () => {
    document.getElementById('turnoModal').classList.add('hidden');
    document.getElementById('turnoModal').classList.remove('flex');
};

window.agregarTurno = async () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const tipo = document.getElementById('turnoSelect').value;
    const nota = document.getElementById('nota').value;

    if(!turnos[año]) turnos[año] = {};
    if(!turnos[año][mes]) turnos[año][mes] = {};
    if(!turnos[año][mes][diaSeleccionado]) turnos[año][mes][diaSeleccionado] = { turnos: [], nota: '' };

    if(!turnos[año][mes][diaSeleccionado].turnos.includes(tipo)) {
        turnos[año][mes][diaSeleccionado].turnos.push(tipo);
        turnos[año][mes][diaSeleccionado].nota = nota;
        window.actualizarCalendario();
        await guardarDatosSupabase();
    }
    window.cerrarModal();
};

window.quitarTurno = async () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    if(turnos[año]?.[mes]?.[diaSeleccionado]) {
        delete turnos[año][mes][diaSeleccionado];
        window.actualizarCalendario();
        await guardarDatosSupabase();
    }
    window.cerrarModal();
};

// --- HERRAMIENTAS ---
window.completarCalendario = async () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const patron = document.getElementById('patronSelect').value;
    const [trabajo, descanso] = patron.split('x').map(Number);
    const diasMes = new Date(año, parseInt(mes) + 1, 0).getDate();

    if(!turnos[año]) turnos[año] = {};
    turnos[año][mes] = {};

    let esTrabajo = true;
    let contador = 0;
    for(let d=1; d<=diasMes; d++) {
        if(esTrabajo) {
            turnos[año][mes][d] = { turnos: ['dia'], nota: '' };
            contador++;
            if(contador >= trabajo) { esTrabajo = false; contador = 0; }
        } else {
            contador++;
            if(contador >= descanso) { esTrabajo = true; contador = 0; }
        }
    }
    window.actualizarCalendario();
    await guardarDatosSupabase();
};

window.limpiarMes = async () => {
    if(!confirm("¿Borrar todos los turnos del mes?")) return;
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    if(turnos[año]?.[mes]) {
        delete turnos[año][mes];
        window.actualizarCalendario();
        await guardarDatosSupabase();
    }
};

window.cambiarPestaña = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active', 'border-blue-500'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    event.currentTarget.classList.add('active', 'border-blue-500');
};

window.cambiarMes = (offset) => {
    let m = parseInt(document.getElementById('monthSelect').value) + offset;
    let y = parseInt(document.getElementById('yearSelect').value);
    if(m < 0) { m = 11; y--; }
    if(m > 11) { m = 0; y++; }
    document.getElementById('monthSelect').value = m;
    document.getElementById('yearSelect').value = y;
    window.actualizarCalendario();
};

window.goToToday = () => {
    const hoy = new Date();
    document.getElementById('monthSelect').value = hoy.getMonth();
    document.getElementById('yearSelect').value = hoy.getFullYear();
    window.actualizarCalendario();
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const ySel = document.getElementById('yearSelect');
    const mSel = document.getElementById('monthSelect');
    const hoy = new Date();

    for(let i=2024; i<=2030; i++) {
        const opt = document.createElement('option');
        opt.value = i; opt.innerText = i;
        ySel.appendChild(opt);
    }

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    meses.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.innerText = m;
        mSel.appendChild(opt);
    });

    ySel.value = hoy.getFullYear();
    mSel.value = hoy.getMonth();
    
    revisarSesion();
});