(function () {
  const FORM_IDS = new Set(["auth-form", "lead-form", "service-form", "task-form", "client-form"]);
  const SUPABASE_URL = "https://esjqybxzpqtonkcomdtb.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanF5Ynh6cHF0b25rY29tZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTE2NTgsImV4cCI6MjA5OTcyNzY1OH0.DEGP5xyOsdl41qFiFaoZfophSKiWdXIcKmq7_wv9nbg";
  const guardClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  function setStatus(text, tone = "neutral") {
    const status = document.querySelector("#sync-status");
    if (status) {
      status.textContent = text;
      status.dataset.tone = tone;
    }
  }

  function showMessage(form, text, tone = "neutral") {
    let notice = form.querySelector("[data-form-message]");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "notice form-message field full";
      notice.dataset.formMessage = "";
      form.insertBefore(notice, form.querySelector(".form-footer") || null);
    }
    notice.textContent = text;
    notice.dataset.tone = tone;
    notice.setAttribute("role", tone === "danger" ? "alert" : "status");
    notice.hidden = false;
  }

  function clearMessage(form) {
    const notice = form.querySelector("[data-form-message]");
    if (notice) {
      notice.textContent = "";
      notice.hidden = true;
    }
  }

  function friendly(error) {
    const message = error?.message || error?.details || String(error);
    if (message.includes("tardo demasiado") || message.includes("aborted")) return "Supabase no respondio a tiempo. Recarga la pagina e intenta de nuevo.";
    if (message.includes("JWT") || message.includes("token") || message.includes("Auth session missing")) return "La sesion expiro. Cierra sesion, entra de nuevo y vuelve a guardar.";
    if (message.includes("row-level security") || message.includes("policy")) return "Supabase bloqueo el guardado por reglas de seguridad. Revisa que el usuario haya iniciado sesion y que el SQL de tablas/politicas este ejecutado.";
    if (message.includes("relation") && message.includes("does not exist")) return "Faltan tablas en Supabase. Ejecuta supabase-schema.sql en el SQL Editor.";
    if (message.includes("Could not find") && (message.includes("brand") || message.includes("model"))) return "Faltan los campos marca/modelo. Ejecuta supabase-add-brand-model.sql en Supabase.";
    return message;
  }

  function dataFrom(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function cleanNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function fallbackId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  async function queryWithTimeout(query, label, ms = 10000) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const request = controller && query && typeof query.abortSignal === "function" ? query.abortSignal(controller.signal) : query;
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        if (controller) controller.abort();
        reject(new Error(`${label} tardo demasiado. Revisa internet, Supabase o vuelve a intentar.`));
      }, ms);
    });
    try {
      const result = await Promise.race([Promise.resolve(request), timeout]);
      if (result?.error) throw result.error;
      return result?.data;
    } finally {
      clearTimeout(timerId);
    }
  }

  async function requireSession() {
    if (!guardClient) throw new Error("No se cargo Supabase. Recarga la pagina e intenta de nuevo.");
    const { data, error } = await Promise.race([
      guardClient.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Verificar sesion tardo demasiado.")), 10000)),
    ]);
    if (error) throw error;
    if (!data?.session?.access_token) throw new Error("La sesion expiro. Cierra sesion, entra de nuevo y vuelve a guardar.");
    return data.session;
  }

  async function saveLeadDirect(form) {
    await requireSession();
    const data = dataFrom(form);
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    if (!name) throw new Error("Falta el nombre del cliente.");
    if (!phone) throw new Error("Falta el telefono o WhatsApp del cliente.");
    if (!data.interest) throw new Error("Falta seleccionar el interes principal.");
    if (!data.followUpDate) throw new Error("Falta la fecha de seguimiento.");

    showMessage(form, "Guardando cliente...", "neutral");
    const existing = await queryWithTimeout(guardClient.from("contacts").select("*").eq("phone", phone).limit(1), "Buscar cliente");
    const contact = Array.isArray(existing) ? existing[0] : null;
    const contactPayload = {
      ...(contact?.id ? { id: contact.id } : {}),
      name,
      phone,
      channel: data.channel || "WhatsApp",
      type: data.clientType || contact?.type || "Nuevo",
      last_contact: today(),
      notes: contact?.notes || data.notes || null,
    };
    const contactRow = await queryWithTimeout(guardClient.from("contacts").upsert(contactPayload, { onConflict: "id" }).select().single(), "Guardar cliente");

    showMessage(form, "Guardando venta...", "neutral");
    const title = String(data.title || "").trim() || [data.interest, data.brand, data.model].filter(Boolean).join(" - ") || "Nuevo lead Holeshot";
    const opportunityPayload = {
      ...(data.id ? { id: data.id } : {}),
      contact_id: contactRow.id,
      title,
      interest: data.interest || null,
      brand: String(data.brand || "").trim() || null,
      model: String(data.model || "").trim() || null,
      budget: cleanNumber(data.budget),
      value: cleanNumber(data.value),
      urgency: data.urgency || "Media",
      stage: data.stage || "Nuevo lead",
      owner: data.owner || "Ventas",
      next_action: String(data.nextAction || "").trim() || "Dar seguimiento al cliente",
      follow_up_date: data.followUpDate,
      notes: String(data.notes || "").trim() || null,
      lost_reason: String(data.lostReason || "").trim() || null,
    };
    const opportunityRow = await queryWithTimeout(guardClient.from("opportunities").upsert(opportunityPayload, { onConflict: "id" }).select().single(), "Guardar venta");

    queryWithTimeout(
      guardClient.from("tasks").insert({
        id: fallbackId(),
        title: opportunityPayload.next_action,
        due_date: opportunityPayload.follow_up_date,
        owner: opportunityPayload.owner,
        priority: opportunityPayload.urgency,
        status: "Pendiente",
        related_type: "opportunity",
        related_id: opportunityRow.id,
      }),
      "Crear seguimiento",
      8000,
    ).catch((error) => console.warn("Venta guardada; seguimiento automatico no creado.", error));

    const modal = document.querySelector("#modal");
    const modalBody = document.querySelector("#modal-body");
    if (modal) modal.hidden = true;
    if (modalBody) modalBody.innerHTML = "";
    setStatus("Venta guardada", "success");
    window.location.hash = "leads";
    window.location.reload();
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !FORM_IDS.has(form.id)) return;
    if (form.id !== "lead-form") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || "Guardar venta";
    clearMessage(form);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    };

    const watchdog = setTimeout(() => {
      setStatus("Supabase no respondio", "danger");
      showMessage(form, "Supabase no respondio a tiempo. Puedes intentar de nuevo sin perder lo escrito.", "danger");
      release();
    }, 16000);

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Guardando...";
      }
      setStatus("Guardando", "neutral");
      showMessage(form, "Guardando en Supabase...", "neutral");
      await saveLeadDirect(form);
    } catch (error) {
      console.error("Holeshot CRM save guard error", error);
      setStatus("Error al guardar", "danger");
      const text = friendly(error);
      showMessage(form, text, "danger");
      alert(text);
    } finally {
      clearTimeout(watchdog);
      release();
    }
  }, true);
})();
