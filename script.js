let turnos = {};
let diaSeleccionado = null;

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
    if (!email || !password) return alert("Ingresa tus datos");
    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: " + error.message);
};

window.registro = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    if (!email || !password) return alert("Completa los campos");
    const { error } = await window.supabase.auth.signUp({ email, password });
    if (error) alert("Error: " + error.message);
    else alert("¡Registro exitoso! Ya puedes entrar.");
};

window.cerrarSesion = () => window.supabase.auth.signOut();

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

window.actualizarCalendario = () => {
    const año = document.getElementById('yearSelect').value;
    const mes = document.getElementById('monthSelect').value;
    const grid = document.getElementById('calendar');
    const mesTxt = document.getElementById('monthYear');
    if (!grid) return;
    grid.innerHTML = '';

    const fecha = new Date(año, mes);
    mesTxt.innerText = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const diasMes = new Date(año, parseInt(mes) + 1, 0).getDate();
    const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7;

    const headers = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    headers.forEach(h => {
        const div = document.createElement('div');
        div.className = 'text-center text-gray-600 font-bold text-xs pb-2';
        div.innerText = h;
        grid.appendChild(div);
    });

    for(let i=0; i<primerDia; i++) grid.appendChild(document.createElement('div'));

    for(let d=1; d<=diasMes; d++) {
        const div = document.createElement('div');
        div.className = 'day bg-gray-900 border border-gray-800 rounded-xl p-1 min-h-[70px] flex flex-col items-center justify-start cursor-pointer hover:bg-gray-800 transition active:scale-95';
        div.innerHTML = `<span class="text-xs font-bold text-gray-500 mb-1">${d}</span>`;
        
        const data = turnos[año]?.[mes]?.[d];
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                const badge = document.createElement('div');
                const color = t.includes('noche') ? 'bg-indigo-600' : 'bg-yellow-500';
                badge.className = `${color} w-full text-[8px] rounded-md text-white py-1 mb-1 font-black text-center uppercase`;
                badge.innerText = t.includes('extra') ? 'EXTRA' : t.toUpperCase();
                div.appendChild(badge);
            });
        }
        div.onclick = () => { 
            diaSeleccionado = d; 
            const modal = document.getElementById('turnoModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
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
        await guardarDatosSupabase();
    }
    window.cerrarModal();
};

window.cerrarModal = () => {
    const modal = document.getElementById('turnoModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

document.addEventListener('DOMContentLoaded', () => {
    const ySel = document.getElementById('yearSelect');
    const mSel = document.getElementById('monthSelect');
    const actual = new Date();
    
    if (ySel) {
        for(let i=2024; i<=2030; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = i;
            ySel.appendChild(opt);
        }
        ySel.value = actual.getFullYear();
    }
    if (mSel) {
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        meses.forEach((m, i) => {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = m;
            mSel.appendChild(opt);
        });
        mSel.value = actual.getMonth();
    }
    revisarSesion();
});