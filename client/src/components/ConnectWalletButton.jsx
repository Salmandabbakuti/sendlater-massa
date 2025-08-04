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
import { useAccountStore } from '@massalabs/react-ui-kit';
import { formatMas } from '@massalabs/massa-web3';
import { ellipsisString } from '../utils';

const { Text } = Typography;

export default function ConnectWalletButton() {
  const {
    connectedAccount,
    balance,
    currentWallet,
    wallets,
    isFetching,
    network,
    setCurrentWallet,
  } = useAccountStore();

  // Get wallet logo based on wallet name
  const getWalletLogo = (walletName) => {
    if (!walletName) return null;
    const name = walletName.toLowerCase();

    if (name.includes('metamask')) {
      return '/metamask-logo.svg';
    } else if (name.includes('massa')) {
      return '/massa-wallet-logo.svg';
    } else if (name.includes('bearby')) {
      return '/bearby-logo.svg';
    }
    return null;
  };

  // Get wallet icon component for buttons/menus
  const getWalletIcon = (walletName) => {
    const logoPath = getWalletLogo(walletName);
    return (
      <Avatar
        size="small"
        shape="square"
        src={logoPath}
        icon={<WalletOutlined />} // Fallback icon if no logo is found
        alt={walletName}
        style={{ objectFit: 'contain' }}
      />
    );
  };

  // Create dropdown menu items for multiple wallets
  const walletMenuItems =
    wallets?.map((wallet, index) => ({
      key: index.toString(),
      label: wallet.name() || `Wallet ${index + 1}`,
      icon: getWalletIcon(wallet.name()),
      onClick: () => handleConnectWallet(index),
    })) || [];

  const handleConnectWallet = async (walletIndex = 0) => {
    if (!wallets || wallets.length === 0) {
      message.error(
        'No wallets available. Please install a compatible Massa wallet extension.',
      );
      return;
    }

    if (walletIndex >= wallets.length) {
      message.error('Selected wallet is not available');
      return;
    }

    try {
      const wallet = wallets[walletIndex];
      await setCurrentWallet(wallet);
      message.success(`Connected to ${wallet.name()}!`);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      message.error(`Failed to connect wallet: ${error.message}`);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await setCurrentWallet();
      message.success('Wallet disconnected successfully!');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      message.error('Failed to disconnect wallet');
    }
  };

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
                  src={getWalletLogo(currentWallet?.name())}
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
                text: connectedAccount?.address,
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
              {ellipsisString(connectedAccount?.address, 6, 4)}
            </Text>

            {/* Network Name */}
            <Tag
              color={
                network?.name?.toLowerCase() === 'mainnet' ? 'green' : 'blue'
              }
            >
              {network?.name?.toUpperCase()}
            </Tag>

            {/* Balance */}
            <Text
              style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}
            >
              {formatMas(balance || 0n)} MAS
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
      onClick: handleDisconnectWallet,
      danger: true,
    },
  ];

  // Connected wallet button
  return (
    <Dropdown
      menu={{
        items: connectedAccount ? connectedDropdownItems : walletMenuItems,
      }}
      trigger={['click']}
      placement="bottomRight"
      overlayStyle={{ minWidth: connectedAccount ? 250 : 'auto' }}
    >
      <Button
        type="primary"
        shape="round"
        size="large"
        loading={isFetching}
        icon={
          connectedAccount ? (
            getWalletIcon(currentWallet?.name())
          ) : (
            <WalletOutlined />
          )
        }
        onClick={
          !connectedAccount && wallets && wallets.length <= 1
            ? () => handleConnectWallet(0)
            : undefined
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginRight: '16px',
        }}
      >
        {connectedAccount ? (
          <>
            <span
              style={{
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ellipsisString(connectedAccount?.address, 6, 4)}
            </span>
            <DownOutlined />
          </>
        ) : wallets && wallets.length > 1 ? (
          <>
            Connect Wallet <DownOutlined />
          </>
        ) : isFetching ? (
          'Connecting...'
        ) : !wallets || wallets.length === 0 ? (
          'No Wallets Found'
        ) : (
          'Connect Wallet'
        )}
      </Button>
    </Dropdown>
  );
}
