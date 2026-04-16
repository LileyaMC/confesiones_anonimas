const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("confesionForm");
const statusMsg = document.getElementById("statusMsg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mensaje = document.getElementById("mensaje").value.trim();
  const categoria = document.getElementById("categoria").value;
  const alias = document.getElementById("alias").value.trim();

  if (!mensaje) {
    statusMsg.textContent = "Escribe una confesión antes de enviar.";
    return;
  }

  statusMsg.textContent = "Enviando confesión...";

  const { error } = await db.from("confesiones").insert([
    {
      mensaje,
      categoria,
      alias: alias || null
    }
  ]);

  if (error) {
    console.error("Error al guardar:", error);
    statusMsg.textContent = `Error: ${error.message}`;
    return;
  }

  form.reset();
  statusMsg.textContent = "Tu confesión fue enviada correctamente ✨";
});

async function cargarConfesionesPublicas() {
  const contenedor = document.getElementById("lista-confesiones");
  if (!contenedor) return;

  const { data, error } = await db
    .from("confesiones")
    .select("*")
    .eq("estado", "aprobado")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando confesiones públicas:", error);
    contenedor.innerHTML = `<p class="footer-note">No se pudieron cargar las confesiones.</p>`;
    return;
  }

  if (!data.length) {
    contenedor.innerHTML = `<p class="footer-note">Aún no hay confesiones aprobadas.</p>`;
    return;
  }

  contenedor.innerHTML = data.map(item => `
    <article class="confesion-card">
      <div class="confesion-top">
        <span class="mini-badge">${item.categoria || "Random"}</span>
        <span class="mini-date">${new Date(item.created_at).toLocaleString("es-CO", {
          dateStyle: "medium",
          timeStyle: "short"
        })}</span>
      </div>

      <p class="confesion-texto">${item.mensaje}</p>

      <div class="confesion-bottom">
        <p class="confesion-meta">Alias: ${item.alias ? item.alias : "Anónimo"}</p>
      </div>
    </article>
  `).join("");
}

cargarConfesionesPublicas();

db
  .channel("confesiones-publicas")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "confesiones" },
    () => {
      cargarConfesionesPublicas();
    }
  )
  .subscribe();