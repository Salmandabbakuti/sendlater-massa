import {
  Args,
  Mas,
  DeserializedResult,
  Serializable,
  formatMas,
} from '@massalabs/massa-web3';

/**
 * Transfer class for TypeScript client-side serialization/deserialization
 * Must match the AssemblyScript Transfer class structure
 */
export class Transfer implements Serializable<Transfer> {
  constructor(
    public id: bigint = 0n,
    public recipient: string = '',
    public amount: bigint = 0n,
    public scheduledPeriod: bigint = 0n,
    public sender: string = '',
    public executed: boolean = false,
    public createdAt: bigint = 0n,
    public executedAt: bigint = 0n,
  ) {}

  serialize(): Uint8Array {
    const data = new Args()
      .addU64(this.id)
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

  deserialize(data: Uint8Array, offset: number): DeserializedResult<Transfer> {
    const args = new Args(data, offset);

    this.id = args.nextU64();
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
  static fromBytes(data: Uint8Array): Transfer {
    const transfer = new Transfer();
    transfer.deserialize(data, 0);
    return transfer;
  }

  /**
   * Convert to a plain object for easier handling
   */
  toObject() {
    const created = new Date(Number(this.createdAt));
    const executed =
      this.executedAt > 0n ? new Date(Number(this.executedAt)) : null;

    return {
      id: Number(this.id),
      recipient: this.recipient,
      amount: `${this.getFormattedAmount()} MAS`,
      scheduledPeriod: Number(this.scheduledPeriod),
      sender: this.sender,
      executed: this.executed,
      created: created.toLocaleString(),
      executed_at: executed?.toLocaleString() || null,
    };
  }

  /**
   * Format amount to MAS with proper decimals
   */
  getFormattedAmount(): string {
    // Convert from smallest unit to MAS (assuming 9 decimals like ETH)
    const masAmount = formatMas(this.amount);
    return masAmount;
  }

  /**
   * Get execution status as human-readable string
   */
  getStatus(currentPeriod: number): 'executed' | 'ready' | 'pending' {
    if (this.executed) return 'executed';
    if (Number(this.scheduledPeriod) <= currentPeriod) return 'ready';
    return 'pending';
  }

  /**
   * Get human-readable time information
   */
  getTimeInfo() {
    const created = new Date(Number(this.createdAt));
    const executed =
      this.executedAt > 0n ? new Date(Number(this.executedAt)) : null;

    return {
      created: created.toISOString(),
      executed: executed?.toISOString() || null,
      createdFormatted: created.toLocaleString(),
      executedFormatted: executed?.toLocaleString() || null,
    };
  }
}
