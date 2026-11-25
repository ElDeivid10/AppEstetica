import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

export type UserRole = 'cliente' | 'admin' | null;

export interface SignUpParams {
  name: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
  hairType?: string;
  allergies?: string;
}

interface AuthContextType {
  session: Session | null;
  userId: string | null;
  userEmail: string | null;
  userRole: UserRole;
  isLoadingAuth: boolean;
  isBlocked: boolean;
  /** true = el usuario aún no completa la guía de primer uso */
  showOnboarding: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  setIsBlocked: (blocked: boolean) => void;
  /** Llámalo cuando el usuario completa o cierra el onboarding */
  dismissOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  userId: null,
  userEmail: null,
  userRole: null,
  isLoadingAuth: true,
  isBlocked: false,
  showOnboarding: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  sendPasswordReset: async () => ({}),
  setIsBlocked: () => {},
  dismissOnboarding: async () => {},
  logout: async () => {},
});

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Teléfono/correo o contraseña incorrectos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu cuenta aún requiere confirmar el correo. Revisa tu bandeja o desactiva "Confirm email" en Supabase Auth.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Este correo electrónico ya está registrado.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (lower.includes('network request failed') || lower.includes('fetch')) {
    return 'Sin conexión con el servidor de Supabase. Verifica tu internet y configuración.';
  }
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Evita navegar brevemente a la app durante signUp -> signOut
  const isRegisteringRef = useRef(false);
  const loadedUidRef = useRef<string | null>(null);

  const loadUserRoleAndOnboarding = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      loadedUidRef.current = null;
      setUserId(null);
      setUserEmail(null);
      setUserRole(null);
      setShowOnboarding(false);
      setIsBlocked(false);
      return;
    }

    const uid = activeSession.user.id;
    const email = activeSession.user.email ?? null;
    loadedUidRef.current = uid;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol, guia_completada')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn('Error cargando rol de usuario:', error.message);
        const isAdminEmail = (email || '').toLowerCase() === 'yoss@yossbeautysalon.com';
        setUserId(uid);
        setUserEmail(email);
        setUserRole(isAdminEmail ? 'admin' : 'cliente');
        return;
      }

      if (data) {
        const rol: UserRole = data.rol === 'admin' ? 'admin' : 'cliente';
        setUserId(uid);
        setUserEmail(email);
        setUserRole(rol);
        setShowOnboarding(data.guia_completada !== true);
      } else {
        // Solo si realmente NO existe fila en public.usuarios — INSERT que ignora conflictos
        // NUNCA usamos upsert aquí para no pisar avatar_uri, rol u otros campos ya guardados
        const isAdminEmail = (email || '').toLowerCase() === 'yoss@yossbeautysalon.com';
        const fallbackRole: UserRole = isAdminEmail ? 'admin' : 'cliente';
        const meta = activeSession.user.user_metadata || {};

        const { error: insertErr } = await supabase.from('usuarios').insert({
          id: uid,
          email: email || `${uid}@clientes.yossbeautysalon.com`,
          password_hash: 'supabase_auth',
          rol: (meta.rol as UserRole) || fallbackRole,
          nombre: meta.nombre || (email ? email.split('@')[0] : 'Clienta'),
          telefono: meta.telefono || null,
          perfil_cabello: meta.perfil_cabello || 'Por definir',
          alergias: meta.alergias || 'Ninguna registrada',
          guia_completada: false,
        });

        // Ignorar error de clave duplicada (ya existe la fila, está bien)
        if (insertErr && !insertErr.message.includes('duplicate') && !insertErr.message.includes('unique')) {
          console.warn('Error creando perfil faltante en usuarios:', insertErr.message);
        }

        // Re-leer la fila para obtener el rol real (pudo haber sido creada por el trigger)
        const { data: retryRow } = await supabase
          .from('usuarios')
          .select('rol, guia_completada')
          .eq('id', uid)
          .maybeSingle();

        const realRole: UserRole = retryRow?.rol === 'admin' ? 'admin' : fallbackRole;
        setUserId(uid);
        setUserEmail(email);
        setUserRole(realRole);
        setShowOnboarding(retryRow?.guia_completada !== true);
      }
    } catch (err) {
      console.warn('Error verificando sesión:', err);
      setUserRole(null);
    }
  }, []);

  // 1. Inicializar sesión y escuchar cambios SIN await dentro de onAuthStateChange
  //    (evita el deadlock clásico del lock interno de @supabase/supabase-js v2)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured) {
        if (mounted) setIsLoadingAuth(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && !isRegisteringRef.current) {
          setSession(data.session ?? null);
          if (data.session) {
            await loadUserRoleAndOnboarding(data.session);
          }
        }
      } catch (e) {
        console.warn('Error inicializando sesión:', e);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted || isRegisteringRef.current) return;
      // Actualización síncrona únicamente: no llamar a supabase.from() aquí dentro
      setSession(newSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserRoleAndOnboarding]);

  // 2. Reaccionar a cambios de sesión fuera del callback de Auth
  useEffect(() => {
    if (isRegisteringRef.current) return;

    if (!session?.user) {
      if (loadedUidRef.current !== null || userRole !== null) {
        loadUserRoleAndOnboarding(null);
      }
      return;
    }

    if (loadedUidRef.current !== session.user.id) {
      loadUserRoleAndOnboarding(session).finally(() => {
        setIsLoadingAuth(false);
      });
    }
  }, [session, userRole, loadUserRoleAndOnboarding]);

  const signIn = async (identifier: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase no está configurado en esta compilación. Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    const cleanId = identifier.trim();
    if (!cleanId || !password.trim()) {
      return { error: 'Ingresa tu teléfono (o correo) y contraseña.' };
    }

    let loginEmail = '';
    if (cleanId.includes('@')) {
      loginEmail = cleanId.toLowerCase();
    } else {
      const digitsOnly = cleanId.replace(/[^\d]/g, '');
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_login_email', {
        p_identifier: digitsOnly || cleanId,
      });

      if (rpcError) {
        return { error: `Error al buscar cuenta: ${translateAuthError(rpcError.message)}` };
      }

      if (!resolvedEmail) {
        return { error: 'No existe ninguna cuenta registrada con ese teléfono.' };
      }
      loginEmail = String(resolvedEmail);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password.trim(),
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    if (data.session) {
      setSession(data.session);
      await loadUserRoleAndOnboarding(data.session);
    }

    return {};
  };

  const signUp = async (
    params: SignUpParams
  ): Promise<{ error?: string; needsEmailConfirmation?: boolean }> => {
    if (!isSupabaseConfigured) {
      return {
        error:
          'Supabase no está configurado en esta compilación. Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    const cleanPhone = params.phone.trim().replace(/[^\d]/g, '');
    const fullName = `${params.name.trim()} ${params.lastName.trim()}`.trim();
    const rawEmail = (params.email || '').trim().toLowerCase();
    const finalEmail = rawEmail || `${cleanPhone}@clientes.yossbeautysalon.com`;

    const { data: existingEmail } = await supabase.rpc('get_login_email', {
      p_identifier: cleanPhone,
    });
    if (existingEmail) {
      return { error: 'Ya existe una cuenta registrada con ese número de teléfono.' };
    }

    isRegisteringRef.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password: params.password,
        options: {
          data: {
            nombre: fullName,
            telefono: cleanPhone,
            perfil_cabello: params.hairType || 'Por definir',
            alergias: params.allergies?.trim() || 'Ninguna registrada',
            rol: 'cliente',
          },
        },
      });

      if (error) {
        return { error: translateAuthError(error.message) };
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { error: 'Este correo electrónico ya está registrado.' };
      }

      if (data.user && data.session) {
        const uid = data.user.id;
        const { error: upsertErr } = await supabase.from('usuarios').upsert(
          {
            id: uid,
            email: finalEmail,
            password_hash: 'supabase_auth',
            rol: 'cliente',
            nombre: fullName,
            telefono: cleanPhone,
            perfil_cabello: params.hairType || 'Por definir',
            alergias: params.allergies?.trim() || 'Ninguna registrada',
            guia_completada: false,
          },
          { onConflict: 'id' }
        );
        if (upsertErr) {
          console.warn('Error guardando datos en usuarios durante registro:', upsertErr.message);
        }

        const firstName = params.name.trim() || 'Bienvenida';
        const nowTs = Date.now();
        const { error: msgSeedErr } = await supabase.from('mensajes_chat').insert([
          {
            id: `msg-${nowTs}-1`,
            cliente_id: uid,
            remitente: 'bot',
            nombre_remitente: 'Asistente Yoss',
            texto: `¡Hola ${firstName}! ✨ Bienvenida a tu espacio personal en Yoss Beauty Salon. Aquí puedes consultar tus citas, horarios, ubicación y resolver dudas de tus tratamientos.`,
            tipo: 'welcome',
            leido_cliente: false,
            leido_admin: true,
            creado_en: new Date(nowTs).toISOString(),
          },
          {
            id: `msg-${nowTs}-2`,
            cliente_id: uid,
            remitente: 'bot',
            nombre_remitente: 'Ubicación Yoss Beauty Salon',
            texto: '📍 Nuestra dirección:\nCueramo, Gomez 60154, Uruapan, Mich.\n\n¡Toca el mapa interactivo para ver la ruta exacta en Google Maps!',
            tipo: 'chat',
            leido_cliente: false,
            leido_admin: true,
            map_url: 'https://maps.app.goo.gl/gjva8goQK7GQSpqQ6',
            map_address: 'Cueramo, Gomez 60154, Uruapan, Mich.',
            map_title: 'Yoss Beauty Salon · Uruapan, Mich.',
            creado_en: new Date(nowTs + 50).toISOString(),
          },
        ]);
        if (msgSeedErr) {
          console.warn('Error creando mensajes de bienvenida:', msgSeedErr.message);
        }

        await supabase.auth.signOut();
        setSession(null);
        loadedUidRef.current = null;
        return { needsEmailConfirmation: false };
      }

      return { needsEmailConfirmation: true };
    } finally {
      isRegisteringRef.current = false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase no está configurado.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      return { error: 'Ingresa un correo electrónico válido.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return {};
  };

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    const targetId = userId || session?.user?.id;
    if (!targetId || !isSupabaseConfigured) return;

    const { error: rpcErr } = await supabase.rpc('marcar_guia_completada');
    if (rpcErr) {
      console.warn('Error en RPC marcar_guia_completada:', rpcErr.message);
      const { error } = await supabase
        .from('usuarios')
        .update({ guia_completada: true })
        .eq('id', targetId);
      if (error) {
        console.warn('Error actualizando guia_completada:', error.message);
      }
    }
  };

  const logout = async () => {
    loadedUidRef.current = null;
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUserId(null);
    setUserEmail(null);
    setUserRole(null);
    setIsBlocked(false);
    setShowOnboarding(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        userId,
        userEmail,
        userRole,
        isLoadingAuth,
        isBlocked,
        showOnboarding,
        signIn,
        signUp,
        sendPasswordReset,
        setIsBlocked,
        dismissOnboarding,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
