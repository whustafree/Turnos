// Importaciones de Firebase desde CDN
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let turnos = {};
let diaSeleccionado = null;

// --- GESTIÓN DE SESIÓN ---
// onAuthStateChanged mantiene la sesión activa aunque cierres el navegador
onAuthStateChanged(window.auth, async (user) => {
    const loginScreen = document.getElementById('loginScreen');
    const appContent = document.getElementById('appContent');

    if (user) {
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        await cargarDatosNube(); // Carga automática al entrar
    } else {
        loginScreen.classList.remove('hidden');
        appContent.classList.add('hidden');
    }
});

// Asignamos las funciones a window para que los botones del HTML puedan verlas
window.login = () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    signInWithEmailAndPassword(window.auth, email, pass)
        .catch(err => alert("Error al ingresar: " + err.message));
};

window.registro = () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    createUserWithEmailAndPassword(window.auth, email, pass)
        .then(() => alert("¡Cuenta creada con éxito!"))
        .catch(err => alert("Error al registrar: " + err.message));
};

window.cerrarSesion = () => signOut(window.auth);

// --- SINCRONIZACIÓN CON FIRESTORE ---
async function guardarDatosNube() {
    const user = window.auth.currentUser;
    if (user) {
        try {
            await setDoc(doc(window.db, "usuarios", user.uid), {
                datosTurnos: turnos,
                actualizado: new Date()
            });
        } catch (e) {
            console.error("Error al sincronizar:", e);
        }
    }
}

async function cargarDatosNube() {
    const user = window.auth.currentUser;
    if (user) {
        const docSnap = await getDoc(doc(window.db, "usuarios", user.uid));
        if (docSnap.exists()) {
            turnos = docSnap.data().datosTurnos || {};
            actualizarCalendario();
        }
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

    for(let i=0; i<primerDia; i++) grid.appendChild(document.createElement('div'));

    for(let d=1; d<=diasMes; d++) {
        const div = document.createElement('div');
        div.className = 'day card p-2 text-center cursor-pointer border border-gray-700 rounded hover:bg-gray-800';
        div.innerHTML = `<span class="font-bold">${d}</span>`;
        
        const data = turnos[año]?.[mes]?.[d];
        if(data && data.turnos) {
            data.turnos.forEach(t => {
                const badge = document.createElement('div');
                badge.className = `turno ${t} text-[9px] rounded mt-1 text-white p-1 uppercase`;
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
        await guardarDatosNube();
    }
    window.cerrarModal();
};

window.cerrarModal = () => {
    document.getElementById('turnoModal').classList.remove('active');
};

// Inicialización de selectores al cargar la página
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
    
    window.actualizarCalendario();
});