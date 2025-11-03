// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';

function useAuth() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session };
}

export default function CalorieAndWorkoutLog() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [dailyTarget, setDailyTarget] = useState<number | ''>('');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [calEntries, setCalEntries] = useState<any[]>([]);
  const [workEntries, setWorkEntries] = useState<any[]>([]);
  const [calAmount, setCalAmount] = useState<number | ''>('');
  const [calNote, setCalNote] = useState('');
  const [wType, setWType] = useState('Rowing');
  const [wMinutes, setWMinutes] = useState<number | ''>('');
  const [wKcal, setWKcal] = useState<number | ''>('');
  const [wNote, setWNote] = useState('');

  async function signInMagic() {
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setSending(false);
    if (error) alert(error.message);
    else alert('Check your email for the magic link.');
  }

  async function signOut() { await supabase.auth.signOut(); }

  useEffect(() => {
    if (!session) return;
    (async () => {
      // load profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (prof) {
        setDisplayName(prof.display_name ?? '');
        setDailyTarget(prof.daily_kcal_target ?? '');
      }
      // load todays logs
      const { data: cals } = await supabase.from('calorie_logs').select('*').eq('user_id', session.user.id).eq('day', today).order('inserted_at', { ascending: false });
      setCalEntries(cals ?? []);
      const { data: w } = await supabase.from('workout_logs').select('*').eq('user_id', session.user.id).eq('day', today).order('inserted_at', { ascending: false });
      setWorkEntries(w ?? []);
    })();
  }, [session, today]);

  const totalCal = calEntries.reduce((s, r) => s + (r.calories ?? 0), 0);
  const remaining = typeof dailyTarget === 'number' ? dailyTarget - totalCal : null;

  async function saveProfile() {
    if (!session) return;
    const payload = {
      id: session.user.id,
      display_name: displayName || null,
      daily_kcal_target: dailyTarget === '' ? null : Number(dailyTarget)
    };
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    alert('Saved profile.');
  }

  async function addCalories() {
    if (!session || calAmount === '' || Number.isNaN(Number(calAmount))) return;
    const row = { user_id: session.user.id, day: today, calories: Number(calAmount), note: calNote || null };
    const { error } = await supabase.from('calorie_logs').insert(row);
    if (error) return alert(error.message);
    setCalAmount('');
    setCalNote('');
    const { data } = await supabase.from('calorie_logs').select('*').eq('user_id', session.user.id).eq('day', today).order('inserted_at', { ascending: false });
    setCalEntries(data ?? []);
  }

  async function addWorkout() {
    if (!session) return;
    const row = {
      user_id: session.user.id, day: today, type: wType || null,
      minutes: wMinutes === '' ? null : Number(wMinutes),
      kcal: wKcal === '' ? null : Number(wKcal),
      note: wNote || null
    };
    const { error } = await supabase.from('workout_logs').insert(row);
    if (error) return alert(error.message);
    setWMinutes(''); setWKcal(''); setWNote('');
    const { data } = await supabase.from('workout_logs').select('*').eq('user_id', session.user.id).eq('day', today).order('inserted_at', { ascending: false });
    setWorkEntries(data ?? []);
  }

  if (!session) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">Sign in</h1>
        <p className="text-sm mb-3">Use your email. We’ll send a magic link (no password).</p>
        <div className="flex gap-2">
          <input className="border px-3 py-2 rounded w-full" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <button className="border px-4 py-2 rounded" onClick={signInMagic} disabled={sending}>{sending?'Sending…':'Send link'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Daily tracker</h1>
        <button className="border px-3 py-1 rounded" onClick={signOut}>Sign out</button>
      </div>

      <section className="border rounded p-4 bg-white mb-4">
        <h2 className="font-semibold mb-2">Profile</h2>
        <div className="grid md:grid-cols-3 gap-2">
          <label className="text-sm">Display name
            <input className="border w-full rounded px-3 py-2" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
          </label>
          <label className="text-sm">Daily kcal target
            <input type="number" className="border w-full rounded px-3 py-2" value={dailyTarget} onChange={e=>setDailyTarget(e.target.value===''?'':Number(e.target.value))} />
          </label>
          <div className="flex items-end">
            <button className="border px-3 py-2 rounded w-full" onClick={saveProfile}>Save</button>
          </div>
        </div>
      </section>

      <section className="border rounded p-4 bg-white mb-4">
        <h2 className="font-semibold">Calories for {today}</h2>
        <p className="text-sm mb-2">Total: <b>{totalCal}</b> kcal {remaining!==null && <span>· Remaining: <b>{remaining}</b> kcal</span>}</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input type="number" placeholder="kcal" className="border rounded px-3 py-2" value={calAmount} onChange={e=>setCalAmount(e.target.value===''?'':Number(e.target.value))}/>
          <input placeholder="note (optional)" className="border rounded px-3 py-2 w-64" value={calNote} onChange={e=>setCalNote(e.target.value)} />
          <button className="border px-3 py-2 rounded" onClick={addCalories}>Add</button>
        </div>
        <ul className="text-sm space-y-1">
          {calEntries.map(r=> (<li key={r.id}>• {r.calories} kcal {r.note?`— ${r.note}`:''}</li>))}
        </ul>
      </section>

      <section className="border rounded p-4 bg-white">
        <h2 className="font-semibold">Workout for {today}</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input className="border rounded px-3 py-2" value={wType} onChange={e=>setWType(e.target.value)} />
          <input type="number" placeholder="minutes" className="border rounded px-3 py-2 w-28" value={wMinutes} onChange={e=>setWMinutes(e.target.value===''?'':Number(e.target.value))} />
          <input type="number" placeholder="kcal (optional)" className="border rounded px-3 py-2 w-32" value={wKcal} onChange={e=>setWKcal(e.target.value===''?'':Number(e.target.value))} />
          <input placeholder="note" className="border rounded px-3 py-2 w-64" value={wNote} onChange={e=>setWNote(e.target.value)} />
          <button className="border px-3 py-2 rounded" onClick={addWorkout}>Add</button>
        </div>
        <ul className="text-sm space-y-1">
          {workEntries.map(r=> (<li key={r.id}>• {r.type} {r.minutes?`— ${r.minutes} min`:''} {r.kcal?`— ${r.kcal} kcal`:''} {r.note?`— ${r.note}`:''}</li>))}
        </ul>
      </section>
    </div>
  );
}
