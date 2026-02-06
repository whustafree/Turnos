// --- SISTEMA DE LOGS INTERNOS (Para ver errores en pantalla) ---
function initInternalConsole() {
    const output = document.getElementById('internalConsoleOutput');
    const statusMsg = document.getElementById('loginStatus');
    if(!output) return;

    function logToScreen(msg, type) {
        const div = document.createElement('div');
        div.style.color = type === 'error' ? '#ff6b6b' : (type === 'warn' ? '#fcd34d' : '#4ade80');
        div.style.marginBottom = '2px';
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight; // Auto-scroll
        
        // También mostrar error crítico en el login si estamos ahí
        if(type === 'error' && statusMsg) {
            statusMsg.innerText = "Error Interno: " + msg;
        }
    }

    // Sobreescribir logs nativos
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function(...args) {
        originalLog.apply(console, args);
        // Convertir objetos a texto simple para mostrar
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
        logToScreen(msg, 'log');
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
        logToScreen(msg, 'error');
        // Asegurar que la consola se abra si hay error
        document.getElementById('internalDebug').classList.remove('hidden');
    };

    console.warn = function(...args) {
        originalWarn.apply(console, args);
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
        logToScreen(msg, 'warn');
    };

    // Capturar errores globales no controlados
    window.onerror = function(msg, url, line) {
        logToScreen(`Global Error: ${msg} (Line: ${line})`, 'error');
        return false;
    };
    
    // Capturar Promesas rotas (ej. errores de Supabase silenciosos)
    window.onunhandledrejection = function(event) {
        logToScreen(`Unhandled Promise: ${event.reason}`, 'error');
    };
    
    console.log("Sistema de Log Interno Iniciado...");
}

// Iniciar log inmediatamente
initInternalConsole();

// --- VARIABLES GLOBALES ---
let turnos = {};
let perfil = {
    nombre: 'Usuario',
    edad: '',
    cargo: '',
    empresa: '',
    adminTotal: 6,
    adminUsados: 0,
    vacacionesTotal: 15,
    vacacionesUsadas: 0,
    patronActual: null 
};
let diaSeleccionado = null;
let feriadosCache = {};

// --- CICLOS ---
const CICLOS_3X3 = {
    '1': ['dia', 'dia', 'dia'], '2': ['noche', 'noche', 'noche'], '3': ['dia', 'noche', 'dia'],
    '4': ['noche', 'noche', 'dia'], '5': ['noche', 'dia', 'noche'], '6': ['dia', 'noche', 'noche'],
    '7': ['dia', 'dia', 'noche'], '8': ['dia', 'noche', 'dia'], '9': ['noche', 'dia', 'dia']
};

// --- CONFIGURACIÓN Y TEMA ---
window.toggleTheme = () => {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    actualizarIconoTema();
};

function actualizarIconoTema() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const icon = document.getElementById('themeIcon');
    if(icon) {
        icon.className = isDark ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-gray-600';
    }
}

// --- FERIADOS ---
const FERIADOS = {
    'Año Nuevo': y => new Date(y, 0, 1),
    'Viernes Santo': y => calcularSemanaSanta(y, -2),
    'Sábado Santo': y => calcularSemanaSanta(y, -1),
    'Día del Trabajo': y => new Date(y, 4, 1),
    'Glorias Navales': y => new Date(y, 4, 21),
    'San Pedro y Pablo': y => new Date(y, 5, 29), 
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
    if (diaSemana === 0 || diaSemana === 6) return false;
    if (esFeriado(fecha)) return false;
    return true;
}

// --- SUPABASE & DATA ---
// MODIFICADO: Versión segura de checkSession
async function checkSession() {
    console.log("Verificando sesión...");
    try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) throw error;

        if (session) {
            console.log("Sesión activa encontrada para:", session.user.email);
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appContent').classList.remove('hidden');
            
            await loadData(session.user.id);
        } else {
            console.log("No hay sesión activa.");
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appContent').classList.add('hidden');
        }
    } catch (e) {
        console.error("Error crítico verificando sesión:", e);
        // En caso de fallo, mostrar Login para no quedar en pantalla negra
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appContent').classList.add('hidden');
    }
}

// Escuchar cambios de sesión
window.supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Evento Auth:", event);
    if(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkSession();
    } else if (event === 'SIGNED_OUT') {
        window.location.reload();
    }
});

window.login = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    console.log("Intentando login con:", email);
    const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
        console.error("Error Login:", error.message);
        alert("Error: " + error.message);
    } else {
        console.log("Login exitoso");
    }
};

window.registro = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const { error } = await window.supabaseClient.auth.signUp({ email, password: pass });
    if (error) {
        console.error("Error Registro:", error.message);
        alert(error.message);
    } else {
        console.log("Registro iniciado, revisar correo");
        alert("Cuenta creada.");
    }
};

window.cerrarSesion = () => {
    console.log("Cerrando sesión...");
    window.supabaseClient.auth.signOut();
    localStorage.removeItem('turnos_local_data'); 
    location.reload();
};

// --- SISTEMA HÍBRIDO DE GUARDADO (LOCAL + NUBE) ---
async function saveData() {
    try {
        // 1. Guardar LOCALMENTE primero (Instantáneo)
        const localData = { turnos, perfil, timestamp: Date.now() };
        localStorage.setItem('turnos_local_data', JSON.stringify(localData));
        updateUI(); // Refrescar interfaz inmediatamente

        // 2. Enviar a SUPABASE en segundo plano
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user) {
            console.log("Sincronizando con nube...");
            window.supabaseClient.from('usuarios_turnos').upsert({ 
                user_id: user.id, 
                datos_turnos: turnos,
                datos_perfil: perfil, 
                updated_at: new Date() 
            }, { onConflict: 'user_id' }).then(({ error }) => {
                if (error) console.error("Error sync nube:", error);
                else console.log("Sincronizado correctamente");
            });
        }
    } catch(e) {
        console.error("Error en saveData:", e);
    }
}

async function loadData(uid) {
    // 1. Cargar desde LOCALSTORAGE primero
    const stored = localStorage.getItem('turnos_local_data');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            turnos = parsed.turnos || {};
            perfil = parsed.perfil || perfil;
            console.log("Datos cargados desde LocalStorage");
            updateUI(); 
        } catch (e) { console.error("Error leyendo local", e); }
    }

    // 2. Buscar en SUPABASE (Nube)
    try {
        const { data, error } = await window.supabaseClient.from('usuarios_turnos').select('datos_turnos, datos_perfil').eq('user_id', uid).maybeSingle();
        
        if (error) throw error;

        if (data) {
            console.log("Datos recibidos de la nube");
            turnos = data.datos_turnos || {};
            if (data.datos_perfil) perfil = { ...perfil, ...data.datos_perfil };
            
            localStorage.setItem('turnos_local_data', JSON.stringify({ turnos, perfil, timestamp: Date.now() }));
            updateUI(); 
        }
    } catch(e) {
        console.error("Error cargando de nube:", e);
    }
}

function updateUI() {
    window.renderCalendar();
    updateDashboard();
    window.renderListaAusencias();
}

// --- DASHBOARD ---
function updateDashboard() {
    document.getElementById('userNombre').innerText = perfil.nombre || 'Usuario';
    document.getElementById('userCargo').innerText = perfil.cargo || 'Cargo no def.';
    document.getElementById('userEmpresa').innerText = perfil.empresa || 'Empresa';
    
    const iniciales = (perfil.nombre || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('dashboardAvatar').innerText = iniciales;
    document.getElementById('headerAvatar').innerText = iniciales;

    const y = parseInt(document.getElementById('yearSelect').value);
    let usadosAdmin = 0;
    let usadosVac = 0;
    
    if (turnos[y]) {
        Object.keys(turnos[y]).forEach(m => {
            Object.keys(turnos[y][m]).forEach(d => {
                const diaData = turnos[y][m][d];
                const fecha = new Date(y, m, d);
                if (diaData.tipo === 'administrativo') usadosAdmin++;
                if (diaData.tipo === 'vacaciones' && esDiaHabil(fecha)) usadosVac++;
            });
        });
    }
    perfil.adminUsados = usadosAdmin;
    perfil.vacacionesUsadas = usadosVac;
    
    document.getElementById('adminUsados').innerText = usadosAdmin;
    document.getElementById('adminTotal').innerText = perfil.adminTotal;
    const pAdmin = Math.min(100, (usadosAdmin/perfil.adminTotal)*100);
    document.getElementById('adminProgress').style.width = `${pAdmin}%`;

    document.getElementById('vacacionesUsadas').innerText = usadosVac;
    document.getElementById('vacacionesTotal').innerText = perfil.vacacionesTotal || 15;
    const pVac = Math.min(100, (usadosVac/(perfil.vacacionesTotal||15))*100);
    document.getElementById('vacacionesProgress').style.width = `${pVac}%`;
}

// --- RESTAURACIÓN DE TURNOS ---
function calcularTurnoOriginal(fecha) {
    if (!perfil.patronActual) return null;
    const { fechaInicio, cicloId } = perfil.patronActual;
    const patronTrabajo = CICLOS_3X3[cicloId];
    const [iy, im, id] = fechaInicio.split('-').map(Number);
    const startDate = new Date(iy, im - 1, id);
    if (fecha < startDate) return null;
    const diffDays = Math.floor((fecha - startDate) / (1000 * 60 * 60 * 24));
    let pos = diffDays % 6; if(pos < 0) pos += 6;
    if (pos < 3) return patronTrabajo[pos];
    return null;
}

function agruparFechas(items) {
    if (items.length === 0) return [];
    items.sort((a, b) => a.fecha - b.fecha);
    const grupos = [];
    let grupoActual = [items[0]];
    for (let i = 1; i < items.length; i++) {
        const diff = (items[i].fecha - grupoActual[grupoActual.length - 1].fecha) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1 && items[i].tipo === items[i-1].tipo) {
            grupoActual.push(items[i]);
        } else {
            grupos.push(grupoActual);
            grupoActual = [items[i]];
        }
    }
    grupos.push(grupoActual);
    return grupos;
}

window.renderListaAusencias = () => {
    const container = document.getElementById('listaAusencias');
    if (!container) return;
    container.innerHTML = '';
    const y = parseInt(document.getElementById('yearSelect').value);
    let items = [];
    if (turnos[y]) {
        Object.keys(turnos[y]).forEach(m => {
            Object.keys(turnos[y][m]).forEach(d => {
                const data = turnos[y][m][d];
                if (data.tipo === 'vacaciones' || data.tipo === 'administrativo') {
                    items.push({ fecha: new Date(y, m, d), tipo: data.tipo });
                }
            });
        });
    }
    if (items.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4 text-xs">No hay ausencias este año.</p>';
        return;
    }
    const grupos = agruparFechas(items);
    grupos.forEach(grupo => {
        const inicio = grupo[0].fecha;
        const fin = grupo[grupo.length - 1].fecha;
        const tipo = grupo[0].tipo;
        const inicioISO = inicio.getFullYear() + '-' + (inicio.getMonth() + 1) + '-' + inicio.getDate();
        const finISO = fin.getFullYear() + '-' + (fin.getMonth() + 1) + '-' + fin.getDate();
        const textoRango = (inicio.getTime() === fin.getTime()) ? inicio.toLocaleDateString('es-CL') : `Del ${inicio.toLocaleDateString('es-CL')} al ${fin.toLocaleDateString('es-CL')}`;
        const diasHabiles = grupo.filter(g => esDiaHabil(g.fecha)).length;
        const subtitulo = tipo === 'vacaciones' ? `${diasHabiles} días hábiles` : 'Día Administrativo';
        const colorClass = tipo === 'vacaciones' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' : 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        const iconClass = tipo === 'vacaciones' ? 'fa-umbrella-beach' : 'fa-file-contract';
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm";
        div.innerHTML = `<div class="flex items-center gap-3"><div class="p-2 rounded-lg ${colorClass}"><i class="fas ${iconClass}"></i></div><div><div class="font-bold text-sm text-gray-700 dark:text-gray-200">${tipo === 'vacaciones' ? 'Vacaciones' : 'Administrativo'}</div><div class="text-xs text-gray-500 dark:text-gray-400">${textoRango}</div><div class="text-[10px] text-gray-400">${subtitulo}</div></div></div><button class="text-red-400 hover:text-red-600 p-2 transition"><i class="fas fa-trash"></i></button>`;
        div.querySelector('button').onclick = () => window.eliminarPeriodo(inicioISO, finISO);
        container.appendChild(div);
    });
};

window.eliminarPeriodo = async (inicioStr, finStr) => {
    if(!confirm("¿Eliminar y restaurar turnos?")) return;
    const [yi, mi, di] = inicioStr.split('-').map(Number);
    const [yf, mf, df] = finStr.split('-').map(Number);
    const start = new Date(yi, mi - 1, di);
    const end = new Date(yf, mf - 1, df);
    let loop = new Date(start);
    while(loop <= end) {
        const cy = loop.getFullYear();
        const cm = loop.getMonth();
        const cd = loop.getDate();
        const turnoOriginal = calcularTurnoOriginal(loop);
        if (turnoOriginal) {
            if(!turnos[cy]) turnos[cy] = {};
            if(!turnos[cy][cm]) turnos[cy][cm] = {};
            turnos[cy][cm][cd] = { turnos: [turnoOriginal], tipo: 'turno' };
        } else {
            if (turnos[cy]?.[cm]?.[cd]) delete turnos[cy][cm][cd];
        }
        loop.setDate(loop.getDate() + 1);
    }
    await saveData();
};

window.generarCartaVacaciones = () => {
    const startStr = document.getElementById('vacStart').value;
    const endStr = document.getElementById('vacEnd').value;
    if(!startStr || !endStr) return alert("Selecciona fechas");
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const start = new Date(sy, sm-1, sd);
    const end = new Date(ey, em-1, ed);
    let habiles = 0;
    let loop = new Date(start);
    while(loop <= end) { if(esDiaHabil(loop)) habiles++; loop.setDate(loop.getDate() + 1); }
    const texto = `Estimada Jefatura,\n\nSolicito feriado legal del ${start.toLocaleDateString('es-CL')} al ${end.toLocaleDateString('es-CL')}.\nTotal: ${habiles} días hábiles.\n\nAtte,\n${perfil.nombre || 'Colaborador'}`;
    navigator.clipboard.writeText(texto).then(() => alert("Carta copiada!"));
};

window.guardarVacaciones = async () => {
    const startStr = document.getElementById('vacStart').value;
    const endStr = document.getElementById('vacEnd').value;
    const aprobado = document.getElementById('vacAprobado').checked;
    if (!startStr || !endStr) return alert("Selecciona fechas");
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const end = new Date(ey, em - 1, ed);
    if (end < start) return alert("Fechas incorrectas");
    let loop = new Date(start);
    while (loop <= end) {
        const cy = loop.getFullYear();
        const cm = loop.getMonth();
        const cd = loop.getDate();
        if(!turnos[cy]) turnos[cy] = {};
        if(!turnos[cy][cm]) turnos[cy][cm] = {};
        turnos[cy][cm][cd] = { tipo: 'vacaciones', turnos: ['VAC'], estado: aprobado ? 'aprobado' : 'pendiente', locked: aprobado };
        loop.setDate(loop.getDate() + 1);
    }
    await saveData();
    alert("Vacaciones guardadas.");
};

window.marcarAdministrativo = async () => {
    if (perfil.adminUsados >= perfil.adminTotal && !confirm("Límite alcanzado. ¿Continuar?")) return;
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    turnos[y][m][diaSeleccionado] = { tipo: 'administrativo', turnos: ['Admin'], estado: 'aprobado', locked: true };
    await saveData();
    document.getElementById('turnoModal').classList.add('hidden');
};

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
        if (data?.locked) classes += " opacity-80";
        let content = `<div class="flex justify-between"><span class="text-sm font-bold text-gray-500 dark:text-gray-400 ml-1">${d}</span>${data?.locked ? '<i class="fas fa-lock text-[10px] text-gray-400"></i>' : ''}</div>`;
        if (data) {
            if (data.tipo === 'vacaciones') content += `<div class="text-[10px] text-yellow-700 dark:text-yellow-300 text-center font-bold mt-2 bg-yellow-100 dark:bg-yellow-900/30 rounded py-1">VAC</div>`;
            else if (data.tipo === 'administrativo') content += `<div class="text-[10px] text-blue-700 dark:text-blue-300 text-center font-bold mt-2 bg-blue-100 dark:bg-blue-900/30 rounded py-1">ADMIN</div>`;
            else if (data.turnos) {
                data.turnos.forEach(t => {
                    let c = 't-dia';
                    if(t.includes('noche')) c = 't-noche';
                    if(t.includes('extra')) c = 't-extra';
                    content += `<span class="turno-badge ${c} w-full text-center">${t.replace('extra-','').toUpperCase()}</span>`;
                });
            }
        }
        div.className = classes;
        div.innerHTML = content;
        div.onclick = () => {
            diaSeleccionado = d;
            document.getElementById('modalDiaNum').innerText = d;
            if (data?.locked && !confirm("Día bloqueado. ¿Editar?")) return;
            document.getElementById('turnoModal').classList.remove('hidden');
            document.getElementById('turnoModal').classList.add('flex');
        };
        grid.appendChild(div);
    }
};

window.agregarTurno = async (tipo) => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(!turnos[y]) turnos[y] = {};
    if(!turnos[y][m]) turnos[y][m] = {};
    let current = [];
    if(turnos[y][m][diaSeleccionado]?.tipo === 'turno') current = turnos[y][m][diaSeleccionado].turnos;
    if(!current.includes(tipo)) current.push(tipo);
    turnos[y][m][diaSeleccionado] = { turnos: current, tipo: 'turno' };
    await saveData();
    document.getElementById('turnoModal').classList.add('hidden');
};

window.quitarTurno = async () => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(turnos[y]?.[m]?.[diaSeleccionado]) { delete turnos[y][m][diaSeleccionado]; await saveData(); }
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

window.goToToday = () => {
    const now = new Date();
    document.getElementById('monthSelect').value = now.getMonth();
    document.getElementById('yearSelect').value = now.getFullYear();
    updateUI();
};

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

window.aplicarCiclo3x3 = async () => {
    const cicloId = document.getElementById('ciclo3x3Select').value;
    const patronTrabajo = CICLOS_3X3[cicloId];
    const fechaInput = document.getElementById('fechaInicio').value;
    if (!fechaInput) return alert("Selecciona fecha");
    perfil.patronActual = { fechaInicio: fechaInput, cicloId: cicloId };
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
        if (!turnos[y][m][d]?.locked) {
            if (pos < 3) turnos[y][m][d] = { turnos: [patronTrabajo[pos]], tipo: 'turno' };
            else if(turnos[y][m][d] && turnos[y][m][d].tipo === 'turno') delete turnos[y][m][d];
        }
    }
    await saveData();
    alert("Ciclo aplicado.");
};

// --- ALIAS PARA COMPATIBILIDAD ---
window.actualizarCalendario = window.renderCalendar;

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.setAttribute('data-theme', 'dark');
    actualizarIconoTema();
    const ys = document.getElementById('yearSelect');
    const ms = document.getElementById('monthSelect');
    for(let i=2024; i<=2030; i++) ys.innerHTML+=`<option value="${i}">${i}</option>`;
    ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].forEach((m,i)=> ms.innerHTML+=`<option value="${i}">${m}</option>`);
    const now = new Date();
    ys.value = now.getFullYear();
    ms.value = now.getMonth();
    checkSession();
});