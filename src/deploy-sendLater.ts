import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';

try {
  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);

  console.log('🚀 Deploying SendLater Contract...');
  console.log('Deployer address:', account.address.toString());

  const byteCode = getScByteCode('build', 'SendLater.wasm');

  // Constructor doesn't need arguments - just initializes the contract
  const constructorArgs = new Args();

  const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    { coins: Mas.fromString('0.2') }, // fund contract enough for async operations
  );

  console.log('✅ SendLater contract deployed successfully!');
  console.log('📄 Contract Address:', contract.address);
  console.log('🔧 Next Steps:');
  console.log('1. Update demo-sendLater.ts with the contract address');
  console.log(
    '2. Update contract address in your React app configuration if needed',
  );
  console.log('3. Run the demo: npm run demo');
} catch (error) {
  console.error('❌ Deployment failed:', error);
}
