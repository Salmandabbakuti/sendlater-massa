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

const CONTRACT_ADDRESS = 'AS1BTbwmhocHYstPF8rSe3XHxFRkL2N31XSHJFjuVTY8bX3g2vRB';

const massaClient = JsonRpcProvider.buildnet();
const contract = new SmartContract(massaClient, CONTRACT_ADDRESS);

export default function App() {
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
      const count = parseInt(countResult.value);
      setTransferCount(count);

      // Get contract balance
      const balanceResult = await contract.read('getContractBalance');
      const balanceArgs = new Args(balanceResult.value);
      const balance = Number(balanceArgs.nextU64());
      setContractBalance(balance);

      // Get current period
      const currentSlot = await massaClient.client.getCurrentSlot();
      setCurrentPeriod(currentSlot.period);

      // Fetch transfers
      const transfersData = [];
      for (let i = 1; i <= count; i++) {
        try {
          const transferResult = await contract.read(
            'getTransfer',
            new Args().addU64(BigInt(i)),
          );
          const transferArgs = new Args(transferResult.value);
          const transferDetails = transferArgs.nextString();

          if (transferDetails) {
            const parts = transferDetails.split('|');
            console.log('Transfer parts:', parts);
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
        .addU64(BigInt(scheduledPeriod))
        .serialize();

      await provider.callSC({
        func: 'scheduleTransfer',
        target: CONTRACT_ADDRESS,
        parameter: args,
        coins: Mas.fromString(amountInMas.toString()),
      });

      message.success('Transfer scheduled successfully!');
      form.resetFields();
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
    const interval = setInterval(fetchContractData, 30000);
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
    },
    {
      title: 'Recipient',
      dataIndex: 'recipient',
      key: 'recipient',
      ellipsis: true,
      width: 180,
    },
    {
      title: 'Amount (MAS)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (amount / 1e9).toFixed(4),
      width: 120,
    },
    {
      title: 'Period',
      dataIndex: 'scheduledPeriod',
      key: 'scheduledPeriod',
      width: 80,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.executed) {
          return <Text type="success">Executed</Text>;
        } else if (record.scheduledPeriod <= currentPeriod) {
          return <Text type="warning">Ready</Text>;
        } else {
          return <Text>Pending</Text>;
        }
      },
      width: 100,
    },
    {
      title: 'Sender',
      dataIndex: 'sender',
      key: 'sender',
      ellipsis: true,
      width: 180,
    },
  ];

  return (
    <div className="App">
      <header className="App-header">
        <MassaLogo />
        <Title level={2} style={{ margin: '16px 0 8px' }}>
          Scheduled Transfers
        </Title>
      </header>

      <div
        className="content"
        style={{ padding: '20px', maxWidth: 1000, margin: '0 auto' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Quick Stats */}
          <Card size="small">
            <Space size="large" wrap>
              <Statistic title="Total Transfers" value={transferCount} />
              <Statistic
                title="Balance"
                value={(contractBalance / 1e9).toFixed(4)}
                suffix="MAS"
              />
              <Statistic title="Current Period" value={currentPeriod} />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchContractData}
                size="small"
              >
                Refresh
              </Button>
            </Space>
          </Card>

          {/* Schedule Form */}
          <Card title="Schedule New Transfer" size="small">
            <Form
              form={form}
              onFinish={scheduleTransfer}
              layout="inline"
              style={{ flexWrap: 'wrap', gap: '8px' }}
            >
              <Form.Item
                name="recipient"
                rules={[
                  { required: true, message: 'Enter recipient address' },
                  {
                    pattern: /^AS[A-Za-z0-9]{49}$/,
                    message: 'Invalid Massa address',
                  },
                ]}
                style={{ minWidth: 300 }}
              >
                <Input placeholder="Recipient Address (AS1...)" />
              </Form.Item>

              <Form.Item
                name="amount"
                rules={[
                  { required: true, message: 'Enter amount' },
                  {
                    type: 'number',
                    min: 0.000000001,
                    message: 'Amount must be > 0',
                  },
                ]}
                style={{ minWidth: 120 }}
              >
                <Input type="number" step="0.001" placeholder="Amount (MAS)" />
              </Form.Item>

              <Form.Item
                name="scheduledPeriod"
                rules={[
                  { required: true, message: 'Enter period' },
                  {
                    type: 'number',
                    min: currentPeriod + 1,
                    message: `Must be > ${currentPeriod}`,
                  },
                ]}
                style={{ minWidth: 120 }}
              >
                <Input
                  type="number"
                  placeholder={`Period (>${currentPeriod})`}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SendOutlined />}
                >
                  Schedule
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* Transfers Table */}
          <Card title={`Transfers (${transfers.length})`} size="small">
            <Table
              columns={columns}
              dataSource={transfers}
              rowKey="id"
              pagination={{
                pageSize: 8,
                size: 'small',
                showSizeChanger: false,
              }}
              size="small"
            />
          </Card>
        </Space>
      </div>
    </div>
  );
}
