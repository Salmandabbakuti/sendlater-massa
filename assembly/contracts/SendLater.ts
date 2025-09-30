import {
  Context,
  generateEvent,
  Storage,
  asyncCall,
  Slot,
  transferCoins,
  balance,
  Address,
  validateAddress,
} from '@massalabs/massa-as-sdk';
import {
  stringToBytes,
  u64ToBytes,
  bytesToU64,
  Args,
  Serializable,
  Result,
} from '@massalabs/as-types';

// Constants for asyncCall gas and fee
const ASYNC_CALL_GAS: u64 = 2_100_000;
const ASYNC_CALL_FEE: u64 = 1;

// Storage keys
const TRANSFER_COUNT_KEY = stringToBytes('transfer_count');

/**
 * Transfer class that implements Serializable interface
 * Represents a scheduled transfer with all its properties
 */
export class Transfer implements Serializable {
  constructor(
    public id: u64 = 0,
    public recipient: string = '',
    public amount: u64 = 0,
    public scheduledPeriod: u64 = 0,
    public sender: string = '',
    public executed: bool = false,
    public createdAt: u64 = 0,
    public executedAt: u64 = 0,
  ) {}

  // Serialize transfer data to bytes for storage
  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.id)
      .add(this.recipient)
      .add(this.amount)
      .add(this.scheduledPeriod)
      .add(this.sender)
      .add(this.executed)
      .add(this.createdAt)
      .add(this.executedAt)
      .serialize();
  }

  // Deserialize transfer data from bytes
  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);
    this.id = args.nextU64().expect("Can't deserialize id.");
    this.recipient = args.nextString().expect("Can't deserialize recipient.");
    this.amount = args.nextU64().expect("Can't deserialize amount.");
    this.scheduledPeriod = args
      .nextU64()
      .expect("Can't deserialize scheduledPeriod.");
    this.sender = args.nextString().expect("Can't deserialize sender.");
    this.executed = args.nextBool().expect("Can't deserialize executed.");
    this.createdAt = args.nextU64().expect("Can't deserialize createdAt.");
    this.executedAt = args.nextU64().expect("Can't deserialize executedAt.");
    return new Result(args.offset);
  }
}

/**
 * Constructor - Initialize the contract
 */
export function constructor(): void {
  assert(
    Context.isDeployingContract(),
    'Constructor can only be called during deployment',
  );
  Storage.set(TRANSFER_COUNT_KEY, u64ToBytes(0));
  generateEvent(`ContractInitialized|${Context.timestamp()}`);
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
  assert(validateAddress(recipient), 'Invalid recipient address');
  assert(amount > 0, 'Transfer amount must be greater than zero');
  assert(
    scheduledPeriod > Context.currentPeriod(),
    'Scheduled period must be in the future',
  );

  // Get current transfer count
  const currentCount = _getTransferCount();
  const transferId = currentCount + 1;
  const createdAt = Context.timestamp();

  // Create the Transfer object
  const transfer = new Transfer(
    transferId,
    recipient,
    amount,
    scheduledPeriod,
    sender,
    false,
    createdAt,
    0,
  );

  // Store the serialized transfer
  const transferKey = stringToBytes(`transfer_${transferId}`);
  Storage.set(transferKey, transfer.serialize());

  // Update transfer count
  Storage.set(TRANSFER_COUNT_KEY, u64ToBytes(transferId));

  // Schedule the execution
  const startSlot = new Slot(scheduledPeriod, 0);
  const endSlot = new Slot(scheduledPeriod + 2, 0);

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
    `TransferScheduled|${transferId}|${sender}|${recipient}|${amount}|${scheduledPeriod}|${createdAt}`,
  );
}

/**
 * Cancel a scheduled transfer and refund the sender
 * Resets the scheduled period to 0 on cancelling
 */
export function cancelTransfer(binaryArgs: StaticArray<u8>): void {
  const transferId = new Args(binaryArgs)
    .nextU64()
    .expect('Transfer ID argument is missing or invalid');
  const transferKey = stringToBytes(`transfer_${transferId}`);

  // Check if the transfer exists
  assert(Storage.has(transferKey), `Transfer with id ${transferId} not found`);

  // Deserialize the transfer object
  const transferData = Storage.get(transferKey);
  const transfer = new Transfer();
  transfer.deserialize(transferData, 0);

  // check if caller is the sender of transfer
  const caller = Context.caller().toString();
  assert(caller === transfer.sender, `Only sender can cancel the transfer`);

  // Check if the transfer is already executed
  assert(!transfer.executed, `Transfer with id ${transferId} already executed`);

  // set scheduled period to 0 to cancel
  transfer.scheduledPeriod = 0;

  // Store the updated transfer
  Storage.set(transferKey, transfer.serialize());

  // Refund the sender
  const senderAddress = new Address(transfer.sender);
  transferCoins(senderAddress, transfer.amount);
  generateEvent(`TransferCancelled|${transferId}`);
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

  // check if the caller is the contract itself
  assert(
    Context.caller() == Context.callee(),
    'Only the contract can execute transfers',
  );

  assert(Storage.has(transferKey), `Transfer with id ${transferId} not found`);

  // Deserialize the transfer object
  const transferData = Storage.get(transferKey);
  const transfer = new Transfer();
  transfer.deserialize(transferData, 0);

  // Check if the transfer is scheduled
  assert(
    transfer.scheduledPeriod > 0,
    `Transfer with id ${transferId} is not scheduled`,
  );

  // Check if the transfer is already executed
  assert(!transfer.executed, `Transfer with id ${transferId} already executed`);

  // Execute the transfer
  const recipientAddress = new Address(transfer.recipient);
  transferCoins(recipientAddress, transfer.amount);

  const timestamp = Context.timestamp();
  // Mark as executed with execution timestamp
  transfer.executed = true;
  transfer.executedAt = timestamp;

  // Store the updated transfer
  Storage.set(transferKey, transfer.serialize());

  // Emit an event for the transfer execution
  generateEvent(
    `TransferExecuted|${transferId}|${transfer.recipient}|${transfer.amount}|${timestamp}`,
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
