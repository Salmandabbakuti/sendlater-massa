# My Massa Smart-contract Project

## Build

By default this will build all files in `assembly/contracts` directory.

```shell
npm run build
```

## Deploy a smart contract

Prerequisites :

- You must add a `.env` file at the root of the repository with the following keys set to valid values :
  - WALLET_SECRET_KEY="wallet_secret_key"
  - JSON_RPC_URL_PUBLIC=<https://test.massa.net/api/v2:33035>

These keys will be the ones used by the deployer script to interact with the blockchain.

The following command will build contracts in `assembly/contracts` directory and execute the deployment script
`src/deploy.ts`. This script will deploy on the node specified in the `.env` file.

```shell
npm run deploy
```

You can modify `src/deploy.ts` to change the smart contract being deployed, and to pass arguments to the constructor
function:

- line 31: specify what contract you want to deploy
- line 33: create the `Args` object to pass to the constructor of the contract you want to deploy

When the deployment operation is executed on-chain, the
[constructor](https://github.com/massalabs/massa-sc-toolkit/blob/main/packages/sc-project-initializer/commands/init/assembly/contracts/main.ts#L10)
function of the smart contract being deployed will
be called with the arguments provided in the deployment script.

You can edit this script and use [massa-web3 library](https://www.npmjs.com/package/@massalabs/massa-web3)
to create advanced deployment procedure.

For more information, please visit our ReadTheDocs about
[Massa smart-contract development](https://docs.massa.net/en/latest/web3-dev/smart-contracts.html).

## Unit tests

The test framework documentation is available here: [as-pect docs](https://as-pect.gitbook.io/as-pect)

```shell
npm run test
```

## Scheduled Transfer Contract

This project includes a scheduled transfer smart contract that allows users to schedule transfers of MAS tokens to be executed at future periods.

### Features

- Schedule transfers to be executed at specific future periods
- Automatic execution via async calls
- Track transfer status and history
- Built-in validation for scheduling constraints

### Deploy the Scheduled Transfer Contract

```shell
npm run deploy:scheduled-transfer
```

This will:
1. Build the contract
2. Deploy it to the Massa network
3. Save the contract address to `client/src/contract-config.json` for the frontend

### Demo the Contract

Run a demo that schedules a test transfer:

```shell
npm run demo:scheduled-transfer
```

### Frontend Usage

The React frontend provides a complete interface to:
- Schedule new transfers
- View all scheduled transfers
- Monitor transfer status
- Check contract balance

Start the frontend:

```shell
cd client
npm install
npm run dev
```

### Contract API

- `scheduleTransfer(recipient: string, scheduledPeriod: u64)`: Schedule a transfer
- `executeTransfer(transferId: StaticArray<u8>)`: Execute a scheduled transfer (called automatically)
- `getTransferCount()`: Get total number of transfers
- `getTransfer(transferId: u64)`: Get transfer details
- `getContractBalance()`: Get contract balance

## Format code

```shell
npm run fmt
```
