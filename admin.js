const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const lista = document.getElementById("listaConfesiones");
const buscador = document.getElementById("buscador");
const filtroCategoria = document.getElementById("filtroCategoria");

let confesiones = [];

function formatearFecha(fecha) {
  const f = new Date(fecha);
  return f.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function badgeEstado(estado) {
  if (estado === "aprobado") return "estado-aprobado";
  if (estado === "rechazado") return "estado-rechazado";
  return "estado-pendiente";
}

function renderConfesiones(items) {
  if (!items.length) {
    lista.innerHTML = `
      <p class="footer-note">
        No hay confesiones disponibles.
      </p>
    `;
    return;
  }

  lista.innerHTML = items.map(item => `
    <article class="confesion-card">
      <div class="confesion-top">
        <span class="mini-badge">${item.categoria || "Random"}</span>
        <span class="mini-date">${formatearFecha(item.created_at)}</span>
      </div>

      <p class="confesion-texto">${item.mensaje}</p>

      <div class="confesion-bottom">
        <p class="confesion-meta">Alias: ${item.alias ? item.alias : "Anónimo"}</p>
        <p class="confesion-meta">
          Estado:
          <span class="${badgeEstado(item.estado)}">${item.estado || "pendiente"}</span>
        </p>
      </div>

      <div class="acciones-admin">
        <button class="accion-btn aprobar-btn" onclick="cambiarEstado(${item.id}, 'aprobado')">
          Aprobar
        </button>

        <button class="accion-btn rechazar-btn" onclick="cambiarEstado(${item.id}, 'rechazado')">
          Rechazar
        </button>

        <button class="accion-btn eliminar-btn" onclick="eliminarConfesion(${item.id})">
          Eliminar
        </button>
      </div>
    </article>
  `).join("");
}

function aplicarFiltros() {
  const texto = buscador.value.toLowerCase().trim();
  const categoria = filtroCategoria.value;

  const filtradas = confesiones.filter(item => {
    const coincideTexto =
      (item.mensaje && item.mensaje.toLowerCase().includes(texto)) ||
      (item.alias && item.alias.toLowerCase().includes(texto)) ||
      (item.categoria && item.categoria.toLowerCase().includes(texto)) ||
      (item.estado && item.estado.toLowerCase().includes(texto));

    const coincideCategoria =
      categoria === "todas" || item.categoria === categoria;

    return coincideTexto && coincideCategoria;
  });

  renderConfesiones(filtradas);
}

async function cargarConfesiones() {
  lista.innerHTML = `
    <p class="footer-note">
      Cargando confesiones...
    </p>
  `;

  const { data, error } = await db
    .from("confesiones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando confesiones:", error);
    lista.innerHTML = `
      <p class="footer-note">
        Error cargando confesiones.
      </p>
    `;
    return;
  }

  confesiones = data || [];
  aplicarFiltros();
}

async function cambiarEstado(id, nuevoEstado) {
  const { error } = await db
    .from("confesiones")
    .update({ estado: nuevoEstado })
    .eq("id", id);

  if (error) {
    console.error("Error actualizando estado:", error);
    alert("No se pudo cambiar el estado.");
    return;
  }

  cargarConfesiones();
}

async function eliminarConfesion(id) {
  const confirmar = confirm("¿Seguro que deseas eliminar esta confesión?");
  if (!confirmar) return;

  const { error } = await db
    .from("confesiones")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error eliminando confesión:", error);
    alert("No se pudo eliminar la confesión.");
    return;
  }

  cargarConfesiones();
}

buscador.addEventListener("input", aplicarFiltros);
filtroCategoria.addEventListener("change", aplicarFiltros);

cargarConfesiones();

db
  .channel("confesiones-realtime")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "confesiones"
    },
    () => {
      cargarConfesiones();
    }
  )
  .subscribe();

window.cambiarEstado = cambiarEstado;
window.eliminarConfesion = eliminarConfesion;