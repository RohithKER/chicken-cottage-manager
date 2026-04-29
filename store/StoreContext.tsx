import React, { createContext, useContext, ReactNode } from 'react';
import { useStore } from './useStore';

type StoreContextType = ReturnType<typeof useStore>;

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore must be used within StoreProvider');
  return ctx;
}
