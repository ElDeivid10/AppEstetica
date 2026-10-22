import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'cliente' | 'admin' | null;

interface AuthContextType {
  userRole: UserRole;
  isBlocked: boolean;
  setUserRole: (role: UserRole) => void;
  setIsBlocked: (blocked: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userRole: null,
  isBlocked: false,
  setUserRole: () => {},
  setIsBlocked: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const logout = () => {
    setUserRole(null);
    setIsBlocked(false);
  };

  return (
    <AuthContext.Provider
      value={{ userRole, isBlocked, setUserRole, setIsBlocked, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
