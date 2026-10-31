import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/auth';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<User>;
  signup: (name: string, email: string, pass: string, company?: string) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  changePassword: (curr: string, newP: string) => Promise<void>;
  switchUserQuick: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate session on app load
  useEffect(() => {
    try {
      const activeSession = AuthService.getCurrentSession();
      if (activeSession && activeSession.user) {
        setUser(activeSession.user);
      }
    } catch (e) {
      console.error('Session restoration failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean = false): Promise<User> => {
    setIsLoading(true);
    try {
      const { user: authedUser } = await AuthService.login(email, pass, rememberMe);
      setUser(authedUser);
      return authedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    pass: string,
    company?: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const { user: registeredUser } = await AuthService.signup(name, email, pass, company);
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (!user) throw new Error('Not authenticated.');
    const updated = await AuthService.updateProfile(user.id, updates);
    setUser(updated);
    return updated;
  };

  const changePassword = async (curr: string, newP: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated.');
    await AuthService.changePassword(user.id, curr, newP);
  };

  // Helper for evaluation / quick testing of RBAC roles in 1-click
  const switchUserQuick = async (targetRole: UserRole): Promise<void> => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@brightloop.io', pass: 'AdminPassword123!' },
      STAFF: { email: 'staff@brightloop.io', pass: 'StaffPassword123!' },
      CUSTOMER: { email: 'customer@vertexlogic.com', pass: 'CustomerPassword123!' },
    };

    const target = creds[targetRole];
    await login(target.email, target.pass, false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        switchUserQuick,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
