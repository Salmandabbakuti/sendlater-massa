import 'dotenv/config';
import {
  Account,
  Args,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

// Replace with your deployed contract address
const CONTRACT_ADDRESS = 'AS1pc8V7p7AKswATjnNksTw63yop2VLXVMFSzD7tw7Ffhpm2qfax';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Listening to contract events at:', CONTRACT_ADDRESS);
console.log('Press Ctrl+C to stop\n');

let lastEventCount = 0;

const checkEvents = async () => {
  try {
    // Try different event query approaches
    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
      isFinal: true,
    });

    if (events && Array.isArray(events) && events.length > lastEventCount) {
      const newEvents = events.slice(lastEventCount);

      newEvents.forEach((event) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Event: ${event.data}`);
      });

      lastEventCount = events.length;
    } else {
      console.log('No new events found');
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.log('Error getting events:', errorMessage);

    // Try with empty filter
    try {
      const allEvents = await provider.getEvents({});
      console.log(`Found ${allEvents?.length || 0} total events in network`);
    } catch (e) {
      console.log('Failed to get any events');
    }
  }
};

// Check for events every 5 seconds
setInterval(checkEvents, 5000);

// Initial check
checkEvents();
