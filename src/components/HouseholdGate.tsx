import { useRef, useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';

export default function HouseholdGate() {
  const { ensuring, error, ensureOnSupabase } = useHousehold();
  const [local, setLocal] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      const code = await ensureOnSupabase(local);
      setNotice(`Household “${code}” is ready ✅`);
    } catch (err: any) {
      setNotice(err?.message || 'Something went wrong.');
    } finally {
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '10vh auto', padding: 24, border: '1px solid #eee', borderRadius: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Couples Fitness & Diet Tracker</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        Enter a shared <b>household code</b>. Example: <code>fit-us2025</code>
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="your-household-code"
          minLength={4}
          pattern="[A-Za-z0-9_-]{4,}"
          required
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button
          disabled={ensuring}
          type="submit"
          style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #222', background: '#222', color: 'white' }}
        >
          {ensuring ? 'Connecting…' : 'Connect'}
        </button>
      </form>

      {notice && <p style={{ marginTop: 10 }}>{notice}</p>}
      {error && <p style={{ marginTop: 10, color: 'crimson' }}>{error}</p>}

      <small style={{ display: 'block', marginTop: 16, color: '#888' }}>
        No email login needed. Your code creates (or joins) a household.
      </small>
    </div>
  );
}
