import { useEffect, useState } from 'react';
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
  Tag,
  DatePicker,
  Alert,
  Row,
  Col,
  Divider,
  Flex,
  Spin,
  Descriptions,
} from 'antd';
import {
  ClockCircleOutlined,
  DoubleRightOutlined,
  DollarOutlined,
  EyeOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Args, parseMas, formatMas, Address, U64 } from '@massalabs/massa-web3';
import { MassaLogo } from '@massalabs/react-ui-kit';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAccountStore } from '@massalabs/react-ui-kit';
import { Transfer, massaProvider, contract } from './utils';
import {
  MASSA_PERIOD_DURATION,
  PERIOD_BUFFER,
  CONTRACT_ADDRESS,
} from './utils/constants';
import './App.css';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [transferCount, setTransferCount] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState(0);
  const [form] = Form.useForm();
  const [transferDetailsModalOpen, setTransferDetailsModalOpen] =
    useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [calculatedPeriod, setCalculatedPeriod] = useState(null);

  const { connectedAccount: account, balance, network } = useAccountStore();

  // Form validation functions
  const validateRecipientAddress = async (_, value) => {
    if (!value) {
      return Promise.reject('Please enter recipient address');
    }
    try {
      Address.fromString(value);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error?.message || 'Invalid address format');
    }
  };

  const validateAmount = async (_, value) => {
    if (!value) {
      return Promise.reject('Please enter amount');
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0.001) {
      return Promise.reject('Amount must be at least 0.001 MAS');
    }

    try {
      const balance = await account?.balance(true);
      if (parseMas(value) > balance) {
        return Promise.reject('Insufficient balance in connected wallet');
      }
      return Promise.resolve();
    } catch {
      return Promise.reject('Invalid balance');
    }
  };

  const validateScheduledPeriod = (_, value) => {
    if (!value) {
      return Promise.reject('Please enter a scheduled period');
    }

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue <= currentPeriod) {
      return Promise.reject(
        `Scheduled Period must be greater than ${currentPeriod}`,
      );
    }

    return Promise.resolve();
  };

  // Calculate estimated execution time from period
  const getEstimatedExecutionTime = (scheduledPeriod) => {
    if (scheduledPeriod <= currentPeriod) {
      return 'Ready to execute';
    }

    const periodsUntilExecution = scheduledPeriod - currentPeriod;
    const secondsUntilExecution = periodsUntilExecution * MASSA_PERIOD_DURATION;
    return dayjs().add(secondsUntilExecution, 'seconds');
  };

  // Get human-readable time remaining using dayjs relativeTime
  const getTimeRemaining = (scheduledPeriod) => {
    if (scheduledPeriod <= currentPeriod) {
      return 'Ready now';
    }

    const periodsUntilExecution = scheduledPeriod - currentPeriod;
    const secondsUntilExecution = periodsUntilExecution * MASSA_PERIOD_DURATION;
    const executionTime = dayjs().add(secondsUntilExecution, 'seconds');

    return executionTime.fromNow(); // This gives us "in 2 hours", "in 30 minutes", etc.
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
      const [transferCountResult, balanceResult, currentSlot] =
        await Promise.all([
          contract.read('getTransferCount'),
          contract.read('getContractBalance'),
          massaProvider.client.getCurrentSlot(),
        ]);

      // Process results
      const transferCount = U64.fromBytes(transferCountResult.value);
      setTransferCount(transferCount);
      const balance = U64.fromBytes(balanceResult.value);
      setContractBalance(balance);
      setCurrentPeriod(currentSlot.period);

      // Fetch transfers in desc order (newest first)
      const transfersData = [];
      for (let i = transferCount; i >= 1; i--) {
        try {
          const transferResult = await contract.read(
            'getTransfer',
            new Args().addU64(i),
          );

          // Check if transfer data exists
          if (transferResult.value && transferResult.value.length > 0) {
            // Deserialize the transfer object
            const transfer = Transfer.fromBytes(transferResult.value);
            const transferObj = transfer.toObject();

            transfersData.push(transferObj);
          }
        } catch (error) {
          console.log(`Error fetching transfer ${i}:`, error);
        }
      }
      setTransfers(transfersData);
    } catch (error) {
      console.error('Error fetching contract data:', error);
      message.error('Failed to fetch contract data. Please try again later.');
    } finally {
      setDataLoading(false);
    }
  };

  const handleScheduleTransfer = async (values) => {
    if (!account) return message.error('Please connect a wallet first.');
    if (network?.name !== 'buildnet')
      return message.error('Please switch to the Massa buildnet!');
    setLoading(true);
    try {
      const amountInMas = parseMas(values.amount);
      const scheduledPeriod = U64.fromNumber(values.scheduledPeriod);

      const args = new Args()
        .addString(values.recipient)
        .addU64(scheduledPeriod);

      const scheduleOp = await account.callSC({
        func: 'scheduleTransfer',
        target: CONTRACT_ADDRESS,
        parameter: args,
        coins: amountInMas,
      });

      console.log('Schedule operation result:', scheduleOp);
      await scheduleOp.waitSpeculativeExecution();
      message.success('Transfer scheduled successfully!');
      form.resetFields();
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
    setTransferDetailsModalOpen(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      sorter: (a, b) => a.id - b.id,
      render: (id) => <Tag color="blue">#{id}</Tag>,
    },
    {
      title: 'Recipient',
      dataIndex: 'recipient',
      ellipsis: true,
      render: (recipient) => (
        <Text
          copyable={{ text: recipient, tooltips: ['Copy', 'Copied!'] }}
          style={{ fontFamily: 'monospace' }}
        >
          {`${recipient.slice(0, 8)}...${recipient.slice(-6)}`}
        </Text>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (amount) => <Text strong>{formatMas(amount)} MAS</Text>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Period',
      dataIndex: 'scheduledPeriod',
      render: (period) => (
        <Text style={{ fontFamily: 'monospace' }}>{period}</Text>
      ),
      sorter: (a, b) => a.scheduledPeriod - b.scheduledPeriod,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.executed) {
          return <Tag color="success">Executed</Tag>;
        } else if (Number(record.scheduledPeriod) <= currentPeriod) {
          return <Tag color="warning">Ready</Tag>;
        } else {
          return <Tag color="processing">Pending</Tag>;
        }
      },
    },
    {
      title: 'Execution Time',
      key: 'estimatedExecution',
      sorter: (a, b) => a?.executedAt - b?.executedAt,
      render: (_, record) => {
        if (record.executed) {
          return record.executedAt ? (
            dayjs(record.executedAt).format('MMM D, YYYY h:mm:ss A')
          ) : (
            <Text type="secondary">-</Text>
          );
        }

        const timeRemaining = getTimeRemaining(record.scheduledPeriod);
        if (timeRemaining === 'Ready now') {
          return (
            <Text type="warning" strong>
              Ready Now
            </Text>
          );
        }

        const estimated = getEstimatedExecutionTime(record.scheduledPeriod);
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '12px' }}>
              {estimated.format('MMM D, YYYY h:mm:ss A')}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {timeRemaining}
            </Text>
          </Space>
        );
      },
      responsive: ['md'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          shape="circle"
          icon={<EyeOutlined />}
          onClick={() => handleViewTransfer(record)}
        />
      ),
    },
  ];

  return (
    <div className="App">
      <Space
        direction="vertical"
        size="large"
        style={{ width: '100%', padding: '0 16px' }}
      >
        {/* Header */}
        <Flex justify="center" align="center" gap="middle">
          <MassaLogo />
          <Title level={2} style={{ margin: 0 }}>
            SendLater
          </Title>
        </Flex>

        {/* Info Alert */}
        <Alert
          description="SendLater allows you to schedule MAS transfers to be executed at a specific future time or massa period. Perfect for recurring payments, time-locked transfers, surprise gifting, scheduled salary payments, hackathon fund distributions and many more!"
          type="info"
          showIcon
          closable
        />

        {/* Stats Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Transfers"
                prefix={<DoubleRightOutlined />}
                value={transferCount}
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Contract Balance"
                value={formatMas(contractBalance)}
                precision={4}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                suffix="MAS"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                prefix={<ClockCircleOutlined />}
                title="Current Period"
                value={currentPeriod}
                formatter={(val) => val}
                valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Transfers Table */}
        <Card
          title={`Scheduled Transfers (${transfers.length})`}
          extra={
            <Space>
              <Button
                type="primary"
                shape="round"
                icon={<PlusOutlined />}
                onClick={() => setTransferModalOpen(true)}
              >
                Transfer
              </Button>
              <Button
                title="Refresh"
                type="text"
                shape="circle"
                icon={<SyncOutlined spin={dataLoading} />}
                onClick={fetchContractData}
                disabled={dataLoading}
              />
            </Space>
          }
        >
          <Table
            style={{ cursor: 'pointer' }}
            columns={columns}
            onRow={(record) => ({
              onClick: () => handleViewTransfer(record),
            })}
            dataSource={transfers}
            loading={transferCount === 0 && dataLoading}
            rowKey="id"
            pagination={{
              responsive: true,
              // hideOnSinglePage: true,
              showLessItems: true,
              pageSizeOptions: [5, 10, 25, 50, 100],
              showSizeChanger: true,
              defaultPageSize: 10,
              pageSize: 10,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} transfers`,
            }}
            scroll={{ x: 970 }}
          />
        </Card>
      </Space>

      {/* New Transfer Modal */}
      <Modal
        title={
          <Space>
            <DoubleRightOutlined />
            Schedule Transfer
          </Space>
        }
        open={transferModalOpen}
        onCancel={() => {
          setTransferModalOpen(false);
          form.resetFields();
          setCalculatedPeriod(null);
        }}
        footer={null}
        width={600}
      >
        <Divider />
        <Form
          form={form}
          onFinish={handleScheduleTransfer}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Spin spinning={loading} tip="Transaction in progress...">
            <Form.Item
              name="recipient"
              label="Recipient Address"
              hasFeedback
              rules={[
                { required: true },
                { validator: validateRecipientAddress },
              ]}
            >
              <Input
                placeholder="Recipient Address (AS1... or AU1...)"
                allowClear
              />
            </Form.Item>

            <Form.Item
              name="amount"
              hasFeedback
              label={
                <Space>
                  Amount (MAS)
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    (Balance: {formatMas(balance || 0n)} MAS)
                  </Text>
                </Space>
              }
              rules={[{ required: true }, { validator: validateAmount }]}
            >
              <Input type="number" step="0.001" placeholder="Amount (MAS)" />
            </Form.Item>

            <Form.Item label="Execution Time">
              <DatePicker
                showTime
                allowClear
                showNow={false}
                placeholder="Select date and time"
                style={{ width: '100%' }}
                onChange={handleDateTimeChange}
                disabledDate={(current) =>
                  current && current.isBefore(dayjs(), 'day')
                }
                disabledTime={(current) => {
                  if (!current || !current.isSame(dayjs(), 'day')) {
                    return {}; // No restrictions for future dates
                  }
                  const now = dayjs();
                  return {
                    disabledHours: () =>
                      Array.from({ length: now.hour() }, (_, i) => i),
                    disabledMinutes: (selectedHour) =>
                      selectedHour === now.hour()
                        ? Array.from({ length: now.minute() }, (_, i) => i)
                        : [],
                    disabledSeconds: (selectedHour, selectedMinute) =>
                      selectedHour === now.hour() &&
                      selectedMinute === now.minute()
                        ? Array.from({ length: now.second() }, (_, i) => i)
                        : [],
                  };
                }}
              />
            </Form.Item>

            {calculatedPeriod && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Period Calculation"
                description={
                  <div>
                    <p>
                      <strong>Periods to add:</strong>{' '}
                      {calculatedPeriod.periodsToAdd + PERIOD_BUFFER}
                    </p>
                    <p>
                      <strong>Target Period:</strong>{' '}
                      {calculatedPeriod.targetPeriod} (±{PERIOD_BUFFER} buffer)
                    </p>
                    <p>
                      <strong>Estimated execution:</strong>{' '}
                      {calculatedPeriod.estimatedExecutionTime.format(
                        'MMM D, YYYY [at] h:mm:ss A',
                      )}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      <em>
                        Note: Execution time may vary by ±{' '}
                        {PERIOD_BUFFER * MASSA_PERIOD_DURATION} sec due to
                        network timing
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
              extra={`Current period: ${currentPeriod}. Each period = ${MASSA_PERIOD_DURATION}s. You can manually override the calculated period.`}
              rules={[
                { required: true },
                { validator: validateScheduledPeriod },
              ]}
            >
              <Input type="number" placeholder={`Period (>${currentPeriod})`} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button
                  shape="round"
                  onClick={() => setTransferModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  htmlType="submit"
                  loading={loading}
                  icon={<DoubleRightOutlined />}
                >
                  Schedule
                </Button>
              </Space>
            </Form.Item>
          </Spin>
        </Form>
      </Modal>

      {/* Transfer Details Modal */}
      <Modal
        title={
          <Space>
            Transfer Details
            <Tag color="blue">#{selectedTransfer?.id}</Tag>
          </Space>
        }
        open={transferDetailsModalOpen}
        onCancel={() => setTransferDetailsModalOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setTransferDetailsModalOpen(false)}
          >
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedTransfer && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Addresses with directional arrow */}
            <Row gutter={[16, 16]} align="middle">
              <Col span={10}>
                <Card size="small" title="Sender">
                  <Text copyable style={{ fontFamily: 'monospace' }}>
                    {selectedTransfer.sender}
                  </Text>
                </Card>
              </Col>
              <Col span={4}>
                <Row justify="center" align="middle" style={{ height: '100%' }}>
                  <DoubleRightOutlined
                    style={{
                      fontSize: '20px',
                      color: selectedTransfer.executed ? '#52c41a' : '#1890ff',
                      padding: '10px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '50%',
                    }}
                  />
                </Row>
              </Col>
              <Col span={10}>
                <Card size="small" title="Recipient">
                  <Text copyable style={{ fontFamily: 'monospace' }}>
                    {selectedTransfer.recipient}
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* Transfer Details */}
            <Card size="small" title="Summary">
              <Descriptions
                size="middle"
                column={1}
                layout="horizontal"
                contentStyle={{
                  textAlign: 'right',
                  justifyContent: 'flex-end',
                  display: 'flex',
                }}
                items={[
                  {
                    key: 'amount',
                    label: 'Amount',
                    children: (
                      <Text
                        strong
                        style={{ fontSize: '18px', color: '#1890ff' }}
                      >
                        {formatMas(selectedTransfer.amount)} MAS
                      </Text>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    children: selectedTransfer.executed ? (
                      <Tag color="success">Executed</Tag>
                    ) : selectedTransfer.scheduledPeriod <= currentPeriod ? (
                      <Tag color="warning">Ready</Tag>
                    ) : (
                      <Tag color="processing">Pending</Tag>
                    ),
                  },
                  {
                    key: 'created',
                    label: 'Created',
                    children: (
                      <Text>
                        {dayjs(selectedTransfer.createdAt).format(
                          'MMM D, YYYY h:mm A',
                        )}
                      </Text>
                    ),
                  },
                  {
                    key: 'period',
                    label: 'Scheduled Period',
                    children: <Text>{selectedTransfer.scheduledPeriod}</Text>,
                  },
                  {
                    key: 'execution',
                    label: 'Execution Time',
                    children: (
                      <Space
                        direction="vertical"
                        size={0}
                        style={{ textAlign: 'right' }}
                      >
                        {selectedTransfer.executed ? (
                          selectedTransfer.executedAt ? (
                            <>
                              <Text strong>
                                {dayjs(selectedTransfer.executedAt).format(
                                  'MMM D, YYYY h:mm:ss A',
                                )}
                              </Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: '11px' }}
                              >
                                {dayjs(selectedTransfer.executedAt).fromNow()}
                              </Text>
                            </>
                          ) : (
                            <Text strong>Unknown</Text>
                          )
                        ) : (
                          <>
                            <Text strong>
                              {(() => {
                                const estimated = getEstimatedExecutionTime(
                                  selectedTransfer.scheduledPeriod,
                                );
                                return estimated === 'Ready to execute'
                                  ? 'Ready now'
                                  : estimated.format('MMM D, YYYY h:mm:ss A');
                              })()}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {getTimeRemaining(
                                selectedTransfer.scheduledPeriod,
                              )}
                            </Text>
                          </>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />

              {/* Network timing note for pending transfers */}
              {!selectedTransfer.executed && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <em>
                      Note: Execution time may vary by ±{' '}
                      {PERIOD_BUFFER * MASSA_PERIOD_DURATION} sec due to network
                      timing
                    </em>
                  </Text>
                </div>
              )}
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
}
