import { bytesToStr, JsonRPCClient } from '@massalabs/massa-web3';
import { useEffect, useState } from 'react';
import { MassaLogo } from '@massalabs/react-ui-kit';
import './App.css';

const massaClient = JsonRPCClient.buildnet();
const CONTRACT_ADDRESS = 'AS1NJdcsVY7joSCTvMTZnfEPuq1yhw7pNE48Arn1H5gQTsXV5Ss5'; // TODO Update with your deployed contract address
const GREETING_KEY = 'greeting_key';

export default function App() {
  const [greeting, setGreeting] = useState(null);
  useEffect(() => {
    getGreeting();
  }, []);

  async function getGreeting() {
    if (massaClient) {
      const dataStoreVal = await massaClient.getDatastoreEntry(
        GREETING_KEY,
        CONTRACT_ADDRESS,
        false,
      );
      const greetingDecoded = dataStoreVal ? bytesToStr(dataStoreVal) : null;
      setGreeting(greetingDecoded);
    }
  }

  return (
    <div className="App">
      <MassaLogo className="logo" size={100} />
      <h2>Greeting message:</h2>
      <h1>{greeting}</h1>
    </div>
  );
}
