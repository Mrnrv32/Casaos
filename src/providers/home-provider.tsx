"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface HomeContextValue {
  homeId: string;
  userId: string;
  userEmail: string;
  fullName: string;
  setFullName: (name: string) => void;
  avatarUrl: string | null;
  homeName: string;
  role: string | null;
}

const HomeContext = createContext<HomeContextValue | null>(null);

interface HomeProviderProps {
  homeId: string;
  userId: string;
  userEmail: string;
  initialFullName: string;
  avatarUrl: string | null;
  homeName: string;
  role: string | null;
  children: React.ReactNode;
}

export function HomeProvider({
  homeId,
  userId,
  userEmail,
  initialFullName,
  avatarUrl,
  homeName,
  role,
  children,
}: HomeProviderProps) {
  const [fullName, setFullName] = useState(initialFullName);

  const value = useMemo<HomeContextValue>(
    () => ({ homeId, userId, userEmail, fullName, setFullName, avatarUrl, homeName, role }),
    [homeId, userId, userEmail, fullName, avatarUrl, homeName, role]
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome must be used within HomeProvider");
  return ctx;
}
