import { multiaddr } from 'multiaddr';
import PeerId from 'peer-id';
import Waku from '../../build/main/lib/waku';

function help(): string[] {
  return [
    '/nick <nickname>: set a new nickname',
    '/info: some information about the node',
    '/connect <Multiaddr>: connect to the given peer',
    '/help: Display this help',
  ];
}

function nick(
  nick: string | undefined,
  setNick: (nick: string) => void
): string[] {
  if (!nick) {
    return ['No nick provided'];
  }
  setNick(nick);
  return [`New nick: ${nick}`];
}

function info(waku: Waku | undefined): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  return [`PeerId: ${waku.libp2p.peerId.toB58String()}`];
}

function connect(peer: string | undefined, waku: Waku | undefined): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  if (!peer) {
    return ['No peer provided'];
  }
  try {
    const peerMultiaddr = multiaddr(peer);
    const peerId = peerMultiaddr.getPeerId();
    if (!peerId) {
      return ['Peer Id needed to dial'];
    }
    waku.libp2p.peerStore.addressBook.add(PeerId.createFromB58String(peerId), [
      peerMultiaddr,
    ]);
    return [
      `${peerId}: ${peerMultiaddr.toString()} added to address book, autodial in progress`,
    ];
  } catch (e) {
    return ['Invalid multiaddr: ' + e];
  }
}

function peers(waku: Waku | undefined): string[] {
  if (!waku) {
    return ['Waku node is starting'];
  }
  let response: string[] = [];
  waku.libp2p.peerStore.peers.forEach((peer, peerId) => {
    response.push(peerId + ':');
    let addresses = '  addresses: [';
    peer.addresses.forEach(({ multiaddr }) => {
      addresses += ' ' + multiaddr.toString() + ',';
    });
    addresses = addresses.replace(/,$/, '');
    addresses += ']';
    response.push(addresses);
    let protocols = '  protocols: [';
    protocols += peer.protocols;
    protocols += ']';
    response.push(protocols);
  });
  if (response.length === 0) {
    response.push('Not connected to any peer.');
  }
  return response;
}

export default function handleCommand(
  input: string,
  waku: Waku | undefined,
  setNick: (nick: string) => void
): { command: string; response: string[] } {
  let response: string[] = [];
  const args = input.split(' ');
  const command = args.shift()!;
  switch (command) {
    case '/help':
      help().map((str) => response.push(str));
      break;
    case '/nick':
      nick(args.shift(), setNick).map((str) => response.push(str));
      break;
    case '/info':
      info(waku).map((str) => response.push(str));
      break;
    case '/connect':
      connect(args.shift(), waku).map((str) => response.push(str));
      break;
    case '/peers':
      peers(waku).map((str) => response.push(str));
      break;
    default:
      response.push(`Unknown Command '${command}'`);
  }
  return { command, response };
}
