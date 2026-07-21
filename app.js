const SUPABASE_URL = "https://esjqybxzpqtonkcomdtb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanF5Ynh6cHF0b25rY29tZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTE2NTgsImV4cCI6MjA5OTcyNzY1OH0.DEGP5xyOsdl41qFiFaoZfophSKiWdXIcKmq7_wv9nbg";

const SALES_STAGES = [
  "Nuevo lead",
  "Contactado",
  "Calificado",
  "Cotizacion enviada",
  "Seguimiento",
  "Ganado",
  "Perdido",
];

const SERVICE_STAGES = [
  "Solicitud recibida",
  "Diagnostico",
  "Cotizacion enviada",
  "Aprobado",
  "En proceso",
  "Listo / entregado",
  "Seguimiento postventa",
];

const CHANNELS = ["WhatsApp", "Instagram", "Referido", "Local", "Web", "Evento", "Marketplace"];
const INTERESTS = ["Moto", "Repuesto", "Accesorio", "Servicio", "Mantenimiento", "Evento", "Otro"];
const URGENCIES = ["Alta", "Media", "Baja"];
const OWNERS = ["Ventas", "Servicio", "Gerencia"];

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const searchInput = document.querySelector("#global-search");
const importInput = document.querySelector("#import-file");
const viewTitle = document.querySelector("#view-title");
const syncStatus = document.querySelector("#sync-status");
const signOutButton = document.querySelector("#sign-out-button");
const newLeadTop = document.querySelector("#new-lead-top");

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

let currentView = "dashboard";
let session = null;
let loading = true;
let state = emptyState();

function emptyState() {
  return {
    contacts: [],
    opportunities: [],
    services: [],
    tasks: [],
  };
}

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateShift(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function dateLabel(date) {
  if (!date) return "Sin fecha";
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(date, status = "Pendiente") {
  return status !== "Completada" && date && date < todayIso();
}

function byId(collection, id) {
  return collection.find((item) => item.id === id);
}

function upsertStateItem(collection, item) {
  if (!item?.id) return;
  const index = collection.findIndex((current) => current.id === item.id);
  if (index >= 0) {
    collection[index] = item;
  } else {
    collection.unshift(item);
  }
}

function sumValues(items, field) {
  return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}

function getContact(id) {
  return byId(state.contacts, id) || {
    id: "",
    name: "Sin cliente",
    phone: "",
    channel: "",
    type: "",
  };
}

function matchesSearch(...values) {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(query));
}

function setSync(message, tone = "neutral") {
  syncStatus.textContent = message;
  syncStatus.dataset.tone = tone;
}

function updateChrome(title, signedIn = Boolean(session)) {
  viewTitle.textContent = title;
  searchInput.disabled = !signedIn;
  newLeadTop.hidden = !signedIn;
  signOutButton.hidden = !signedIn;
  if (!signedIn) setSync("Sin sesion", "warning");
}

function optionList(items, selected = "") {
  return items
    .map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${item === selected ? "selected" : ""}>${escapeHtml(
          item,
        )}</option>`,
    )
    .join("");
}

function contactOptions(selected = "") {
  return state.contacts
    .map(
      (contact) =>
        `<option value="${contact.id}" ${contact.id === selected ? "selected" : ""}>${escapeHtml(
          contact.name,
        )} - ${escapeHtml(contact.phone || "sin telefono")}</option>`,
    )
    .join("");
}

function openModal(title, content) {
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modal.hidden = false;
  const firstInput = modalBody.querySelector("input, select, textarea, button");
  if (firstInput) firstInput.focus();
}

function closeModal() {
  modal.hidden = true;
  modalBody.innerHTML = "";
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function formFieldLabel(field) {
  const label = field.closest(".field")?.querySelector("label")?.textContent || field.name || "campo requerido";
  return label.replace("*", "").trim();
}

function showFormMessage(form, message, tone = "neutral") {
  let notice = form.querySelector("[data-form-message]");
  if (!notice) {
    notice = document.createElement("div");
    notice.className = "notice form-message field full";
    notice.dataset.formMessage = "";
    const footer = form.querySelector(".form-footer");
    form.insertBefore(notice, footer || null);
  }
  notice.textContent = message;
  notice.dataset.tone = tone;
  notice.setAttribute("role", tone === "danger" ? "alert" : "status");
  notice.hidden = false;
}

function clearFormMessage(form) {
  const notice = form.querySelector("[data-form-message]");
  if (notice) {
    notice.hidden = true;
    notice.textContent = "";
  }
}

function validateRequiredFields(form) {
  const missing = [...form.querySelectorAll("[required]")].find((field) => !String(field.value || "").trim());
  if (!missing) return true;
  const label = formFieldLabel(missing);
  showFormMessage(form, `Falta completar: ${label}.`, "danger");
  setSync("Faltan datos", "warning");
  missing.focus();
  return false;
}

function setSaveStep(form, message) {
  if (form) showFormMessage(form, message, "neutral");
  setSync(message.replace("...", ""), "neutral");
}

async function withTimeout(operation, label, ms = 12000) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`${label} tardo demasiado. Revisa internet, Supabase o vuelve a intentar.`));
    }, ms);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timerId);
  }
}

function contactFromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    channel: row.channel || "",
    type: row.type || "",
    lastContact: row.last_contact || "",
    notes: row.notes || "",
  };
}

function contactToDb(item) {
  return {
    ...(item.id ? { id: item.id } : {}),
    name: item.name,
    phone: item.phone,
    channel: item.channel || null,
    type: item.type || null,
    last_contact: item.lastContact || null,
    notes: item.notes || null,
  };
}

function opportunityFromDb(row) {
  return {
    id: row.id,
    contactId: row.contact_id,
    title: row.title || "",
    interest: row.interest || "",
    brand: row.brand || "",
    model: row.model || "",
    budget: Number(row.budget || 0),
    value: Number(row.value || 0),
    urgency: row.urgency || "Media",
    stage: row.stage || "Nuevo lead",
    owner: row.owner || "Ventas",
    nextAction: row.next_action || "",
    followUpDate: row.follow_up_date || "",
    createdAt: row.created_at || "",
    notes: row.notes || "",
    lostReason: row.lost_reason || "",
  };
}

function opportunityToDb(item) {
  return {
    ...(item.id ? { id: item.id } : {}),
    contact_id: item.contactId,
    title: item.title,
    interest: item.interest || null,
    brand: item.brand || null,
    model: item.model || null,
    budget: Number(item.budget || 0),
    value: Number(item.value || 0),
    urgency: item.urgency || null,
    stage: item.stage || "Nuevo lead",
    owner: item.owner || null,
    next_action: item.nextAction || null,
    follow_up_date: item.followUpDate || null,
    notes: item.notes || null,
    lost_reason: item.lostReason || null,
  };
}

function serviceFromDb(row) {
  return {
    id: row.id,
    contactId: row.contact_id,
    asset: row.asset || "",
    request: row.request || "",
    stage: row.stage || "Solicitud recibida",
    quotedValue: Number(row.quoted_value || 0),
    dueDate: row.due_date || "",
    owner: row.owner || "Servicio",
    notes: row.notes || "",
  };
}

function serviceToDb(item) {
  return {
    ...(item.id ? { id: item.id } : {}),
    contact_id: item.contactId,
    asset: item.asset || null,
    request: item.request,
    stage: item.stage || "Solicitud recibida",
    quoted_value: Number(item.quotedValue || 0),
    due_date: item.dueDate || null,
    owner: item.owner || null,
    notes: item.notes || null,
  };
}

function taskFromDb(row) {
  return {
    id: row.id,
    title: row.title || "",
    dueDate: row.due_date || "",
    owner: row.owner || "Ventas",
    priority: row.priority || "Media",
    status: row.status || "Pendiente",
    relatedType: row.related_type || "",
    relatedId: row.related_id || "",
  };
}

function taskToDb(item) {
  return {
    ...(item.id ? { id: item.id } : {}),
    title: item.title,
    due_date: item.dueDate || null,
    owner: item.owner || null,
    priority: item.priority || "Media",
    status: item.status || "Pendiente",
    related_type: item.relatedType || null,
    related_id: item.relatedId || null,
  };
}

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error("No se cargo Supabase. Revisa la conexion a internet y vuelve a cargar.");
  }
}

async function requireActiveSession() {
  requireSupabase();
  if (session?.access_token) return session;
  const { data, error } = await withTimeout(supabaseClient.auth.getSession(), "Verificar sesion");
  if (error) throw error;
  session = data.session;
  if (!session?.access_token) {
    throw new Error("La sesion de Supabase expiro. Cierra sesion, entra de nuevo y vuelve a guardar.");
  }
  return session;
}

async function loadRemoteData() {
  requireSupabase();
  loading = true;
  renderLoading("Cargando datos de Supabase...");
  setSync("Sincronizando", "neutral");

  const [contacts, opportunities, services, tasks] = await Promise.all([
    supabaseClient.from("contacts").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("opportunities").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("services").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const error = contacts.error || opportunities.error || services.error || tasks.error;
  if (error) throw error;

  state = {
    contacts: contacts.data.map(contactFromDb),
    opportunities: opportunities.data.map(opportunityFromDb),
    services: services.data.map(serviceFromDb),
    tasks: tasks.data.map(taskFromDb),
  };

  loading = false;
  setSync("Guardado en Supabase", "success");
  render();
}

async function init() {
  try {
    if (!supabaseClient) {
      loading = false;
      renderAuth("No se pudo cargar Supabase. Revisa internet y vuelve a abrir la pagina.");
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    session = data.session;

    supabaseClient.auth.onAuthStateChange(async (_event, nextSession) => {
      session = nextSession;
      if (session) {
        await safeLoad();
      } else {
        state = emptyState();
        renderAuth();
      }
    });

    if (session) {
      await safeLoad();
    } else {
      loading = false;
      renderAuth();
    }
  } catch (error) {
    loading = false;
    renderAuth(friendlyError(error));
  }
}

async function safeLoad() {
  try {
    await loadRemoteData();
  } catch (error) {
    loading = false;
    setSync("Error", "danger");
    renderError(friendlyError(error));
  }
}

function friendlyError(error) {
  const message = error?.message || error?.details || String(error);
  if (message.includes("relation") && message.includes("does not exist")) {
    return "Faltan tablas en Supabase. Ejecuta el archivo supabase-schema.sql en el SQL Editor.";
  }
  if (message.includes("Could not find") && (message.includes("brand") || message.includes("model"))) {
    return "Faltan los campos marca/modelo en Supabase. Ejecuta supabase-add-brand-model.sql en el SQL Editor.";
  }
  if (message.includes("row-level security") || message.includes("policy")) {
    return "Supabase bloqueo la accion por reglas de seguridad. Revisa que hayas ejecutado supabase-schema.sql y que hayas iniciado sesion.";
  }
  return message;
}

function errorDetail(error) {
  if (!error) return "Sin detalle tecnico.";
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ") || String(error);
}

function renderAuth(message = "") {
  updateChrome("Acceso Holeshot", false);
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.remove("active"));
  app.innerHTML = `
    <section class="auth-wrap">
      <div class="auth-card card">
        <div class="auth-logo-wrap">
          <img src="./logo.png?v=11" alt="Holeshot Power Parts" />
        </div>
        <h2>Entrar al CRM</h2>
        <p class="muted">Usa el usuario creado en Supabase para guardar ventas, clientes y servicios en la nube.</p>
        ${message ? `<div class="notice">${escapeHtml(message)}</div>` : ""}
        <form id="auth-form" class="form-grid">
          <div class="field full">
            <label>Email</label>
            <input name="email" type="email" autocomplete="email" required />
          </div>
          <div class="field full">
            <label>Contrasena</label>
            <input name="password" type="password" autocomplete="current-password" required />
          </div>
          <div class="form-footer field full">
            <button class="button primary" type="submit">Entrar</button>
            <button class="button" type="button" data-action="sign-up">Crear usuario</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderLoading(message = "Cargando...") {
  updateChrome("Tablero Holeshot", Boolean(session));
  app.innerHTML = `<div class="card"><div class="card-body"><p class="muted">${escapeHtml(message)}</p></div></div>`;
}

function renderError(message) {
  updateChrome("Necesita configuracion", Boolean(session));
  app.innerHTML = `
    <div class="card">
      <div class="card-header"><h2>No se pudo cargar el CRM</h2></div>
      <div class="card-body">
        <div class="notice">${escapeHtml(message)}</div>
        <br />
        <button class="button primary" data-action="reload-data">Reintentar</button>
      </div>
    </div>
  `;
}

function setView(view) {
  currentView = view;
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
  app.focus();
}

function render() {
  if (loading) {
    renderLoading();
    return;
  }

  if (!session) {
    renderAuth();
    return;
  }

  const titles = {
    dashboard: "Tablero Holeshot",
    leads: "Ventas y oportunidades",
    services: "Servicios y postventa",
    tasks: "Seguimientos",
    clients: "Clientes",
    reports: "Reportes",
    settings: "Datos y Supabase",
  };

  updateChrome(titles[currentView], true);
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });

  const views = {
    dashboard: renderDashboard,
    leads: renderLeads,
    services: renderServices,
    tasks: renderTasks,
    clients: renderClients,
    reports: renderReports,
    settings: renderSettings,
  };

  app.innerHTML = views[currentView]();
}

function renderDashboard() {
  const openOps = state.opportunities.filter((item) => !["Ganado", "Perdido"].includes(item.stage));
  const wonOps = state.opportunities.filter((item) => item.stage === "Ganado");
  const activeServices = state.services.filter((item) => item.stage !== "Seguimiento postventa");
  const pendingTasks = state.tasks.filter((task) => task.status !== "Completada");
  const overdueTasks = pendingTasks.filter((task) => isOverdue(task.dueDate, task.status));
  const salesValue = openOps.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const totalSalesValue = sumValues(state.opportunities, "value");
  const wonSalesValue = sumValues(wonOps, "value");
  const totalServiceValue = sumValues(state.services, "quotedValue");
  const totalBusinessValue = totalSalesValue + totalServiceValue;

  return `
    <section class="grid kpi-grid">
      ${metric("Total ventas", money(totalSalesValue), `${state.opportunities.length} ventas registradas`)}
      ${metric("Total servicios", money(totalServiceValue), `${state.services.length} servicios registrados`)}
      ${metric("Total combinado", money(totalBusinessValue), "Ventas + servicios")}
      ${metric("Ventas ganadas", money(wonSalesValue), `${wonOps.length} cierres ganados`)}
      ${metric("Oportunidades abiertas", openOps.length, `${money(salesValue)} en valor potencial`)}
      ${metric("Seguimientos vencidos", overdueTasks.length, "Necesitan accion hoy")}
      ${metric("Servicios activos", activeServices.length, "En taller o pendientes")}
      ${metric("Clientes registrados", state.contacts.length, "Base Holeshot")}
    </section>

    <section class="grid split-grid">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>Pipeline comercial</h2>
            <p class="muted">Control diario de ventas, cotizaciones y cierres.</p>
          </div>
          <button class="button primary" data-action="new-lead">Nuevo lead</button>
        </div>
        <div class="card-body">
          <div class="pipeline">
            ${SALES_STAGES.map(renderStage).join("")}
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-header">
            <h2>Prioridad de hoy</h2>
            <button class="button" data-action="new-task">Nueva tarea</button>
          </div>
          <div class="card-body">${renderTaskList(pendingTasks.slice(0, 6))}</div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Servicios activos</h2></div>
          <div class="card-body">${renderServiceMini(activeServices.slice(0, 4))}</div>
        </div>
      </div>
    </section>
  `;
}

function metric(label, value, note) {
  return `
    <div class="card metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderStage(stage) {
  const items = state.opportunities.filter((item) => item.stage === stage).slice(0, 4);
  return `
    <div class="stage">
      <div class="stage-head">
        <span>${escapeHtml(stage)}</span>
        <span>${items.length}</span>
      </div>
      ${
        items.length
          ? items
              .map((item) => {
                const contact = getContact(item.contactId);
                return `<div class="mini-card">
                  <strong>${escapeHtml(contact.name)}</strong>
                  <span>${escapeHtml(item.title)} Â· ${money(item.value)}</span>
                </div>`;
              })
              .join("")
          : `<p class="empty">Sin registros</p>`
      }
    </div>
  `;
}

function renderTaskList(tasks) {
  if (!tasks.length) return `<p class="empty">No hay seguimientos pendientes.</p>`;
  return `
    <div class="task-list">
      ${tasks
        .map(
          (task) => `<div class="task-item">
            <input type="checkbox" ${task.status === "Completada" ? "checked" : ""} data-complete-task="${task.id}" aria-label="Marcar seguimiento" />
            <div>
              <strong>${escapeHtml(task.title)}</strong>
              <p class="muted">${dateLabel(task.dueDate)} Â· ${escapeHtml(task.owner)}</p>
            </div>
            <div class="actions">
              ${taskBadge(task)}
              <button class="button" data-action="edit-task" data-id="${task.id}">Editar</button>
            </div>
          </div>`,
        )
        .join("")}
    </div>
  `;
}

function taskBadge(task) {
  if (task.status === "Completada") return `<span class="pill done">Completada</span>`;
  if (isOverdue(task.dueDate, task.status)) return `<span class="pill late">Vencida</span>`;
  if (task.priority === "Alta") return `<span class="pill hot">Alta</span>`;
  return `<span class="pill">${escapeHtml(task.priority || "Media")}</span>`;
}

function renderServiceMini(services) {
  if (!services.length) return `<p class="empty">No hay servicios activos.</p>`;
  return services
    .map((service) => {
      const contact = getContact(service.contactId);
      return `<div class="mini-card">
        <strong>${escapeHtml(contact.name)}</strong>
        <span>${escapeHtml(service.request)} Â· ${escapeHtml(service.stage)}</span>
      </div>`;
    })
    .join("");
}

function renderLeads() {
  const rows = state.opportunities.filter((item) => {
    const contact = getContact(item.contactId);
    return matchesSearch(contact.name, contact.phone, item.title, item.interest, item.brand, item.model, item.stage, item.owner);
  });

  return `
    <div class="toolbar">
      <div>
        <h2>Ventas Holeshot</h2>
        <p class="muted">Registra cada lead con proxima accion y fecha de seguimiento.</p>
      </div>
      <div class="toolbar-actions">
        <button class="button primary" data-action="new-lead">Nuevo lead</button>
        <button class="button" data-action="new-task">Nuevo seguimiento</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Interes</th>
            <th>Valor</th>
            <th>Etapa</th>
            <th>Seguimiento</th>
            <th>Responsable</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows.map(renderLeadRow).join("")
              : `<tr><td colspan="7" class="empty">No hay ventas con ese filtro.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderLeadRow(item) {
  const contact = getContact(item.contactId);
  return `
    <tr>
      <td>
        <div class="row-title">${escapeHtml(contact.name)}</div>
        <div class="row-note">${escapeHtml(contact.phone)} Â· ${escapeHtml(contact.channel)}</div>
      </td>
      <td>
        <div class="row-title">${escapeHtml(item.title)}</div>
        <div class="row-note">${[item.interest, item.brand, item.model].filter(Boolean).map(escapeHtml).join(" · ") || "Sin detalle"} · Urgencia ${escapeHtml(item.urgency)}</div>
      </td>
      <td>${money(item.value)}</td>
      <td>
        <select class="status-select" data-update-stage="opportunity" data-id="${item.id}">
          ${optionList(SALES_STAGES, item.stage)}
        </select>
      </td>
      <td>
        <span class="pill ${isOverdue(item.followUpDate) ? "late" : "info"}">${dateLabel(item.followUpDate)}</span>
        <div class="row-note">${escapeHtml(item.nextAction)}</div>
      </td>
      <td>${escapeHtml(item.owner)}</td>
      <td>
        <div class="actions">
          <button class="button" data-action="edit-lead" data-id="${item.id}">Editar</button>
          <button class="button" data-action="add-task-from-opportunity" data-id="${item.id}">Tarea</button>
        </div>
      </td>
    </tr>
  `;
}

function renderServices() {
  const rows = state.services.filter((item) => {
    const contact = getContact(item.contactId);
    return matchesSearch(contact.name, contact.phone, item.request, item.asset, item.stage, item.owner);
  });

  return `
    <div class="toolbar">
      <div>
        <h2>Servicios y postventa</h2>
        <p class="muted">Para diagnosticos, trabajos en proceso, entregas y seguimiento posterior.</p>
      </div>
      <div class="toolbar-actions">
        <button class="button primary" data-action="new-service">Nuevo servicio</button>
        <button class="button" data-action="new-client">Nuevo cliente</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Solicitud</th>
            <th>Etapa</th>
            <th>Fecha compromiso</th>
            <th>Valor</th>
            <th>Responsable</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows.map(renderServiceRow).join("")
              : `<tr><td colspan="7" class="empty">No hay servicios con ese filtro.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderServiceRow(item) {
  const contact = getContact(item.contactId);
  return `
    <tr>
      <td>
        <div class="row-title">${escapeHtml(contact.name)}</div>
        <div class="row-note">${escapeHtml(contact.phone)}</div>
      </td>
      <td>
        <div class="row-title">${escapeHtml(item.request)}</div>
        <div class="row-note">${escapeHtml(item.asset || "Sin producto especifico")}</div>
      </td>
      <td>
        <select class="status-select" data-update-stage="service" data-id="${item.id}">
          ${optionList(SERVICE_STAGES, item.stage)}
        </select>
      </td>
      <td><span class="pill ${isOverdue(item.dueDate) ? "late" : "info"}">${dateLabel(item.dueDate)}</span></td>
      <td>${money(item.quotedValue)}</td>
      <td>${escapeHtml(item.owner)}</td>
      <td>
        <div class="actions">
          <button class="button" data-action="edit-service" data-id="${item.id}">Editar</button>
          <button class="button" data-action="add-task-from-service" data-id="${item.id}">Tarea</button>
        </div>
      </td>
    </tr>
  `;
}

function renderTasks() {
  const rows = state.tasks
    .filter((task) => matchesSearch(task.title, task.owner, task.priority, task.status))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  return `
    <div class="toolbar">
      <div>
        <h2>Seguimientos</h2>
        <p class="muted">Cada venta o servicio debe quedar con una proxima accion.</p>
      </div>
      <button class="button primary" data-action="new-task">Nuevo seguimiento</button>
    </div>
    <div class="card">
      <div class="card-body">${renderTaskList(rows)}</div>
    </div>
  `;
}

function renderClients() {
  const rows = state.contacts.filter((item) =>
    matchesSearch(item.name, item.phone, item.channel, item.type, item.notes),
  );

  return `
    <div class="toolbar">
      <div>
        <h2>Clientes Holeshot</h2>
        <p class="muted">Base independiente para ventas, servicio, recompra y referidos.</p>
      </div>
      <button class="button primary" data-action="new-client">Nuevo cliente</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Telefono</th>
            <th>Canal</th>
            <th>Tipo</th>
            <th>Ultimo contacto</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    (item) => `<tr>
                      <td><div class="row-title">${escapeHtml(item.name)}</div></td>
                      <td>${escapeHtml(item.phone)}</td>
                      <td>${escapeHtml(item.channel)}</td>
                      <td><span class="pill">${escapeHtml(item.type)}</span></td>
                      <td>${dateLabel(item.lastContact)}</td>
                      <td class="row-note">${escapeHtml(item.notes || "")}</td>
                      <td><button class="button" data-action="edit-client" data-id="${item.id}">Editar</button></td>
                    </tr>`,
                  )
                  .join("")
              : `<tr><td colspan="7" class="empty">No hay clientes con ese filtro.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderReports() {
  const won = state.opportunities.filter((item) => item.stage === "Ganado").length;
  const lost = state.opportunities.filter((item) => item.stage === "Perdido").length;
  const open = state.opportunities.length - won - lost;
  const total = Math.max(state.opportunities.length, 1);
  const byChannel = CHANNELS.map((channel) => ({
    label: channel,
    count: state.contacts.filter((contact) => contact.channel === channel).length,
  })).filter((item) => item.count);
  const serviceCounts = SERVICE_STAGES.map((stage) => ({
    label: stage,
    count: state.services.filter((service) => service.stage === stage).length,
  })).filter((item) => item.count);

  return `
    <div class="toolbar">
      <div>
        <h2>Reportes rapidos</h2>
        <p class="muted">Indicadores simples para revisar semanalmente.</p>
      </div>
      <button class="button" data-action="export-csv">Exportar CSV</button>
    </div>
    <section class="grid three-grid">
      <div class="card metric">
        <span>Conversion</span>
        <strong>${Math.round((won / total) * 100)}%</strong>
        <small>${won} ganadas Â· ${lost} perdidas Â· ${open} abiertas</small>
      </div>
      <div class="card metric">
        <span>Venta potencial abierta</span>
        <strong>${money(
          state.opportunities
            .filter((item) => !["Ganado", "Perdido"].includes(item.stage))
            .reduce((sum, item) => sum + Number(item.value || 0), 0),
        )}</strong>
        <small>Valor estimado del pipeline</small>
      </div>
      <div class="card metric">
        <span>Servicios pendientes</span>
        <strong>${state.services.filter((item) => item.stage !== "Seguimiento postventa").length}</strong>
        <small>Trabajos activos o por entregar</small>
      </div>
    </section>
    <section class="grid split-grid" style="margin-top:16px">
      <div class="card">
        <div class="card-header"><h2>Leads por canal</h2></div>
        <div class="card-body">${renderBars(byChannel)}</div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Servicios por etapa</h2></div>
        <div class="card-body">${renderBars(serviceCounts)}</div>
      </div>
    </section>
  `;
}

function renderBars(items) {
  if (!items.length) return `<p class="empty">Todavia no hay datos suficientes.</p>`;
  const max = Math.max(...items.map((item) => item.count), 1);
  return items
    .map(
      (item) => `<div class="report-line">
        <strong>${escapeHtml(item.label)}</strong>
        <div class="bar"><span style="width:${Math.max(8, (item.count / max) * 100)}%"></span></div>
        <span>${item.count}</span>
      </div>`,
    )
    .join("");
}

function renderSettings() {
  const email = session?.user?.email || "Usuario activo";
  return `
    <div class="toolbar">
      <div>
        <h2>Datos y Supabase</h2>
        <p class="muted">Sesion: ${escapeHtml(email)}</p>
      </div>
      <div class="toolbar-actions">
        <button class="button" data-action="reload-data">Sincronizar</button>
        <button class="button" data-action="export-json">Exportar JSON</button>
        <button class="button" data-action="import-json">Importar JSON</button>
      </div>
    </div>
    <div class="grid split-grid">
      <div class="card">
        <div class="card-header"><h2>Base oficial</h2></div>
        <div class="card-body">
          <p class="muted">Los datos se guardan en Supabase. Cada cambio crea o actualiza registros en la base de datos oficial.</p>
          <br />
          <div class="notice">Antes de operar con clientes reales, ejecuta el archivo supabase-schema.sql en Supabase y crea los usuarios del equipo en Authentication.</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Mantenimiento</h2></div>
        <div class="card-body">
          <p class="muted">Puedes cargar datos de prueba o limpiar las tablas si estas configurando el sistema.</p>
          <br />
          <div class="toolbar-actions">
            <button class="button warning" data-action="reset-demo">Cargar demo</button>
            <button class="button warning" data-action="clear-data">Vaciar CRM</button>
            <button class="button" data-action="sign-out">Salir</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function leadForm(recordId = "") {
  const record = byId(state.opportunities, recordId);
  const contact = record ? getContact(record.contactId) : {};
  const title = record ? "Editar venta" : "Nuevo lead de venta";

  openModal(
    title,
    `<form id="lead-form" class="form-grid" novalidate>
      <input type="hidden" name="id" value="${escapeHtml(record?.id || "")}" />
      <div class="notice form-message field full" data-form-message hidden></div>
      <div class="field">
        <label>Nombre del cliente *</label>
        <input name="name" required value="${escapeHtml(contact.name || "")}" />
      </div>
      <div class="field">
        <label>Telefono / WhatsApp *</label>
        <input name="phone" required value="${escapeHtml(contact.phone || "")}" />
      </div>
      <div class="field">
        <label>Canal de entrada *</label>
        <select name="channel" required>${optionList(CHANNELS, contact.channel || "WhatsApp")}</select>
      </div>
      <div class="field">
        <label>Tipo de cliente</label>
        <select name="clientType">${optionList(["Nuevo", "Recurrente", "Referido", "Mayorista"], contact.type || "Nuevo")}</select>
      </div>
      <div class="field">
        <label>Interes principal *</label>
        <select name="interest" required>${optionList(INTERESTS, record?.interest || "Servicio")}</select>
      </div>
      <div class="field">
        <label>Titulo de oportunidad</label>
        <input name="title" value="${escapeHtml(record?.title || "")}" placeholder="Ej. Cotizacion casco, repuesto, moto..." />
      </div>
      <div class="field">
        <label>Marca</label>
        <input name="brand" value="${escapeHtml(record?.brand || "")}" placeholder="Ej. Honda, Yamaha, KTM..." />
      </div>
      <div class="field">
        <label>Modelo</label>
        <input name="model" value="${escapeHtml(record?.model || "")}" placeholder="Ej. CRF 250, YZ 125..." />
      </div>
      <div class="field">
        <label>Presupuesto estimado</label>
        <input name="budget" type="number" min="0" value="${escapeHtml(record?.budget || "")}" />
      </div>
      <div class="field">
        <label>Valor potencial</label>
        <input name="value" type="number" min="0" value="${escapeHtml(record?.value || "")}" />
      </div>
      <div class="field">
        <label>Urgencia</label>
        <select name="urgency">${optionList(URGENCIES, record?.urgency || "Media")}</select>
      </div>
      <div class="field">
        <label>Responsable</label>
        <select name="owner">${optionList(OWNERS, record?.owner || "Ventas")}</select>
      </div>
      <div class="field">
        <label>Etapa</label>
        <select name="stage">${optionList(SALES_STAGES, record?.stage || "Nuevo lead")}</select>
      </div>
      <div class="field">
        <label>Fecha de seguimiento *</label>
        <input name="followUpDate" type="date" required value="${escapeHtml(record?.followUpDate || todayIso())}" />
      </div>
      <div class="field full">
        <label>Proxima accion</label>
        <input name="nextAction" value="${escapeHtml(record?.nextAction || "")}" placeholder="Ej. Llamar, mandar cotizacion, confirmar pago..." />
      </div>
      <div class="field full">
        <label>Notas</label>
        <textarea name="notes">${escapeHtml(record?.notes || contact.notes || "")}</textarea>
      </div>
      <div class="field full">
        <label>Motivo de perdida</label>
        <input name="lostReason" value="${escapeHtml(record?.lostReason || "")}" placeholder="Solo si la venta se marca como perdida" />
      </div>
      <div class="form-footer field full">
        <button type="button" class="ghost-button" data-action="close-modal">Cancelar</button>
        <button class="button primary" type="submit">Guardar venta</button>
      </div>
    </form>`,
  );
}

function serviceForm(recordId = "") {
  if (!state.contacts.length) {
    clientForm();
    alert("Primero crea un cliente para poder abrir un servicio.");
    return;
  }

  const record = byId(state.services, recordId);
  const contact = record ? getContact(record.contactId) : state.contacts[0] || {};

  openModal(
    record ? "Editar servicio" : "Nuevo servicio",
    `<form id="service-form" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(record?.id || "")}" />
      <div class="field">
        <label>Cliente existente *</label>
        <select name="contactId" required>${contactOptions(record?.contactId || contact.id || "")}</select>
      </div>
      <div class="field">
        <label>Responsable</label>
        <select name="owner">${optionList(OWNERS, record?.owner || "Servicio")}</select>
      </div>
      <div class="field">
        <label>Moto / producto</label>
        <input name="asset" value="${escapeHtml(record?.asset || "")}" placeholder="Ej. Moto, casco, repuesto..." />
      </div>
      <div class="field">
        <label>Valor cotizado</label>
        <input name="quotedValue" type="number" min="0" value="${escapeHtml(record?.quotedValue || "")}" />
      </div>
      <div class="field">
        <label>Etapa</label>
        <select name="stage">${optionList(SERVICE_STAGES, record?.stage || "Solicitud recibida")}</select>
      </div>
      <div class="field">
        <label>Fecha compromiso *</label>
        <input name="dueDate" type="date" required value="${escapeHtml(record?.dueDate || todayIso())}" />
      </div>
      <div class="field full">
        <label>Solicitud del cliente *</label>
        <input name="request" required value="${escapeHtml(record?.request || "")}" />
      </div>
      <div class="field full">
        <label>Notas de servicio</label>
        <textarea name="notes">${escapeHtml(record?.notes || "")}</textarea>
      </div>
      <div class="form-footer field full">
        <button type="button" class="ghost-button" data-action="close-modal">Cancelar</button>
        <button class="button primary" type="submit">Guardar servicio</button>
      </div>
    </form>`,
  );
}

function taskForm(recordId = "") {
  const record = byId(state.tasks, recordId);
  openModal(
    record ? "Editar seguimiento" : "Nuevo seguimiento",
    `<form id="task-form" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(record?.id || "")}" />
      <div class="field full">
        <label>Accion pendiente *</label>
        <input name="title" required value="${escapeHtml(record?.title || "")}" />
      </div>
      <div class="field">
        <label>Fecha *</label>
        <input name="dueDate" type="date" required value="${escapeHtml(record?.dueDate || todayIso())}" />
      </div>
      <div class="field">
        <label>Responsable</label>
        <select name="owner">${optionList(OWNERS, record?.owner || "Ventas")}</select>
      </div>
      <div class="field">
        <label>Prioridad</label>
        <select name="priority">${optionList(URGENCIES, record?.priority || "Media")}</select>
      </div>
      <div class="field">
        <label>Estado</label>
        <select name="status">${optionList(["Pendiente", "Completada"], record?.status || "Pendiente")}</select>
      </div>
      <div class="form-footer field full">
        <button type="button" class="ghost-button" data-action="close-modal">Cancelar</button>
        <button class="button primary" type="submit">Guardar seguimiento</button>
      </div>
    </form>`,
  );
}

function clientForm(recordId = "") {
  const record = byId(state.contacts, recordId);
  openModal(
    record ? "Editar cliente" : "Nuevo cliente",
    `<form id="client-form" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(record?.id || "")}" />
      <div class="field">
        <label>Nombre *</label>
        <input name="name" required value="${escapeHtml(record?.name || "")}" />
      </div>
      <div class="field">
        <label>Telefono / WhatsApp *</label>
        <input name="phone" required value="${escapeHtml(record?.phone || "")}" />
      </div>
      <div class="field">
        <label>Canal</label>
        <select name="channel">${optionList(CHANNELS, record?.channel || "WhatsApp")}</select>
      </div>
      <div class="field">
        <label>Tipo</label>
        <select name="type">${optionList(["Nuevo", "Recurrente", "Referido", "Mayorista"], record?.type || "Nuevo")}</select>
      </div>
      <div class="field">
        <label>Ultimo contacto</label>
        <input name="lastContact" type="date" value="${escapeHtml(record?.lastContact || todayIso())}" />
      </div>
      <div class="field full">
        <label>Notas</label>
        <textarea name="notes">${escapeHtml(record?.notes || "")}</textarea>
      </div>
      <div class="form-footer field full">
        <button type="button" class="ghost-button" data-action="close-modal">Cancelar</button>
        <button class="button primary" type="submit">Guardar cliente</button>
      </div>
    </form>`,
  );
}

async function findOrCreateContact(data, form) {
  const phone = data.phone?.trim();
  if (!data.name?.trim()) throw new Error("Falta el nombre del cliente.");
  if (!phone) throw new Error("Falta el telefono o WhatsApp del cliente.");

  const existing = state.contacts.find((item) => item.phone && item.phone === phone);
  const payload = {
    id: existing?.id || uid(),
    name: data.name.trim(),
    phone,
    channel: data.channel,
    type: data.clientType || existing?.type || "Nuevo",
    lastContact: todayIso(),
    notes: existing ? existing.notes || "" : data.contactNotes || data.notes || "",
  };

  if (existing) {
    const unchanged =
      existing.name === payload.name &&
      existing.phone === payload.phone &&
      existing.channel === payload.channel &&
      existing.type === payload.type &&
      (existing.notes || "") === (payload.notes || "");
    if (unchanged) return existing;

    setSaveStep(form, "Actualizando cliente...");
    const { error } = await withTimeout(
      supabaseClient.from("contacts").update(contactToDb(payload)).eq("id", existing.id),
      "Actualizar cliente",
    );
    if (error) throw error;
    return { ...existing, ...payload };
  }

  setSaveStep(form, "Creando cliente...");
  const { error } = await withTimeout(
    supabaseClient.from("contacts").insert(contactToDb(payload)),
    "Crear cliente",
  );
  if (error) throw error;
  return payload;
}

async function createLeadFollowUpTask(payload, opportunityId) {
  try {
    const taskPayload = {
      id: uid(),
      title: payload.nextAction,
      dueDate: payload.followUpDate,
      owner: payload.owner,
      priority: payload.urgency,
      status: "Pendiente",
      relatedType: "opportunity",
      relatedId: opportunityId,
    };
    const { error: taskError } = await withTimeout(
      supabaseClient
        .from("tasks")
        .insert(taskToDb(taskPayload)),
      "Crear seguimiento",
      10000,
    );
    if (taskError) throw taskError;
    upsertStateItem(state.tasks, taskPayload);
    if (currentView === "dashboard" || currentView === "tasks") render();
  } catch (taskError) {
    console.warn("La venta se guardo, pero no se pudo crear el seguimiento.", taskError);
  }
}

async function createServiceFollowUpTask(payload, serviceId) {
  try {
    const taskPayload = {
      id: uid(),
      title: `Seguimiento servicio: ${payload.request}`,
      dueDate: payload.dueDate,
      owner: payload.owner,
      priority: "Media",
      status: "Pendiente",
      relatedType: "service",
      relatedId: serviceId,
    };
    const { error: taskError } = await withTimeout(
      supabaseClient
        .from("tasks")
        .insert(taskToDb(taskPayload)),
      "Crear seguimiento de servicio",
      10000,
    );
    if (taskError) throw taskError;
    upsertStateItem(state.tasks, taskPayload);
    if (currentView === "dashboard" || currentView === "tasks") render();
  } catch (taskError) {
    console.warn("El servicio se guardo, pero no se pudo crear el seguimiento.", taskError);
  }
}

async function saveLead(form) {
  setSaveStep(form, "Verificando sesion...");
  await requireActiveSession();
  const data = getFormData(form);
  const contact = await findOrCreateContact(data, form);
  const existing = byId(state.opportunities, data.id);
  const payload = {
    id: existing?.id || uid(),
    contactId: contact.id,
    title: data.title.trim() || [data.interest, data.brand, data.model].filter(Boolean).join(" - ") || "Nuevo lead Holeshot",
    interest: data.interest,
    brand: (data.brand || "").trim(),
    model: (data.model || "").trim(),
    budget: Number(data.budget || 0),
    value: Number(data.value || 0),
    urgency: data.urgency,
    stage: data.stage,
    owner: data.owner,
    nextAction: data.nextAction.trim() || "Dar seguimiento al cliente",
    followUpDate: data.followUpDate,
    notes: data.notes.trim(),
    lostReason: data.lostReason.trim(),
  };

  let savedOpportunity;
  if (existing) {
    setSaveStep(form, "Actualizando venta...");
    const { error } = await withTimeout(
      supabaseClient.from("opportunities").update(opportunityToDb(payload)).eq("id", existing.id),
      "Actualizar venta",
    );
    if (error) throw error;
    savedOpportunity = { ...existing, ...payload };
  } else {
    setSaveStep(form, "Creando venta...");
    const { error } = await withTimeout(
      supabaseClient.from("opportunities").insert(opportunityToDb(payload)),
      "Crear venta",
    );
    if (error) throw error;
    savedOpportunity = payload;
  }

  upsertStateItem(state.contacts, contact);
  upsertStateItem(state.opportunities, savedOpportunity);
  currentView = "leads";
  closeModal();
  setSync("Venta guardada", "success");
  render();
  if (!existing) createLeadFollowUpTask(payload, savedOpportunity.id);
}

async function saveService(form) {
  await requireActiveSession();
  const data = getFormData(form);
  const existing = byId(state.services, data.id);
  const payload = {
    id: existing?.id || uid(),
    contactId: data.contactId,
    asset: data.asset.trim(),
    request: data.request.trim(),
    stage: data.stage,
    quotedValue: Number(data.quotedValue || 0),
    dueDate: data.dueDate,
    owner: data.owner,
    notes: data.notes.trim(),
  };

  let savedService;
  if (existing) {
    const { error } = await withTimeout(
      supabaseClient.from("services").update(serviceToDb(payload)).eq("id", existing.id),
      "Actualizar servicio",
    );
    if (error) throw error;
    savedService = { ...existing, ...payload };
  } else {
    const { error } = await withTimeout(
      supabaseClient.from("services").insert(serviceToDb(payload)),
      "Crear servicio",
    );
    if (error) throw error;
    savedService = payload;
  }

  upsertStateItem(state.services, savedService);
  closeModal();
  setSync("Servicio guardado", "success");
  render();
  if (!existing) createServiceFollowUpTask(payload, savedService.id);
}

async function saveTask(form) {
  await requireActiveSession();
  const data = getFormData(form);
  const existing = byId(state.tasks, data.id);
  const payload = {
    ...(existing ? { id: existing.id } : {}),
    title: data.title.trim(),
    dueDate: data.dueDate,
    owner: data.owner,
    priority: data.priority,
    status: data.status,
    relatedType: existing?.relatedType || "",
    relatedId: existing?.relatedId || "",
  };

  if (existing) {
    const { error } = await supabaseClient.from("tasks").update(taskToDb(payload)).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseClient.from("tasks").insert(taskToDb(payload));
    if (error) throw error;
  }

  closeModal();
  await loadRemoteData();
}

async function saveClient(form) {
  await requireActiveSession();
  const data = getFormData(form);
  const existing = byId(state.contacts, data.id);
  const payload = {
    ...(existing ? { id: existing.id } : {}),
    name: data.name.trim(),
    phone: data.phone.trim(),
    channel: data.channel,
    type: data.type,
    lastContact: data.lastContact,
    notes: data.notes.trim(),
  };

  if (existing) {
    const { error } = await supabaseClient.from("contacts").update(contactToDb(payload)).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseClient.from("contacts").insert(contactToDb(payload));
    if (error) throw error;
  }

  closeModal();
  await loadRemoteData();
}

async function addTaskFromOpportunity(id) {
  const item = byId(state.opportunities, id);
  if (!item) return;
  const { error } = await supabaseClient.from("tasks").insert(
    taskToDb({
      title: item.nextAction || `Seguimiento: ${item.title}`,
      dueDate: item.followUpDate || todayIso(),
      owner: item.owner,
      priority: item.urgency,
      status: "Pendiente",
      relatedType: "opportunity",
      relatedId: item.id,
    }),
  );
  if (error) throw error;
  currentView = "tasks";
  await loadRemoteData();
}

async function addTaskFromService(id) {
  const item = byId(state.services, id);
  if (!item) return;
  const { error } = await supabaseClient.from("tasks").insert(
    taskToDb({
      title: `Seguimiento servicio: ${item.request}`,
      dueDate: item.dueDate || todayIso(),
      owner: item.owner,
      priority: "Media",
      status: "Pendiente",
      relatedType: "service",
      relatedId: item.id,
    }),
  );
  if (error) throw error;
  currentView = "tasks";
  await loadRemoteData();
}

function demoState() {
  const contactOne = {
    id: uid(),
    name: "Cliente demo venta",
    phone: "70000001",
    channel: "Instagram",
    type: "Nuevo",
    lastContact: dateShift(-1),
    notes: "Interesado en compra y accesorios.",
  };
  const contactTwo = {
    id: uid(),
    name: "Cliente demo servicio",
    phone: "70000002",
    channel: "WhatsApp",
    type: "Recurrente",
    lastContact: dateShift(-2),
    notes: "Necesita seguimiento postservicio.",
  };
  const opportunity = {
    id: uid(),
    contactId: contactOne.id,
    title: "Cotizacion inicial",
    interest: "Accesorio",
    budget: 450,
    value: 520,
    urgency: "Alta",
    stage: "Cotizacion enviada",
    owner: "Ventas",
    nextAction: "Enviar alternativas y confirmar disponibilidad.",
    followUpDate: dateShift(1),
    notes: "Pregunto por opciones y forma de pago.",
    lostReason: "",
  };
  const service = {
    id: uid(),
    contactId: contactTwo.id,
    asset: "Moto cliente",
    request: "Revision general y mantenimiento preventivo",
    stage: "En proceso",
    quotedValue: 280,
    dueDate: dateShift(2),
    owner: "Servicio",
    notes: "Avisar apenas este lista para entrega.",
  };

  return {
    contacts: [contactOne, contactTwo],
    opportunities: [opportunity],
    services: [service],
    tasks: [
      {
        id: uid(),
        title: "Seguimiento a cotizacion demo",
        dueDate: dateShift(1),
        owner: "Ventas",
        priority: "Alta",
        status: "Pendiente",
        relatedType: "opportunity",
        relatedId: opportunity.id,
      },
      {
        id: uid(),
        title: "Confirmar entrega de servicio demo",
        dueDate: dateShift(2),
        owner: "Servicio",
        priority: "Media",
        status: "Pendiente",
        relatedType: "service",
        relatedId: service.id,
      },
    ],
  };
}

async function clearRemoteData() {
  await supabaseClient.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseClient.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseClient.from("opportunities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseClient.from("contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

async function insertState(nextState) {
  if (nextState.contacts?.length) {
    const { error } = await supabaseClient.from("contacts").upsert(nextState.contacts.map(contactToDb));
    if (error) throw error;
  }
  if (nextState.opportunities?.length) {
    const { error } = await supabaseClient
      .from("opportunities")
      .upsert(nextState.opportunities.map(opportunityToDb));
    if (error) throw error;
  }
  if (nextState.services?.length) {
    const { error } = await supabaseClient.from("services").upsert(nextState.services.map(serviceToDb));
    if (error) throw error;
  }
  if (nextState.tasks?.length) {
    const { error } = await supabaseClient.from("tasks").upsert(nextState.tasks.map(taskToDb));
    if (error) throw error;
  }
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  download(`holeshot-crm-${todayIso()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function exportCsv() {
  const rows = [
    ["tipo", "cliente", "telefono", "detalle", "etapa", "valor", "responsable", "fecha"],
    ...state.opportunities.map((item) => {
      const contact = getContact(item.contactId);
      return [
        "venta",
        contact.name,
        contact.phone,
        item.title,
        item.stage,
        item.value,
        item.owner,
        item.followUpDate,
      ];
    }),
    ...state.services.map((item) => {
      const contact = getContact(item.contactId);
      return [
        "servicio",
        contact.name,
        contact.phone,
        item.request,
        item.stage,
        item.quotedValue,
        item.owner,
        item.dueDate,
      ];
    }),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  download(`holeshot-crm-${todayIso()}.csv`, csv, "text/csv");
}

async function runAction(action, id, target) {
  try {
    if (action === "close-modal") return closeModal();
    if (action === "sign-out") {
      await supabaseClient.auth.signOut();
      return;
    }
    if (action === "reload-data") return safeLoad();
    if (!session && action !== "sign-up") return renderAuth("Inicia sesion para usar el CRM.");

    if (action === "new-lead") return leadForm();
    if (action === "edit-lead") return leadForm(id);
    if (action === "new-service") return serviceForm();
    if (action === "edit-service") return serviceForm(id);
    if (action === "new-task") return taskForm();
    if (action === "edit-task") return taskForm(id);
    if (action === "new-client") return clientForm();
    if (action === "edit-client") return clientForm(id);
    if (action === "add-task-from-opportunity") return addTaskFromOpportunity(id);
    if (action === "add-task-from-service") return addTaskFromService(id);
    if (action === "export-json") return exportJson();
    if (action === "export-csv") return exportCsv();
    if (action === "import-json") return importInput.click();
    if (action === "sign-up") return signUpFromForm();

    if (action === "reset-demo" && confirm("Esto agregara datos demo a Supabase. Continuar?")) {
      await insertState(demoState());
      return loadRemoteData();
    }

    if (action === "clear-data" && confirm("Esto borrara los datos del CRM en Supabase. Continuar?")) {
      await clearRemoteData();
      return loadRemoteData();
    }
  } catch (error) {
    console.error("Holeshot CRM action error", error);
    setSync("Error", "danger");
    const message = friendlyError(error);
    const detail = errorDetail(error);
    alert(detail && detail !== message ? `${message}\n\nDetalle tecnico: ${detail}` : message);
    target?.removeAttribute("disabled");
  }
}

async function signIn(form) {
  const data = getFormData(form);
  setSync("Entrando", "neutral");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (error) throw error;
}

async function signUpFromForm() {
  const form = document.querySelector("#auth-form");
  if (!form?.reportValidity()) return;
  const data = getFormData(form);
  setSync("Creando usuario", "neutral");
  const { error } = await supabaseClient.auth.signUp({
    email: data.email,
    password: data.password,
  });
  if (error) throw error;
  renderAuth("Usuario creado. Si Supabase pide confirmacion, revisa el correo antes de entrar.");
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

searchInput.addEventListener("input", render);

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  await runAction(action, id, target);
});

document.addEventListener("click", (event) => {
  const submitButton = event.target.closest('button[type="submit"]');
  const form = submitButton?.closest("form");
  if (form?.id === "lead-form") {
    showFormMessage(form, "Revisando datos de la venta...", "neutral");
    setSync("Revisando venta", "neutral");
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form?.matches("form")) return;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton?.textContent;
  clearFormMessage(form);

  if (!validateRequiredFields(form)) return;

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Guardando...";
    }
    setSync("Guardando", "neutral");
    showFormMessage(form, "Guardando en Supabase...", "neutral");
    if (form.id === "auth-form") await signIn(form);
    if (form.id === "lead-form") await saveLead(form);
    if (form.id === "service-form") await saveService(form);
    if (form.id === "task-form") await saveTask(form);
    if (form.id === "client-form") await saveClient(form);
  } catch (error) {
    console.error("Holeshot CRM submit error", error);
    setSync("Error al guardar", "danger");
    const message = friendlyError(error);
    const detail = errorDetail(error);
    showFormMessage(form, detail && detail !== message ? `${message} Detalle tecnico: ${detail}` : message, "danger");
    alert(detail && detail !== message ? `${message}\n\nDetalle tecnico: ${detail}` : message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
});

document.addEventListener("change", async (event) => {
  try {
    const stageTarget = event.target.closest("[data-update-stage]");
    if (stageTarget) {
      await requireActiveSession();
      const table = stageTarget.dataset.updateStage === "service" ? "services" : "opportunities";
      const { error } = await supabaseClient
        .from(table)
        .update({ stage: stageTarget.value })
        .eq("id", stageTarget.dataset.id);
      if (error) throw error;
      await loadRemoteData();
    }

    const taskTarget = event.target.closest("[data-complete-task]");
    if (taskTarget) {
      await requireActiveSession();
      const status = taskTarget.checked ? "Completada" : "Pendiente";
      const { error } = await supabaseClient
        .from("tasks")
        .update({ status })
        .eq("id", taskTarget.dataset.completeTask);
      if (error) throw error;
      await loadRemoteData();
    }
  } catch (error) {
    console.error("Holeshot CRM update error", error);
    setSync("Error al actualizar", "danger");
    const message = friendlyError(error);
    const detail = errorDetail(error);
    alert(detail && detail !== message ? `${message}\n\nDetalle tecnico: ${detail}` : message);
  }
});

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.contacts)) throw new Error("Formato invalido");
    await insertState({
      contacts: imported.contacts || [],
      opportunities: imported.opportunities || [],
      services: imported.services || [],
      tasks: imported.tasks || [],
    });
    await loadRemoteData();
  } catch (error) {
    alert(`No se pudo importar el archivo. ${friendlyError(error)}`);
  } finally {
    importInput.value = "";
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

init();



