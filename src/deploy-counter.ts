import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Deploying async-counter contract...');

const byteCode = getScByteCode('build', 'async-counter.wasm');

// Constructor doesn't need arguments - initializes to 0
const constructorArgs = new Args();

const contract = await SmartContract.deploy(
  provider,
  byteCode,
  constructorArgs,
  { coins: Mas.fromString('0.1') },
);

console.log('Contract deployed at:', contract.address);

// Start the automatic counter
await contract.call('autoIncrement', new Args(), {
  coins: Mas.fromString('0.01'),
});

console.log('Auto-increment started - counter will increment every 2 periods');
