const STORAGE_KEY = "holeshot-crm:v1";

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

let currentView = "dashboard";
let state = loadState();

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedState() {
  const today = new Date();
  const inDays = (days) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  return {
    contacts: [
      {
        id: uid(),
        name: "Cliente demo venta",
        phone: "70000001",
        channel: "Instagram",
        type: "Nuevo",
        lastContact: inDays(-1),
        notes: "Interesado en compra y accesorios.",
      },
      {
        id: uid(),
        name: "Cliente demo servicio",
        phone: "70000002",
        channel: "WhatsApp",
        type: "Recurrente",
        lastContact: inDays(-2),
        notes: "Necesita seguimiento postservicio.",
      },
    ],
    opportunities: [],
    services: [],
    tasks: [],
    settings: {
      owners: OWNERS,
      channels: CHANNELS,
      interests: INTERESTS,
    },
  };
}

function createDemoRecords(base) {
  const today = new Date();
  const date = (days) => {
    const next = new Date(today);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  };
  const firstContact = base.contacts[0];
  const secondContact = base.contacts[1];

  base.opportunities.push({
    id: uid(),
    contactId: firstContact.id,
    title: "Cotizacion inicial",
    interest: "Accesorio",
    budget: 450,
    value: 520,
    urgency: "Alta",
    stage: "Cotizacion enviada",
    owner: "Ventas",
    nextAction: "Enviar alternativas y confirmar disponibilidad.",
    followUpDate: date(1),
    createdAt: date(-4),
    notes: "Pregunto por opciones y forma de pago.",
    lostReason: "",
  });

  base.services.push({
    id: uid(),
    contactId: secondContact.id,
    asset: "Moto cliente",
    request: "Revision general y mantenimiento preventivo",
    stage: "En proceso",
    quotedValue: 280,
    dueDate: date(2),
    owner: "Servicio",
    notes: "Avisar apenas este lista para entrega.",
  });

  base.tasks.push({
    id: uid(),
    title: "Seguimiento a cotizacion demo",
    dueDate: date(1),
    owner: "Ventas",
    priority: "Alta",
    status: "Pendiente",
    relatedType: "opportunity",
    relatedId: base.opportunities[0].id,
  });

  base.tasks.push({
    id: uid(),
    title: "Confirmar entrega de servicio demo",
    dueDate: date(2),
    owner: "Servicio",
    priority: "Media",
    status: "Pendiente",
    relatedType: "service",
    relatedId: base.services[0].id,
  });

  return base;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const demo = createDemoRecords(seedState());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    return demo;
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      contacts: parsed.contacts || [],
      opportunities: parsed.opportunities || [],
      services: parsed.services || [],
      tasks: parsed.tasks || [],
      settings: {
        owners: parsed.settings?.owners || OWNERS,
        channels: parsed.settings?.channels || CHANNELS,
        interests: parsed.settings?.interests || INTERESTS,
      },
    };
  } catch {
    const demo = createDemoRecords(seedState());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    return demo;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setView(view) {
  currentView = view;
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
  app.focus();
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(date, status = "Pendiente") {
  return status !== "Completada" && date && date < todayIso();
}

function dateLabel(date) {
  if (!date) return "Sin fecha";
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function byId(collection, id) {
  return collection.find((item) => item.id === id);
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

function findOrCreateContact(data) {
  const phone = data.phone?.trim();
  let contact = state.contacts.find((item) => item.phone && item.phone === phone);
  if (!contact) {
    contact = {
      id: uid(),
      name: data.name.trim(),
      phone,
      channel: data.channel,
      type: data.clientType || "Nuevo",
      lastContact: todayIso(),
      notes: data.contactNotes || "",
    };
    state.contacts.unshift(contact);
  } else {
    contact.name = data.name.trim();
    contact.channel = data.channel || contact.channel;
    contact.lastContact = todayIso();
    contact.notes = data.contactNotes || contact.notes;
  }
  return contact;
}

function leadForm(recordId = "") {
  const record = byId(state.opportunities, recordId);
  const contact = record ? getContact(record.contactId) : {};
  const title = record ? "Editar venta" : "Nuevo lead de venta";

  openModal(
    title,
    `<form id="lead-form" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(record?.id || "")}" />
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
        <label>Titulo de oportunidad *</label>
        <input name="title" required value="${escapeHtml(record?.title || "")}" placeholder="Ej. Cotizacion casco, repuesto, moto..." />
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
        <label>Proxima accion *</label>
        <input name="nextAction" required value="${escapeHtml(record?.nextAction || "")}" placeholder="Ej. Llamar, mandar cotizacion, confirmar pago..." />
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

function render() {
  const titles = {
    dashboard: "Tablero Holeshot",
    leads: "Ventas y oportunidades",
    services: "Servicios y postventa",
    tasks: "Seguimientos",
    clients: "Clientes",
    reports: "Reportes",
    settings: "Datos",
  };
  viewTitle.textContent = titles[currentView];

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
  const activeServices = state.services.filter((item) => item.stage !== "Seguimiento postventa");
  const pendingTasks = state.tasks.filter((task) => task.status !== "Completada");
  const overdueTasks = pendingTasks.filter((task) => isOverdue(task.dueDate, task.status));
  const salesValue = openOps.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return `
    <section class="grid kpi-grid">
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
                  <span>${escapeHtml(item.title)} · ${money(item.value)}</span>
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
              <p class="muted">${dateLabel(task.dueDate)} · ${escapeHtml(task.owner)}</p>
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
        <span>${escapeHtml(service.request)} · ${escapeHtml(service.stage)}</span>
      </div>`;
    })
    .join("");
}

function renderLeads() {
  const rows = state.opportunities.filter((item) => {
    const contact = getContact(item.contactId);
    return matchesSearch(contact.name, contact.phone, item.title, item.interest, item.stage, item.owner);
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
        <div class="row-note">${escapeHtml(contact.phone)} · ${escapeHtml(contact.channel)}</div>
      </td>
      <td>
        <div class="row-title">${escapeHtml(item.title)}</div>
        <div class="row-note">${escapeHtml(item.interest)} · Urgencia ${escapeHtml(item.urgency)}</div>
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
        <small>${won} ganadas · ${lost} perdidas · ${open} abiertas</small>
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
  return `
    <div class="toolbar">
      <div>
        <h2>Datos del sistema</h2>
        <p class="muted">Exporta, importa o reinicia la base local del CRM.</p>
      </div>
      <div class="toolbar-actions">
        <button class="button" data-action="export-json">Exportar JSON</button>
        <button class="button" data-action="import-json">Importar JSON</button>
      </div>
    </div>
    <div class="grid split-grid">
      <div class="card">
        <div class="card-header"><h2>Informacion necesaria</h2></div>
        <div class="card-body">
          <p class="muted">Para que el CRM sea usable, cada lead debe tener nombre, telefono, canal, interes, etapa, responsable, proxima accion y fecha de seguimiento.</p>
          <br />
          <div class="notice">Esta primera version guarda la informacion en este navegador. Antes de cambiar de computadora o limpiar el navegador, usa Exportar JSON.</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Mantenimiento</h2></div>
        <div class="card-body">
          <p class="muted">Puedes limpiar los datos de prueba cuando vayas a empezar con clientes reales.</p>
          <br />
          <div class="toolbar-actions">
            <button class="button warning" data-action="reset-demo">Cargar demo</button>
            <button class="button warning" data-action="clear-data">Vaciar CRM</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveLead(form) {
  const data = getFormData(form);
  const contact = findOrCreateContact(data);
  const existing = byId(state.opportunities, data.id);
  const payload = {
    contactId: contact.id,
    title: data.title.trim(),
    interest: data.interest,
    budget: Number(data.budget || 0),
    value: Number(data.value || 0),
    urgency: data.urgency,
    stage: data.stage,
    owner: data.owner,
    nextAction: data.nextAction.trim(),
    followUpDate: data.followUpDate,
    notes: data.notes.trim(),
    lostReason: data.lostReason.trim(),
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    const opportunity = {
      id: uid(),
      createdAt: todayIso(),
      ...payload,
    };
    state.opportunities.unshift(opportunity);
    state.tasks.unshift({
      id: uid(),
      title: opportunity.nextAction,
      dueDate: opportunity.followUpDate,
      owner: opportunity.owner,
      priority: opportunity.urgency,
      status: "Pendiente",
      relatedType: "opportunity",
      relatedId: opportunity.id,
    });
  }

  saveState();
  closeModal();
  render();
}

function saveService(form) {
  const data = getFormData(form);
  const existing = byId(state.services, data.id);
  const payload = {
    contactId: data.contactId,
    asset: data.asset.trim(),
    request: data.request.trim(),
    stage: data.stage,
    quotedValue: Number(data.quotedValue || 0),
    dueDate: data.dueDate,
    owner: data.owner,
    notes: data.notes.trim(),
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    const service = {
      id: uid(),
      ...payload,
    };
    state.services.unshift(service);
    state.tasks.unshift({
      id: uid(),
      title: `Seguimiento servicio: ${service.request}`,
      dueDate: service.dueDate,
      owner: service.owner,
      priority: "Media",
      status: "Pendiente",
      relatedType: "service",
      relatedId: service.id,
    });
  }

  saveState();
  closeModal();
  render();
}

function saveTask(form) {
  const data = getFormData(form);
  const existing = byId(state.tasks, data.id);
  const payload = {
    title: data.title.trim(),
    dueDate: data.dueDate,
    owner: data.owner,
    priority: data.priority,
    status: data.status,
    relatedType: existing?.relatedType || "",
    relatedId: existing?.relatedId || "",
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.tasks.unshift({ id: uid(), ...payload });
  }

  saveState();
  closeModal();
  render();
}

function saveClient(form) {
  const data = getFormData(form);
  const existing = byId(state.contacts, data.id);
  const payload = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    channel: data.channel,
    type: data.type,
    lastContact: data.lastContact,
    notes: data.notes.trim(),
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    state.contacts.unshift({ id: uid(), ...payload });
  }

  saveState();
  closeModal();
  render();
}

function addTaskFromOpportunity(id) {
  const item = byId(state.opportunities, id);
  if (!item) return;
  state.tasks.unshift({
    id: uid(),
    title: item.nextAction || `Seguimiento: ${item.title}`,
    dueDate: item.followUpDate || todayIso(),
    owner: item.owner,
    priority: item.urgency,
    status: "Pendiente",
    relatedType: "opportunity",
    relatedId: item.id,
  });
  saveState();
  setView("tasks");
}

function addTaskFromService(id) {
  const item = byId(state.services, id);
  if (!item) return;
  state.tasks.unshift({
    id: uid(),
    title: `Seguimiento servicio: ${item.request}`,
    dueDate: item.dueDate || todayIso(),
    owner: item.owner,
    priority: "Media",
    status: "Pendiente",
    relatedType: "service",
    relatedId: item.id,
  });
  saveState();
  setView("tasks");
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

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

searchInput.addEventListener("input", render);

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action, id } = target.dataset;
  if (action === "close-modal") closeModal();
  if (action === "new-lead") leadForm();
  if (action === "edit-lead") leadForm(id);
  if (action === "new-service") serviceForm();
  if (action === "edit-service") serviceForm(id);
  if (action === "new-task") taskForm();
  if (action === "edit-task") taskForm(id);
  if (action === "new-client") clientForm();
  if (action === "edit-client") clientForm(id);
  if (action === "add-task-from-opportunity") addTaskFromOpportunity(id);
  if (action === "add-task-from-service") addTaskFromService(id);
  if (action === "export-json") exportJson();
  if (action === "export-csv") exportCsv();
  if (action === "import-json") importInput.click();
  if (action === "reset-demo" && confirm("Esto reemplazara los datos actuales con datos demo. Continuar?")) {
    state = createDemoRecords(seedState());
    saveState();
    render();
  }
  if (action === "clear-data" && confirm("Esto vaciara el CRM local. Continuar?")) {
    state = seedState();
    state.contacts = [];
    saveState();
    render();
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "lead-form") saveLead(form);
  if (form.id === "service-form") saveService(form);
  if (form.id === "task-form") saveTask(form);
  if (form.id === "client-form") saveClient(form);
});

document.addEventListener("change", (event) => {
  const stageTarget = event.target.closest("[data-update-stage]");
  if (stageTarget) {
    const collection = stageTarget.dataset.updateStage === "service" ? state.services : state.opportunities;
    const record = byId(collection, stageTarget.dataset.id);
    if (record) {
      record.stage = stageTarget.value;
      saveState();
      render();
    }
  }

  const taskTarget = event.target.closest("[data-complete-task]");
  if (taskTarget) {
    const task = byId(state.tasks, taskTarget.dataset.completeTask);
    if (task) {
      task.status = taskTarget.checked ? "Completada" : "Pendiente";
      saveState();
      render();
    }
  }
});

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.contacts)) throw new Error("Formato invalido");
    state = {
      contacts: imported.contacts || [],
      opportunities: imported.opportunities || [],
      services: imported.services || [],
      tasks: imported.tasks || [],
      settings: imported.settings || { owners: OWNERS, channels: CHANNELS, interests: INTERESTS },
    };
    saveState();
    render();
  } catch {
    alert("No se pudo importar el archivo. Revisa que sea un JSON exportado desde este CRM.");
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

render();
