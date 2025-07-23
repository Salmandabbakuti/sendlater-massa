import {
  Card,
  Button,
  Statistic,
  notification,
  Typography,
  message,
} from 'antd';
import { MinusOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { SmartContract, JsonRpcProvider } from '@massalabs/massa-web3';
import { getWallets } from '@massalabs/wallet-provider';
import { useEffect, useState } from 'react';
import { MassaLogo } from '@massalabs/react-ui-kit';
import './App.css';

const massaClient = JsonRpcProvider.buildnet();
const CONTRACT_ADDRESS = 'AS1QRecKraQtHm71Hw2wNq6AVT4KUKNV5EyqTgcbpmEQL6zZ5u3e'; // TODO Update with your deployed contract address

const contract = new SmartContract(massaClient, CONTRACT_ADDRESS);

export default function App({ account }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchCurrentCount = async () => {
    setLoading(true);
    try {
      const result = await contract.read('getCount');
      const countValue = parseInt(result.value) || 0;
      console.log('Current count:', countValue);
      setCount(countValue);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error fetching count:', error);
      message.error(
        'Failed to fetch current count. Make sure the contract address is correct.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentCount();
  }, []); // Empty dependency array is correct here

  const handleIncrement = async () => {
    if (!account) {
      notification.warning({
        message: 'Wallet Required',
        description: 'Please connect your wallet to increment the counter.',
      });
      return;
    }

    setLoading(true);
    try {
      // Create a write-enabled contract instance with the connected account
      const writeContract = new SmartContract(
        account.provider,
        CONTRACT_ADDRESS,
      );
      await writeContract.call('increment');

      notification.success({
        message: 'Success',
        description: 'Counter incremented successfully!',
      });

      // Refresh count after a short delay to allow blockchain confirmation
      setTimeout(() => {
        fetchCurrentCount();
      }, 2000);
    } catch (error) {
      console.error('Error incrementing:', error);
      notification.error({
        message: 'Error',
        description: `Failed to increment counter: ${
          error.message || 'Unknown error'
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecrement = async () => {
    if (!account) {
      notification.warning({
        message: 'Wallet Required',
        description: 'Please connect your wallet to decrement the counter.',
      });
      return;
    }

    setLoading(true);
    try {
      // Create a write-enabled contract instance with the connected account
      const writeContract = new SmartContract(
        account.provider,
        CONTRACT_ADDRESS,
      );
      await writeContract.call('decrement');

      notification.success({
        message: 'Success',
        description: 'Counter decremented successfully!',
      });

      // Refresh count after a short delay to allow blockchain confirmation
      setTimeout(() => {
        fetchCurrentCount();
      }, 2000);
    } catch (error) {
      console.error('Error decrementing:', error);
      notification.error({
        message: 'Error',
        description: `Failed to decrement counter: ${
          error.message || 'Unknown error'
        }`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <MassaLogo className="logo" size={100} />
      {/* Counter component */}
      <Card
        title="Counter Smart Contract"
        style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}
        actions={[
          <Button
            key="decrement"
            type="primary"
            shape="round"
            danger
            icon={<MinusOutlined />}
            onClick={handleDecrement}
            loading={loading}
            disabled={!account || !isInitialized}
            size="large"
          />,
          <Button
            key="increment"
            type="primary"
            shape="round"
            icon={<PlusOutlined />}
            onClick={handleIncrement}
            loading={loading}
            disabled={!account || !isInitialized}
            size="large"
          />,
        ]}
        extra={
          <Button
            size="small"
            shape="circle"
            onClick={fetchCurrentCount}
            icon={<SyncOutlined spin={loading} />}
            title="Refresh count"
          />
        }
      >
        <Statistic
          title="Current Count"
          value={count}
          precision={0}
          valueStyle={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: count > 0 ? '#3f8600' : count < 0 ? '#cf1322' : '#1677ff',
          }}
        />
        {!account ? (
          <Typography.Text
            type="secondary"
            style={{ marginTop: '16px', display: 'block' }}
          >
            Connect your wallet to modify the counter.
          </Typography.Text>
        ) : (
          <Typography.Text
            type="success"
            style={{ marginTop: '16px', display: 'block' }}
          >
            Wallet connected! You can now modify the counter.
          </Typography.Text>
        )}
      </Card>
    </div>
  );
}
