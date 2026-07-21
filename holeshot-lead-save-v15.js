(function () {
  const SUPABASE_URL = "https://esjqybxzpqtonkcomdtb.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanF5Ynh6cHF0b25rY29tZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTE2NTgsImV4cCI6MjA5OTcyNzY1OH0.DEGP5xyOsdl41qFiFaoZfophSKiWdXIcKmq7_wv9nbg";
  const REQUEST_TIMEOUT_MS = 12000;

  const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

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

  function setSync(message, tone = "neutral") {
    const status = document.querySelector("#sync-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function showFormMessage(form, message, tone = "neutral") {
    let notice = form.querySelector("[data-form-message]");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "notice form-message field full";
      notice.dataset.formMessage = "";
      form.insertBefore(notice, form.querySelector(".form-footer") || null);
    }
    notice.textContent = message;
    notice.dataset.tone = tone;
    notice.setAttribute("role", tone === "danger" ? "alert" : "status");
    notice.hidden = false;
  }

  function setStep(form, message) {
    showFormMessage(form, message, "neutral");
    setSync(message.replace("...", ""), "neutral");
  }

  function dataFrom(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function cleanNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function friendlyError(error) {
    const message = error?.message || error?.details || String(error);
    if (message.includes("tardo demasiado") || message.includes("aborted") || message.includes("AbortError")) {
      return "Supabase no respondio a tiempo. Intenta de nuevo; el formulario ya fue liberado.";
    }
    if (message.includes("JWT") || message.includes("token") || message.includes("Auth session missing")) {
      return "La sesion expiro. Cierra sesion, entra de nuevo y vuelve a guardar.";
    }
    if (message.includes("row-level security") || message.includes("policy")) {
      return "Supabase bloqueo el guardado por reglas de seguridad. Revisa que hayas iniciado sesion y que el SQL de tablas/politicas este ejecutado.";
    }
    if (message.includes("relation") && message.includes("does not exist")) {
      return "Faltan tablas en Supabase. Ejecuta supabase-schema.sql en el SQL Editor.";
    }
    if (message.includes("Could not find") && (message.includes("brand") || message.includes("model"))) {
      return "Faltan los campos marca/modelo. Ejecuta supabase-add-brand-model.sql en Supabase.";
    }
    return message;
  }

  function releaseButton(button, originalText) {
    if (!button) return;
    button.disabled = false;
    button.textContent = originalText || "Guardar venta";
  }

  async function getSession() {
    if (!supabaseClient) throw new Error("No se cargo Supabase. Recarga la pagina e intenta de nuevo.");
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (!data?.session?.access_token) {
      throw new Error("La sesion de Supabase expiro. Cierra sesion, entra de nuevo y vuelve a guardar.");
    }
    return data.session;
  }

  async function restRequest(path, { method = "GET", query = {}, body, token, prefer = "return=representation", timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(prefer ? { Prefer: prefer } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        const message = payload?.message || payload?.details || `${method} ${path} fallo con estado ${response.status}`;
        throw new Error(message);
      }
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`${path} tardo demasiado.`);
      }
      throw error;
    } finally {
      clearTimeout(timerId);
    }
  }

  function contactPayload(data, existingContact) {
    return {
      ...(existingContact?.id ? { id: existingContact.id } : {}),
      name: cleanText(data.name),
      phone: cleanText(data.phone),
      channel: data.channel || "WhatsApp",
      type: data.clientType || existingContact?.type || "Nuevo",
      last_contact: todayIso(),
      notes: existingContact?.notes || cleanText(data.notes) || null,
    };
  }

  function opportunityPayload(data, contactId) {
    return {
      ...(data.id ? { id: data.id } : {}),
      contact_id: contactId,
      title: cleanText(data.title) || [data.interest, data.brand, data.model].filter(Boolean).join(" - ") || "Nuevo lead Holeshot",
      interest: data.interest || null,
      brand: cleanText(data.brand) || null,
      model: cleanText(data.model) || null,
      budget: cleanNumber(data.budget),
      value: cleanNumber(data.value),
      urgency: data.urgency || "Media",
      stage: data.stage || "Nuevo lead",
      owner: data.owner || "Ventas",
      next_action: cleanText(data.nextAction) || "Dar seguimiento al cliente",
      follow_up_date: data.followUpDate || null,
      notes: cleanText(data.notes) || null,
      lost_reason: cleanText(data.lostReason) || null,
    };
  }

  async function saveContact(data, token, form) {
    const phone = cleanText(data.phone);
    setStep(form, "Buscando cliente...");
    const found = await restRequest("contacts", {
      token,
      query: { select: "*", phone: `eq.${phone}`, limit: "1" },
      prefer: "",
    });
    const existingContact = Array.isArray(found) ? found[0] : null;
    const payload = contactPayload(data, existingContact);

    if (existingContact?.id) {
      setStep(form, "Actualizando cliente...");
      const rows = await restRequest("contacts", {
        method: "PATCH",
        token,
        query: { id: `eq.${existingContact.id}` },
        body: payload,
      });
      return Array.isArray(rows) && rows[0] ? rows[0] : payload;
    }

    setStep(form, "Creando cliente...");
    const rows = await restRequest("contacts", {
      method: "POST",
      token,
      body: { ...payload, id: uid() },
    });
    return Array.isArray(rows) && rows[0] ? rows[0] : payload;
  }

  async function saveOpportunity(data, contactId, token, form) {
    const payload = opportunityPayload(data, contactId);
    if (data.id) {
      setStep(form, "Actualizando venta...");
      const rows = await restRequest("opportunities", {
        method: "PATCH",
        token,
        query: { id: `eq.${data.id}` },
        body: payload,
      });
      return Array.isArray(rows) && rows[0] ? rows[0] : payload;
    }

    setStep(form, "Creando venta...");
    const rows = await restRequest("opportunities", {
      method: "POST",
      token,
      body: { ...payload, id: uid() },
    });
    return Array.isArray(rows) && rows[0] ? rows[0] : payload;
  }

  function createFollowUpTask(data, opportunityId, token) {
    const payload = {
      id: uid(),
      title: cleanText(data.nextAction) || "Dar seguimiento al cliente",
      due_date: data.followUpDate || todayIso(),
      owner: data.owner || "Ventas",
      priority: data.urgency || "Media",
      status: "Pendiente",
      related_type: "opportunity",
      related_id: opportunityId,
    };
    return restRequest("tasks", {
      method: "POST",
      token,
      body: payload,
      timeoutMs: 5000,
    });
  }

  function validate(data) {
    if (!cleanText(data.name)) return "Falta el nombre del cliente.";
    if (!cleanText(data.phone)) return "Falta el telefono o WhatsApp.";
    if (!data.interest) return "Falta seleccionar el interes principal.";
    if (!data.followUpDate) return "Falta la fecha de seguimiento.";
    return "";
  }

  document.addEventListener(
    "submit",
    async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "lead-form") return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton?.textContent || "Guardar venta";
      const data = dataFrom(form);
      const validationError = validate(data);
      if (validationError) {
        showFormMessage(form, validationError, "danger");
        setSync("Faltan datos", "warning");
        return;
      }

      let finished = false;
      const watchdog = setTimeout(() => {
        if (finished) return;
        showFormMessage(form, "Supabase esta tardando demasiado. El boton ya esta libre para intentar otra vez.", "danger");
        setSync("Supabase lento", "danger");
        releaseButton(submitButton, originalText);
      }, 15000);

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Guardando...";
        }
        setStep(form, "Verificando sesion...");
        const session = await getSession();
        const contact = await saveContact(data, session.access_token, form);
        const opportunity = await saveOpportunity(data, contact.id, session.access_token, form);

        setStep(form, "Creando seguimiento...");
        await createFollowUpTask(data, opportunity.id, session.access_token).catch((error) => {
          console.warn("Venta guardada; seguimiento automatico no creado.", error);
        });

        finished = true;
        clearTimeout(watchdog);
        showFormMessage(form, "Venta guardada. Actualizando pantalla...", "success");
        setSync("Venta guardada", "success");
        const modal = document.querySelector("#modal");
        const modalBody = document.querySelector("#modal-body");
        window.location.hash = "leads";
        setTimeout(() => {
          if (modal) modal.hidden = true;
          if (modalBody) modalBody.innerHTML = "";
          window.location.reload();
        }, 350);
      } catch (error) {
        finished = true;
        clearTimeout(watchdog);
        console.error("Holeshot lead save v15 error", error);
        const message = friendlyError(error);
        showFormMessage(form, message, "danger");
        setSync("Error al guardar", "danger");
        alert(message);
      } finally {
        if (finished) releaseButton(submitButton, originalText);
      }
    },
    true,
  );
})();
