import { Card, Button, Statistic, message, Space } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { SmartContract, JsonRpcProvider } from '@massalabs/massa-web3';
import { getWallets } from '@massalabs/wallet-provider';
import { useEffect, useState, useRef } from 'react';
import { MassaLogo } from '@massalabs/react-ui-kit';
import './App.css';

const massaClient = JsonRpcProvider.buildnet();
const CONTRACT_ADDRESS =
  'AS129cqqMZbzMoL7zR12TfVXSoYLorxdHZj645rwrtXCtjoPdeqVy'; // TODO Update with your deployed async-counter contract address
const contract = new SmartContract(massaClient, CONTRACT_ADDRESS);

export default function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventLogs, setEventLogs] = useState([]);
  const [eventCount, setEventCount] = useState(0);
  const startSlotRef = useRef(null);

  const fetchCurrentCount = async () => {
    setLoading(true);
    try {
      // const wallets = await getWallets();
      // if (!wallets || wallets.length === 0) {
      //   message.error('No wallet connected. Please connect a wallet first.');
      //   return;
      // }
      // console.log('Connected wallets:', wallets);

      // const accounts = await wallets[0].accounts();
      // console.log('Available accounts:', accounts);

      // if (!accounts || accounts.length === 0) {
      //   message.error('No accounts found in the connected wallet.');
      //   return;
      // }
      // console.log('Using account:', accounts[0]);
      // const provider = accounts[0];
      // const result = await provider.readSC({
      //   func: 'getCount',
      //   target: CONTRACT_ADDRESS,
      // });
      const result = await contract.read('getCount');
      console.log('📊 Fetching current count:', result);
      // The result should contain the counter value
      const countValue = parseInt(result.value) || 0;
      console.log('Current count:', countValue);
      setCount(countValue);
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

    // Initialize the start slot once
    const initializeEventMonitoring = async () => {
      try {
        const currentSlot = await massaClient.client.getCurrentSlot();
        console.log('Initial slot for event filtering:', currentSlot);
        startSlotRef.current = currentSlot;
      } catch (error) {
        console.error('Error getting current slot:', error);
      }
    };
    initializeEventMonitoring();
  }, []); // Empty dependency array - run only once on mount

  useEffect(() => {
    const checkForEvents = async () => {
      try {
        const events = await massaClient.getEvents({
          smartContractAddress: CONTRACT_ADDRESS,
          isFinal: true,
          start: startSlotRef.current || undefined,
        });

        if (events && events.length > eventCount) {
          const newEvents = events.slice(eventCount);

          newEvents.forEach((event) => {
            console.log('📋 New event detected:', event.data);

            // Add event to log with timestamp
            const logEntry = {
              id: `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 15)}`,
              timestamp: new Date().toLocaleTimeString(),
              message: event.data,
            };

            setEventLogs((prev) => [logEntry, ...prev]);
          });

          setEventCount(events.length);

          // Only refresh counter if we found new events
          if (newEvents.length > 0) {
            fetchCurrentCount();
          }
        }
      } catch (error) {
        console.error('Error checking events:', error);
      }
    };

    // Set up event polling every 5 seconds
    const eventInterval = setInterval(checkForEvents, 5000);

    return () => clearInterval(eventInterval);
  }, [eventCount]); // Include eventCount in dependencies

  return (
    <div className="App">
      <MassaLogo className="logo" size={100} />
      {/* Counter component */}
      <Card
        title="Autonomous Counter"
        style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}
        extra={
          <Space>
            <Button
              size="small"
              shape="circle"
              onClick={fetchCurrentCount}
              icon={<SyncOutlined spin={loading} />}
              title="Refresh count"
            />
          </Space>
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
      </Card>

      {/* Event Log Section */}
      <Card
        title={`Event Logs (${eventLogs.length})`}
        style={{
          maxWidth: 500,
          margin: '20px auto',
          textAlign: 'left',
          maxHeight: '300px',
          overflow: 'auto',
        }}
        size="small"
      >
        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {eventLogs.length > 0 ? (
            eventLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  marginBottom: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  borderLeft: '3px solid #1677ff',
                }}
              >
                <span style={{ color: '#666', marginRight: '8px' }}>
                  [{log.timestamp}]
                </span>
                <span>{log.message}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                color: '#999',
                fontStyle: 'italic',
              }}
            >
              ⏳ Waiting for contract events...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
