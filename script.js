let turnos = {};
let diaSeleccionado = null;
let feriadosCache = {};

// --- 1. LÓGICA DE FERIADOS DE CHILE (Original) ---
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
        Object.entries(FERIADOS).forEach(([n,fn]) => feriadosCache[y][fn(y).toDateString()] = n);
    }
    return feriadosCache[y][fecha.toDateString()];
}

// --- 2. SUPABASE ---
async function checkSession() {
    const { data: { session } } = await window.supabase.auth.getSession();
    const loginDiv = document.getElementById('loginScreen');
    const appDiv = document.getElementById('appContent');
    if (session) {
        loginDiv.classList.add('hidden');
        appDiv.classList.remove('hidden');
        await loadData(session.user.id);
    } else {
        loginDiv.classList.remove('hidden');
        appDiv.classList.add('hidden');
    }
}

window.supabase.auth.onAuthStateChange(() => checkSession());

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
    if (error) alert(error.message); else alert("Cuenta creada.");
};

window.cerrarSesion = () => window.supabase.auth.signOut();

async function saveData() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (user) {
        // Usamos upsert con la corrección del SQL anterior
        await window.supabase.from('usuarios_turnos').upsert({ 
            user_id: user.id, 
            datos_turnos: turnos,
            updated_at: new Date() 
        }, { onConflict: 'user_id' });
    }
}

async function loadData(uid) {
    const { data } = await window.supabase.from('usuarios_turnos').select('datos_turnos').eq('user_id', uid).maybeSingle();
    if (data) { turnos = data.datos_turnos || {}; window.renderCalendar(); }
}

// --- 3. UI Y CALENDARIO ---
window.renderCalendar = () => {
    const year = parseInt(document.getElementById('yearSelect').value);
    const month = parseInt(document.getElementById('monthSelect').value);
    const grid = document.getElementById('calendar');
    const title = document.getElementById('monthYear');
    
    grid.innerHTML = '';
    title.innerText = new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Días vacíos
    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div class="bg-transparent"></div>`;

    for(let d=1; d<=daysInMonth; d++) {
        const date = new Date(year, month, d);
        const feriadoName = esFeriado(date);
        const isFeriado = !!feriadoName;
        const isToday = new Date().toDateString() === date.toDateString();
        
        const data = turnos[year]?.[month]?.[d];
        const div = document.createElement('div');
        
        let bgClass = "bg-dark-800";
        if (isFeriado) bgClass = "bg-red-900/10 border-red-500/30";
        else if (isToday) bgClass = "bg-blue-900/20 border-blue-500/50";
        
        div.className = `day relative rounded-xl border border-dark-700 p-1 flex flex-col justify-between cursor-pointer hover:border-blue-500 transition h-20 md:h-24 ${bgClass}`;
        
        let badges = '';
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                let col = t.includes('noche') ? 'bg-indigo-600 text-white' : 'bg-amber-400 text-black';
                if(t.includes('extra')) col = t.includes('noche') ? 'bg-purple-600 text-white ring-1 ring-white/30' : 'bg-orange-500 text-white ring-1 ring-white/30';
                badges += `<span class="${col} text-[9px] font-black px-2 py-1 rounded-md w-full text-center block mb-0.5 shadow-sm uppercase tracking-wide">${t.replace('extra-','E-')}</span>`;
            });
        }

        div.innerHTML = `
            <div class="flex justify-between items-start px-1">
                <span class="text-sm font-bold ${isFeriado?'text-red-400':(isToday?'text-blue-400':'text-slate-400')}">${d}</span>
                ${feriadoName ? '<i class="fas fa-flag text-[8px] text-red-400" title="'+feriadoName+'"></i>' : ''}
                ${data?.nota ? '<i class="fas fa-comment-dots text-[8px] text-blue-400"></i>' : ''}
            </div>
            <div class="w-full px-0.5 flex flex-col justify-end">${badges}</div>
        `;
        div.onclick = () => window.openModal(d);
        grid.appendChild(div);
    }
    window.calcStats();
};

window.openModal = (d) => {
    diaSeleccionado = d;
    document.getElementById('modalDiaNum').innerText = d;
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    document.getElementById('nota').value = turnos[y]?.[m]?.[d]?.nota || '';
    document.getElementById('turnoModal').classList.remove('hidden');
    document.getElementById('turnoModal').classList.add('flex');
};

window.cerrarModal = () => document.getElementById('turnoModal').classList.add('hidden');

window.agregarTurno = async (tipo) => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    const nota = document.getElementById('nota').value;

    if(!turnos[y]) turnos[y] = {};
    if(!turnos[y][m]) turnos[y][m] = {};
    if(!turnos[y][m][diaSeleccionado]) turnos[y][m][diaSeleccionado] = { turnos: [] };

    let current = turnos[y][m][diaSeleccionado].turnos;
    
    // Lógica inteligente: Si agrego día, quito noche. Si agrego extra, convive.
    if(!tipo.includes('extra')) {
        current = current.filter(t => t.includes('extra')); // Borra normales previos
    }
    if(!current.includes(tipo)) current.push(tipo);
    
    turnos[y][m][diaSeleccionado] = { turnos: current, nota: nota };
    
    await saveData();
    window.renderCalendar();
    window.cerrarModal();
};

window.quitarTurno = async () => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(turnos[y]?.[m]?.[diaSeleccionado]) {
        delete turnos[y][m][diaSeleccionado];
        await saveData();
        window.renderCalendar();
    }
    window.cerrarModal();
};

// --- 4. LÓGICA DE PATRONES (Restaurada del original) ---
window.toggleCustomPattern = () => {
    const sel = document.getElementById('patronSelect').value;
    document.getElementById('customPatternDiv').classList.toggle('hidden', sel !== 'custom');
};

window.completarCalendario = async () => {
    const y = parseInt(document.getElementById('yearSelect').value);
    const m = parseInt(document.getElementById('monthSelect').value);
    const pat = document.getElementById('patronSelect').value;
    const rot = document.getElementById('tipoRotacion').value;
    const fechaIniInput = document.getElementById('fechaInicio').value;

    let w, r; 
    if(pat === 'custom') {
        w = parseInt(document.getElementById('diasTrabajo').value);
        r = parseInt(document.getElementById('diasDescanso').value);
    } else {
        [w, r] = pat.split('x').map(Number);
    }

    // Fecha base para el cálculo del ciclo
    let startDate;
    if (fechaIniInput) {
        const [iy, im, id] = fechaIniInput.split('-').map(Number);
        startDate = new Date(iy, im - 1, id);
    } else {
        startDate = new Date(y, m, 1);
    }

    if(!turnos[y]) turnos[y] = {};
    // No borramos el mes completo, solo sobrescribimos los días que correspondan
    if(!turnos[y][m]) turnos[y][m] = {}; 

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cycleLen = w + r;

    for(let d=1; d<=daysInMonth; d++) {
        const currentDate = new Date(y, m, d);
        
        // Calcular diferencia en días
        const diffTime = currentDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
        
        // Calcular posición en el ciclo (manejo de negativos para fechas anteriores)
        let cyclePos = diffDays % cycleLen;
        if(cyclePos < 0) cyclePos += cycleLen;

        if (cyclePos < w) { // Es día de trabajo
            let type = 'dia';
            
            if (rot === 'solo-noche') type = 'noche';
            else if (rot === 'dia-noche') {
                // Alternancia de ciclos completos
                const cycleCount = Math.floor(diffDays / cycleLen);
                type = (Math.abs(cycleCount) % 2 === 0) ? 'dia' : 'noche';
            } 
            else if (rot === 'noche-noche-dia') {
                // Ciclo complejo de 3 rotaciones (Noche, Noche, Día)
                // Ciclo total = 3 * cycleLen
                const bigCycle = Math.floor(diffDays / cycleLen);
                const posInBig = (bigCycle % 3 + 3) % 3; // 0, 1, 2
                if(posInBig === 0) type = 'noche';
                else if(posInBig === 1) type = 'noche';
                else type = 'dia';
            }
            else if (rot === 'dia-dia-noche') {
                const bigCycle = Math.floor(diffDays / cycleLen);
                const posInBig = (bigCycle % 3 + 3) % 3;
                if(posInBig === 0) type = 'dia';
                else if(posInBig === 1) type = 'dia';
                else type = 'noche';
            }

            turnos[y][m][d] = { turnos: [type], nota: '' };
        } else {
            // Es descanso: si quieres borrar lo que había, descomenta:
            // if(turnos[y][m][d]) delete turnos[y][m][d];
        }
    }
    
    await saveData();
    window.renderCalendar();
    alert("Calendario generado correctamente.");
};

window.limpiarMes = async () => {
    if(!confirm("¿Seguro de borrar este mes?")) return;
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    if(turnos[y]?.[m]) delete turnos[y][m];
    await saveData();
    window.renderCalendar();
};

window.autollenarAnual = async () => {
    if(!confirm("Esto llenará todo el año actual basado en la configuración. ¿Seguir?")) return;
    const y = parseInt(document.getElementById('yearSelect').value);
    const currentM = parseInt(document.getElementById('monthSelect').value);
    
    // Ejecutar completarCalendario para cada mes restante
    const originalM = document.getElementById('monthSelect').value;
    
    for(let m = 0; m < 12; m++) {
        document.getElementById('monthSelect').value = m;
        await window.completarCalendario(); // Reutiliza la lógica
    }
    
    document.getElementById('monthSelect').value = currentM;
    window.renderCalendar();
};

// --- 5. ESTADÍSTICAS Y PDF ---
window.calcStats = () => {
    const y = document.getElementById('yearSelect').value;
    const m = document.getElementById('monthSelect').value;
    let t=0, n=0, e=0, l=0, dias=new Date(y,parseInt(m)+1,0).getDate(), txt=[];
    
    for(let d=1; d<=dias; d++) {
        const dt = turnos[y]?.[m]?.[d];
        if(dt && dt.turnos.length > 0) {
            t++;
            dt.turnos.forEach(x => {
                if(x.includes('extra')) e+=12; else n+=12;
            });
            txt.push(`${d}/${parseInt(m)+1}: ${dt.turnos.join('+').toUpperCase()}`);
        }
    }
    l = dias - t;
    document.getElementById('diasTrabajados').innerText = t;
    document.getElementById('diasLibres').innerText = l;
    document.getElementById('horasNormales').innerText = n;
    document.getElementById('horasExtras').innerText = e;
    document.getElementById('diasNormales').value = txt.join('\n');
};

window.exportarAPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const title = document.getElementById('monthYear').innerText;
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE TURNOS", 105, 20, null, null, "center");
    doc.setFontSize(12);
    doc.text(title, 105, 30, null, null, "center");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = document.getElementById('diasNormales').value.split('\n');
    let y = 50;
    lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 7;
    });
    
    // Resumen
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN:", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Trabajados: ${document.getElementById('diasTrabajados').innerText}`, 20, y);
    doc.text(`Libres: ${document.getElementById('diasLibres').innerText}`, 80, y);
    y += 7;
    doc.text(`Horas Normales: ${document.getElementById('horasNormales').innerText}`, 20, y);
    doc.text(`Horas Extras: ${document.getElementById('horasExtras').innerText}`, 80, y);

    doc.save("Turnos_Reporte.pdf");
};

// --- HELPERS UI ---
window.cambiarPestaña = (id) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'border-blue-500', 'text-white');
        b.classList.add('text-slate-400');
    });
    
    document.getElementById(`tab-${id}`).classList.remove('hidden');
    const btn = event.currentTarget || document.querySelector(`.tab-btn[onclick="cambiarPestaña('${id}')"]`);
    if(btn) {
        btn.classList.add('active', 'border-blue-500', 'text-white');
        btn.classList.remove('text-slate-400');
    }
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

// INIT
document.addEventListener('DOMContentLoaded', () => {
    const ys = document.getElementById('yearSelect');
    const ms = document.getElementById('monthSelect');
    for(let i=2024; i<=2030; i++) ys.innerHTML+=`<option value="${i}">${i}</option>`;
    ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].forEach((m,i)=> ms.innerHTML+=`<option value="${i}">${m}</option>`);
    
    const now = new Date();
    ys.value = now.getFullYear();
    ms.value = now.getMonth();
    
    checkSession();
});