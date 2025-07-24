import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

// Try to read contract address from config file
let CONTRACT_ADDRESS = 'AS17YtGELtp2ug9VTAU8GLPzPHAtHzgdFty4CSwDgChBqQPDqVi3'; // Fallback address

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
    .addU64(futureperiod)
    .serialize();
  const operation = await contract.call('scheduleTransfer', scheduleArgs, {
    coins: transferAmount,
  });

  console.log('⌛ Waiting for operation to complete...');

  await operation.waitSpeculativeExecution();

  console.log('✅ Transfer scheduled successfully!');

  // Wait a moment and then check the contract state
  console.log('\n📊 Checking contract state...');

  // Get transfer count - function takes no parameters
  const countResult = await contract.read('getTransferCount');
  // Use Args to deserialize the response
  const countArgs = new Args(countResult.value);
  const transferCount = countArgs.nextU64();
  console.log('Total transfers:', transferCount.toString());

  // Get contract balance - function takes no parameters
  const balanceResult = await contract.read('getContractBalance', new Args());
  const balanceArgs = new Args(balanceResult.value);
  const balance = balanceArgs.nextU64();
  console.log('Contract balance:', (Number(balance) / 1e9).toFixed(9), 'MAS');

  // Get details of last transfer
  const transferArgs = new Args().addU64(transferCount).serialize(); // Get last transfer (ID = transferCount)
  const transferResult = await contract.read('getTransfer', transferArgs);
  // The transfer details are returned as a string, so we can use bytesToStr
  const transferDetails = new Args(transferResult.value).nextString();
  console.log('Last transfer details:', transferDetails);

  console.log('\n🎉 Demo completed successfully!');
  console.log(
    `\nThe transfer will be automatically executed at period ${futureperiod}`,
  );
  console.log('You can monitor this using the React frontend.');
} catch (error) {
  console.error('❌ Error during demo:', error);
}
