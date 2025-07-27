import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getWallets } from '@massalabs/wallet-provider';
import { WalletContext } from '../contexts/WalletContext';
import '@ant-design/v5-patch-for-react-19';
import { formatMas } from '@massalabs/massa-web3';

export default function Web3Provider({ children }) {
  const [mounted, setMounted] = useState(false);
  const [account, setAccount] = useState(null); // This will be the full account object
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWallets();
    checkExistingConnection();
    setMounted(true);
  }, []);

  const loadWallets = async () => {
    try {
      const wallets = await getWallets();
      setAvailableWallets(wallets || []);
      console.log('Available wallets:', wallets);
    } catch (error) {
      console.error('Error loading wallets:', error);
      message.error('Failed to load available wallets');
    }
  };

  const checkExistingConnection = async () => {
    setLoading(true);
    try {
      const wallets = await getWallets();
      if (wallets && wallets.length > 0) {
        // Check if any wallet is already connected
        for (const wallet of wallets) {
          const accounts = await wallet.accounts();
          if (accounts && accounts.length > 0) {
            const primaryAccount = accounts[0];
            // fetch balance and add property to account
            const balance = await primaryAccount.balance(true);
            const balanceString = `${formatMas(balance || 0n)} MAS`;
            primaryAccount.balanceString = balanceString; // Add balance to account object
            // fetch network info
            const networkInfos = await primaryAccount.networkInfos();
            primaryAccount.networkName = networkInfos?.name || '';
            primaryAccount.chainId = networkInfos?.chainId || '';
            setAccount(primaryAccount); // Store the account object
            setConnectedWallet(wallet);
            console.log('Found existing connection:', primaryAccount);
            break;
          }
        }
      }
    } catch {
      console.log('No existing wallet connection found');
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async (walletIndex = 0) => {
    if (availableWallets.length === 0) {
      message.error(
        'No wallets available. Please install a compatible Massa wallet extension.',
      );
      return false;
    }

    if (walletIndex >= availableWallets.length) {
      message.error('Selected wallet is not available');
      return false;
    }

    setLoading(true);

    try {
      const wallet = availableWallets[walletIndex];
      const walletName = wallet.name() || 'Unknown Wallet';
      console.log(`Attempting to connect to wallet: ${walletName}`);

      // Check if wallet is already connected
      const existingAccounts = await wallet.accounts();
      if (existingAccounts && existingAccounts.length > 0) {
        const primaryAccount = existingAccounts[0];
        // fetch balance and add property to account
        const balance = await primaryAccount.balance(true);
        const balanceString = `${formatMas(balance || 0n)} MAS`;
        primaryAccount.balanceString = balanceString; // Add balance to account object
        // fetch network info
        const networkInfos = await primaryAccount.networkInfos();
        primaryAccount.networkName = networkInfos?.name || '';
        primaryAccount.chainId = networkInfos?.chainId || '';
        setAccount(primaryAccount); // Store the account object
        setConnectedWallet(wallet);
        message.success(`Already connected to ${walletName}!`);
        console.log('Using existing connection:', primaryAccount);
        return true;
      }

      // Attempt new connection
      const connected = await wallet.connect();

      if (connected) {
        const accounts = await wallet.accounts();

        if (accounts && accounts.length > 0) {
          const primaryAccount = accounts[0];
          // fetch network info
          const networkInfos = await primaryAccount.networkInfos();
          primaryAccount.networkName = networkInfos?.name || '';
          primaryAccount.chainId = networkInfos?.chainId || '';
          setAccount(primaryAccount); // Store the account object
          setConnectedWallet(wallet);

          message.success(`Successfully connected to ${walletName}!`);
          console.log('New connection established:', primaryAccount);
          return true;
        } else {
          message.error('No accounts found in the connected wallet');
          await wallet.disconnect().catch(console.error);
          return false;
        }
      } else {
        message.error('Failed to connect to the wallet. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Wallet connection error:', error);

      // More specific error messages
      if (error.message?.includes('User rejected')) {
        message.warning('Connection cancelled by user');
      } else if (error.message?.includes('already pending')) {
        message.warning(
          'Connection already in progress. Please check your wallet.',
        );
      } else {
        message.error(
          `Failed to connect wallet: ${error.message || 'Unknown error'}`,
        );
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (!connectedWallet) {
      message.warning('No wallet is currently connected');
      return false;
    }

    setLoading(true);

    try {
      const walletName = connectedWallet.name() || 'wallet';

      // Clear state first to provide immediate feedback
      setAccount(null);
      setConnectedWallet(null);

      // Then attempt to disconnect from the wallet
      const disconnected = await connectedWallet.disconnect();

      if (disconnected) {
        message.success(`${walletName} disconnected successfully!`);
        console.log('Wallet disconnected successfully');
      } else {
        message.warning(`${walletName} may still be connected in background`);
      }
      return true;
    } catch (error) {
      console.error('Wallet disconnection error:', error);

      // Even if disconnect fails, we've cleared our local state
      message.warning(
        'Local connection cleared. You may need to disconnect manually from your wallet.',
      );
      return true;
    } finally {
      setLoading(false);
    }
  };

  const contextValue = {
    account,
    connectedWallet,
    availableWallets,
    loading,
    connectWallet,
    disconnectWallet,
    isConnected: !!account,
  };

  return (
    <WalletContext value={contextValue}>{mounted && children}</WalletContext>
  );
}
