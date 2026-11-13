import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('skilltrack_token')));

  const acceptSession = useCallback(({ token, user: nextUser }) => {
    localStorage.setItem('skilltrack_token', token);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('skilltrack_token')) return;
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('skilltrack_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('skilltrack_token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, acceptSession, logout }), [user, loading, acceptSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
