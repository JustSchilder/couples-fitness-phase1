import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHousehold } from '../contexts/HouseholdContext';

type Workout = {
  id: string;
  exercise: string;
  duration_minutes: number;
  calories_burned: number | null;
  date: string;
  created_at: string;
};

export default function WorkoutLog() {
  const { code } = useHousehold();
  const [exercise, setExercise] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [list, setList] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!code) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('household_code', code)
      .order('created_at', { ascending: false })
      .limit(100);
    setLoading(false);
    if (!error && data) setList(data as Workout[]);
  };

  const addWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    const durationNum = Number(duration) || 0;
    const caloriesNum = calories ? Number(calories) : null;
    await supabase.from('workouts').insert({
      household_code: code,
      exercise,
      duration_minutes: durationNum,
      calories_burned: caloriesNum,
    });
    setExercise('');
    setDuration('');
    setCalories('');
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Workouts</h3>
      <form onSubmit={addWorkout} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          placeholder="Exercise (e.g., Running)"
          required
          style={{ flex: '1 1 180px', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Minutes"
          type="number"
          min={0}
          required
          style={{ width: 120, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
        <input
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Calories (optional)"
          type="number"
          min={0}
          style={{ width: 160, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
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
          {list.map((w) => (
            <li
              key={w.id}
              style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 8, background: '#fafafa' }}
            >
              <div style={{ fontWeight: 600 }}>{w.exercise}</div>
              <div>{w.duration_minutes} min {w.calories_burned ? `· ${w.calories_burned} kcal` : ''}</div>
              <small style={{ color: '#666' }}>{new Date(w.created_at).toLocaleString()}</small>
            </li>
          ))}
          {!list.length && <li>No workouts yet.</li>}
        </ul>
      )}
    </div>
  );
}
