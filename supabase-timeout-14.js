(function () {
  const TIMEOUT_MS = 10000;

  function timeoutPromise(label, ms = TIMEOUT_MS) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} tardo demasiado. Revisa internet, Supabase o vuelve a intentar.`)), ms);
    });
  }

  function withTimeout(promise, label, ms = TIMEOUT_MS) {
    return Promise.race([Promise.resolve(promise), timeoutPromise(label, ms)]);
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
    if (window.supabase.__holeshotTimeoutPatched) return true;

    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    window.supabase.createClient = (...args) => wrapClient(originalCreateClient(...args));
    Object.defineProperty(window.supabase, "__holeshotTimeoutPatched", { value: true });
    return true;
  }

  if (!install()) {
    window.addEventListener("load", install, { once: true });
  }
})();
