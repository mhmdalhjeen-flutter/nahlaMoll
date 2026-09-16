'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface ShellUiContextValue {
  sideMenuOpen: boolean;
  setSideMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  chatbotOpen: boolean;
  setChatbotOpen: (open: boolean) => void;
}

const ShellUiContext = createContext<ShellUiContextValue | null>(null);

export function ShellUiProvider({ children }: { children: React.ReactNode }) {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const value = useMemo(
    () => ({
      sideMenuOpen,
      setSideMenuOpen,
      searchOpen,
      setSearchOpen,
      searchQuery,
      setSearchQuery,
      chatbotOpen,
      setChatbotOpen,
    }),
    [sideMenuOpen, searchOpen, searchQuery, chatbotOpen],
  );

  return <ShellUiContext.Provider value={value}>{children}</ShellUiContext.Provider>;
}

export function useShellUi() {
  const ctx = useContext(ShellUiContext);
  if (!ctx) {
    throw new Error('useShellUi must be used within ShellUiProvider');
  }
  return ctx;
}
