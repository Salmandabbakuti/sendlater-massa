import { Args } from '@massalabs/massa-web3';

/**
 * Transfer class for client-side serialization/deserialization
 * Must match the AssemblyScript Transfer class structure
 */
export class Transfer {
  constructor(
    recipient = '',
    amount = 0n,
    scheduledPeriod = 0n,
    sender = '',
    executed = false,
    createdAt = 0n,
    executedAt = 0n,
  ) {
    this.recipient = recipient;
    this.amount = amount;
    this.scheduledPeriod = scheduledPeriod;
    this.sender = sender;
    this.executed = executed;
    this.createdAt = createdAt;
    this.executedAt = executedAt;
  }

  serialize() {
    const data = new Args()
      .addString(this.recipient)
      .addU64(this.amount)
      .addU64(this.scheduledPeriod)
      .addString(this.sender)
      .addBool(this.executed)
      .addU64(this.createdAt)
      .addU64(this.executedAt)
      .serialize();
    return new Uint8Array(data);
  }

  deserialize(data, offset) {
    const args = new Args(data, offset);

    this.recipient = args.nextString();
    this.amount = args.nextU64();
    this.scheduledPeriod = args.nextU64();
    this.sender = args.nextString();
    this.executed = args.nextBool();
    this.createdAt = args.nextU64();
    this.executedAt = args.nextU64();

    return { instance: this, offset: args.getOffset() };
  }

  /**
   * Create Transfer from serialized bytes
   */
  static fromBytes(data) {
    const transfer = new Transfer();
    transfer.deserialize(data, 0);
    return transfer;
  }

  /**
   * Convert to a plain object for easier handling in React
   */
  toObject() {
    return {
      recipient: this.recipient,
      amount: Number(this.amount),
      scheduledPeriod: Number(this.scheduledPeriod),
      sender: this.sender,
      executed: this.executed,
      createdAt: Number(this.createdAt),
      executedAt: this.executedAt > 0n ? Number(this.executedAt) : null,
    };
  }
}
