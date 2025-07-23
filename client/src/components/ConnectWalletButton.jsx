import { Button, message, Dropdown, Typography } from 'antd';
import {
  WalletOutlined,
  DisconnectOutlined,
  DownOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useWallet } from '../hooks/useWallet';

const { Text } = Typography;

export default function ConnectWalletButton() {
  const {
    account,
    connectedWallet,
    availableWallets,
    loading,
    connectWallet,
    disconnectWallet,
  } = useWallet();

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
    onClick: () => connectWallet(index),
  }));

  // Connected wallet dropdown items
  const connectedDropdownItems = [
    {
      key: 'address',
      label: (
        <div style={{ minWidth: 200 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Address
          </Text>
          <br />
          <Text
            copyable={{
              text: account,
              onCopy: () => message.success('Address copied!'),
              icon: [
                <CopyOutlined key="copy-icon" />,
                <CheckOutlined key="copied-icon" />,
              ],
            }}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          >
            {formatAddress(account)}
          </Text>
        </div>
      ),
      disabled: true,
    },
    {
      key: 'wallet-info',
      label: (
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Connected to
          </Text>
          <br />
          <Text style={{ fontSize: '13px' }}>
            {connectedWallet?.name() || 'Unknown Wallet'}
          </Text>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'disconnect',
      label: 'Disconnect Wallet',
      icon: <DisconnectOutlined />,
      onClick: disconnectWallet,
      danger: true,
    },
  ];

  // Connected wallet button
  if (account) {
    return (
      <Dropdown
        menu={{ items: connectedDropdownItems }}
        trigger={['click']}
        placement="bottomRight"
        overlayStyle={{ minWidth: 250 }}
      >
        <Button
          type="primary"
          shape="round"
          size="large"
          loading={loading}
          icon={<WalletOutlined />}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginRight: '16px',
          }}
        >
          <span
            style={{
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatAddress(account)}
          </span>
          <DownOutlined />
        </Button>
      </Dropdown>
    );
  }

  // Multiple wallets dropdown
  if (availableWallets.length > 1) {
    return (
      <Dropdown
        menu={{ items: walletMenuItems }}
        trigger={['click']}
        placement="bottomRight"
        disabled={loading}
      >
        <Button
          type="primary"
          shape="round"
          size="large"
          loading={loading}
          icon={<WalletOutlined />}
          style={{ marginRight: '16px' }}
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
      onClick={() => connectWallet(0)}
      style={{ marginRight: '16px' }}
    >
      {availableWallets.length === 0 ? 'No Wallets Found' : 'Connect Wallet'}
    </Button>
  );
}
