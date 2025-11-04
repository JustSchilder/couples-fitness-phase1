import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHousehold } from '../contexts/HouseholdContext';

export default function HouseholdGate() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { setCode } = useHousehold();

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    setLoading(true);
    setErr(null);
    try {
      // create (or fetch) the household row in Supabase
      const { data, error } = await supabase.rpc('ensure_household', { p_code: raw });
      if (error) throw error;
      const cleaned = (data?.code || raw).toLowerCase();
      localStorage.setItem('household_code', cleaned);
      setCode(cleaned);
    } catch (e: any) {
      setErr(e?.message || 'Failed to join household.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 20, borderRadius: 16, border: '1px solid #eee' }}>
      <h1 style={{ marginTop: 0 }}>Couples Fitness & Diet Tracker</h1>
      <p>Enter a shared <b>household code</b>. Example: <code>fit-us2025</code></p>
      <form onSubmit={connect} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="your-household-code"
          style={{ flex: 1 }}
        />
        <button disabled={loading} style={{ padding: '10px 14px' }}>{loading ? 'Connecting…' : 'Connect'}</button>
      </form>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      <p style={{ color: '#666', marginTop: 8 }}>No email login needed. Your code creates (or joins) a household.</p>
    </div>
  );
}
