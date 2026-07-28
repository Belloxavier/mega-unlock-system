import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center text-white">
        Cargando sistema...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <Dashboard />;
}

export default App;