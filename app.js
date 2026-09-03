const URL_API = "https://script.google.com/macros/s/AKfycbzR1qqGqGvD7OUGKiWpzwLu502Q8wDPOA0xN04pmkLmX39_y34geRlastEhyddSaQWk/exec";
const PIN_SECRETO = "199094";

let inventario = [];
let filtroActual = "todos";
let subFiltroActual = "todos";
let productoSeleccionado = null;

function verificarPIN() {
    const pinIngresado = document.getElementById("pinInput").value;
    if (pinIngresado === PIN_SECRETO) {
        document.getElementById("pantallaLogin").classList.add("oculto");
        document.getElementById("appPrincipal").classList.remove("oculto");
        cargarDatos(); 
    } else {
        document.getElementById("mensajeError").classList.remove("oculto");
        document.getElementById("pinInput").value = "";
    }
}

document.getElementById("pinInput").addEventListener("keypress", function(e) {
    if (e.key === "Enter") verificarPIN();
});

async function cargarDatos() {
    try {
        const respuesta = await fetch(URL_API, { method: "GET", redirect: "follow" });
        inventario = await respuesta.json();
        document.getElementById("cargando").classList.add("oculto");
        document.getElementById("tablaInventario").classList.remove("oculto");
        renderizarTabla();
    } catch (error) {
        document.getElementById("cargando").innerText = "Error al conectar con la base de datos.";
    }
}

function renderizarTabla() {
    const textoBusqueda = document.getElementById("buscador").value.toLowerCase();
    const cuerpo = document.getElementById("cuerpoTabla");
    cuerpo.innerHTML = "";

    const productosFiltrados = inventario.filter(prod => {
        const coincideBusqueda = prod.producto.toLowerCase().includes(textoBusqueda) || 
                                 prod.barras.toString().toLowerCase().includes(textoBusqueda);
        
        let coincideBoton = false;
        if (filtroActual === "todos") coincideBoton = true;
        else if (filtroActual === "activos") coincideBoton = prod.estado === "Activo";
        else if (filtroActual === "archivados") coincideBoton = prod.estado === "Archivado";
        else if (filtroActual === "sin-stock") coincideBoton = (prod.stock <= 0 && prod.estado === "Activo");
        else if (filtroActual === "alertas") {
            const tieneStock = prod.stock > 0 && prod.estado === "Activo";
            if (tieneStock) {
                if (subFiltroActual === "todos") coincideBoton = (prod.estadoCad === "Caducado" || prod.estadoCad.includes("Próximo"));
                else if (subFiltroActual === "proximos") coincideBoton = (prod.estadoCad === "Próximo 7 días");
                else if (subFiltroActual === "caducados") coincideBoton = (prod.estadoCad === "Caducado");
            }
        }
        return coincideBusqueda && coincideBoton;
    });

    productosFiltrados.forEach(prod => {
        let colorStock = prod.stock <= 0 ? "rojo" : (prod.stock <= prod.stockMin ? "naranja" : "verde");
        let colorCad = prod.estadoCad === "Caducado" ? "rojo" : (prod.estadoCad.includes("Próximo") ? "naranja" : "verde");

        cuerpo.innerHTML += `
            <tr class="clickeable" onclick="abrirModal('${prod.barras}')">
                <td><strong>${prod.producto}</strong><br><small style="color:#86868b">${prod.categoria} | ${prod.barras}</small></td>
                <td style="font-size: 18px; font-weight: bold;">${prod.stock}</td>
                <td><span class="badge ${colorStock}">${prod.estadoStock}</span></td>
                <td>${prod.caducidad}<br><span class="badge ${colorCad}">${prod.estadoCad}</span></td>
                <td><span class="badge ${prod.estado === 'Activo' ? 'verde' : 'gris'}">${prod.estado}</span></td>
            </tr>
        `;
    });
}

function abrirModal(codigoBarras) {
    productoSeleccionado = inventario.find(p => p.barras.toString() === codigoBarras.toString());
    if(!productoSeleccionado) return;
    document.getElementById("modalProductoNombre").innerText = productoSeleccionado.producto;
    document.getElementById("modalProductoDetalle").innerText = `${productoSeleccionado.categoria} | ${productoSeleccionado.barras}`;
    document.getElementById("modalStock").value = productoSeleccionado.stock;
    document.getElementById("modalEstado").value = productoSeleccionado.estado;
    document.getElementById("modalEdicion").classList.remove("oculto");
}

function cerrarModal() {
    document.getElementById("modalEdicion").classList.add("oculto");
}

function ajustarStock(cantidad) {
    const input = document.getElementById("modalStock");
    input.value = Number(input.value) + cantidad;
}

async function guardarEdicion() {
    const nuevoStock = document.getElementById("modalStock").value;
    const nuevoEstado = document.getElementById("modalEstado").value;
    const botonGuardar = document.querySelector(".btn-guardar");
    
    botonGuardar.innerText = "⏳ Guardando...";
    botonGuardar.disabled = true;
    const payload = { barras: productoSeleccionado.barras, stock: nuevoStock, estado: nuevoEstado };

    try {
        const respuesta = await fetch(URL_API, { method: 'POST', body: JSON.stringify(payload) });
        const resultado = await respuesta.json();
        if (resultado.ok) {
            cerrarModal();
            document.getElementById("tablaInventario").classList.add("oculto");
            document.getElementById("cargando").classList.remove("oculto");
            document.getElementById("cargando").innerText = "🔄 Actualizando inventario...";
            cargarDatos();
        } else {
            alert("❌ Error de Sheets: " + resultado.mensaje);
        }
    } catch (error) {
        alert("❌ Error de conexión.");
    } finally {
        botonGuardar.innerText = "💾 Guardar Cambios";
        botonGuardar.disabled = false;
    }
}

document.getElementById("buscador").addEventListener("input", renderizarTabla);

document.querySelectorAll(".btn-filtro").forEach(boton => {
    boton.addEventListener("click", (e) => {
        document.querySelectorAll(".btn-filtro").forEach(b => b.classList.remove("activo"));
        e.target.classList.add("activo");
        filtroActual = e.target.dataset.filtro;
        
        if (filtroActual === "alertas") {
            document.getElementById("subFiltrosCaducidad").classList.remove("oculto");
        } else {
            document.getElementById("subFiltrosCaducidad").classList.add("oculto");
            subFiltroActual = "todos"; 
            document.querySelectorAll(".btn-subfiltro").forEach(b => b.classList.remove("activo"));
            document.querySelector('.btn-subfiltro[data-sub="todos"]').classList.add("activo");
        }
        renderizarTabla();
    });
});

document.querySelectorAll(".btn-subfiltro").forEach(boton => {
    boton.addEventListener("click", (e) => {
        document.querySelectorAll(".btn-subfiltro").forEach(b => b.classList.remove("activo"));
        e.target.classList.add("activo");
        subFiltroActual = e.target.dataset.sub;
        renderizarTabla();
    });
});
