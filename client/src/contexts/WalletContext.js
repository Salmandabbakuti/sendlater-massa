import { createContext } from 'react';

// Create wallet context
export const WalletContext = createContext({
  account: null,
  connectedWallet: null,
  availableWallets: [],
  loading: false,
  connectWallet: () => {},
  disconnectWallet: () => {},
  isConnected: false,
});
