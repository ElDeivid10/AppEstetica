import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'cliente' | 'admin' | null;

interface AuthContextType {
  userRole: UserRole;
  isBlocked: boolean;
  /** true = el usuario acaba de iniciar sesión por primera vez en esta sesión */
  showOnboarding: boolean;
  setUserRole: (role: UserRole) => void;
  setIsBlocked: (blocked: boolean) => void;
  /** Llámalo cuando el usuario completa o cierra el onboarding */
  dismissOnboarding: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userRole: null,
  isBlocked: false,
  showOnboarding: false,
  setUserRole: () => {},
  setIsBlocked: () => {},
  dismissOnboarding: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRoleState] = useState<UserRole>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  /** Al asignar un rol activo se dispara el onboarding si no había sesión previa */
  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    if (role !== null) {
      // Siempre mostrar onboarding al iniciar sesión (en producción se usaría AsyncStorage)
      setShowOnboarding(true);
    }
  };

  const dismissOnboarding = () => setShowOnboarding(false);

  const logout = () => {
    setUserRoleState(null);
    setIsBlocked(false);
    setShowOnboarding(false);
  };

  return (
    <AuthContext.Provider
      value={{
        userRole,
        isBlocked,
        showOnboarding,
        setUserRole,
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
