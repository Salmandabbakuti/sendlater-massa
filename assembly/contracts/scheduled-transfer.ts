import {
  Context,
  generateEvent,
  Storage,
  asyncCall,
  Slot,
  transferCoins,
  balance,
  Address,
} from '@massalabs/massa-as-sdk';
import {
  stringToBytes,
  u64ToBytes,
  bytesToU64,
  bytesToString,
  Args,
} from '@massalabs/as-types';

// Constants for asyncCall gas and fee
const ASYNC_CALL_GAS: u64 = 2_100_000;
const ASYNC_CALL_FEE: u64 = 1;

// Storage keys
const TRANSFER_COUNT_KEY = stringToBytes('transfer_count');

/**
 * Constructor - Initialize the contract
 */
export function constructor(): void {
  if (!Context.isDeployingContract()) return;
  Storage.set(TRANSFER_COUNT_KEY, u64ToBytes(0));
  generateEvent('ScheduledTransfer contract initialized');
}

/**
 * Schedule a transfer of funds to be executed at a future period
 */
export function scheduleTransfer(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('Recipient address is missing or invalid');
  const scheduledPeriod = args
    .nextU64()
    .expect('Scheduled period is missing or invalid');
  const sender = Context.caller().toString();
  const amount = Context.transferredCoins();

  // Validate inputs
  if (amount === 0) {
    generateEvent('Error: No coins transferred');
    return;
  }

  if (scheduledPeriod <= Context.currentPeriod()) {
    generateEvent('Error: Scheduled period must be in the future');
    return;
  }

  // Get current transfer count
  const currentCount = _getTransferCount();
  const transferId = currentCount + 1;

  // Store the scheduled transfer
  const transferData = `${recipient}|${amount}|${scheduledPeriod}|${sender}|false`;
  const transferKey = stringToBytes(`transfer_${transferId}`);
  Storage.set(transferKey, stringToBytes(transferData));

  // Update transfer count
  Storage.set(TRANSFER_COUNT_KEY, u64ToBytes(transferId));

  // Schedule the execution
  const startSlot = new Slot(scheduledPeriod, 0);
  const endSlot = new Slot(scheduledPeriod + 1, 0);

  asyncCall(
    Context.callee(),
    'executeTransfer',
    startSlot,
    endSlot,
    ASYNC_CALL_GAS,
    ASYNC_CALL_FEE,
    u64ToBytes(transferId),
  );

  generateEvent(
    `Transfer scheduled: ID ${transferId}, Amount: ${amount}, Recipient: ${recipient}, Period: ${scheduledPeriod}`,
  );
}

/**
 * Execute a scheduled transfer
 */
export function executeTransfer(binaryArgs: StaticArray<u8>): void {
  const transferId = new Args(binaryArgs)
    .nextU64()
    .expect('Transfer ID argument is missing or invalid');
  generateEvent(`Executing transfer with ID: ${transferId}`);
  const transferKey = stringToBytes(`transfer_${transferId}`);

  if (!Storage.has(transferKey)) {
    generateEvent(`Error: Transfer ${transferId} not found`);
    return;
  }

  const transferData = bytesToString(Storage.get(transferKey));
  const parts = transferData.split('|');
  const recipient = parts[0];
  const amount = u64(parseInt(parts[1]));
  const executed = parts[4] === 'true';

  if (executed) {
    generateEvent(`Error: Transfer ${transferId} already executed`);
    return;
  }

  // Execute the transfer
  const recipientAddress = new Address(recipient);
  transferCoins(recipientAddress, amount);

  // Mark as executed
  const updatedData = `${parts[0]}|${parts[1]}|${parts[2]}|${parts[3]}|true`;
  Storage.set(transferKey, stringToBytes(updatedData));

  generateEvent(
    `Transfer executed: ID ${transferId}, Amount: ${amount} sent to ${recipient}`,
  );
}

/**
 * Get the total number of scheduled transfers
 */
export function getTransferCount(): StaticArray<u8> {
  const count = _getTransferCount();
  return u64ToBytes(count);
}

/**
 * Get transfer details
 */
export function getTransfer(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const transferId = new Args(binaryArgs)
    .nextU64()
    .expect('Transfer ID argument is missing or invalid');
  const transferKey = stringToBytes(`transfer_${transferId}`);
  return Storage.get(transferKey);
}

/**
 * Get contract balance
 */
export function getContractBalance(): StaticArray<u8> {
  return u64ToBytes(balance());
}

function _getTransferCount(): u64 {
  if (Storage.has(TRANSFER_COUNT_KEY)) {
    return bytesToU64(Storage.get(TRANSFER_COUNT_KEY));
  }
  return 0;
}
