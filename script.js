let turnos = {};
let diaSeleccionado = null;

// --- FERIADOS ---
const FERIADOS = {
    'Año Nuevo': y => new Date(y, 0, 1),
    'Día del Trabajo': y => new Date(y, 4, 1),
    'Glorias Navales': y => new Date(y, 4, 21),
    'Fiestas Patrias': y => new Date(y, 8, 18),
    'Navidad': y => new Date(y, 11, 25)
};

function esFeriado(fecha) {
    const y = fecha.getFullYear();
    const dStr = fecha.toDateString();
    return Object.entries(FERIADOS).some(([n, fn]) => fn(y).toDateString() === dStr);
}

// --- GESTIÓN DE SESIÓN (SUPABASE) ---
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
    if (error) alert("Error: " + error.message);
};

window.registro = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    const { error } = await window.supabase.auth.signUp({ email, password });
    if (error) alert("Error: " + error.message);
    else alert("¡Usuario creado! Ya puedes entrar.");
};

window.cerrarSesion = () => window.supabase.auth.signOut();

// --- PERSISTENCIA ---
async function guardarDatosSupabase() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
        // Corrección del error 400: Asegurar que el objeto se envíe correctamente
        await window.supabase.from('usuarios_turnos').upsert({ 
            user_id: user.id, 
            datos_turnos: turnos,
            updated_at: new Date() 
        }, { onConflict: 'user_id' });
    }
}

async function cargarDatosSupabase(userId) {
    const { data } = await window.supabase.from('usuarios_turnos').select('datos_turnos').eq('user_id', userId).maybeSingle();
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

    mesTxt.innerText = new Date(año, mes).toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;
    const totalDias = new Date(año, parseInt(mes) + 1, 0).getDate();

    ['Lu','Ma','Mi','Ju','Vi','Sa','Do'].forEach(h => {
        const div = document.createElement('div');
        div.className = 'text-center text-gray-600 font-bold text-[10px] py-1';
        div.innerText = h;
        grid.appendChild(div);
    });

    for(let i=0; i<primerDia; i++) grid.appendChild(document.createElement('div'));

    for(let d=1; d<=totalDias; d++) {
        const feriado = esFeriado(new Date(año, mes, d));
        const div = document.createElement('div');
        div.className = `day bg-gray-900 border ${feriado ? 'border-red-900' : 'border-gray-800'} rounded-xl p-1 min-h-[65px] flex flex-col items-center cursor-pointer`;
        div.innerHTML = `<span class="text-xs ${feriado?'text-red-500':'text-gray-500'} font-bold">${d}</span>`;

        const data = turnos[año]?.[mes]?.[d];
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                const badge = document.createElement('div');
                badge.className = `${t.includes('noche')?'bg-indigo-600':'bg-yellow-500'} w-full text-[8px] rounded-md text-white text-center font-black mt-1 py-0.5`;
                badge.innerText = t.toUpperCase();
                div.appendChild(badge);
            });
        }
        div.onclick = () => { diaSeleccionado = d; abrirModal(); };
        grid.appendChild(div);
    }
    window.calcularEstadisticas();
};

function abrirModal() {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    document.getElementById('nota').value = turnos[año]?.[mes]?.[diaSeleccionado]?.nota || '';
    document.getElementById('turnoModal').classList.remove('hidden');
    document.getElementById('turnoModal').classList.add('flex');
}

window.cerrarModal = () => document.getElementById('turnoModal').classList.add('hidden');

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

// --- CONFIGURACIÓN Y AUTOCOMPLETADO ---
window.toggleCustomPattern = () => {
    const custom = document.getElementById('patronSelect').value === 'custom';
    document.getElementById('customPatternDiv').classList.toggle('hidden', !custom);
};

window.completarCalendario = async () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const pSel = document.getElementById('patronSelect').value;
    const rot = document.getElementById('tipoRotacion').value;
    
    let t, d;
    if(pSel === 'custom') {
        t = parseInt(document.getElementById('diasTrabajo').value);
        d = parseInt(document.getElementById('diasDescanso').value);
    } else {
        [t, d] = pSel.split('x').map(Number);
    }

    const total = new Date(año, parseInt(mes) + 1, 0).getDate();
    if(!turnos[año]) turnos[año] = {};
    turnos[año][mes] = {};

    let esTrabajo = true, cont = 0;
    const partes = rot.split('-');

    for(let dia=1; dia<=total; dia++) {
        if(esTrabajo) {
            let tipo = (rot === 'dia-noche') ? (Math.floor((dia-1)/(t+d))%2===0?'dia':'noche') : (partes[0] || 'dia');
            turnos[año][mes][dia] = { turnos: [tipo], nota: '' };
            cont++;
            if(cont >= t) { esTrabajo = false; cont = 0; }
        } else {
            cont++;
            if(cont >= d) { esTrabajo = true; cont = 0; }
        }
    }
    window.actualizarCalendario();
    await guardarDatosSupabase();
};

window.calcularEstadisticas = () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    let hN = 0, hE = 0, trabajados = 0, lista = [];
    if(turnos[año]?.[mes]) {
        Object.entries(turnos[año][mes]).forEach(([dia, obj]) => {
            trabajados++;
            obj.turnos.forEach(t => {
                if(t.includes('extra')) hE += 12; else hN += 12;
                lista.push(`Día ${dia}: ${t.toUpperCase()}`);
            });
        });
    }
    document.getElementById('diasTrabajados').innerText = trabajados;
    document.getElementById('horasNormales').innerText = hN;
    document.getElementById('horasExtras').innerText = hE;
    document.getElementById('diasNormales').value = lista.join('\n');
};

window.cambiarPestaña = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active', 'border-blue-500'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    event.currentTarget.classList.add('active', 'border-blue-500');
};

window.cambiarMes = (off) => {
    let m = parseInt(document.getElementById('monthSelect').value) + off;
    let y = parseInt(document.getElementById('yearSelect').value);
    if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
    document.getElementById('monthSelect').value = m;
    document.getElementById('yearSelect').value = y;
    window.actualizarCalendario();
};

window.goToToday = () => {
    const n = new Date();
    document.getElementById('monthSelect').value = n.getMonth();
    document.getElementById('yearSelect').value = n.getFullYear();
    window.actualizarCalendario();
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const yS = document.getElementById('yearSelect');
    const mS = document.getElementById('monthSelect');
    const n = new Date();
    for(let i=2024; i<=2030; i++) {
        const o = document.createElement('option');
        o.value = i; o.innerText = i;
        yS.appendChild(o);
    }
    ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].forEach((m, i) => {
        const o = document.createElement('option');
        o.value = i; o.innerText = m;
        mS.appendChild(o);
    });
    yS.value = n.getFullYear();
    mS.value = n.getMonth();
    revisarSesion();
});