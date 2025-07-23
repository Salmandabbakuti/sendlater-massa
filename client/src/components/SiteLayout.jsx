import { useState, useEffect } from 'react';
import { Layout, Button, message, Dropdown } from 'antd';
import {
  WalletOutlined,
  DisconnectOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { getWallets } from '@massalabs/wallet-provider';
import 'antd/dist/reset.css';

const { Header, Footer, Content } = Layout;

export default function SiteLayout({ children }) {
  const [account, setAccount] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load available wallets on component mount
  useEffect(() => {
    loadWallets();
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

  const handleConnectWallet = async (walletIndex = 0) => {
    if (availableWallets.length === 0) {
      message.error(
        'No wallets available. Please install a compatible Massa wallet (e.g., Metamask with Massa Snap).',
      );
      return;
    }

    if (walletIndex >= availableWallets.length) {
      message.error('Selected wallet is not available');
      return;
    }

    setLoading(true);

    try {
      const wallet = availableWallets[walletIndex];
      console.log(`Connecting to wallet: ${wallet.name || 'Unknown'}`);

      const connected = await wallet.connect();

      if (connected) {
        const accounts = await wallet.accounts();

        if (accounts && accounts.length > 0) {
          const primaryAccount = accounts[0];
          setAccount(primaryAccount.address);
          setConnectedWallet(wallet);

          message.success(
            `Connected to ${wallet.name || 'wallet'} successfully!`,
          );
          console.log('Connected account:', primaryAccount);
        } else {
          message.error('No accounts found in the connected wallet');
          await wallet.disconnect();
        }
      } else {
        message.error('Failed to connect to the wallet');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      message.error(
        `Failed to connect wallet: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    if (!connectedWallet) {
      message.warning('No wallet is currently connected');
      return;
    }

    setLoading(true);

    try {
      const disconnected = await connectedWallet.disconnect();

      if (disconnected) {
        setAccount(null);
        setConnectedWallet(null);
        message.success('Wallet disconnected successfully!');
        console.log('Wallet disconnected');
      } else {
        message.error('Failed to disconnect wallet');
      }
    } catch (error) {
      console.error('Wallet disconnection error:', error);
      message.error(
        `Failed to disconnect wallet: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Format address for display (show first 6 and last 4 characters)
  const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Create dropdown menu items for multiple wallets
  const walletMenuItems = availableWallets.map((wallet, index) => ({
    key: index.toString(),
    label: wallet.name() || `Wallet ${index + 1}`,
    icon: <WalletOutlined />,
    onClick: () => handleConnectWallet(index),
  }));

  const renderWalletButton = () => {
    if (account) {
      return (
        <Dropdown
          menu={{
            items: [
              {
                key: 'address',
                label: `Address: ${formatAddress(account)}`,
              },
              {
                key: 'wallet',
                label: `Wallet: ${connectedWallet?.name() || 'Unknown'}`,
              },
              {
                type: 'divider',
              },
              {
                key: 'disconnect',
                label: 'Disconnect',
                icon: <DisconnectOutlined />,
                onClick: handleDisconnectWallet,
                danger: true,
              },
            ],
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="primary"
            shape="round"
            size="large"
            loading={loading}
            icon={<WalletOutlined />}
          >
            {formatAddress(account)} <DownOutlined />
          </Button>
        </Dropdown>
      );
    }

    // If multiple wallets available, show dropdown
    if (availableWallets.length > 1) {
      return (
        <Dropdown
          menu={{ items: walletMenuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="primary"
            shape="round"
            size="large"
            loading={loading}
            icon={<WalletOutlined />}
          >
            Connect Wallet <DownOutlined />
          </Button>
        </Dropdown>
      );
    }

    // Single wallet or no wallets
    return (
      <Button
        type="primary"
        shape="round"
        size="large"
        loading={loading}
        icon={<WalletOutlined />}
        onClick={() => handleConnectWallet(0)}
        disabled={availableWallets.length === 0}
      >
        {availableWallets.length === 0 ? 'No Wallets' : 'Connect Wallet'}
      </Button>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 99,
          padding: 0,
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            textAlign: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '15px',
            margin: '0 12px',
          }}
        >
          Massa Starter
        </p>
        {renderWalletButton()}
      </Header>
      <Content
        style={{
          margin: '12px 8px',
          padding: 8,
          minHeight: '100%',
          color: 'black',
          maxHeight: '100%',
        }}
      >
        {children}
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        <a
          href="https://github.com/Salmandabbakuti"
          target="_blank"
          rel="noopener noreferrer"
        >
          ©{new Date().getFullYear()} Massa Starter. Powered by Massa
        </a>
        <p style={{ fontSize: '12px' }}>v0.0.2</p>
      </Footer>
    </Layout>
  );
}
