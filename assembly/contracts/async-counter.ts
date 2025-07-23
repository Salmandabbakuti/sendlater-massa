import {
  Context,
  generateEvent,
  Storage,
  asyncCall,
  Slot,
} from '@massalabs/massa-as-sdk';
import { stringToBytes, u64ToBytes, bytesToU64 } from '@massalabs/as-types';

// Constants for asyncCall gas and fee
const ASYNC_CALL_GAS: u64 = 2_100_000;
const ASYNC_CALL_FEE: u64 = 1;
const COUNTER_KEY = stringToBytes('counter'); // Use bytes for storage key

/**
 * Constructor - Initialize the counter
 */
export function constructor(): void {
  if (!Context.isDeployingContract()) return;
  Storage.set(COUNTER_KEY, u64ToBytes(0));
  generateEvent(`Counter initialized with value: 0`);
}

/**
 * Auto increment counter and schedule next increment (like asyncHello)
 */
export function autoIncrement(): void {
  // Increment the counter
  const currentValue = _getCount();
  const newValue = currentValue + 1;
  Storage.set(COUNTER_KEY, u64ToBytes(newValue));

  generateEvent(`Counter incremented to: ${newValue}`);

  // Schedule next increment in 2 periods (same as asyncHello)
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();

  const startSlot = new Slot(currentPeriod + 2, currentThread);
  const endSlot = new Slot(currentPeriod + 3, currentThread);

  asyncCall(
    Context.callee(),
    'autoIncrement',
    startSlot,
    endSlot,
    ASYNC_CALL_GAS,
    ASYNC_CALL_FEE,
  );

  generateEvent(`Next increment scheduled for period ${currentPeriod + 2}`);
}

export function getCount(): StaticArray<u8> {
  const count = _getCount();
  return u64ToBytes(count);
}

/**
 * Get current counter value
 */
function _getCount(): u64 {
  if (Storage.has(COUNTER_KEY)) {
    return bytesToU64(Storage.get(COUNTER_KEY));
  }
  return 0;
}
