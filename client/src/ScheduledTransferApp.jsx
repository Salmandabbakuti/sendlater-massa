import {
  Card,
  Button,
  Input,
  Form,
  message,
  Table,
  Space,
  Typography,
  Statistic,
  Divider,
} from 'antd';
import {
  ClockCircleOutlined,
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  SmartContract,
  JsonRpcProvider,
  Mas,
  Args,
} from '@massalabs/massa-web3';
import { getWallets } from '@massalabs/wallet-provider';
import { useEffect, useState } from 'react';
import { MassaLogo } from '@massalabs/react-ui-kit';
import './App.css';

const { Title, Text } = Typography;

// Try to load contract address from config file, fallback to placeholder
let CONTRACT_ADDRESS = 'AS1...'; // Default placeholder
try {
  const contractConfig = await import('./contract-config.json');
  CONTRACT_ADDRESS = contractConfig.address;
} catch {
  console.log('Contract config not found, using placeholder address');
}

const massaClient = JsonRpcProvider.buildnet();
const contract = new SmartContract(massaClient, CONTRACT_ADDRESS);

export default function ScheduledTransferApp() {
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [transferCount, setTransferCount] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState(0);
  const [form] = Form.useForm();

  const fetchContractData = async () => {
    try {
      // Get transfer count
      const countResult = await contract.read('getTransferCount');
      console.log('Transfer count result:', countResult);
      const count = parseInt(countResult.value) || 0;
      setTransferCount(count);

      // Get contract balance
      const balanceResult = await contract.read('getContractBalance');
      const balance = parseInt(balanceResult.value) || 0;
      setContractBalance(balance);

      // Get current period from provider
      const currentSlot = await massaClient.client.getCurrentSlot();
      console.log('Current slot:', currentSlot);
      setCurrentPeriod(currentSlot.period); // Approximate period

      // Fetch all transfers
      const transfersData = [];
      for (let i = 1; i <= count; i++) {
        try {
          const transferResult = await contract.read(
            'getTransfer',
            new Args().addU64(i),
          );
          if (
            transferResult.value &&
            transferResult.value !== 'Transfer not found'
          ) {
            const parts = transferResult.value.split('|');
            if (parts.length >= 5) {
              transfersData.push({
                id: i,
                recipient: parts[0],
                amount: parseInt(parts[1]),
                scheduledPeriod: parseInt(parts[2]),
                sender: parts[3],
                executed: parts[4] === 'true',
              });
            }
          }
        } catch (error) {
          console.log(`Error fetching transfer ${i}:`, error);
        }
      }
      setTransfers(transfersData);
    } catch (error) {
      console.error('Error fetching contract data:', error);
      message.error('Failed to fetch contract data');
    }
  };

  const scheduleTransfer = async (values) => {
    setLoading(true);
    try {
      const wallets = await getWallets();
      if (!wallets || wallets.length === 0) {
        message.error('No wallet connected. Please connect a wallet first.');
        return;
      }

      const accounts = await wallets[0].accounts();
      if (!accounts || accounts.length === 0) {
        message.error('No accounts found in the connected wallet.');
        return;
      }

      const provider = accounts[0];
      const amountInMas = parseFloat(values.amount);
      const scheduledPeriod = parseInt(values.scheduledPeriod);

      const args = new Args()
        .addString(values.recipient)
        .addU64(scheduledPeriod);

      await provider.callSC({
        func: 'scheduleTransfer',
        target: CONTRACT_ADDRESS,
        parameter: args.serialize(),
        coins: Mas.fromString(amountInMas.toString()),
      });

      message.success('Transfer scheduled successfully!');
      form.resetFields();

      // Refresh data after a short delay
      setTimeout(fetchContractData, 2000);
    } catch (error) {
      console.error('Error scheduling transfer:', error);
      message.error('Failed to schedule transfer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchContractData, 30000);
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Recipient',
      dataIndex: 'recipient',
      key: 'recipient',
      ellipsis: true,
    },
    {
      title: 'Amount (MAS)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (amount / 1e9).toFixed(4),
    },
    {
      title: 'Scheduled Period',
      dataIndex: 'scheduledPeriod',
      key: 'scheduledPeriod',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.executed) {
          return <Text type="success">Executed</Text>;
        } else if (record.scheduledPeriod <= currentPeriod) {
          return <Text type="warning">Ready to Execute</Text>;
        } else {
          return <Text>Pending</Text>;
        }
      },
    },
    {
      title: 'Sender',
      dataIndex: 'sender',
      key: 'sender',
      ellipsis: true,
    },
  ];

  return (
    <div className="App">
      <header className="App-header">
        <MassaLogo />
        <Title level={2} style={{ color: 'white', margin: '20px 0' }}>
          Scheduled Transfer Contract
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          Schedule transfers to be executed at future periods
        </Text>
      </header>

      <div className="content">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Contract Info */}
          <Card title="Contract Information">
            <Space direction="horizontal" size="large" wrap>
              <Statistic
                title="Total Transfers"
                value={transferCount}
                prefix={<ClockCircleOutlined />}
              />
              <Statistic
                title="Contract Balance"
                value={(contractBalance / 1e9).toFixed(4)}
                suffix="MAS"
              />
              <Statistic title="Current Period" value={currentPeriod} />
            </Space>
            <Divider />
            <Text type="secondary">Contract Address: {CONTRACT_ADDRESS}</Text>
            <br />
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchContractData}
              style={{ marginTop: 10 }}
            >
              Refresh Data
            </Button>
          </Card>

          {/* Schedule Transfer Form */}
          <Card title="Schedule New Transfer" extra={<SendOutlined />}>
            <Form
              form={form}
              layout="vertical"
              onFinish={scheduleTransfer}
              style={{ maxWidth: 600 }}
            >
              <Form.Item
                label="Recipient Address"
                name="recipient"
                rules={[
                  { required: true, message: 'Please enter recipient address' },
                  {
                    pattern: /^AS[A-Za-z0-9]{49}$/,
                    message: 'Please enter a valid Massa address',
                  },
                ]}
              >
                <Input placeholder="AS1..." />
              </Form.Item>

              <Form.Item
                label="Amount (MAS)"
                name="amount"
                rules={[
                  { required: true, message: 'Please enter amount' },
                  {
                    type: 'number',
                    min: 0.000000001,
                    message: 'Amount must be greater than 0',
                  },
                ]}
              >
                <Input type="number" step="0.000000001" placeholder="1.0" />
              </Form.Item>

              <Form.Item
                label="Scheduled Period"
                name="scheduledPeriod"
                rules={[
                  { required: true, message: 'Please enter scheduled period' },
                  {
                    type: 'number',
                    min: currentPeriod + 1,
                    message: `Period must be greater than current period (${currentPeriod})`,
                  },
                ]}
                help={`Current period is ${currentPeriod}. Choose a future period.`}
              >
                <Input type="number" placeholder={currentPeriod + 100} />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<ClockCircleOutlined />}
                >
                  Schedule Transfer
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Transfers Table */}
          <Card title="Scheduled Transfers">
            <Table
              columns={columns}
              dataSource={transfers}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: true }}
            />
          </Card>
        </Space>
      </div>
    </div>
  );
}
