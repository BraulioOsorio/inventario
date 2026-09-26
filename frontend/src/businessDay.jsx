import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clientLocalDate } from "./api";
import { useAuth } from "./auth";

const BusinessDayContext = createContext(null);

export function BusinessDayProvider({ children }) {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.businessDayStatus(token);
      setStatus(data);
    } catch (err) {
      setError(err.message || "No se pudo consultar el día operativo.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      loading,
      error,
      clientDate: clientLocalDate(),
      canOperate: Boolean(status?.can_operate),
      refresh,
      async openDay() {
        const data = await api.openBusinessDay(token);
        setStatus(data);
        return data;
      },
      async closeDay() {
        const data = await api.closeBusinessDay(token);
        setStatus(data);
        return data;
      },
      async rolloverDay() {
        const data = await api.rolloverBusinessDay(token);
        setStatus(data);
        return data;
      },
    }),
    [status, loading, error, token, refresh]
  );

  return <BusinessDayContext.Provider value={value}>{children}</BusinessDayContext.Provider>;
}

export function useBusinessDay() {
  const ctx = useContext(BusinessDayContext);
  if (!ctx) throw new Error("useBusinessDay debe usarse dentro de BusinessDayProvider");
  return ctx;
}
