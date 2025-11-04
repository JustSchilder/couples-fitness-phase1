import { useEffect, useRef, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { supabase } from '../lib/supabaseClient';

export default function SyncStatus() {
  const { code } = useHousehold();
  const [last, setLast] = useState<Date | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!code) return;

    const ping = async () => {
      try {
        await supabase.rpc('log_sync', { p_household_code: code, p_event: 'ping' });
        setLast(new Date());
      } catch (e) {
        // swallow errors; status will still render
      }
    };

    // initial ping + every 30s
    ping();
    timer.current = window.setInterval(ping, 30000);

    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [code]);

  return (
    <div style={{ background: '#e9f7ec', border: '1px solid #cdebd3', padding: 8, borderRadius: 8 }}>
      <span role="img" aria-label="home">🏠</span> <b>{code}</b> · {navigator.onLine ? 'Online' : 'Offline'}
      {last && <> · Last sync: {Math.max(0, Math.round((Date.now() - last.getTime()) / 1000))}s ago</>}
    </div>
  );
}
