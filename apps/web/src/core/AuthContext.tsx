import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from './api-client';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string;
  profile?: {
    displayName?: string;
    bio?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load stored credentials on mount
    const storedToken = localStorage.getItem('voicesphere_access_token');
    const storedUser = localStorage.getItem('voicesphere_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiClient.post('/auth/login', { identity: username, password });
    const { accessToken, user: userData } = res.data;
    
    localStorage.setItem('voicesphere_access_token', accessToken);
    localStorage.setItem('voicesphere_user', JSON.stringify(userData));
    
    setToken(accessToken);
    setUser(userData);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await apiClient.post('/auth/register', { username, email, password });
    const { accessToken, user: userData } = res.data;
    
    localStorage.setItem('voicesphere_access_token', accessToken);
    localStorage.setItem('voicesphere_user', JSON.stringify(userData));
    
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('voicesphere_access_token');
    localStorage.removeItem('voicesphere_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const mergedUser = { ...user, ...updatedUser };
      localStorage.setItem('voicesphere_user', JSON.stringify(mergedUser));
      setUser(mergedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
