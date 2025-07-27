import {
  Button,
  message,
  Dropdown,
  Typography,
  Avatar,
  Space,
  Badge,
  Tag,
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

  // Get wallet logo based on wallet name
  const getWalletLogo = (walletName) => {
    if (!walletName) return null;
    const name = walletName.toLowerCase();

    if (name.includes('metamask')) {
      return '/metamask-logo.svg';
    } else if (name.includes('massa')) {
      return '/massa-wallet-logo.svg';
    } else if (name.includes('bearby')) {
      return '/bearby-logo.svg'; // Placeholder for bearby logo
    }
    return null;
  };

  // Get wallet icon component for buttons/menus
  const getWalletIcon = (walletName) => {
    const logoPath = getWalletLogo(walletName);
    if (logoPath) {
      return (
        <Avatar
          size="small"
          shape="square"
          src={logoPath}
          alt={walletName}
          style={{ objectFit: 'contain' }}
        />
      );
    }
    return <WalletOutlined />;
  };

  // Create dropdown menu items for multiple wallets
  const walletMenuItems = availableWallets.map((wallet, index) => ({
    key: index.toString(),
    label: wallet.name() || `Wallet ${index + 1}`,
    icon: getWalletIcon(wallet.name()),
    onClick: () => connectWallet(index),
  }));

  // Connected wallet dropdown items
  const connectedDropdownItems = [
    {
      key: 'wallet-info',
      label: (
        <div style={{ minWidth: 200, padding: '12px 0', textAlign: 'center' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* Avatar with wallet badge */}
            <Badge
              count={
                <Avatar
                  size={20}
                  src={getWalletLogo(connectedWallet?.name())}
                  icon={<WalletOutlined />}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #d9d9d9',
                    fontSize: '10px',
                    color: '#1890ff',
                  }}
                />
              }
              offset={[-8, 8]}
            >
              <Avatar size={48} icon={<UserOutlined />} />
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

            {/* Network Name */}
            {account?.networkName && (
              <Tag
                color={
                  account?.networkName?.toLowerCase() === 'mainnet'
                    ? 'green'
                    : 'blue'
                }
              >
                {account?.networkName?.toUpperCase()}
              </Tag>
            )}

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
  return (
    <Dropdown
      menu={{
        items: account ? connectedDropdownItems : walletMenuItems,
      }}
      trigger={['click']}
      placement="bottomRight"
      overlayStyle={{ minWidth: account ? 250 : 'auto' }}
    >
      <Button
        type="primary"
        shape="round"
        size="large"
        loading={loading}
        icon={
          account ? getWalletIcon(connectedWallet?.name()) : <WalletOutlined />
        }
        onClick={
          !account && availableWallets.length <= 1
            ? () => connectWallet(0)
            : undefined
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginRight: '16px',
        }}
      >
        {account ? (
          <>
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
          </>
        ) : availableWallets.length > 1 ? (
          <>
            Connect Wallet <DownOutlined />
          </>
        ) : loading ? (
          'Connecting...'
        ) : availableWallets.length === 0 ? (
          'No Wallets Found'
        ) : (
          'Connect Wallet'
        )}
      </Button>
    </Dropdown>
  );
}
