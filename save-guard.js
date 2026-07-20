(function () {
  const FORM_IDS = new Set(["auth-form", "lead-form", "service-form", "task-form", "client-form"]);
  const SUPABASE_URL = "https://esjqybxzpqtonkcomdtb.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanF5Ynh6cHF0b25rY29tZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTE2NTgsImV4cCI6MjA5OTcyNzY1OH0.DEGP5xyOsdl41qFiFaoZfophSKiWdXIcKmq7_wv9nbg";
  const guardClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  function call(name, ...args) {
    if (typeof window[name] !== "function") {
      throw new Error(`No se encontro la funcion ${name}. Recarga la pagina e intenta de nuevo.`);
    }
    return window[name](...args);
  }

  function message(form, text, tone = "neutral") {
    call("showFormMessage", form, text, tone);
  }

  function sync(text, tone = "neutral") {
    call("setSync", text, tone);
  }

  function friendly(error) {
    return typeof window.friendlyError === "function"
      ? window.friendlyError(error)
      : error?.message || String(error);
  }

  function detail(error) {
    return typeof window.errorDetail === "function"
      ? window.errorDetail(error)
      : error?.message || String(error);
  }

  const originalWithTimeout = window.withTimeout;
  if (typeof originalWithTimeout === "function") {
    window.withTimeout = async function guardedTimeout(operation, label, ms = 10000) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const request =
        controller && operation && typeof operation.abortSignal === "function"
          ? operation.abortSignal(controller.signal)
          : operation;
      let timerId;
      const timeout = new Promise((_, reject) => {
        timerId = setTimeout(() => {
          if (controller) controller.abort();
          reject(new Error(`${label} tardo demasiado. Revisa internet, Supabase o vuelve a intentar.`));
        }, ms);
      });

      try {
        return await Promise.race([Promise.resolve(request), timeout]);
      } finally {
        clearTimeout(timerId);
      }
    };
  }

  async function queryWithTimeout(query, label, ms = 10000) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const request =
      controller && query && typeof query.abortSignal === "function"
        ? query.abortSignal(controller.signal)
        : query;
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
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Verificar sesion tardo demasiado.")), 10000),
      ),
    ]);
    if (error) throw error;
    if (!data?.session?.access_token) {
      throw new Error("La sesion expiro. Cierra sesion, entra de nuevo y vuelve a guardar.");
    }
    return data.session;
  }

  function dataFrom(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function cleanNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function saveLeadDirect(form) {
    message(form, "Verificando sesion...", "neutral");
    sync("Verificando sesion", "neutral");
    await requireSession();

    const data = dataFrom(form);
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    if (!name) throw new Error("Falta el nombre del cliente.");
    if (!phone) throw new Error("Falta el telefono o WhatsApp del cliente.");
    if (!data.interest) throw new Error("Falta seleccionar el interes principal.");
    if (!data.followUpDate) throw new Error("Falta la fecha de seguimiento.");

    message(form, "Guardando cliente...", "neutral");
    const existingContacts = await queryWithTimeout(
      guardClient.from("contacts").select("*").eq("phone", phone).limit(1),
      "Buscar cliente",
    );
    const existingContact = Array.isArray(existingContacts) ? existingContacts[0] : null;
    const contactPayload = {
      ...(existingContact?.id ? { id: existingContact.id } : {}),
      name,
      phone,
      channel: data.channel || "WhatsApp",
      type: data.clientType || existingContact?.type || "Nuevo",
      last_contact: today(),
      notes: existingContact?.notes || data.notes || null,
    };
    const contactRow = await queryWithTimeout(
      guardClient.from("contacts").upsert(contactPayload, { onConflict: "id" }).select().single(),
      "Guardar cliente",
    );

    message(form, "Guardando venta...", "neutral");
    const title =
      String(data.title || "").trim() ||
      [data.interest, data.brand, data.model].filter(Boolean).join(" - ") ||
      "Nuevo lead Holeshot";
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
    const opportunityRow = await queryWithTimeout(
      guardClient.from("opportunities").upsert(opportunityPayload, { onConflict: "id" }).select().single(),
      "Guardar venta",
    );

    const taskPayload = {
      title: opportunityPayload.next_action,
      due_date: opportunityPayload.follow_up_date,
      owner: opportunityPayload.owner,
      priority: opportunityPayload.urgency,
      status: "Pendiente",
      related_type: "opportunity",
      related_id: opportunityRow.id,
    };
    queryWithTimeout(guardClient.from("tasks").insert(taskPayload), "Crear seguimiento", 8000).catch((error) => {
      console.warn("La venta se guardo, pero no se pudo crear el seguimiento automatico.", error);
    });

    if (typeof contactFromDb === "function" && typeof upsertStateItem === "function") {
      upsertStateItem(state.contacts, contactFromDb(contactRow));
    }
    if (typeof opportunityFromDb === "function" && typeof upsertStateItem === "function") {
      upsertStateItem(state.opportunities, opportunityFromDb(opportunityRow));
    }
    currentView = "leads";
    call("closeModal");
    sync("Venta guardada", "success");
    if (typeof render === "function") render();
  }

  document.addEventListener(
    "submit",
    async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !FORM_IDS.has(form.id)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton?.textContent || "Guardar";

      if (typeof window.clearFormMessage === "function") window.clearFormMessage(form);
      if (typeof window.validateRequiredFields === "function" && !window.validateRequiredFields(form)) return;

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
        sync("Supabase no respondio", "danger");
        message(
          form,
          "Supabase no respondio a tiempo. El formulario sigue abierto para que puedas intentar de nuevo sin perder lo escrito.",
          "danger",
        );
        release();
      }, 16000);

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Guardando...";
        }
        sync("Guardando", "neutral");
        message(form, "Guardando en Supabase...", "neutral");

        if (form.id === "auth-form") await call("signIn", form);
        if (form.id === "lead-form") await saveLeadDirect(form);
        if (form.id === "service-form") await call("saveService", form);
        if (form.id === "task-form") await call("saveTask", form);
        if (form.id === "client-form") await call("saveClient", form);
      } catch (error) {
        console.error("Holeshot CRM guarded submit error", error);
        sync("Error al guardar", "danger");
        const userMessage = friendly(error);
        const technicalDetail = detail(error);
        const fullMessage =
          technicalDetail && technicalDetail !== userMessage
            ? `${userMessage} Detalle tecnico: ${technicalDetail}`
            : userMessage;
        message(form, fullMessage, "danger");
        alert(fullMessage);
      } finally {
        clearTimeout(watchdog);
        release();
      }
    },
    true,
  );
})();
