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

console.log('Deploying async-hello contract...');

const byteCode = getScByteCode('build', 'async-hello.wasm');

const constructorArgs = new Args();
constructorArgs.addString('Hello World');

const contract = await SmartContract.deploy(
  provider,
  byteCode,
  constructorArgs,
  { coins: Mas.fromString('0.1') },
);

console.log('Contract deployed at:', contract.address);

// Trigger first async call
await contract.call('asyncHello', new Args(), {
  coins: Mas.fromString('0.01'),
});

console.log('Async execution started');
