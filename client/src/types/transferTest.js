// Simple test to verify Transfer class functionality
import { Transfer } from './Transfer.js';

// Test data
const testTransfer = new Transfer(
  'AS12345678901234567890123456789012345678901234567890123456',
  1000000000n, // 1 MAS in the smallest unit
  12345n,
  'AS98765432109876543210987654321098765432109876543210987654',
  false,
  1640995200000n, // timestamp
  0n,
);

console.log('Original transfer:', testTransfer);

// Test serialization
const serialized = testTransfer.serialize();
console.log('Serialized length:', serialized.length);

// Test deserialization
const deserialized = Transfer.fromBytes(serialized);
console.log('Deserialized transfer:', deserialized);

// Test toObject conversion
const obj = deserialized.toObject();
console.log('Object representation:', obj);

// Verify data integrity
const isValid =
  testTransfer.recipient === deserialized.recipient &&
  testTransfer.amount === deserialized.amount &&
  testTransfer.scheduledPeriod === deserialized.scheduledPeriod &&
  testTransfer.sender === deserialized.sender &&
  testTransfer.executed === deserialized.executed &&
  testTransfer.createdAt === deserialized.createdAt &&
  testTransfer.executedAt === deserialized.executedAt;

console.log('Data integrity check:', isValid ? 'PASSED' : 'FAILED');

export { testTransfer };
