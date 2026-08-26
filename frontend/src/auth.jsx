import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);
const STORAGE_KEY = "inventario_auth";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").token || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").user || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me(token)
      .then((u) => {
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: u }));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      async login(email, password) {
        const data = await api.login({ email, password });
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: data.access_token, user: data.user })
        );
        return data;
      },
      async register(full_name, email, password) {
        const data = await api.register({ full_name, email, password });
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: data.access_token, user: data.user })
        );
        return data;
      },
      logout() {
        setToken(null);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
