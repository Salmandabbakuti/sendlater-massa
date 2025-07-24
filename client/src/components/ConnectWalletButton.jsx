import {
  Button,
  message,
  Dropdown,
  Typography,
  Avatar,
  Space,
  Badge,
} from 'antd';
import {
  WalletOutlined,
  DisconnectOutlined,
  DownOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useWallet } from '../hooks/useWallet';

const { Text } = Typography;

export default function ConnectWalletButton() {
  const {
    account,
    availableWallets,
    loading,
    connectedWallet,
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
      key: 'wallet-info',
      label: (
        <div style={{ minWidth: 200, padding: '12px 0', textAlign: 'center' }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {/* Avatar with wallet badge */}
            <Badge
              count={
                <WalletOutlined
                  title={connectedWallet?.name() || '-'}
                  style={{ color: '#1890ff', fontSize: '12px' }}
                />
              }
              offset={[-8, 8]}
            >
              <Avatar
                size={48}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#f0f0f0', color: '#666' }}
              />
            </Badge>

            {/* Address */}
            <Text
              copyable={{
                text: account?.address,
                onCopy: () => message.success('Address copied!'),
                icon: [
                  <CopyOutlined key="copy-icon" />,
                  <CheckOutlined key="copied-icon" />,
                ],
              }}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#666',
              }}
            >
              {formatAddress(account?.address)}
            </Text>

            {/* Balance */}
            <Text
              style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}
            >
              {account?.balanceString || '0 MAS'}
            </Text>
          </Space>
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
            {formatAddress(account?.address)}
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
      {loading
        ? 'Connecting...'
        : availableWallets.length === 0
        ? 'No Wallets Found'
        : 'Connect Wallet'}
    </Button>
  );
}
