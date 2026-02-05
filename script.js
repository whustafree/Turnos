let turnos = {};
let perfil = {
    nombre: 'Usuario',
    edad: '',
    cargo: '',
    empresa: '',
    adminTotal: 6,
    adminUsados: 0
};
let diaSeleccionado = null;

// --- GESTIÓN DE SESIÓN Y DATOS ---
async function checkSession() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appContent').classList.remove('hidden');
        await loadData(session.user.id);
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
    }
}

window.supabase.auth.onAuthStateChange(() => checkSession());

window.login = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const { error } = await window.supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message);
};

window.registro = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const { error } = await window.supabase.auth.signUp({ email, password: pass });
    if (error) alert(error.message); else alert("Cuenta creada.");
};

window.cerrarSesion = () => window.supabase.auth.signOut();

async function saveData() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
        // Guardamos turnos Y perfil en la misma tabla
        await window.supabase.from('usuarios_turnos').upsert({ 
            user_id: user.id, 
            datos_turnos: turnos,
            datos_perfil: perfil, // Nueva columna JSONB
            updated_at: new Date() 
        }, { onConflict: 'user_id' });
    }
    updateUI();
}

async function loadData(uid) {
    const { data } = await window.supabase.from('usuarios_turnos').select('datos_turnos, datos_perfil').eq('user_id', uid).maybeSingle();
    if (data) {
        turnos = data.datos_turnos || {};
        if (data.datos_perfil) perfil = { ...perfil, ...data.datos_perfil };
        updateUI();
    }
}

function updateUI() {
    window.renderCalendar();
    updateDashboard();
}

// --- DASHBOARD Y PERFIL ---
function updateDashboard() {
    // Actualizar Textos
    document.getElementById('userNombre').innerText = perfil.nombre || 'Usuario';
    document.getElementById('userCargo').innerText = perfil.cargo || 'Cargo no def.';
    document.getElementById('userEmpresa').innerText = perfil.empresa || 'Empresa';
    document.getElementById('userEdad').innerText = perfil.edad ? `${perfil.edad} años` : '-- años';
    
    // Iniciales Avatar
    const iniciales = (perfil.nombre || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('dashboardAvatar').innerText = iniciales;
    document.getElementById('headerAvatar').innerText = iniciales;

    // Calcular Administrativos Usados (Escaneando todo el año actual)
    const y = document.getElementById('yearSelect').value;
    let usados = 0;
    if (turnos[y]) {
        Object.values(turnos[y]).forEach(mesData => {
            Object.values(mesData).forEach(diaData => {
                if (diaData.tipo === 'administrativo') usados++;
            });
        });
    }
    perfil.adminUsados = usados;
    
    document.getElementById('adminUsados').innerText = usados;
    document.getElementById('adminTotal').innerText = perfil.adminTotal;
    const porcentaje = Math.min(100, (usados / perfil.adminTotal) * 100);
    document.getElementById('adminProgress').style.width = `${porcentaje}%`;
}

window.abrirPerfil = () => {
    document.getElementById('editNombre').value = perfil.nombre;
    document.getElementById('editEdad').value = perfil.edad;
    document.getElementById('editCargo').value = perfil.cargo;
    document.getElementById('editEmpresa').value = perfil.empresa;
    document.getElementById('editAdminTotal').value = perfil.adminTotal;
    document.getElementById('perfilModal').classList.remove('hidden');
};

window.cerrarPerfil = () => document.getElementById('perfilModal').classList.add('hidden');

window.guardarPerfil = async () => {
    perfil.nombre = document.getElementById('editNombre').value;
    perfil.edad = document.getElementById('editEdad').value;
    perfil.cargo = document.getElementById('editCargo').value;
    perfil.empresa = document.getElementById('editEmpresa').value;
    perfil.adminTotal = parseInt(document.getElementById('editAdminTotal').value);
    await saveData();
    window.cerrarPerfil();
};

// --- LÓGICA DE LOS 9 CICLOS (3x3) ---
const CICLOS_3X3 = {
    '1': ['dia', 'dia', 'dia'],                 // 1. Solo Día
    '2': ['noche', 'noche', 'noche'],           // 2. Solo Noche
    '3': ['dia', 'noche', 'dia'],               // 3. Alternando
    '4': ['noche', 'noche', 'dia'],             // 4. N-N-D
    '5': ['noche', 'dia', 'noche'],             // 5. N-D-N
    '6': ['dia', 'noche', 'noche'],             // 6. D-N-N
    '7': ['dia', 'dia', 'noche'],               // 7. D-D-N
    '8': ['dia', 'noche', 'dia'],               // 8. D-N-D (Igual al 3, pero explícito)
    '9': ['noche', 'dia', 'dia']                // 9. N-D-D
};

window.aplicarCiclo3x3 = async () => {
    const cicloId = document.getElementById('ciclo3x3Select').value;
    const patronTrabajo = CICLOS_3X3[cicloId]; // Array de 3
    const fechaInput = document.getElementById('fechaInicio').value;
    
    if (!fechaInput) return alert("Selecciona una fecha de inicio");
    
    const y = parseInt(document.getElementById('yearSelect').value);
    const m = parseInt(document.getElementById('monthSelect').value);
    
    const [iy, im, id] = fechaInput.split('-').map(Number);
    const startDate = new Date(iy, im - 1, id); // Fecha donde empieza el primer día de trabajo
    
    if(!turnos[y]) turnos[y] = {};
    if(!turnos[y][m]) turnos[y][m] = {};

    const diasMes = new Date(y, m + 1, 0).getDate();
    const cycleLen = 6; // 3 trabajo + 3 descanso

    for(let d=1; d<=diasMes; d++) {
        const currentDate = new Date(y, m, d);
        if (currentDate < startDate) continue;

        const diffTime = currentDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
        
        let pos = diffDays % cycleLen; 
        if(pos < 0) pos += cycleLen;

        // Días 0, 1, 2 son Trabajo. Días 3, 4, 5 son Descanso.
        if (pos < 3) {
            const tipoTurno = patronTrabajo[pos]; // Obtener el tipo específico del array (0, 1 o 2)
            turnos[y][m][d] = { turnos: [tipoTurno], tipo: 'turno' };
        } else {
            // Es descanso, borramos si había turno, pero respetamos vacaciones
            if(turnos[y][m][d] && turnos[y][m][d].tipo === 'turno') {
                delete turnos[y][m][d];
            }
        }
    }
    await saveData();
    alert("Ciclo aplicado correctamente.");
};

// --- GESTIÓN DE VACACIONES Y ADMINISTRATIVOS ---
window.marcarAdministrativo = async () => {
    if (perfil.adminUsados >= perfil.adminTotal) {
        if(!confirm("Ya has usado todos tus días administrativos. ¿Marcar igual?")) return;
    }
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    
    // Guardar como tipo especial
    turnos[y][m][diaSeleccionado] = { 
        tipo: 'administrativo', 
        turnos: ['Admin'],
        estado: 'aprobado' 
    };
    await saveData();
    document.getElementById('turnoModal').classList.add('hidden');
};

window.guardarVacaciones = async () => {
    const startStr = document.getElementById('vacStart').value;
    const endStr = document.getElementById('vacEnd').value;
    const aprobado = document.getElementById('vacAprobado').checked;

    if (!startStr || !endStr) return alert("Fechas inválidas");

    const start = new Date(startStr);
    const end = new Date(endStr);
    
    // Iterar por fechas
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const cy = d.getFullYear();
        const cm = d.getMonth();
        const cd = d.getDate();

        if(!turnos[cy]) turnos[cy] = {};
        if(!turnos[cy][cm]) turnos[cy][cm] = {};

        turnos[cy][cm][cd] = {
            tipo: 'vacaciones',
            turnos: ['VAC'],
            estado: aprobado ? 'aprobado' : 'pendiente'
        };
    }
    await saveData();
    alert("Vacaciones registradas.");
};

// --- CALENDARIO RENDER ---
window.renderCalendar = () => {
    const y = parseInt(document.getElementById('yearSelect').value);
    const m = parseInt(document.getElementById('monthSelect').value);
    const grid = document.getElementById('calendar');
    document.getElementById('monthYear').innerText = new Date(y, m).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    grid.innerHTML = '';
    const firstDay = (new Date(y, m, 1).getDay() + 6) % 7;
    const totalDays = new Date(y, m + 1, 0).getDate();

    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div></div>`;

    for(let d=1; d<=totalDays; d++) {
        const data = turnos[y]?.[m]?.[d];
        const div = document.createElement('div');
        let classes = "day rounded-xl p-1 flex flex-col justify-between cursor-pointer relative";
        
        // Estilos según tipo
        if (data?.tipo === 'vacaciones') classes += " vacaciones";
        else if (data?.tipo === 'administrativo') classes += " administrativo";
        
        // Contenido HTML
        let content = `<span class="text-sm font-bold text-gray-500 ml-1">${d}</span>`;
        
        if (data) {
            if (data.tipo === 'vacaciones') {
                content += `<div class="text-[10px] text-yellow-700 text-center font-bold mt-2">VACACIONES</div>`;
                if(data.estado === 'pendiente') content += `<i class="fas fa-clock absolute top-1 right-1 text-yellow-600 opacity-50 text-xs"></i>`;
            } else if (data.tipo === 'administrativo') {
                content += `<div class="text-[10px] text-blue-700 text-center font-bold mt-2">ADMIN</div>`;
            } else if (data.turnos) {
                // Turnos normales
                data.turnos.forEach(t => {
                    let c = 't-dia';
                    if(t.includes('noche')) c = 't-noche';
                    if(t.includes('extra')) c = 't-extra';
                    content += `<span class="turno-badge ${c} w-full text-center">${t === 'dia' ? 'DÍA' : (t==='noche'?'NOCHE':t)}</span>`;
                });
            }
        }

        div.className = classes;
        div.innerHTML = content;
        div.onclick = () => {
            diaSeleccionado = d;
            document.getElementById('modalDiaNum').innerText = d;
            document.getElementById('turnoModal').classList.remove('hidden');
            document.getElementById('turnoModal').classList.add('flex');
        };
        grid.appendChild(div);
    }
};

// --- HELPERS UI ---
window.agregarTurno = async (tipo) => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(!turnos[y]) turnos[y] = {};
    if(!turnos[y][m]) turnos[y][m] = {};
    
    // Sobrescribir si hay vacaciones o admin, volvemos a turno normal
    let current = [];
    if(turnos[y][m][diaSeleccionado]?.tipo === 'turno') {
        current = turnos[y][m][diaSeleccionado].turnos;
    }
    
    if(!current.includes(tipo)) current.push(tipo);
    
    turnos[y][m][diaSeleccionado] = { turnos: current, tipo: 'turno' };
    await saveData();
    document.getElementById('turnoModal').classList.add('hidden');
};

window.quitarTurno = async () => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(turnos[y]?.[m]?.[diaSeleccionado]) {
        delete turnos[y][m][diaSeleccionado];
        await saveData();
    }
    document.getElementById('turnoModal').classList.add('hidden');
};

window.cambiarPestaña = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'text-blue-600', 'ring-2'));
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    event.currentTarget.classList.add('active', 'text-blue-600', 'ring-2');
};

window.cambiarMes = (v) => {
    let m = parseInt(document.getElementById('monthSelect').value) + v;
    let y = parseInt(document.getElementById('yearSelect').value);
    if(m<0){m=11; y--;} if(m>11){m=0; y++;}
    document.getElementById('monthSelect').value = m;
    document.getElementById('yearSelect').value = y;
    window.renderCalendar();
};

window.goToToday = () => {
    const d = new Date();
    document.getElementById('monthSelect').value = d.getMonth();
    document.getElementById('yearSelect').value = d.getFullYear();
    window.renderCalendar();
};

document.addEventListener('DOMContentLoaded', () => {
    const ys = document.getElementById('yearSelect');
    const ms = document.getElementById('monthSelect');
    for(let i=2024; i<=2030; i++) ys.innerHTML+=`<option value="${i}">${i}</option>`;
    ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].forEach((m,i)=> ms.innerHTML+=`<option value="${i}">${m}</option>`);
    const now = new Date();
    ys.value = now.getFullYear();
    ms.value = now.getMonth();
    checkSession();
});