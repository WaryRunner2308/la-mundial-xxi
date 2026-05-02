import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'gerencia' | 'invitado' | null;

interface AuthContextType {
  userRole: UserRole;
  login: (role: 'gerencia' | 'invitado', password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>(null);

  // Cargar rol desde localStorage al iniciar
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    if (savedRole === 'gerencia' || savedRole === 'invitado') {
      setUserRole(savedRole);
    }
  }, []);

  const login = (role: 'gerencia' | 'invitado', password?: string): boolean => {
    if (role === 'invitado') {
      setUserRole('invitado');
      localStorage.setItem('userRole', 'invitado');
      return true;
    }

    if (role === 'gerencia') {
      // Credenciales: usuario pumpo, contraseña Laly2018
      // Usuario es case-insensitive, contraseña exacta
      const validUser = 'pumpo';
      const validPass = 'Laly2018';
      const inputUser = (password?.toLowerCase() || '').trim();

      if (inputUser === validUser && password === validPass) {
        setUserRole('gerencia');
        localStorage.setItem('userRole', 'gerencia');
        return true;
      }
      return false;
    }

    return false;
  };

  const logout = () => {
    setUserRole(null);
    localStorage.removeItem('userRole');
  };

  const isAuthenticated = userRole !== null;

  return (
    <AuthContext.Provider value={{ userRole, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
