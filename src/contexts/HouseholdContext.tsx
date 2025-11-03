import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Ctx = {
  code: string | null;
  lastSyncAt: number | null;
  online: boolean;
  ensuring: boolean;
  error: string | null;
  setCode: (code: string | null) => void;
  ensureOnSupabase: (raw: string) => Promise<string>;
  pingSync: (event?: string) => Promise<void>;
};

const HouseholdContext = createContext<Ctx | null>(null);
const LS_KEY = 'householdCode';

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [code, setCodeState] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [ensuring, setEnsuring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setCodeState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const setCode = (next: string | null) => {
    try {
      if (next) localStorage.setItem(LS_KEY, next);
      else localStorage.removeItem(LS_KEY);
    } catch {}
    setCodeState(next);
  };

  const ensureOnSupabase = async (raw: string) => {
    const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean.length < 4) throw new Error('Code must be at least 4 characters (a-z, 0-9, _ or -).');
    setEnsuring(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('ensure_household', { p_code: clean });
      if (error) throw error;
      setCode(data.code);
      return data.code as string;
    } catch (e: any) {
      console.warn('[supabase] ensure_household failed; local fallback:', e?.message || e);
      setCode(clean);
      return clean;
    } finally {
      setEnsuring(false);
    }
  };

  const pingSync = async (event: string = 'ping') => {
    if (!code) return;
    try {
      await supabase.rpc('log_sync', { p_household_code: code, p_event: event });
    } catch {}
    setLastSyncAt(Date.now());
  };

  const value: Ctx = useMemo(
    () => ({ code, lastSyncAt, online, ensuring, error, setCode, ensureOnSupabase, pingSync }),
    [code, lastSyncAt, online, ensuring, error]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return ctx;
}
