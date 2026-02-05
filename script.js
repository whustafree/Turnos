let turnos = {};
let perfil = {
    nombre: 'Usuario',
    edad: '',
    cargo: '',
    empresa: '',
    adminTotal: 6,
    adminUsados: 0,
    vacacionesTotal: 15,
    vacacionesUsadas: 0
};
let diaSeleccionado = null;
let feriadosCache = {};

// --- 1. LÓGICA DE FERIADOS (CHILE) ---
const FERIADOS = {
    'Año Nuevo': y => new Date(y, 0, 1),
    'Viernes Santo': y => calcularSemanaSanta(y, -2),
    'Sábado Santo': y => calcularSemanaSanta(y, -1),
    'Día del Trabajo': y => new Date(y, 4, 1),
    'Glorias Navales': y => new Date(y, 4, 21),
    'San Pedro y Pablo': y => { let d = new Date(y, 5, 29); return d.getDay()===1 ? d : new Date(y, 5, 29); }, 
    'Virgen del Carmen': y => new Date(y, 6, 16),
    'Asunción': y => new Date(y, 7, 15),
    'Fiestas Patrias': y => new Date(y, 8, 18),
    'Glorias del Ejército': y => new Date(y, 8, 19),
    'Encuentro Dos Mundos': y => new Date(y, 9, 12),
    'Inmaculada': y => new Date(y, 11, 8),
    'Navidad': y => new Date(y, 11, 25)
};

function calcularSemanaSanta(ano, dias) {
    const a=ano%19, b=Math.floor(ano/100), c=ano%100, d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30, i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7, m=Math.floor((a+11*h+22*l)/451), mes=Math.floor((h+l-7*m+114)/31)-1, dia=((h+l-7*m+114)%31)+1;
    return new Date(new Date(ano,mes,dia).getTime() + dias * 86400000);
}

function esFeriado(fecha) {
    const y = fecha.getFullYear();
    if (!feriadosCache[y]) {
        feriadosCache[y] = {};
        Object.values(FERIADOS).forEach(fn => feriadosCache[y][fn(y).toDateString()] = true);
    }
    return feriadosCache[y][fecha.toDateString()];
}

function esDiaHabil(fecha) {
    const diaSemana = fecha.getDay();
    // 0 = Domingo, 6 = Sábado. Feriados tampoco son hábiles para vacaciones legales.
    if (diaSemana === 0 || diaSemana === 6) return false;
    if (esFeriado(fecha)) return false;
    return true;
}

// --- 2. SUPABASE ---
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
        await window.supabase.from('usuarios_turnos').upsert({ 
            user_id: user.id, 
            datos_turnos: turnos,
            datos_perfil: perfil, 
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
    renderListaAusencias();
}

// --- DASHBOARD Y PERFIL ---
function updateDashboard() {
    document.getElementById('userNombre').innerText = perfil.nombre || 'Usuario';
    document.getElementById('userCargo').innerText = perfil.cargo || 'Cargo no def.';
    document.getElementById('userEmpresa').innerText = perfil.empresa || 'Empresa';
    
    // Iniciales Avatar
    const iniciales = (perfil.nombre || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('dashboardAvatar').innerText = iniciales;
    document.getElementById('headerAvatar').innerText = iniciales;

    // Calcular Saldos (Escaneo Anual)
    const y = parseInt(document.getElementById('yearSelect').value);
    let usadosAdmin = 0;
    let usadosVac = 0; // Solo hábiles
    
    if (turnos[y]) {
        Object.keys(turnos[y]).forEach(m => {
            Object.keys(turnos[y][m]).forEach(d => {
                const diaData = turnos[y][m][d];
                const fecha = new Date(y, m, d);
                
                if (diaData.tipo === 'administrativo') {
                    usadosAdmin++;
                } else if (diaData.tipo === 'vacaciones') {
                    // REGLA CHILENA: Solo descontar si es hábil
                    if (esDiaHabil(fecha)) {
                        usadosVac++;
                    }
                }
            });
        });
    }
    perfil.adminUsados = usadosAdmin;
    perfil.vacacionesUsadas = usadosVac;
    
    // Actualizar UI
    document.getElementById('adminUsados').innerText = usadosAdmin;
    document.getElementById('adminTotal').innerText = perfil.adminTotal;
    const porcAdmin = Math.min(100, (usadosAdmin / perfil.adminTotal) * 100);
    document.getElementById('adminProgress').style.width = `${porcAdmin}%`;

    document.getElementById('vacacionesUsadas').innerText = usadosVac;
    document.getElementById('vacacionesTotal').innerText = perfil.vacacionesTotal || 15;
    const porcVac = Math.min(100, (usadosVac / (perfil.vacacionesTotal || 15)) * 100);
    document.getElementById('vacacionesProgress').style.width = `${porcVac}%`;
}

// --- GESTIÓN DE VACACIONES Y ADMINISTRATIVOS ---
window.marcarAdministrativo = async () => {
    if (perfil.adminUsados >= perfil.adminTotal) {
        if(!confirm("⚠️ Ya usaste todos tus días administrativos. ¿Marcar igual?")) return;
    }
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    
    turnos[y][m][diaSeleccionado] = { 
        tipo: 'administrativo', 
        turnos: ['Admin'],
        estado: 'aprobado',
        locked: true // Bloqueado
    };
    await saveData();
    document.getElementById('turnoModal').classList.add('hidden');
};

window.guardarVacaciones = async () => {
    const startStr = document.getElementById('vacStart').value;
    const endStr = document.getElementById('vacEnd').value;
    const aprobado = document.getElementById('vacAprobado').checked;

    if (!startStr || !endStr) return alert("Selecciona fechas válidas");

    // Crear fechas locales para evitar desfase
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    
    const [ey, em, ed] = endStr.split('-').map(Number);
    const end = new Date(ey, em - 1, ed);
    
    if (end < start) return alert("La fecha de fin debe ser posterior al inicio");

    let loopDate = new Date(start);
    while (loopDate <= end) {
        const cy = loopDate.getFullYear();
        const cm = loopDate.getMonth();
        const cd = loopDate.getDate();

        if(!turnos[cy]) turnos[cy] = {};
        if(!turnos[cy][cm]) turnos[cy][cm] = {};

        // Guardamos el día como vacaciones visualmente
        turnos[cy][cm][cd] = {
            tipo: 'vacaciones',
            turnos: ['VAC'],
            estado: aprobado ? 'aprobado' : 'pendiente',
            locked: aprobado // Si está aprobado, se bloquea
        };
        
        loopDate.setDate(loopDate.getDate() + 1);
    }
    await saveData();
    alert("Vacaciones registradas correctamente.");
};

window.eliminarAusencia = async (fechaStr) => {
    if(!confirm("¿Eliminar este registro de ausencia?")) return;
    const [d, m, y] = fechaStr.split('/').map(Number);
    // Ajustar mes (0-index)
    const mesIdx = m - 1;
    
    if (turnos[y]?.[mesIdx]?.[d]) {
        delete turnos[y][mesIdx][d];
        await saveData();
    }
};

window.renderListaAusencias = () => {
    const container = document.getElementById('listaAusencias');
    if (!container) return;
    container.innerHTML = '';

    const y = parseInt(document.getElementById('yearSelect').value);
    
    // Recopilar todas las ausencias del año
    let lista = [];
    if (turnos[y]) {
        Object.keys(turnos[y]).forEach(m => {
            Object.keys(turnos[y][m]).forEach(d => {
                const data = turnos[y][m][d];
                if (data.tipo === 'vacaciones' || data.tipo === 'administrativo') {
                    lista.push({
                        fecha: new Date(y, m, d),
                        tipo: data.tipo,
                        estado: data.estado || 'pendiente'
                    });
                }
            });
        });
    }

    // Ordenar por fecha
    lista.sort((a, b) => a.fecha - b.fecha);

    if (lista.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">No hay ausencias registradas este año.</p>';
        return;
    }

    // Renderizar lista (Simplificada día a día para permitir borrado individual)
    lista.forEach(item => {
        const fechaFmt = item.fecha.toLocaleDateString('es-CL');
        const esHabil = item.tipo === 'vacaciones' ? esDiaHabil(item.fecha) : true;
        const color = item.tipo === 'vacaciones' ? 'text-yellow-600 bg-yellow-50' : 'text-blue-600 bg-blue-50';
        const label = item.tipo === 'vacaciones' ? 'Vacaciones' : 'Administrativo';
        const descuento = (item.tipo === 'vacaciones' && !esHabil) ? '<span class="text-[10px] text-gray-400 ml-2">(No descuenta)</span>' : '';

        const html = `
            <div class="flex justify-between items-center p-3 mb-2 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg ${color}">
                        <i class="fas ${item.tipo === 'vacaciones' ? 'fa-umbrella-beach' : 'fa-file-contract'}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-gray-700">${label}</div>
                        <div class="text-xs text-gray-500">${fechaFmt} ${descuento}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${item.estado === 'aprobado' ? '<i class="fas fa-lock text-gray-300 text-xs" title="Aprobado"></i>' : ''}
                    <button onclick="eliminarAusencia('${fechaFmt}')" class="text-red-400 hover:text-red-600 p-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
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
        
        if (data?.tipo === 'vacaciones') classes += " vacaciones";
        else if (data?.tipo === 'administrativo') classes += " administrativo";
        
        // Bloqueo visual
        if (data?.locked) classes += " opacity-90";

        let content = `<div class="flex justify-between"><span class="text-sm font-bold text-gray-500 ml-1">${d}</span>${data?.locked ? '<i class="fas fa-lock text-[10px] text-gray-400 mr-1"></i>' : ''}</div>`;
        
        if (data) {
            if (data.tipo === 'vacaciones') {
                content += `<div class="text-[10px] text-yellow-700 text-center font-bold mt-2 bg-yellow-100 rounded py-1 border border-yellow-200">VACACIONES</div>`;
            } else if (data.tipo === 'administrativo') {
                content += `<div class="text-[10px] text-blue-700 text-center font-bold mt-2 bg-blue-100 rounded py-1 border border-blue-200">ADMIN</div>`;
            } else if (data.turnos) {
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
            
            // Si está bloqueado, avisar (o permitir desbloquear si es necesario en el futuro)
            if (data?.locked && !confirm("Este día está aprobado/bloqueado. ¿Deseas editarlo igual?")) return;

            document.getElementById('turnoModal').classList.remove('hidden');
            document.getElementById('turnoModal').classList.add('flex');
        };
        grid.appendChild(div);
    }
};

// --- PERFIL HELPERS ---
window.abrirPerfil = () => {
    document.getElementById('editNombre').value = perfil.nombre;
    document.getElementById('editCargo').value = perfil.cargo;
    document.getElementById('editEmpresa').value = perfil.empresa;
    document.getElementById('editAdminTotal').value = perfil.adminTotal;
    document.getElementById('editVacacionesTotal').value = perfil.vacacionesTotal || 15;
    document.getElementById('perfilModal').classList.remove('hidden');
};

window.cerrarPerfil = () => document.getElementById('perfilModal').classList.add('hidden');

window.guardarPerfil = async () => {
    perfil.nombre = document.getElementById('editNombre').value;
    perfil.cargo = document.getElementById('editCargo').value;
    perfil.empresa = document.getElementById('editEmpresa').value;
    perfil.adminTotal = parseInt(document.getElementById('editAdminTotal').value);
    perfil.vacacionesTotal = parseInt(document.getElementById('editVacacionesTotal').value);
    await saveData();
    window.cerrarPerfil();
};

// --- OTROS HELPERS ---
window.agregarTurno = async (tipo) => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(!turnos[y]) turnos[y] = {};
    if(!turnos[y][m]) turnos[y][m] = {};
    
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
    updateUI();
};

// --- CICLOS ---
const CICLOS_3X3 = {
    '1': ['dia', 'dia', 'dia'], '2': ['noche', 'noche', 'noche'], '3': ['dia', 'noche', 'dia'],
    '4': ['noche', 'noche', 'dia'], '5': ['noche', 'dia', 'noche'], '6': ['dia', 'noche', 'noche'],
    '7': ['dia', 'dia', 'noche'], '8': ['dia', 'noche', 'dia'], '9': ['noche', 'dia', 'dia']
};

window.aplicarCiclo3x3 = async () => {
    const cicloId = document.getElementById('ciclo3x3Select').value;
    const patronTrabajo = CICLOS_3X3[cicloId];
    const fechaInput = document.getElementById('fechaInicio').value;
    if (!fechaInput) return alert("Selecciona fecha inicio");
    
    const [iy, im, id] = fechaInput.split('-').map(Number);
    const startDate = new Date(iy, im - 1, id); 
    const y = parseInt(document.getElementById('yearSelect').value);
    const m = parseInt(document.getElementById('monthSelect').value);
    
    if(!turnos[y]) turnos[y] = {};
    if(!turnos[y][m]) turnos[y][m] = {};

    const diasMes = new Date(y, m + 1, 0).getDate();
    for(let d=1; d<=diasMes; d++) {
        const currentDate = new Date(y, m, d);
        if (currentDate < startDate) continue;
        const diffDays = Math.floor((currentDate - startDate) / (1000 * 3600 * 24));
        let pos = diffDays % 6; if(pos < 0) pos += 6;

        // Solo sobrescribir si no está bloqueado (locked)
        if (!turnos[y][m][d]?.locked) {
            if (pos < 3) {
                turnos[y][m][d] = { turnos: [patronTrabajo[pos]], tipo: 'turno' };
            } else {
                if(turnos[y][m][d] && turnos[y][m][d].tipo === 'turno') delete turnos[y][m][d];
            }
        }
    }
    await saveData();
    alert("Ciclo aplicado (respetando días bloqueados)");
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
// Añade esto al final de tu archivo script.js existente (o reemplaza si prefieres)

// --- TEMA (DARK MODE) ---
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// Cargar preferencia al inicio
document.addEventListener('DOMContentLoaded', () => {
    // ... (tu código de inicialización existente) ...
    
    // Cargar Tema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if(icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
    }
});