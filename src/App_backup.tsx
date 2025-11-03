// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';

// Couples Fitness & Diet Planner - v5.2 (StackBlitz-safe, styled)
// - Tabs: Profiles / Diet / Workouts
// - Profile sub-tabs: You / Partner
// - Day selector on Diet & Workouts
// - Macros + cheat buffer
// - Peanut butter added
// - Inline styles for mint highlight + fixed paddings (works without Tailwind JIT)

/* ----------------- Helpers (no regex literals, no "\n" in strings) ----------------- */
function round(n, dp = 0) { const f = Math.pow(10, dp); return Math.round(n * f) / f; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// No regex literals and no "\n" escapes anywhere.
function csvNeedsQuotes(v) {
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c === ',' || c === '"' || c === '\n') return true;
  }
  return false;
}
function csvEscape(value) {
  const s = String(value ?? '');
  return csvNeedsQuotes(s) ? '"' + s.split('"').join('""') + '"' : s;
}
function downloadCSV(filename, rows) {
  const NL = String.fromCharCode(10); // newline without using "\n" literal
  const csv = rows.map(r => r.map(csvEscape).join(',')).join(NL);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function choice(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------- Energy formulas -----------------
const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9 };
function mifflin({ sex, weightKg, heightCm, age }){ return 10*weightKg + 6.25*heightCm - 5*age + (sex === 'male' ? 5 : -161); }
function katch(leanKg){ return 370 + 21.6 * leanKg; }
function leanMassKg(weightKg, bfPct){ if(bfPct === '' || bfPct == null) return null; const bf = Number(bfPct); if(!(bf > 0 && bf < 60)) return null; return weightKg*(1-bf/100); }
function tdeeFromProfile(p){ const lm = leanMassKg(p.weightKg, p.bodyFatPct); const bmr = lm ? katch(lm) : mifflin(p); const tdee = bmr * ACTIVITY[p.activity]; return { bmr, tdee }; }
function goalCalories(tdee, goal){ if(goal === 'cut') return tdee*0.8; if(goal === 'bulk') return tdee*1.1; return tdee; }
function macroTargets(profile){ const w = profile.weightKg; const g = profile.goal; const protein = g==='cut' ? 2.0*w : g==='bulk' ? 1.8*w : 1.8*w; const fat = 0.8*w; return { protein, fat }; }

// ----------------- Defaults -----------------
const DEFAULT_YOU = { name:'You', sex:'female', age:30, heightCm:170, weightKg:65, bodyFatPct:'', activity:'moderate', goal:'cut' };
const DEFAULT_HIM = { name:'Partner', sex:'male', age:32, heightCm:180, weightKg:78, bodyFatPct:'', activity:'light', goal:'recomp' };

// ----------------- Nutrition DB (kcal per gram unless noted) -----------------
const NDB = {
  oats: { kcal:3.8, p:0.135, c:0.62, f:0.07 },
  '7-granenontbijt': { kcal:3.6, p:0.11, c:0.72, f:0.05 },
  'muesli krokant 4 noten': { kcal:4.3, p:0.09, c:0.65, f:0.17 },
  milk: { kcal:0.64, p:0.033, c:0.05, f:0.036 },
  yoghurt: { kcal:0.6, p:0.036, c:0.047, f:0.032 },
  'cottage cheese': { kcal:0.85, p:0.11, c:0.03, f:0.02 },
  bread: { kcal:2.5/30, p:0.03, c:0.12, f:0.015 },
  'young cheese': { kcal:4.0, p:0.25, c:0.02, f:0.33 },
  butter: { kcal:7.2, p:0.01, c:0.0, f:0.81 },
  'peanut butter': { kcal:5.9, p:0.25, c:0.20, f:0.50 },
  'chicken breast': { kcal:1.1, p:0.23, c:0.0, f:0.02 },
  'chicken drumsticks': { kcal:1.9, p:0.20, c:0.0, f:0.13 },
  salmon: { kcal:2.1, p:0.20, c:0.0, f:0.13 },
  'white fish (koolvis)': { kcal:0.8, p:0.18, c:0.0, f:0.01 },
  'tuna (canned)': { kcal:150, p:30, c:0, f:2 },
  egg: { kcal:78, p:6.5, c:0.6, f:5.3 },
  'white rice (raw)': { kcal:3.6, p:0.07, c:0.80, f:0.01 },
  'rice noodles (raw)': { kcal:3.6, p:0.07, c:0.80, f:0.01 },
  'wheat noodles (raw)': { kcal:3.5, p:0.12, c:0.72, f:0.02 },
  'wholewheat pasta (raw)': { kcal:3.5, p:0.12, c:0.71, f:0.02 },
  'potato (raw)': { kcal:0.77, p:0.02, c:0.17, f:0.0 },
  'sweet potato (raw)': { kcal:0.86, p:0.015, c:0.20, f:0.0 },
  pumpkin: { kcal:0.26, p:0.01, c:0.06, f:0.0 },
  broccoli: { kcal:0.35, p:0.028, c:0.07, f:0.004 },
  spinach: { kcal:0.23, p:0.029, c:0.036, f:0.004 },
  'Chinese cabbage': { kcal:0.16, p:0.009, c:0.03, f:0.002 },
  courgette: { kcal:0.17, p:0.012, c:0.035, f:0.003 },
  paprika: { kcal:0.31, p:0.01, c:0.06, f:0.003 },
  tomato: { kcal:0.18, p:0.009, c:0.039, f:0.002 },
  snijbonen: { kcal:0.31, p:0.018, c:0.05, f:0.002 },
  sperziebonen: { kcal:0.31, p:0.018, c:0.05, f:0.002 },
  carrots: { kcal:0.41, p:0.009, c:0.10, f:0.002 },
  champignons: { kcal:0.22, p:0.031, c:0.03, f:0.003 },
  cucumber: { kcal:0.16, p:0.007, c:0.037, f:0.001 },
  apple: { kcal:95, p:0.3, c:25, f:0.3 },
  pear: { kcal:100, p:0.4, c:27, f:0.2 },
  orange: { kcal:62, p:1.2, c:15.4, f:0.2 },
  grapes: { kcal:0.69, p:0.006, c:0.18, f:0.0 },
  nuts: { kcal:6.0, p:0.20, c:0.20, f:0.55 },
};

function macroForIngredient(ing){
  const { item, qty, unit } = ing; const key = item.toLowerCase(); const rec = NDB[key]; if(!rec) return { kcal:0,p:0,c:0,f:0 };
  if(unit==='g' || unit==='ml'){ return { kcal: rec.kcal*qty, p: (rec.p||0)*qty, c: (rec.c||0)*qty, f: (rec.f||0)*qty }; }
  if(unit==='slice'){ if(key==='bread'){ const grams=30*qty; const perG=NDB['bread']; return { kcal: perG.kcal*grams, p: perG.p*grams, c: perG.c*grams, f: perG.f*grams }; } }
  if(unit==='pcs'){
    if(key==='egg' || key==='apple' || key==='pear' || key==='orange') return { kcal: rec.kcal*qty, p:(rec.p||0)*qty, c:(rec.c||0)*qty, f:(rec.f||0)*qty };
  }
  if(unit==='can' && key==='tuna (canned)'){ return { kcal: rec.kcal*qty, p: rec.p*qty, c: rec.c*qty, f: rec.f*qty }; }
  return { kcal:0,p:0,c:0,f:0 };
}

// ----------------- Recipes -----------------
const BREAKFAST_YOU = [
  { name:'Oats + milk + egg', ingredients:[{item:'oats',qty:55,unit:'g',for:'you'},{item:'milk',qty:220,unit:'ml',for:'you'},{item:'egg',qty:1,unit:'pcs',for:'you'}]},
  { name:'7-granenontbijt + milk', ingredients:[{item:'7-granenontbijt',qty:60,unit:'g',for:'you'},{item:'milk',qty:220,unit:'ml',for:'you'}]},
  { name:'Muesli krokant + milk', ingredients:[{item:'muesli krokant 4 noten',qty:55,unit:'g',for:'you'},{item:'milk',qty:220,unit:'ml',for:'you'}]},
  { name:'Oats + milk + peanut butter', ingredients:[{item:'oats',qty:50,unit:'g',for:'you'},{item:'milk',qty:220,unit:'ml',for:'you'},{item:'peanut butter',qty:20,unit:'g',for:'you'}]},
];
const BREAKFAST_HIM = [ { name:'Bread + butter + young cheese', ingredients:[{item:'bread',qty:4,unit:'slice',for:'him'},{item:'butter',qty:10,unit:'g',for:'him'},{item:'young cheese',qty:40,unit:'g',for:'him'}] } ];
const SNACK_POOL = [
  { name:'Apple / Pear', ingredients:[{item:'apple',qty:1,unit:'pcs',for:'you'},{item:'pear',qty:1,unit:'pcs',for:'him'}]},
  { name:'Yoghurt + nuts', ingredients:[{item:'yoghurt',qty:150,unit:'g',for:'you'},{item:'yoghurt',qty:200,unit:'g',for:'him'},{item:'nuts',qty:15,unit:'g',for:'you'},{item:'nuts',qty:15,unit:'g',for:'him'}]},
  { name:'Cottage cheese + nuts', ingredients:[{item:'cottage cheese',qty:150,unit:'g',for:'you'},{item:'cottage cheese',qty:200,unit:'g',for:'him'},{item:'nuts',qty:15,unit:'g',for:'you'},{item:'nuts',qty:15,unit:'g',for:'him'}]},
  { name:'Orange / Grapes', ingredients:[{item:'orange',qty:1,unit:'pcs',for:'you'},{item:'grapes',qty:150,unit:'g',for:'him'}]},
  { name:'Apple + peanut butter (you)', ingredients:[{item:'apple',qty:1,unit:'pcs',for:'you'},{item:'peanut butter',qty:15,unit:'g',for:'you'}]},
];
const LUNCH_POOL = [
  { name:'Chicken + rice + broccoli', split:true, ingredients:[{item:'chicken breast',qty:220,unit:'g'},{item:'white rice (raw)',qty:160,unit:'g'},{item:'broccoli',qty:220,unit:'g'}]},
  { name:'White fish + rice noodles + Chinese cabbage', split:true, ingredients:[{item:'white fish (koolvis)',qty:260,unit:'g'},{item:'rice noodles (raw)',qty:150,unit:'g'},{item:'Chinese cabbage',qty:220,unit:'g'}]},
  { name:'Chicken + noodles stir fry', split:true, ingredients:[{item:'chicken breast',qty:260,unit:'g'},{item:'wheat noodles (raw)',qty:170,unit:'g'},{item:'champignons',qty:150,unit:'g'},{item:'paprika',qty:150,unit:'g'},{item:'spinach',qty:150,unit:'g'}]},
  { name:'Tuna salad bowl', split:true, ingredients:[{item:'tuna (canned)',qty:1,unit:'can'},{item:'cucumber',qty:200,unit:'g'},{item:'tomato',qty:200,unit:'g'},{item:'feta',qty:60,unit:'g'}]},
];
const DINNER_POOL = [
  { name:'Salmon + potatoes + spinach', split:true, ingredients:[{item:'salmon',qty:320,unit:'g'},{item:'potato (raw)',qty:420,unit:'g'},{item:'spinach',qty:260,unit:'g'}]},
  { name:'Chicken drumsticks + sweet potato + veg', split:true, ingredients:[{item:'chicken drumsticks',qty:360,unit:'g'},{item:'sweet potato (raw)',qty:420,unit:'g'},{item:'courgette',qty:160,unit:'g'},{item:'paprika',qty:160,unit:'g'}]},
  { name:'Chicken breast + pumpkin + snijbonen', split:true, ingredients:[{item:'chicken breast',qty:320,unit:'g'},{item:'pumpkin',qty:420,unit:'g'},{item:'snijbonen',qty:260,unit:'g'}]},
  { name:'White fish + tomato/courgette + beans', split:true, ingredients:[{item:'white fish (koolvis)',qty:280,unit:'g'},{item:'courgette',qty:160,unit:'g'},{item:'tomato',qty:160,unit:'g'},{item:'sperziebonen',qty:220,unit:'g'}]},
];

// ----------------- Meal generation & scaling -----------------
function foldMacros(a,b){ return { kcal:a.kcal+b.kcal, p:a.p+b.p, c:a.c+b.c, f:a.f+b.f }; }
function macroForRecipe(recipe, youShare){ let total = {kcal:0,p:0,c:0,f:0}, you = {kcal:0,p:0,c:0,f:0}, him = {kcal:0,p:0,c:0,f:0}; (recipe.ingredients||[]).forEach(ing=>{ const m = macroForIngredient(ing); const shared = !ing.for; if(shared){ const ys = youShare; const hs = 1-ys; const yp = {kcal:m.kcal*ys,p:m.p*ys,c:m.c*ys,f:m.f*ys}; const hp = {kcal:m.kcal*hs,p:m.p*hs,c:m.c*hs,f:m.f*hs}; you = foldMacros(you, yp); him = foldMacros(him, hp); total = foldMacros(total, m); } else if(ing.for==='you'){ you = foldMacros(you, m); total = foldMacros(total, m); } else if(ing.for==='him'){ him = foldMacros(him, m); total = foldMacros(total, m); } }); return {total, you, him}; }
function kcalForRecipe(recipe, youShare){ const m = macroForRecipe(recipe, youShare); return { total:m.total.kcal, you:m.you.kcal, him:m.him.kcal }; }
function scaleRecipe(recipe, factor){ return { ...recipe, ingredients:(recipe.ingredients||[]).map(ing=>({ ...ing, qty: (!ing.for ? ing.qty*factor : ing.qty) })) }; }
function dayMacros(day, youShare){ return day.meals.reduce((acc,m)=>{ const k=macroForRecipe(m.recipe, youShare); return { you: foldMacros(acc.you,k.you), him: foldMacros(acc.him,k.him) }; }, {you:{kcal:0,p:0,c:0,f:0}, him:{kcal:0,p:0,c:0,f:0}}); }
function buildDay({ rng }){ const bfy = choice(BREAKFAST_YOU, rng); const bfh = choice(BREAKFAST_HIM, rng); const bf = { label:'Breakfast', recipe:{ name: bfy.name + ' / ' + bfh.name, ingredients:[...bfy.ingredients, ...bfh.ingredients] } }; const s1 = { label:'Snack 1', recipe: choice(SNACK_POOL, rng) }; const lunchBase = choice(LUNCH_POOL, rng); const s2 = { label:'Snack 2', recipe: choice(SNACK_POOL, rng) }; const dinnerBase = choice(DINNER_POOL, rng); return { meals:[ bf, s1, {label:'Lunch', recipe:lunchBase}, s2, {label:'Dinner', recipe:dinnerBase} ] }; }
function autoScaleDay(day, youShare, youTarget, himTarget){ const base = dayMacros(day, youShare); const youErr = youTarget / Math.max(1, base.you.kcal); const himErr = himTarget / Math.max(1, base.him.kcal); const factor = clamp((youErr + himErr)/2, 0.85, 1.25); const scaledMeals = day.meals.map(m => (m.label==='Lunch' || m.label==='Dinner') ? ({ ...m, recipe: scaleRecipe(m.recipe, factor) }) : m); return { ...day, meals: scaledMeals }; }
function generateWeek(seed, youShare, youTarget, himTarget){ const rng = mulberry32(seed); const days=[]; for(let i=0;i<7;i++){ let d=buildDay({rng}); d=autoScaleDay(d, youShare, youTarget, himTarget); days.push(d);} return days; }

// ----------------- Workouts -----------------
const WORKOUTS = {
  A: { title:'Full-Body A', strength:[ { ex:'Goblet Squat', sets:4, reps:'8-10', rest:'90s' }, { ex:'DB Bench / Floor Press', sets:4, reps:'8-10', rest:'90s' }, { ex:'One-Arm DB Row (each)', sets:4, reps:'10', rest:'60s' }, { ex:'DB Romanian Deadlift', sets:3, reps:'12', rest:'90s' }, { ex:'Plank', sets:3, reps:'45s', rest:'45s' }, ] },
  B: { title:'Full-Body B', strength:[ { ex:'Split Squat (each)', sets:3, reps:'10', rest:'60-75s' }, { ex:'DB Overhead Press', sets:4, reps:'8-10', rest:'90s' }, { ex:'Renegade Row', sets:3, reps:'10', rest:'60s' }, { ex:'Hip Thrust (DB on hips)', sets:3, reps:'12', rest:'90s' }, { ex:'Side Plank (each)', sets:3, reps:'30s', rest:'45s' }, ] },
  C: { title:'Full-Body C', strength:[ { ex:'Step-Ups (each)', sets:3, reps:'10', rest:'60s' }, { ex:'Incline Push-Ups (feet up)', sets:4, reps:'12', rest:'60s' }, { ex:'DB Deadlift', sets:4, reps:'8', rest:'90s' }, { ex:'DB Curl', sets:3, reps:'12', rest:'60s' }, { ex:'Russian Twists (total)', sets:3, reps:'20', rest:'45s' }, ] },
  HIIT: { title:'Cardio / HIIT', cardioBlocks:[ { type:'Rowing Intervals', detail:'10 x (1 min hard / 1 min easy)', minutes:20 }, { type:'Bodyweight HIIT', detail:'4 rounds: Jump Squats 15, Push-Ups 12, DB Thrusters 12, Mountain Climbers 30s, Rest 60s', minutes:20 }, ], steady:{ type:'Rowing steady', minutes:40 } },
  REST: { title:'Rest / Walk' }
};

// ----------------- UI -----------------
function NumberField({ label, value, onChange, step=1, min, max, suffix }) {
  return (
    <label className='flex flex-col gap-1'>
      <span className='text-sm text-slate-600'>{label}</span>
      <div className='flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 bg-white shadow-sm'>
        <input type='number' value={value} onChange={(e)=>onChange(Number(e.target.value))} step={step} min={min} max={max} className='w-full outline-none'/>
        {suffix && <span className='text-slate-500 text-sm'>{suffix}</span>}
      </div>
    </label>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <label className='flex flex-col gap-1'>
      <span className='text-sm text-slate-600'>{label}</span>
      <select value={value} onChange={(e)=>onChange(e.target.value)} className='rounded-2xl border border-slate-200 px-4 py-2 bg-white shadow-sm'>
        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}
function ProfileCard({ title, p, setP }) {
  const { bmr, tdee } = useMemo(()=> tdeeFromProfile(p), [p]);
  const target = useMemo(()=> goalCalories(tdee, p.goal), [tdee, p.goal]);
  const mt = useMemo(()=> macroTargets(p), [p]);
  const carbsG = useMemo(()=> {
    const fatK=mt.fat*9; const protK=mt.protein*4; const remain=Math.max(0, target-fatK-protK); return remain/4;
  }, [mt, target]);

  return (
    <div className='rounded-2xl border p-5 bg-white shadow-sm space-y-3'>
      <h3 className='font-semibold text-lg'>{title}</h3>
      <div className='grid md:grid-cols-3 gap-3'>
        <label className='flex flex-col gap-1'><span className='text-sm text-slate-600'>Name</span><input value={p.name} onChange={e=>setP({...p,name:e.target.value})} className='rounded-2xl border px-4 py-2'/></label>
        <SelectField label='Sex' value={p.sex} onChange={v=>setP({...p,sex:v})} options={[{value:'female',label:'Female'},{value:'male',label:'Male'}]} />
        <SelectField label='Activity' value={p.activity} onChange={v=>setP({...p,activity:v})} options={[{value:'sedentary',label:'Sedentary'},{value:'light',label:'Light (1-3x/wk)'},{value:'moderate',label:'Moderate (3-5x/wk)'},{value:'active',label:'Active (6-7x/wk)'},{value:'veryActive',label:'Very active'}]} />
        <NumberField label='Age' value={p.age} onChange={v=>setP({...p,age:v})} min={12} max={90} />
        <NumberField label='Height' value={p.heightCm} onChange={v=>setP({...p,heightCm:v})} min={120} max={220} suffix='cm' />
        <NumberField label='Weight' value={p.weightKg} onChange={v=>setP({...p,weightKg:v})} min={30} max={200} step={0.1} suffix='kg' />
        <NumberField label='Body fat % (optional)' value={p.bodyFatPct === '' ? 0 : p.bodyFatPct} onChange={v=>setP({...p,bodyFatPct: v || ''})} min={0} max={60} step={0.5} suffix='%' />
        <SelectField label='Goal' value={p.goal} onChange={v=>setP({...p,goal:v})} options={[{value:'cut',label:'Cut'},{value:'recomp',label:'Recomp'},{value:'bulk',label:'Bulk'}]} />
      </div>
      <div className='grid md:grid-cols-3 gap-3'>
        <div className='rounded-xl border p-4'><p className='text-sm'>BMR: <b>{round(bmr)}</b> kcal</p><p className='text-sm'>TDEE: <b>{round(tdee)}</b> kcal</p><p className='text-sm'>Goal calories: <b>{round(target)}</b> kcal</p></div>
        <div className='rounded-xl border p-4 text-sm'><p className='font-medium'>Daily macro targets</p><p>Protein: <b>{round(mt.protein)}</b> g</p><p>Fat: <b>{round(mt.fat)}</b> g</p><p>Carbs (auto): <b>{round(carbsG)}</b> g</p></div>
        <div className='text-xs text-slate-500 rounded-xl border p-4'>Estimates only; if body fat % is entered, Katch-McArdle is used for BMR.</div>
      </div>
    </div>
  );
}
function IngredientRow({ ing, youShare }) {
  const shared=!ing.for;
  const youQty = shared ? ing.qty*youShare : (ing.for==='you'?ing.qty:0);
  const himQty = shared ? ing.qty*(1-youShare) : (ing.for==='him'?ing.qty:0);
  return (
    <tr>
      <td className='py-1 pr-2 capitalize'>{ing.item}</td>
      <td className='py-1 pr-2 text-right'>{shared ? (round(ing.qty)+' '+ing.unit) : '-'}</td>
      <td className='py-1 pr-2 text-right'>{youQty ? (round(youQty)+' '+ing.unit) : '-'}</td>
      <td className='py-1 pr-2 text-right'>{himQty ? (round(himQty)+' '+ing.unit) : '-'}</td>
    </tr>
  );
}
function WorkoutBlock({ which, perPersonMinutes, youMinutes, himMinutes, nameYou, nameHim }) {
  if(which==='REST') return (<p className='text-sm text-slate-600'>Rest / 30 min easy walk</p>);
  if(which==='HIIT'){
    return (
      <div className='text-sm text-slate-700 space-y-1'>
        <p><b>Cardio / HIIT</b></p>
        <ul className='list-disc ml-5'>
          {WORKOUTS.HIIT.cardioBlocks.map((b,i)=>(<li key={i}>{b.type}: {b.detail} (~{b.minutes} min)</li>))}
        </ul>
        <p>Or steady rowing — {nameYou}: ~{youMinutes} min, {nameHim}: ~{himMinutes} min</p>
      </div>
    );
  }
  const W=WORKOUTS[which];
  return (
    <div className='text-sm text-slate-700 space-y-1'>
      <p><b>{W.title}</b> (adjust load by RPE 7–8)</p>
      <table className='text-sm'>
        <thead>
          <tr className='text-slate-500'><th className='pr-4 text-left'>Exercise</th><th className='pr-4 text-left'>Sets</th><th className='pr-4 text-left'>Reps/Time</th><th className='pr-4 text-left'>Rest</th></tr>
        </thead>
        <tbody>
          {W.strength.map((s,i)=>(<tr key={i}><td className='pr-4'>{s.ex}</td><td className='pr-4'>{s.sets}</td><td className='pr-4'>{s.reps}</td><td className='pr-4'>{s.rest}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
function DayCard({ index, day, youShare, workoutDetail, youTarget, himTarget, nameYou, nameHim }) {
  const macros = useMemo(()=> dayMacros(day, youShare), [day, youShare]);
  return (
    <div className='rounded-2xl border p-5 bg-white shadow-sm'>
      <h3 className='text-lg font-semibold mb-2'>Day {index+1}</h3>
      {day.meals.map((m,i)=>(
        <div key={i} className='mb-3'>
          <p className='font-medium text-slate-800'>{m.label}: <span className='font-normal text-slate-700'>{m.recipe.name}</span></p>
          {m.recipe.ingredients && m.recipe.ingredients.length ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm mt-2'>
                <thead>
                  <tr className='text-left text-slate-500'>
                    <th className='py-1 pr-2'>Ingredient</th>
                    <th className='py-1 pr-2 text-right'>Total</th>
                    <th className='py-1 pr-2 text-right'>{nameYou}</th>
                    <th className='py-1 pr-2 text-right'>{nameHim}</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recipe.ingredients.map((ing,k)=>(<IngredientRow key={k} ing={ing} youShare={youShare}/>))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ))}
      <div className='grid md:grid-cols-2 gap-3 border-t pt-3 text-sm'>
        <div>
          <p className='font-semibold'>Daily totals ({nameYou})</p>
          <p>{round(macros.you.kcal)} kcal · P {round(macros.you.p)} g · C {round(macros.you.c)} g · F {round(macros.you.f)} g (target {round(youTarget)} kcal)</p>
        </div>
        <div>
          <p className='font-semibold'>Daily totals ({nameHim})</p>
          <p>{round(macros.him.kcal)} kcal · P {round(macros.him.p)} g · C {round(macros.him.c)} g · F {round(macros.him.f)} g (target {round(himTarget)} kcal)</p>
        </div>
      </div>
      {workoutDetail && (<div className='mt-3'><p className='text-slate-700 font-semibold'>Workout</p>{workoutDetail}</div>)}
    </div>
  );
}
function aggregateGroceries(week){ const map=new Map(); const add=(key,unit,qty)=>{ const k=key.toLowerCase()+'|'+unit; map.set(k,(map.get(k)||0)+qty); }; week.forEach(d=> d.meals.forEach(m=> (m.recipe && m.recipe.ingredients || []).forEach(ing=> add(ing.item, ing.unit, ing.qty)))); return Array.from(map.entries()).map(([k,qty])=>{ const parts=k.split('|'); const item=parts[0]; const unit=parts[1]; return {item,unit,qty:round(qty)}; }).sort((a,b)=> a.item.localeCompare(b.item)); }

// ----------------- App -----------------
export default function CouplesPlanner(){
  const [you, setYou] = useState(DEFAULT_YOU);
  const [him, setHim] = useState(DEFAULT_HIM);
  const youEnergy = useMemo(()=>{ const {tdee} = tdeeFromProfile(you); return goalCalories(tdee, you.goal); }, [you]);
  const himEnergy = useMemo(()=>{ const {tdee} = tdeeFromProfile(him); return goalCalories(tdee, him.goal); }, [him]);
  const autoShare = useMemo(()=>{ const total=youEnergy+himEnergy; if(total<=0) return 0.5; return clamp(youEnergy/total, 0.3, 0.7); }, [youEnergy, himEnergy]);
  const [youShare, setYouShare] = useState(0.45); useEffect(()=>{ setYouShare(autoShare); }, [autoShare]);

  const [seed, setSeed] = useState(12345);
  const [week, setWeek] = useState(()=> generateWeek(seed, youShare, youEnergy, himEnergy));
  useEffect(()=>{ setWeek(generateWeek(seed, youShare, youEnergy, himEnergy)); }, [seed, youShare, youEnergy, himEnergy]);

  const [tab, setTab] = useState('profiles');
  const [profileTab, setProfileTab] = useState('you');
  const [dietDay, setDietDay] = useState(0);
  const [workoutDay, setWorkoutDay] = useState(0);

  const nameYou = (you.name || 'You').trim() || 'You';
  const nameHim = (him.name || 'Partner').trim() || 'Partner';

  const groceries = useMemo(()=> aggregateGroceries(week), [week]);
  function exportGroceryCSV(){ const rows = [['Item','Quantity','Unit']].concat(groceries.map(g=>[g.item,g.qty,g.unit])); downloadCSV('weekly_grocery_list.csv', rows); }

  const baseRowMin = 30; const totalGoal = youEnergy + himEnergy; const youRow = Math.round(baseRowMin * (youEnergy/totalGoal) * 2); const himRow = Math.round(baseRowMin * (himEnergy/totalGoal) * 2);
  const workoutMap = ['A','HIIT','B','REST','C','HIIT','REST'];

  const [cheatKcal, setCheatKcal] = useState(0); const kcalPerMinRow = 8; const extraRowYou = Math.ceil((cheatKcal*youShare)/kcalPerMinRow); const extraRowHim = Math.ceil((cheatKcal*(1-youShare))/kcalPerMinRow);

  // Styles for mint-green active buttons, plus 10px gaps fallback even without Tailwind JIT
  const mintOn = { backgroundColor:'#A7F3D0', borderColor:'#10B981', color:'#065F46', boxShadow:'0 1px 2px rgba(0,0,0,.08)' };
  const btnBase = { padding:'8px 16px', borderRadius:16, border:'1px solid #e5e7eb', background:'#fff', transition:'all .15s ease' };

  return (
    <div className='min-h-screen bg-slate-50 py-6' style={{paddingLeft:20, paddingRight:24}}>
      <div className='max-w-6xl mx-auto space-y-6'>
        <header className='flex items-center justify-between flex-wrap' style={{gap:10}}>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold'>Couples Fitness & Diet Planner</h1>
            <p className='text-slate-600'>Profiles, diet and workouts with portion split, macros, and cheat buffer.</p>
          </div>
          <div className='flex' style={{gap:10}}>
            <button onClick={()=>setSeed(Math.floor(Math.random()*1e9))} className='rounded-2xl border bg-white hover:shadow px-4 py-2'>Regenerate Week</button>
            <button onClick={exportGroceryCSV} className='rounded-2xl border bg-white hover:shadow px-4 py-2'>Export Grocery CSV</button>
          </div>
        </header>

        {/* Main tabs */}
        <nav className='flex' style={{gap:10}}>
          {['profiles','diet','workouts'].map(t => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={()=>setTab(t)}
                style={{...btnBase, ...(active? mintOn : {})}}
                className='border rounded-2xl'
                aria-pressed={active}
              >
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            );
          })}
        </nav>

        {tab==='profiles' && (
          <div className='space-y-4'>
            {/* Sub tabs */}
            <div className='flex' style={{gap:10}}>
              {[
                {k:'you', label:nameYou || 'You'},
                {k:'him', label:nameHim || 'Partner'}
              ].map(t => {
                const active = profileTab === t.k;
                return (
                  <button
                    key={t.k}
                    onClick={()=>setProfileTab(t.k)}
                    style={{...btnBase, padding:'6px 12px', ...(active? mintOn : {})}}
                    className='border rounded-xl'
                    aria-pressed={active}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {profileTab==='you' ? (<ProfileCard title='Your Profile' p={you} setP={setYou} />) : (<ProfileCard title='Partner Profile' p={him} setP={setHim} />)}

            <section className='rounded-2xl border p-5 bg-white shadow-sm flex items-center justify-between flex-wrap' style={{gap:10}}>
              <div>
                <p className='text-sm text-slate-700'>Portion split auto-derived from goal calories.</p>
                <p className='text-sm text-slate-600'>Auto split — {nameYou}: <b>{round(youShare*100)}</b>% | {nameHim}: <b>{round((1-youShare)*100)}</b>%</p>
              </div>
              <div className='rounded-2xl border px-4 py-2 bg-white shadow-sm'>
                <label className='text-sm text-slate-700'>Adjust manually: {round(youShare*100)}%
                  <input type='range' min={0.3} max={0.7} step={0.01} value={youShare} onChange={(e)=>setYouShare(Number(e.target.value))} className='ml-3 align-middle'/>
                </label>
              </div>
            </section>

            <section className='rounded-2xl border p-5 bg-white shadow-sm space-y-2'>
              <h3 className='font-semibold'>Cheat buffer</h3>
              <p className='text-sm text-slate-600'>Enter extra calories (beer/chips/wine etc.). We split by your current portion ratio and convert to next-day rowing minutes (assumes about {kcalPerMinRow} kcal per minute).</p>
              <div className='flex items-center flex-wrap' style={{gap:10}}>
                <input type='number' value={cheatKcal} onChange={e=>setCheatKcal(Number(e.target.value)||0)} className='rounded-2xl border px-4 py-2 w-40' placeholder='e.g., 350'/>
                <div className='text-sm text-slate-700'>{nameYou}: <b>{extraRowYou}</b> min · {nameHim}: <b>{extraRowHim}</b> min</div>
              </div>
              <p className='text-xs text-slate-500'>Examples: Leffe 330ml ~ 210 kcal; chips small bowl ~ 300 kcal; wine (150ml) ~ 120 kcal.</p>
            </section>
          </div>
        )}

        {tab==='diet' && (
          <div className='space-y-4'>
            <div className='flex items-center' style={{gap:10}}>
              <label className='text-sm'>Choose day</label>
              <select value={dietDay} onChange={e=>setDietDay(Number(e.target.value))} className='rounded-xl border px-3 py-2 bg-white'>
                {[0,1,2,3,4,5,6].map(i=> <option key={i} value={i}>Day {i+1}</option>)}
              </select>
            </div>
            <DayCard
              index={dietDay}
              day={week[dietDay]}
              youShare={youShare}
              youTarget={youEnergy}
              himTarget={himEnergy}
              nameYou={nameYou}
              nameHim={nameHim}
            />
          </div>
        )}

        {tab==='workouts' && (
          <div className='space-y-4'>
            <div className='flex items-center' style={{gap:10}}>
              <label className='text-sm'>Choose day</label>
              <select value={workoutDay} onChange={e=>setWorkoutDay(Number(e.target.value))} className='rounded-xl border px-3 py-2 bg-white'>
                {[0,1,2,3,4,5,6].map(i=> <option key={i} value={i}>Day {i+1} ({workoutMap[i]})</option>)}
              </select>
            </div>
            <div className='rounded-2xl border p-5 bg-white shadow-sm'>
              <h3 className='font-semibold mb-2'>Day {workoutDay+1} — {workoutMap[workoutDay]}</h3>
              <WorkoutBlock which={workoutMap[workoutDay]} perPersonMinutes={40} youMinutes={youRow} himMinutes={himRow} nameYou={nameYou} nameHim={nameHim} />
            </div>
          </div>
        )}

        <section className='rounded-2xl border p-5 bg-white shadow-sm'>
          <div className='flex items-center justify-between flex-wrap' style={{gap:10}}>
            <h2 className='text-lg font-semibold'>Weekly Grocery Totals</h2>
            <button onClick={exportGroceryCSV} className='px-4 py-2 rounded-2xl border hover:shadow bg-white'>Export CSV</button>
          </div>
          <div className='overflow-x-auto mt-3'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-slate-500'>
                  <th className='py-1 pr-2'>Item</th>
                  <th className='py-1 pr-2 text-right'>Quantity</th>
                  <th className='py-1 pr-2'>Unit</th>
                </tr>
              </thead>
              <tbody>
                {groceries.map((g, i) => (
                  <tr key={i}>
                    <td className='py-1 pr-2 capitalize'>{g.item}</td>
                    <td className='py-1 pr-2 text-right'>{g.qty}</td>
                    <td className='py-1 pr-2'>{g.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='text-xs text-slate-500 mt-2'>Quantities are approximate; rice and pasta shown as raw weights.</p>
        </section>

        <footer className='text-xs text-slate-500 pt-2'>
          <p>For planning only; not medical advice.</p>
        </footer>
      </div>
    </div>
  );
}
