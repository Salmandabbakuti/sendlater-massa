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
  Tag,
  DatePicker,
  Alert,
} from 'antd';
import {
  ClockCircleOutlined,
  SwapOutlined,
  DollarOutlined,
  SendOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlusOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  SmartContract,
  JsonRpcProvider,
  Mas,
  Args,
} from '@massalabs/massa-web3';
import { useEffect, useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { MassaLogo } from '@massalabs/react-ui-kit';
import dayjs from 'dayjs';
import './App.css';

const { Title, Text } = Typography;

const CONTRACT_ADDRESS = 'AS1tczYTPcs8cNiqnKHM5TGANzPZA5HnFQA7iDyEttZ85wD7su99';

const massaClient = JsonRpcProvider.buildnet();
const contract = new SmartContract(massaClient, CONTRACT_ADDRESS);

export default function App() {
  const { connectedWallet, account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [transferCount, setTransferCount] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState(0);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(null);
  const [calculatedPeriod, setCalculatedPeriod] = useState(null);

  // Constants for Massa network timing
  const MASSA_PERIOD_DURATION = 16; // seconds per period
  const PERIOD_BUFFER = 4; // buffer periods for safety

  // Calculate estimated execution time from period
  const getEstimatedExecutionTime = (scheduledPeriod) => {
    if (scheduledPeriod <= currentPeriod) {
      return 'Ready to execute';
    }

    const periodsUntilExecution = scheduledPeriod - currentPeriod;
    const secondsUntilExecution = periodsUntilExecution * MASSA_PERIOD_DURATION;
    return dayjs().add(secondsUntilExecution, 'seconds');
  };

  // Calculate target period from selected timestamp
  const calculatePeriodFromTimestamp = (targetTimestamp) => {
    const now = dayjs();
    const target = dayjs(targetTimestamp);
    const secondsDifference = target.diff(now, 'seconds');

    if (secondsDifference <= 0) {
      return null; // Past timestamp
    }

    const periodsToAdd = Math.ceil(secondsDifference / MASSA_PERIOD_DURATION);
    const targetPeriod = currentPeriod + periodsToAdd + PERIOD_BUFFER;

    return {
      targetPeriod,
      periodsToAdd,
      secondsDifference,
      estimatedExecutionTime: dayjs().add(
        (periodsToAdd + PERIOD_BUFFER) * MASSA_PERIOD_DURATION,
        'seconds',
      ),
    };
  };

  // Handle date/time selection
  const handleDateTimeChange = (date) => {
    setSelectedDateTime(date);
    if (date && currentPeriod > 0) {
      const calculation = calculatePeriodFromTimestamp(date.valueOf());
      setCalculatedPeriod(calculation);

      if (calculation) {
        form.setFieldsValue({ scheduledPeriod: calculation.targetPeriod });
      }
    } else {
      setCalculatedPeriod(null);
      form.setFieldsValue({ scheduledPeriod: '' });
    }
  };

  const fetchContractData = async () => {
    setDataLoading(true);
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

      // Get current period and timestamp
      const currentSlot = await massaClient.client.getCurrentSlot();
      console.log(typeof currentSlot.period);
      setCurrentPeriod(currentSlot.period);

      // Fetch transfers in desc order (newest first)
      const transfersData = [];
      for (let i = count; i >= 1; i--) {
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
    } finally {
      setDataLoading(false);
    }
  };

  const scheduleTransfer = async (values) => {
    setLoading(true);
    try {
      if (!connectedWallet || !account) {
        message.error('No wallet connected. Please connect a wallet first.');
        return;
      }

      const accounts = await connectedWallet.accounts();
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
      setSelectedDateTime(null);
      setCalculatedPeriod(null);
      setTransferModalOpen(false);
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
      key: 'id',
      width: '8%',
      render: ({ id }) => <Tag color="cyan">#{id}</Tag>,
    },
    {
      title: 'Recipient',
      dataIndex: 'recipient',
      key: 'recipient',
      render: (recipient) => (
        <Text
          copyable={{
            text: recipient,
            onCopy: () => message.success('Recipient address copied!'),
          }}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        >
          {`${recipient.slice(0, 4)}...${recipient.slice(-3)}`}
        </Text>
      ),
      width: '15%',
    },
    {
      title: 'Amount (MAS)',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (amount / 1e9).toFixed(4),
      width: '12%',
    },
    {
      title: 'Period',
      dataIndex: 'scheduledPeriod',
      key: 'scheduledPeriod',
      width: '10%',
      responsive: ['md'],
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
      width: '10%',
    },
    {
      title: 'Estimated Execution',
      key: 'estimatedExecution',
      render: (_, record) => {
        if (record.executed) {
          return <Text type="secondary">-</Text>;
        }

        const estimated = getEstimatedExecutionTime(record.scheduledPeriod);
        if (estimated === 'Ready to execute') {
          return (
            <Text type="warning" strong>
              Ready
            </Text>
          );
        }

        const periodsUntilExecution = record.scheduledPeriod - currentPeriod;
        const minutesUntilExecution = Math.ceil(
          (periodsUntilExecution * MASSA_PERIOD_DURATION) / 60,
        );

        return (
          <div style={{ fontSize: '12px' }}>
            <div>{estimated.format('MMM D, YYYY, hh:mm:ss A')}</div>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {minutesUntilExecution < 60
                ? `${minutesUntilExecution}m`
                : `${Math.ceil(minutesUntilExecution / 60)}h`}
            </Text>
          </div>
        );
      },
      width: '20%',
      responsive: ['lg'],
    },
    {
      title: 'Executed At',
      dataIndex: 'executedAt',
      key: 'executedAt',
      render: (executedAt) =>
        executedAt !== null
          ? dayjs(executedAt).format('MMM D, YYYY, hh:mm A')
          : '-',
      width: '15%',
      responsive: ['sm'],
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
      width: '10%',
    },
  ];

  return (
    <div className="App">
      <header className="App-header">
        <MassaLogo />
        <Title level={2}>SendLater</Title>
      </header>

      <div className="content">
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* Quick Stats */}
          <Card
            extra={
              <Button
                title="Refresh"
                shape="circle"
                icon={<ReloadOutlined spin={dataLoading} />}
                onClick={fetchContractData}
              />
            }
          >
            <Space size="large" wrap>
              <Statistic
                title="Total Transfers"
                prefix={<SwapOutlined />}
                value={transferCount}
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
              <Statistic
                title="Balance"
                value={(contractBalance / 1e9).toFixed(4)}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                suffix="MAS"
              />
              <Statistic
                prefix={<ClockCircleOutlined />}
                title="Current Period"
                value={currentPeriod}
                valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
              />
            </Space>
          </Card>

          {/* Transfers Table */}
          <Card
            title={`Transfers (${transfers.length})`}
            extra={
              <Button
                title="New Transfer"
                type="primary"
                shape="round"
                icon={<PlusOutlined />}
                onClick={() => setTransferModalOpen(true)}
              >
                Transfer
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={transfers}
              rowKey="id"
              pagination={{
                pageSize: 8,
                size: 'small',
                showSizeChanger: false,
                responsive: true,
              }}
              size="small"
              scroll={{ x: 800 }}
              responsive
            />
          </Card>
        </Space>
      </div>

      {/* New Transfer Modal */}
      <Modal
        title="Schedule New Transfer"
        open={transferModalOpen}
        onCancel={() => {
          setTransferModalOpen(false);
          form.resetFields();
          setSelectedDateTime(null);
          setCalculatedPeriod(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          onFinish={scheduleTransfer}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="recipient"
            label="Recipient Address"
            hasFeedback
            rules={[
              { required: true, message: 'Enter recipient address' },
              // {
              //   pattern: /^A[SU][A-Za-z0-9]{49}$/,
              //   message: 'Invalid Massa address (must start with AS or AU)',
              // },
            ]}
          >
            <Input placeholder="Recipient Address (AS1... or AU1...)" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (MAS)"
            rules={[
              { required: true, message: 'Enter amount' },
              // {
              //   type: 'number',
              //   min: 0.000000001,
              //   message: 'Amount must be > 0',
              // },
            ]}
          >
            <Input type="number" step="0.001" placeholder="Amount (MAS)" />
          </Form.Item>

          <Form.Item
            label="Execution Time"
            help="Select when you want the transfer to be executed"
          >
            <DatePicker
              showTime
              placeholder="Select date and time"
              style={{ width: '100%' }}
              onChange={handleDateTimeChange}
              disabledDate={(current) =>
                current && current.isBefore(dayjs(), 'day')
              }
              disabledTime={() => ({
                disabledHours: () => {
                  const now = dayjs();
                  const selected = selectedDateTime;
                  if (selected && selected.isSame(now, 'day')) {
                    return Array.from({ length: now.hour() }, (_, i) => i);
                  }
                  return [];
                },
                disabledMinutes: (selectedHour) => {
                  const now = dayjs();
                  const selected = selectedDateTime;
                  if (
                    selected &&
                    selected.isSame(now, 'day') &&
                    selectedHour === now.hour()
                  ) {
                    return Array.from(
                      { length: now.minute() + 1 },
                      (_, i) => i,
                    );
                  }
                  return [];
                },
              })}
            />
          </Form.Item>

          {calculatedPeriod && (
            <Alert
              type="info"
              style={{ marginBottom: 16 }}
              message="Period Calculation"
              description={
                <div>
                  <p>
                    <strong>Target Period:</strong>{' '}
                    {calculatedPeriod.targetPeriod} (±{PERIOD_BUFFER} buffer)
                  </p>
                  <p>
                    <strong>Periods to add:</strong>{' '}
                    {calculatedPeriod.periodsToAdd + PERIOD_BUFFER}
                  </p>
                  <p>
                    <strong>Estimated execution:</strong>{' '}
                    {calculatedPeriod.estimatedExecutionTime.format(
                      'MMM D, YYYY [at] h:mm:ss A',
                    )}
                  </p>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    <em>
                      Note: Execution time may vary by ±
                      {PERIOD_BUFFER * MASSA_PERIOD_DURATION}s due to network
                      timing
                    </em>
                  </p>
                </div>
              }
            />
          )}

          <Form.Item
            name="scheduledPeriod"
            label="Scheduled Period (Advanced)"
            hasFeedback
            validateFirst
            help={`Current period: ${currentPeriod}. Each period = ${MASSA_PERIOD_DURATION}s. You can manually override the calculated period.`}
            rules={[
              {
                required: true,
                message: 'Select a time or enter period manually',
              },
              // {
              //   type: 'number',
              //   min: currentPeriod + 1,
              //   message: `Must be > ${currentPeriod}`,
              // },
            ]}
          >
            <Input
              type="number"
              placeholder={`Period (>${currentPeriod})`}
              suffix={<CalendarOutlined />}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button shape="round" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                shape="round"
                htmlType="submit"
                loading={loading}
                icon={<SendOutlined />}
              >
                Schedule
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer Details Modal */}
      <Modal
        title={
          <Text strong>
            Transfer Details <Tag color="cyan">#{selectedTransfer?.id}</Tag>
          </Text>
        }
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
          <Descriptions
            bordered
            column={1}
            size="small"
            items={[
              {
                key: 'transfer-id',
                label: 'Transfer ID',
                children: <Tag color="cyan">{selectedTransfer.id}</Tag>,
              },
              {
                key: 'recipient',
                label: 'Recipient Address',
                children: (
                  <Text copyable style={{ fontFamily: 'monospace' }}>
                    {selectedTransfer.recipient}
                  </Text>
                ),
              },
              {
                key: 'sender',
                label: 'Sender Address',
                children: (
                  <Text copyable style={{ fontFamily: 'monospace' }}>
                    {selectedTransfer.sender}
                  </Text>
                ),
              },
              {
                key: 'amount',
                label: 'Amount (MAS)',
                children: (selectedTransfer.amount / 1e9).toFixed(9),
              },
              {
                key: 'scheduled-period',
                label: 'Scheduled Period',
                children: selectedTransfer.scheduledPeriod,
              },
              {
                key: 'estimated-execution',
                label: 'Estimated Execution Time',
                children: selectedTransfer.executed
                  ? 'Already executed'
                  : (() => {
                      const estimated = getEstimatedExecutionTime(
                        selectedTransfer.scheduledPeriod,
                      );
                      if (estimated === 'Ready to execute') {
                        return <Text type="warning">Ready to execute now</Text>;
                      }
                      return (
                        <div>
                          <Text>
                            {estimated.format(
                              'ddd, MMM D, YYYY [at] h:mm:ss A',
                            )}
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            (
                            {Math.ceil(
                              ((selectedTransfer.scheduledPeriod -
                                currentPeriod) *
                                MASSA_PERIOD_DURATION) /
                                60,
                            )}{' '}
                            minutes from now)
                          </Text>
                        </div>
                      );
                    })(),
              },
              {
                key: 'status',
                label: 'Status',
                children: selectedTransfer.executed ? (
                  <Text type="success">Executed</Text>
                ) : selectedTransfer.scheduledPeriod <= currentPeriod ? (
                  <Text type="warning">Ready to Execute</Text>
                ) : (
                  <Text>Pending</Text>
                ),
              },
              {
                key: 'created-at',
                label: 'Created At',
                children: dayjs(selectedTransfer.createdAt).format(
                  'ddd, MMM D, YYYY h:mm A',
                ),
              },
              {
                key: 'executed-at',
                label: 'Executed At',
                children:
                  selectedTransfer.executedAt !== null
                    ? dayjs(selectedTransfer.executedAt).format(
                        'ddd, MMM D, YYYY [at] h:mm:ss A',
                      )
                    : 'Not executed yet',
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
