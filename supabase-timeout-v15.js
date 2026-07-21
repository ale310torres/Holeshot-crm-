(function () {
  const TIMEOUT_MS = 12000;

  function timeoutError(label) {
    return new Error(`${label} tardo demasiado. Revisa internet, Supabase o vuelve a intentar.`);
  }

  function timeoutPromise(label, ms = TIMEOUT_MS) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(timeoutError(label)), ms);
    });
  }

  function withTimeout(promise, label, ms = TIMEOUT_MS) {
    return Promise.race([Promise.resolve(promise), timeoutPromise(label, ms)]);
  }

  function createTimedFetch(baseFetch) {
    return async function timedFetch(input, init = {}) {
      if (typeof AbortController === "undefined") {
        return withTimeout(baseFetch(input, init), "Supabase");
      }

      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(timeoutError("Supabase")), TIMEOUT_MS);
      const upstreamSignal = init.signal;
      if (upstreamSignal) {
        if (upstreamSignal.aborted) controller.abort(upstreamSignal.reason);
        else upstreamSignal.addEventListener("abort", () => controller.abort(upstreamSignal.reason), { once: true });
      }

      try {
        return await baseFetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timerId);
      }
    };
  }

  function wrapThenable(target, label) {
    if (!target || typeof target !== "object") return target;
    return new Proxy(target, {
      get(obj, prop, receiver) {
        const value = Reflect.get(obj, prop, receiver);
        if (prop === "then") {
          return (resolve, reject) => withTimeout(obj, label).then(resolve, reject);
        }
        if (typeof value !== "function") return value;
        return (...args) => wrapThenable(value.apply(obj, args), label);
      },
    });
  }

  function wrapClient(client) {
    if (!client || client.__holeshotTimeoutWrapped) return client;

    const originalFrom = client.from.bind(client);
    client.from = (table) => wrapThenable(originalFrom(table), `Supabase ${table}`);

    if (client.auth) {
      for (const method of ["getSession", "getUser", "signInWithPassword", "signUp", "signOut"]) {
        if (typeof client.auth[method] !== "function") continue;
        const original = client.auth[method].bind(client.auth);
        client.auth[method] = (...args) => withTimeout(original(...args), `Supabase auth ${method}`);
      }
    }

    Object.defineProperty(client, "__holeshotTimeoutWrapped", { value: true });
    return client;
  }

  function install() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") return false;
    if (window.supabase.__holeshotTimeoutPatchedV15) return true;

    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    const timedFetch = createTimedFetch(window.fetch.bind(window));

    window.supabase.createClient = (url, key, options = {}) => {
      const nextOptions = {
        ...options,
        global: {
          ...(options.global || {}),
          fetch: options.global?.fetch || timedFetch,
        },
      };
      return wrapClient(originalCreateClient(url, key, nextOptions));
    };

    Object.defineProperty(window.supabase, "__holeshotTimeoutPatchedV15", { value: true });
    return true;
  }

  if (!install()) {
    window.addEventListener("load", install, { once: true });
  }
})();
