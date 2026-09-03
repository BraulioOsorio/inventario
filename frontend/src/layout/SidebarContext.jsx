import { createContext, useContext, useState } from "react";

const SidebarCtx = createContext({ open: false, toggle: () => {}, close: () => {} });

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const value = {
    open,
    toggle: () => setOpen((v) => !v),
    close: () => setOpen(false),
  };
  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

export function useSidebar() {
  return useContext(SidebarCtx);
}
