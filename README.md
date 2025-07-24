# ⏰ SendLater - Scheduled Transfers on Massa

## 🌟 Overview

SendLater is a revolutionary DeFi application that brings scheduling capabilities to cryptocurrency transfers on the Massa blockchain. Whether you want to make recurring payments, implement vesting schedules, or simply schedule a transfer, SendLater provides a secure and user-friendly solution. Set it and forget it - your transfers will execute automatically at the specified time.

**What SendLater Does Today:**
- **Schedule Future Transfers**: Set up MAS token transfers to execute at any future date and time
- **Autonomous Execution**: Transfers execute automatically using Massa's unique async smart contract capabilities
- **Transfer Management**: View, track, and monitor all your scheduled transfers in real-time
- **Secure & Transparent**: All transfers are recorded on-chain with complete audit trails
- **User-Friendly Interface**: Modern React-based dashboard for easy transfer scheduling and monitoring
- **Real-Time Updates**: Live status updates for all transfers, including pending and executed transfers

**Real-World Use Cases:**
- **Timed Payments**: Schedule payments to execute at specific dates (salary payments, contract settlements)
- **Investment Scheduling**: Automate token transfers for dollar-cost averaging or scheduled investments
- **Gift Transfers**: Schedule surprise transfers for birthdays, anniversaries, or special occasions
- **Business Payments**: Set up vendor payments or team compensations in advance
- **Escrow Services**: Create time-locked transfers for trustless transactions

![Main Dashboard](https://github.com/user-attachments/assets/649384ef-8e5f-42a3-8ed8-cd10d10e8e47)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Contract Functionalities](#contract-functionalities)
- [Screenshots](#screenshots)
- [Deployed Resources](#deployed-resources)
- [Changelog](#changelog)
- [Roadmap](#roadmap)
- [References](#references)
- [Safety & Security](#safety--security)
- [License](#license)

**Future Vision:**

While currently focused on basic transfer scheduling, SendLater is headed towards becoming a comprehensive financial automation platform. Future developments will include recurring payment templates, bill reminder integrations, multi-currency support, and advanced financial planning tools - all designed to help you maintain perfect payment discipline and optimize your financial health.

In today's fast-paced world, managing financial obligations can be challenging - missed credit card payments, forgotten utility bills, or delayed loan EMIs can significantly impact your credit score and result in costly penalties.

**The Problem We're Solving:**
- **Missed Payments**: Forgetting to pay bills on time leads to late fees and credit score damage
- **Financial Discipline**: Manual payment tracking is error-prone and time-consuming  
- **Credit Impact**: Late payments can reduce your CIBIL score and affect future loan eligibility
- **Penalty Costs**: Late fees and interest charges eat into your savings
- **Mental Stress**: Constantly remembering payment dates creates unnecessary anxiety

**The SendLater Solution:**
SendLater addresses these real-world financial challenges by enabling you to schedule payments in advance. Whether it's credit card bills, postpaid mobile payments, loan EMIs, or recurring subscriptions, you can set them up once and never worry about missing a payment again.

- **Timed Payments**: Schedule payments to execute at specific dates (salary payments, contract settlements)
- **Investment Scheduling**: Automate token transfers for dollar-cost averaging or scheduled investments
- **Gift Transfers**: Schedule surprise transfers for birthdays, anniversaries, or special occasions
- **Business Payments**: Set up vendor payments or team compensations in advance
- **Escrow Services**: Create time-locked transfers for trustless transactions
- **Financial Discipline**: Build better money management habits through automated scheduling
- **Credit Protection**: Never miss payments that could harm your credit score

## ✨ Features

### 🔐 Smart Contract Features
- **Autonomous Execution**: Transfers execute automatically using Massa's async calls
- **Secure Scheduling**: Built-in validation prevents past scheduling and unauthorized access
- **Transfer History**: Complete on-chain record of all transfers
- **Balance Management**: Real-time contract balance tracking
- **Gas Optimization**: Efficient contract design minimizing transaction costs

### 🎨 Frontend Features
- **Modern UI/UX**: Clean interface built with Ant Design components
- **Wallet Integration**: Seamless connection with Massa wallets
- **Real-time Updates**: Live status updates and balance monitoring
- **Responsive Design**: Works perfectly on desktop and mobile
- **Natural Time Display**: Human-readable time formatting ("in 2 hours", "3 days ago")
- **Transaction History**: Comprehensive transfer history with filtering
- **Copy-to-Clipboard**: Easy address and transaction ID copying

### 🚀 Advanced Features
- **Period-based Scheduling**: Precise control using Massa's period system
- **Buffer Management**: Built-in timing buffers for network reliability
- **Error Handling**: Comprehensive error handling and user feedback
- **Multi-wallet Support**: Support for multiple wallet providers
- **Dark/Light Theme**: Adaptive theming support

## 📸 Screenshots

### Main Dashboard
![Main Dashboard](https://github.com/user-attachments/assets/649384ef-8e5f-42a3-8ed8-cd10d10e8e47)

### Transfer Details
![Transfer Details](https://github.com/user-attachments/assets/eb82eec2-0980-4dc9-aa68-0971adeb2223)

### Transfer Details - Pending
![Transfer Details - Pending](https://github.com/user-attachments/assets/c4b95308-1008-47b3-8b3c-1b1a8fa0d009)

### Schedule Transfer
![Schedule Transfer](https://github.com/user-attachments/assets/52ac59b5-b358-4914-9ee5-40297504c08f)

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Massa wallet (Station, Bearby, or compatible)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Salmandabbakuti/sendlater-massa.git
   cd sendlater-massa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   PRIVATE_KEY="your_wallet_private_key"
   ```

### 🔨 Compile Contracts

Build all smart contracts:

```bash
npm run build
```

This compiles all AssemblyScript contracts in the `assembly/contracts` directory and generates WebAssembly files.

### 🚀 Deploy Contracts

Deploy the scheduled transfer contract to Massa testnet:

```bash
npm run deploy:sendLater
```

This will:
1. Build the contract
2. Deploy it to the Massa network
4. Fund the contract with initial MAS for gas fees

### 🧪 Demo & Testing

Run the demo script to test contract functionality:

```bash
npm run demo:sendLater
```

This will:
- Schedule a transfer to be executed in the future
- Show the last transfer details in the console

### 🌐 Start the Frontend

```bash
npm install

npm run dev
```
   
Visit `http://localhost:5173` to access the application.

### 🔗 Connect Your Wallet

1. Install a compatible Massa wallet (Massa Station recommended)
2. Create or import your wallet
3. Switch to Massa testnet
4. Get testnet MAS from the [Massa faucet](https://faucet.massa.net)
5. Connect your wallet to the application

## 🔧 Contract Functionalities

The SendLater smart contract provides core functionalities for scheduling and executing transfers. It uses Massa's autonomous smart contract capabilities to handle transfers at specified future periods. You can find the contract source code in the [`assembly/contracts/sendLater.ts`](assembly/contracts/sendLater.ts) file.

### Core Functions

#### `scheduleTransfer(binaryArgs: StaticArray<u8>)`
Schedules a new transfer to be executed at a future period.

**Parameters:**
- `recipient`: Massa address of the transfer recipient
- `scheduledPeriod`: Target period for execution (must be future)

**Requirements:**
- Sender must attach MAS tokens for the transfer
- Scheduled period must be in the future
- Recipient address must be valid

#### `executeTransfer(binaryArgs: StaticArray<u8>)`
Executes a scheduled transfer (called automatically by async calls).

**Parameters:**
- `transferId`: Unique identifier of the transfer to execute

**Behavior:**
- Automatically triggered when the scheduled period arrives
- Transfers tokens from contract to recipient
- Updates transfer status to executed
- Records execution timestamp

### Query Functions

#### `getTransferCount(): StaticArray<u8>`
Returns bytes representation of the number of transfers ever scheduled.

#### `getTransfer(binaryArgs: StaticArray<u8>): StaticArray<u8>`
Retrieves detailed information about a specific transfer.

**Returns:** Pipe-separated bytes string containing:
- Recipient address
- Transfer amount
- Scheduled period
- Sender address
- Execution status
- Creation timestamp
- Execution timestamp

#### `getContractBalance(): u64`
Returns the current MAS balance held by the contract.

### Data Structures

```typescript
interface Transfer {
  id: u64;
  recipient: string;
  amount: u64;
  scheduledPeriod: u64;
  sender: string;
  executed: boolean;
  createdAt: u64;
  executedAt: u64 | null;
}
```

### Decentralized Web (DWEB) Deployment

Deploy the frontend to decentralized storage. Learn more about process at [Massa DeWeb](https://docs.massa.net/docs/deweb/cli/upload).

> Note: export SECRET_KEY in your terminal before running the upload command.

```bash
export SECRET_KEY=<your_secret_key>
```

```bash
cd client

# Build the frontend
npm run build
npm run build

# Upload to DeWeb (vite project)
npx @massalabs/deweb-cli upload dist
```

After successful upload, you will get deployed address like `AS12v...2UgLS`.

Next step is to assign mns name to your deployed address:

To assign a MNS to your website navigate to [Massa Name Service](https://mns.massa.net) and register mns name like `sendlater.massa` and update the address to deployed address in previous step.

## 📍 Deployed Resources

### Smart Contracts

| Network | Contract Address | Explorer Link |
|---------|------------------|---------------|
| Massa Testnet | `AS17YtGELtp2ug9VTAU8GLPzPHAtHzgdFty4CSwDgChBqQPDqVi3` | [View on Explorer](https://test.massa.net) |
| Massa Mainnet | Coming Soon | - |

### Frontend Deployments

| Platform | URL | Status |
|----------|-----|--------|
| Vercel | [sendlater-massa.vercel.app](https://sendlater-massa.vercel.app) | ✅ Active |
| DeWeb | [sendlater.dev.massa-deweb.xyz/](https://sendlater.dev.massa-deweb.xyz/) | ✅ Active |
| IPFS | Coming Soon | 🚧 Planned |
| Arweave | Coming Soon | 🚧 Planned |

## 📝 Changelog

### V0.1.0
- Initial release with core features
- Basic transfer scheduling
- Transfers List and Details
- Automatic execution of scheduled transfers
- Frontend interface with wallet integration
- Realtime transfer status updates
- Added transfer details page

## 🗺️ Roadmap

### Phase 1: Core Features (✅ Completed)
- [x] Basic transfer scheduling
- [x] Transfers List and Details
- [x] Automatic execution of scheduled transfers
- [x] Frontend interface with wallet integration
- [x] Realtime transfer status updates

### Phase 2: TBD


## 📚 References
- [Massa Documentation](https://docs.massa.net/docs/learn/home)
- [Basic Concepts](https://docs.massa.net/docs/learn/architecture/basic-concepts)
- [AS SDK Documentation](https://docs.massa.net/docs/build/smart-contract/sdk)
- [Autonomous Smart Contracts](https://docs.massa.net/docs/build/smart-contract/async)
- [Massa Web3 Library](https://docs.massa.net/docs/build/massa-web3/intro)
- [Massa Wallet Provider](https://docs.massa.net/docs/build/wallet-provider/wallet)
- [Hello World Dapp](https://docs.massa.net/docs/build/hello-world-dapp)
- [MRC Standards Contracts](https://github.com/massalabs/massa-standards/tree/main/smart-contracts)
- [DWeb Deployment](https://docs.massa.net/docs/deweb/upload/overview)


## 🔒 Safety & Security

This is an experimental software and subject to change over time.

This is a proof of concept and is not ready for production use. It is not audited and has not been tested for security. Use at your own risk. I do not give any warranties and will not be liable for any loss incurred through any use of this codebase.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

