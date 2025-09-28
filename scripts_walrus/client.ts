import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

export const walrusClient = new WalrusClient({
  network: 'testnet',
  suiClient,
  storageNodeClientOptions: {
    timeout: 60_000,
    onError: (error) => console.log('Node error:', error),
  },
});