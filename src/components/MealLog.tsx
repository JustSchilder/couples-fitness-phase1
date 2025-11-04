import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHousehold } from '../contexts/HouseholdContext';

type Meal = {
  id: string;
  meal_name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  date: string;
  created_at: string;
};

export default function MealLog() {
  const { code } = useHousehold();
  const [meal, setMeal] = useState('');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [list, setList] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!code) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('household_code', code)
      .order('created_at', { ascending: false })
      .limit(100);
    setLoading(false);
    if (!error && data) setList(data as Meal[]);
  };

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    await supabase.from('meals').insert({
      household_code: code,
      meal_name: meal,
      calories: Number(cal),
      protein: protein ? Number(protein) : null,
      carbs: carbs ? Number(carbs) : null,
      fat: fat ? Number(fat) : null,
    });
    setMeal('');
    setCal('');
    setProtein('');
    setCarbs('');
    setFat('');
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Meals</h3>
      <form onSubmit={addMeal} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          placeholder="Meal (e.g., Chicken Salad)"
          required
          style={{ flex: '1 1 220px', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <input
          value={cal}
          onChange={(e) => setCal(e.target.value)}
          placeholder="Calories"
          type="number"
          min={0}
          required
          style={{ width: 140, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <input
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="Protein (g)"
          type="number"
          min={0}
          style={{ width: 140, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <input
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="Carbs (g)"
          type="number"
          min={0}
          style={{ width: 140, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <input
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          placeholder="Fat (g)"
          type="number"
          min={0}
          style={{ width: 140, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button
          type="submit"
          style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #222', background: '#222', color: 'white' }}
        >
          Add
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          {list.map((m) => (
            <li
              key={m.id}
              style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 8, background: '#fafafa' }}
            >
              <div style={{ fontWeight: 600 }}>{m.meal_name}</div>
              <div>{m.calories} kcal</div>
              <small style={{ color: '#666' }}>{new Date(m.created_at).toLocaleString()}</small>
            </li>
          ))}
          {!list.length && <li>No meals yet.</li>}
        </ul>
      )}
    </div>
  );
}
