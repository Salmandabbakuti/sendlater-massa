import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
  U64,
} from '@massalabs/massa-web3';
import { Transfer } from './Transfer.js';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);
const CONTRACT_ADDRESS = 'AS1JwGjhqt1s3VWk8VsQ92TG84Mne8MM2YXUS2zAQ1crYGkoyCBf';

const contract = new SmartContract(provider, CONTRACT_ADDRESS);

console.log('🚀 Starting SendLater Demo...');

// Get current node status to determine current period
const currentSlot = await provider.client.getCurrentSlot();
console.log('Current period:', typeof currentSlot.period);

// Schedule a transfer for 11 periods in the future(approx 3 minutes from now)
// Note: The period is a 16-second interval, so 11 periods = 176 seconds
const futureperiod = BigInt(currentSlot.period) + 11n;
const recipientAddress = 'AU15bZP26cUAc2jtXStAqnobi8xQHGwnPkGzsXBcnG5tAKEANYas'; // Example address
const transferAmount = Mas.fromString('0.1'); // 0.1 MAS

console.log('\n📅 Scheduling a transfer...');
console.log('Recipient:', recipientAddress);
console.log('Amount:', '0.1 MAS');
console.log('Scheduled for period:', futureperiod.toString());

try {
  const scheduleArgs = new Args()
    .addString(recipientAddress)
    .addU64(futureperiod);
  const operation = await contract.call('scheduleTransfer', scheduleArgs, {
    coins: transferAmount,
  });

  console.log('⌛ Waiting for operation to complete...');

  await operation.waitSpeculativeExecution();

  console.log('✅ Transfer scheduled successfully!');

  // Wait a moment and then check the contract state
  console.log('\n📊 Checking contract state...');

  // Get contract balance - function takes no parameters
  const balanceResult = await contract.read('getContractBalance', new Args());
  const balanceArgs = new Args(balanceResult.value);
  const balance = balanceArgs.nextU64();
  console.log('Contract balance:', (Number(balance) / 1e9).toFixed(9), 'MAS');

  // Get transfer count - function takes no parameters
  const transferCountResult = await contract.read('getTransferCount');
  // Use Args to deserialize the response
  const transferCount = U64.fromBytes(transferCountResult.value);
  console.log('Total transfers:', transferCount.toString());

  // Get details of last transfer using Transfer class
  const getTransferArgs = new Args().addU64(transferCount); // Get last transfer (ID = transferCount)
  const transferResult = await contract.read('getTransfer', getTransferArgs);

  if (transferResult.value && transferResult.value.length > 0) {
    // Deserialize the transfer using our Transfer class
    const transfer = Transfer.fromBytes(transferResult.value);
    const transferObj = transfer.toObject();

    console.log('\n📋 Last Transfer Details:');
    console.table(transferObj);
  } else {
    console.log('❌ No transfer data found');
  }

  console.log('\n🎉 Demo completed successfully!');
  console.log(
    `\nThe transfer will be automatically executed at period ${futureperiod}`,
  );
  console.log('You can monitor this using the React frontend.');
} catch (error) {
  console.error('❌ Error during ScheduleLater demo:', error);
}
