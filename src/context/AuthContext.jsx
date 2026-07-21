import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigError } from '../lib/supabaseClient';

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 12000;
const PROFILE_CACHE_KEY = 'holeshot_profile_cache_v1';

function withTimeout(promise, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(errorMessage)), AUTH_TIMEOUT_MS);
    }),
  ]);
}

function getCachedProfile(userId) {
  try {
    const cached = JSON.parse(window.localStorage.getItem(PROFILE_CACHE_KEY) || 'null');
    if (cached?.user_id === userId) return cached;
  } catch {
    return null;
  }
  return null;
}

function setCachedProfile(profile) {
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore cache errors.
  }
}

function clearCachedProfile() {
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore cache errors.
  }
}

function profileErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('crm_bootstrap_holeshot_profile')) {
    return 'Falta ejecutar supabase/schema.sql en Supabase. Ese SQL crea el perfil automatico de Holeshot.';
  }
  if (message.includes('relation') && message.includes('does not exist')) {
    return 'Faltan tablas en Supabase. Ejecuta supabase/schema.sql completo.';
  }
  if (message.includes('permission') || message.includes('policy') || message.includes('row-level security')) {
    return 'Supabase bloqueo el perfil por policies. Ejecuta supabase/schema.sql completo otra vez.';
  }
  return 'No se pudo cargar tu perfil. Revisa Supabase o intenta de nuevo.';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  async function fetchProfile(userId) {
    return withTimeout(
      supabase
        .from('crm_user_profiles')
        .select('*, organizations(*)')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle(),
      'La consulta del perfil tardo demasiado.'
    );
  }

  async function bootstrapProfile(email) {
    return withTimeout(
      supabase.rpc('crm_bootstrap_holeshot_profile', { profile_email: email || null }),
      'Crear perfil de Holeshot tardo demasiado.'
    );
  }

  async function loadProfile(userId, options = {}) {
    const { email = '', keepExistingProfile = true, allowBootstrap = true } = options;

    if (!supabase) {
      setProfile(null);
      setProfileError('Supabase no esta configurado. Revisa las variables de entorno.');
      return null;
    }

    try {
      let { data, error } = await fetchProfile(userId);
      if (error) throw error;

      if (!data && allowBootstrap) {
        const bootstrap = await bootstrapProfile(email);
        if (bootstrap.error) throw bootstrap.error;
        const afterBootstrap = await fetchProfile(userId);
        data = afterBootstrap.data;
        if (afterBootstrap.error) throw afterBootstrap.error;
      }

      if (!data) {
        if (!keepExistingProfile) {
          setProfile(null);
          clearCachedProfile();
        }
        setProfileError('Usuario sin perfil valido. Ejecuta supabase/schema.sql o crea el perfil en Supabase.');
        return null;
      }

      setProfile(data);
      setCachedProfile(data);
      setProfileError('');
      return data;
    } catch (error) {
      console.warn('No se pudo cargar perfil:', error);
      if (!keepExistingProfile) {
        setProfile(null);
        clearCachedProfile();
      }
      setProfileError(profileErrorMessage(error));
      return null;
    }
  }

  async function reloadProfile() {
    if (!session?.user?.id) return null;
    setLoading(true);
    try {
      return await loadProfile(session.user.id, {
        email: session.user.email,
        keepExistingProfile: false,
        allowBootstrap: true,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!supabase) {
        setProfileError('Supabase no esta configurado. Revisa las variables de entorno.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          'La sesion tardo demasiado en cargar.'
        );

        if (!mounted) return;
        if (error) throw error;

        const nextSession = data.session;
        setSession(nextSession);

        if (!nextSession?.user?.id) {
          setProfile(null);
          setProfileError('');
          clearCachedProfile();
          setLoading(false);
          return;
        }

        const cachedProfile = getCachedProfile(nextSession.user.id);
        if (cachedProfile) {
          setProfile(cachedProfile);
          setProfileError('');
          setLoading(false);
          loadProfile(nextSession.user.id, {
            email: nextSession.user.email,
            keepExistingProfile: true,
            allowBootstrap: true,
          });
          return;
        }

        await loadProfile(nextSession.user.id, {
          email: nextSession.user.email,
          keepExistingProfile: false,
          allowBootstrap: true,
        });
      } catch (error) {
        if (!mounted) return;
        console.warn('No se pudo cargar sesion inicial:', error);
        setSession(null);
        setProfile(null);
        setProfileError('No se pudo cargar la sesion. Revisa la conexion con Supabase.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    if (!supabase) return undefined;

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileError('');
        clearCachedProfile();
        setLoading(false);
        return;
      }

      if (nextSession?.user?.id) {
        const cachedProfile = getCachedProfile(nextSession.user.id);
        if (cachedProfile && !profile) {
          setProfile(cachedProfile);
          setProfileError('');
        }

        loadProfile(nextSession.user.id, {
          email: nextSession.user.email,
          keepExistingProfile: true,
          allowBootstrap: true,
        });
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    setProfileError('');

    if (!supabase) {
      return { error: `${supabaseConfigError} Revisa las variables en Vercel o en el archivo .env.` };
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        'Supabase tardo demasiado en responder.'
      );

      if (error) {
        const message = String(error.message || '').toLowerCase();

        if (message.includes('email not confirmed') || message.includes('confirm')) {
          return { error: 'Tu email todavia no esta confirmado. Confirmalo en Supabase o desactiva la confirmacion de email.' };
        }

        if (message.includes('invalid login credentials')) {
          return { error: 'Email o contrasena incorrectos, o el usuario pertenece a otro proyecto de Supabase.' };
        }

        return { error: `No se pudo iniciar sesion: ${error.message}` };
      }

      setSession(data.session);

      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id, {
          email: data.session.user.email,
          keepExistingProfile: false,
          allowBootstrap: true,
        });
      }

      return { error: null };
    } catch (error) {
      return { error: 'No se pudo conectar con Supabase. Revisa internet, Supabase o las variables de entorno.' };
    }
  }

  async function signOut() {
    setLoading(true);

    try {
      if (supabase) {
        await supabase.auth.signOut({ scope: 'local' });
      }
    } finally {
      setSession(null);
      setProfile(null);
      setProfileError('');
      clearCachedProfile();
      setLoading(false);
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      loading,
      profileError,
      organizationId: profile?.organization_id || null,
      organization: profile?.organizations || null,
      role: profile?.role || null,
      salesRepId: profile?.sales_rep_id || null,
      isOwner: profile?.role === 'owner',
      isAdmin: ['owner', 'admin'].includes(profile?.role),
      isManager: ['owner', 'admin', 'manager'].includes(profile?.role),
      isRep: profile?.role === 'rep',
      signIn,
      signOut,
      reloadProfile,
    }),
    [session, profile, loading, profileError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}



