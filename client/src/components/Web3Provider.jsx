import { useEffect } from 'react';
import { useAccountStore } from '@massalabs/react-ui-kit';
import '@ant-design/v5-patch-for-react-19';
import { message, ConfigProvider, theme } from 'antd';

export default function Web3Provider({ children }) {
  const { setCurrentWallet, wallets } = useAccountStore();

  const initializeWallets = async () => {
    try {
      // Check for existing connections
      for (const wallet of wallets) {
        try {
          const accounts = await wallet.accounts();
          if (accounts && accounts.length > 0) {
            // Found an existing connection, set it as current
            await setCurrentWallet(wallet, accounts[0]);
            console.log('Found existing wallet connection:', wallet.name());
            break;
          }
        } catch (error) {
          // Wallet not connected, continue checking others
          console.error(
            `Error checking accounts for wallet ${wallet.name()}:`,
            error,
          );
          continue;
        }
      }
    } catch (error) {
      console.error('Error initializing wallets:', error);
      message.error('Failed to initialize wallets. Please try again later.');
    }
  };

  useEffect(() => {
    initializeWallets();
  }, [wallets]);

  return (
    <ConfigProvider theme={theme.defaultAlgorithm}>{children}</ConfigProvider>
  );
}
