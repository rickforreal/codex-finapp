import { useEffect } from 'react';

import { fetchHealth } from './api/healthApi';
import { AppShell } from './components/layout/AppShell';

const App = () => {
  useEffect(() => {
    void fetchHealth()
      .then((response) => {
        console.info(response);
      })
      .catch((error: unknown) => {
        console.warn('Health check failed', error);
      });
  }, []);

  return <AppShell />;
};

export default App;
