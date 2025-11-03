import { useEffect } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';

function timeAgo(ts: number | null) {
  if (!ts) return 'never';
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export default function SyncStatus() {
  const { code, online, lastSyncAt, pingSync } = useHousehold();

  useEffect(() => {
    if (!code || !online) return;
    pingSync('heartbeat');
    const id = setInterval(() => pingSync('heartbeat'), 45_000);
    return () => clearInterval(id);
  }, [code, online, pingSync]);

  if (!code) return null;

  return (
    <div
      style={{
        padding: '8px 12px',
        background: online ? '#e6ffed' : '#fff7e6',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <span>🏠 <b>{code}</b></span>
      <span>&middot;</span>
      <span>{online ? 'Online' : 'Offline'}</span>
      <span>&middot;</span>
      <span>Last sync: {timeAgo(lastSyncAt)}</span>
    </div>
  );
}
