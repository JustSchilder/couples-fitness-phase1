import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHousehold } from '../contexts/HouseholdContext';

type Stat = {
  id: string;
  date: string;
  weight_kg: number | null;
  body_fat: number | null;
  muscle_mass: number | null;
  created_at: string;
};

export default function BodyStats() {
  const { code } = useHousehold();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [muscle, setMuscle] = useState<string>('');
  const [list, setList] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!code) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from('body_stats')
        .select('*')
        .eq('household_code', code)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setList((data || []) as Stat[]);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load body stats.');
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setErr(null);
    try {
      const payload = {
        household_code: code,
        date,
        weight_kg: weight ? Number(weight) : null,
        body_fat: fat ? Number(fat) : null,
        muscle_mass: muscle ? Number(muscle) : null,
      };
      const { error } = await supabase.from('body_stats').insert(payload);
      if (error) throw error;
      setWeight(''); setFat(''); setMuscle('');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add body stat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [code]);

  return (
    <section>
      <h3 style={{ margin: '12px 0' }}>Body Stats</h3>

      <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '140px 140px 140px 160px auto', gap: 8, alignItems: 'center' }}>
        <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight kg" type="number" step="0.1" min={0} />
        <input value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Body Fat %" type="number" step="0.1" min={0} max={100} />
        <input value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="Muscle %" type="number" step="0.1" min={0} max={100} />
        <input value={date} onChange={(e) => setDate(e.target.value)} type="date" required />
        <button disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Saving…' : 'Add'}</button>
      </form>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}

      <ul style={{ marginTop: 12, paddingLeft: 18 }}>
        {list.map((s) => (
          <li key={s.id}>
            {s.date}: {s.weight_kg ? `${s.weight_kg} kg` : '—'}
            {s.body_fat != null ? `, ${s.body_fat}% fat` : ''}{s.muscle_mass != null ? `, ${s.muscle_mass}% muscle` : ''}
          </li>
        ))}
        {!loading && list.length === 0 && <li>No body stats yet.</li>}
      </ul>
    </section>
  );
}
