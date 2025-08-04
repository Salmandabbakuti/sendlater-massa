import { useEffect, useState } from 'react';
import { useAccountStore } from '@massalabs/react-ui-kit';
import '@ant-design/v5-patch-for-react-19';
import { getWallets } from '@massalabs/wallet-provider';
import { message } from 'antd';

export default function Web3Provider({ children }) {
  const [mounted, setMounted] = useState(false);

  const { setWallets, setCurrentWallet } = useAccountStore();

  const initializeWallets = async () => {
    try {
      const availableWallets = await getWallets();
      setWallets(availableWallets || []);

      // Check for existing connections
      if (availableWallets && availableWallets.length > 0) {
        for (const wallet of availableWallets) {
          try {
            const accounts = await wallet.accounts();
            if (accounts && accounts.length > 0) {
              // Found an existing connection, set it as current
              await setCurrentWallet(wallet, accounts[0]);
              console.log('Found existing wallet connection:', wallet.name());
              break;
            }
          } catch {
            // Wallet not connected, continue checking others
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Error initializing wallets:', error);
      message.error('Failed to initialize wallet system');
    }
  };

  useEffect(() => {
    initializeWallets();
    setMounted(true);
  }, []);

  return mounted && children;
}
