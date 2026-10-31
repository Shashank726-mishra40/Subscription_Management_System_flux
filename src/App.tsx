import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { AppRoutes } from './routes/AppRoutes';
import { BillingService } from './services/billingService';

export const App: React.FC = () => {
  useEffect(() => {
    // Start automated recurring billing background daemon (evaluates every 30s)
    BillingService.startBackgroundScheduler(30000);
    return () => {
      BillingService.stopBackgroundScheduler();
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <AppRoutes />
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
