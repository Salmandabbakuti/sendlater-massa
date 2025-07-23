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
  Modal,
  Descriptions,
} from 'antd';
import {
  ClockCircleOutlined,
  SendOutlined,
  ReloadOutlined,
  EyeOutlined,
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

const CONTRACT_ADDRESS = 'AS1nhrVT666KzByEtm3MgSjbgfEL8diLQDwn84WuqSHwjGtCzaju';

const massaClient = JsonRpcProvider.buildnet();
const contract = new SmartContract(massaClient, CONTRACT_ADDRESS);

export default function App() {
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [transferCount, setTransferCount] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState(0);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

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
      console.log(typeof currentSlot.period);
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
            if (parts.length >= 7) {
              // Updated to expect 7 parts with timestamps
              transfersData.push({
                id: i,
                recipient: parts[0],
                amount: parseInt(parts[1]),
                scheduledPeriod: parseInt(parts[2]),
                sender: parts[3],
                executed: parts[4] === 'true',
                createdAt: parseInt(parts[5]),
                executedAt: parts[6] !== '0' ? parseInt(parts[6]) : null,
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

  const handleViewTransfer = (transfer) => {
    setSelectedTransfer(transfer);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
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
      width: 100,
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewTransfer(record)}
          size="small"
        />
      ),
      width: 80,
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
                hasFeedback
                rules={[
                  { required: true, message: 'Enter recipient address' },
                  // {
                  //   pattern: /^A[SU][A-Za-z0-9]{49}$/,
                  //   message: 'Invalid Massa address (must start with AS or AU)',
                  // },
                ]}
                style={{ minWidth: 300 }}
              >
                <Input placeholder="Recipient Address (AS1... or AU1...)" />
              </Form.Item>

              <Form.Item
                name="amount"
                rules={[
                  { required: true, message: 'Enter amount' },
                  // {
                  //   type: 'number',
                  //   min: 0.000000001,
                  //   message: 'Amount must be > 0',
                  // },
                ]}
                style={{ minWidth: 120 }}
              >
                <Input type="number" step="0.001" placeholder="Amount (MAS)" />
              </Form.Item>

              <Form.Item
                name="scheduledPeriod"
                hasFeedback
                validateFirst
                rules={[
                  { required: true, message: 'Enter period' },
                  // {
                  //   type: 'number',
                  //   min: currentPeriod + 1,
                  //   message: `Must be > ${currentPeriod}`,
                  // },
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

      {/* Transfer Details Modal */}
      <Modal
        title={`Transfer Details - ID ${selectedTransfer?.id}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedTransfer && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Transfer ID">
              {selectedTransfer.id}
            </Descriptions.Item>
            <Descriptions.Item label="Recipient Address">
              <Text copyable style={{ fontFamily: 'monospace' }}>
                {selectedTransfer.recipient}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Sender Address">
              <Text copyable style={{ fontFamily: 'monospace' }}>
                {selectedTransfer.sender}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              {(selectedTransfer.amount / 1e9).toFixed(9)} MAS
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Period">
              {selectedTransfer.scheduledPeriod}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {selectedTransfer.executed ? (
                <Text type="success">Executed</Text>
              ) : selectedTransfer.scheduledPeriod <= currentPeriod ? (
                <Text type="warning">Ready to Execute</Text>
              ) : (
                <Text>Pending</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(selectedTransfer.createdAt * 1000).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Executed At">
              {selectedTransfer.executedAt
                ? new Date(selectedTransfer.executedAt * 1000).toLocaleString()
                : 'Not executed yet'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
