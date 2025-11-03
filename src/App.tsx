import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext';
import HouseholdGate from './components/HouseholdGate';
import SyncStatus from './components/SyncStatus';

function Inner() {
  const { code } = useHousehold();
  return (
    <div style={{ padding: 24, background: '#fff', color: '#111', fontFamily: 'system-ui, sans-serif' }}>
      {code ? (
        <>
          <SyncStatus />
          <h2>Welcome 👋</h2>
          <p>Phase 1 is online.</p>
        </>
      ) : (
        <HouseholdGate />
      )}
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
