import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SiteLayout from './components/SiteLayout';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteLayout>
      {({ account, connectedWallet }) => (
        <App account={account} connectedWallet={connectedWallet} />
      )}
    </SiteLayout>
  </StrictMode>,
);
