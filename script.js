// Variables globales
let turnos = {};
let diaSeleccionado = null;

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

// Escuchar cambios de estado (Login/Logout)
window.supabase.auth.onAuthStateChange((event, session) => {
    revisarSesion();
});

window.login = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;
    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error al entrar: " + error.message);
};

window.registro = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;
    const { error } = await window.supabase.auth.signUp({ email, password });
    if (error) alert("Error al registrar: " + error.message);
    else alert("¡Revisa tu correo para confirmar el registro!");
};

window.cerrarSesion = async () => {
    await window.supabase.auth.signOut();
};

// --- SINCRONIZACIÓN DE DATOS ---
async function guardarDatosSupabase() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
        // Guardamos o actualizamos (upsert) usando el user_id
        const { error } = await window.supabase.from('usuarios_turnos')
            .upsert({ 
                user_id: user.id, 
                datos_turnos: turnos,
                updated_at: new Date() 
            }, { onConflict: 'user_id' });
        
        if (error) console.error("Error al sincronizar:", error);
    }
}

async function cargarDatosSupabase(userId) {
    const { data, error } = await window.supabase
        .from('usuarios_turnos')
        .select('datos_turnos')
        .eq('user_id', userId)
        .maybeSingle(); // Usamos maybeSingle para que no de error si es usuario nuevo

    if (data) {
        turnos = data.datos_turnos || {};
        window.actualizarCalendario();
    }
}

// --- LÓGICA DEL CALENDARIO ---
window.actualizarCalendario = () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const grid = document.getElementById('calendar');
    if (!grid) return;
    grid.innerHTML = '';

    const diasMes = new Date(año, parseInt(mes) + 1, 0).getDate();
    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;

    // Espacios vacíos
    for(let i=0; i<primerDia; i++) grid.appendChild(document.createElement('div'));

    // Días del mes
    for(let d=1; d<=diasMes; d++) {
        const div = document.createElement('div');
        div.className = 'day card p-2 text-center cursor-pointer border border-gray-700 rounded hover:bg-gray-800';
        div.innerHTML = `<span class="font-bold text-sm">${d}</span>`;
        
        const data = turnos[año]?.[mes]?.[d];
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                const badge = document.createElement('div');
                badge.className = `turno ${t} text-[9px] rounded mt-1 text-white p-1 uppercase font-bold`;
                badge.textContent = t.replace('-', ' ');
                div.appendChild(badge);
            });
        }
        div.onclick = () => { 
            diaSeleccionado = d; 
            document.getElementById('turnoModal').classList.add('active'); 
        };
        grid.appendChild(div);
    }
};

window.agregarTurno = async () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const tipo = document.getElementById('turnoSelect').value;

    if(!turnos[año]) turnos[año] = {};
    if(!turnos[año][mes]) turnos[año][mes] = {};
    if(!turnos[año][mes][diaSeleccionado]) turnos[año][mes][diaSeleccionado] = { turnos: [] };

    if(!turnos[año][mes][diaSeleccionado].turnos.includes(tipo)) {
        turnos[año][mes][diaSeleccionado].turnos.push(tipo);
        window.actualizarCalendario();
        await guardarDatosSupabase(); // Sincroniza al instante con Supabase
    }
    window.cerrarModal();
};

window.cerrarModal = () => {
    document.getElementById('turnoModal').classList.remove('active');
};

// Inicialización de selectores
document.addEventListener('DOMContentLoaded', () => {
    const ySel = document.getElementById('yearSelect');
    const mSel = document.getElementById('monthSelect');
    const actual = new Date();
    
    if (ySel) {
        for(let i=2024; i<=2030; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.textContent = i;
            ySel.appendChild(opt);
        }
        ySel.value = actual.getFullYear();
    }
    if (mSel) mSel.value = actual.getMonth();
    
    revisarSesion();
});