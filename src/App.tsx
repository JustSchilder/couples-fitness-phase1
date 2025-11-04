import { useState } from 'react';
import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext';
import HouseholdGate from './components/HouseholdGate';
import SyncStatus from './components/SyncStatus';
import WorkoutLog from './components/WorkoutLog';
import MealLog from './components/MealLog';
import BodyStats from './components/BodyStats';

function Dashboard() {
  const [tab, setTab] = useState<'workouts' | 'meals' | 'stats'>('workouts');

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: '0 auto' }}>
      <SyncStatus />
      <nav style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {(['workouts', 'meals', 'stats'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid #ddd',
              background: tab === t ? '#222' : '#f4f4f4',
              color: tab === t ? 'white' : 'black',
              cursor: 'pointer',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </nav>

      {tab === 'workouts' && <WorkoutLog />}
      {tab === 'meals' && <MealLog />}
      {tab === 'stats' && <BodyStats />}
    </div>
  );
}

function Inner() {
  const { code } = useHousehold();
  return (
    <div style={{ padding: 8, background: '#fff', color: '#111', fontFamily: 'system-ui, sans-serif' }}>
      {code ? <Dashboard /> : <HouseholdGate />}
    </div>
  );
}

export default function App() {
  return (
    <HouseholdProvider>
      <Inner />
    </HouseholdProvider>
  );
}
