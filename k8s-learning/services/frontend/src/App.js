import { useState, useCallback } from 'react';
import EnvironmentBanner from './components/EnvironmentBanner';
import HealthPanel from './components/HealthPanel';
import CreateOrderForm from './components/CreateOrderForm';
import OrdersList from './components/OrdersList';
import AlertsFeed from './components/AlertsFeed';
import Toast from './components/Toast';

function App() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  return (
    <div className="bg-cream min-h-screen">
      <EnvironmentBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <HealthPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <CreateOrderForm
              onSuccess={(msg) => showToast(msg, 'success')}
              onError={(msg) => showToast(msg, 'error')}
            />
            <OrdersList />
          </div>
          <AlertsFeed />
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
