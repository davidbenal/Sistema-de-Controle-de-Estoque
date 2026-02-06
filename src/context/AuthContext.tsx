import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuários mockados para demonstração
const mockUsers: Record<string, User> = {
  'admin@restaurante.com': {
    id: '1',
    name: 'João Silva',
    email: 'admin@restaurante.com',
    role: 'administrador',
  },
  'gerente@restaurante.com': {
    id: '2',
    name: 'Maria Santos',
    email: 'gerente@restaurante.com',
    role: 'gerencia',
  },
  'cozinha@restaurante.com': {
    id: '3',
    name: 'Pedro Costa',
    email: 'cozinha@restaurante.com',
    role: 'operacao',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Simula autenticação - aceita qualquer senha
    const mockUser = mockUsers[email];
    if (mockUser) {
      setUser(mockUser);
    } else {
      throw new Error('Usuário não encontrado');
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
