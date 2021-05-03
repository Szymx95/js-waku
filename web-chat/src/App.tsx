import { multiaddr } from 'multiaddr';
import PeerId from 'peer-id';
import React, { useEffect, useState } from 'react';
import './App.css';
import { ChatMessage } from 'waku-chat/chat_message';
import { WakuMessage } from 'waku/waku_message';
import { RelayDefaultTopic } from 'waku/waku_relay';
import handleCommand from './command';
import Room from './Room';
import Waku from 'waku/waku';
import { WakuContext } from './WakuContext';
import { ThemeProvider } from '@livechat/ui-kit';
import { generate } from 'server-name-generator';

export const ChatContentTopic = 'dingpu';

export default function App() {
  let [stateMessages, setMessages] = useState<ChatMessage[]>([]);
  let [stateWaku, setWaku] = useState<Waku | undefined>(undefined);
  let [nick, setNick] = useState<string>(generate());

  useEffect(() => {
    const handleNewMessages = (event: { data: Uint8Array }) => {
      const chatMsg = decodeWakuMessage(event.data);
      if (chatMsg) {
        copyAndReplace([chatMsg], stateMessages, setMessages);
      }
    };

    if (!stateWaku) {
      initWaku(setWaku)
        .then(() => console.log('Waku init done'))
        .catch((e) => console.log('Waku init failed ', e));
    } else {
      stateWaku.libp2p.pubsub.on(RelayDefaultTopic, handleNewMessages);

      // To clean up listener when component unmounts
      return () => {
        stateWaku?.libp2p.pubsub.removeListener(
          RelayDefaultTopic,
          handleNewMessages
        );
      };
    }
  }, [stateWaku, stateMessages]);

  return (
    <div
      className="chat-app"
      style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      <WakuContext.Provider value={{ waku: stateWaku }}>
        <ThemeProvider>
          <Room
            nick={nick}
            lines={stateMessages}
            commandHandler={(input: string) => {
              const { command, response } = handleCommand(
                input,
                stateWaku,
                setNick
              );
              const commandMessages = response.map((msg) => {
                return new ChatMessage(new Date(), command, msg);
              });
              copyAndReplace(commandMessages, stateMessages, setMessages);
            }}
          />
        </ThemeProvider>
      </WakuContext.Provider>
    </div>
  );
}

async function initWaku(setter: (waku: Waku) => void) {
  try {
    const waku = await Waku.create({
      config: {
        pubsub: {
          enabled: true,
          emitSelf: true,
        },
      },
    });

    setter(waku);

    waku.libp2p.peerStore.addressBook.add(
      PeerId.createFromB58String(
        '16Uiu2HAmPLe7Mzm8TsYUubgCAW1aJoeFScxrLj8ppHFivPo97bUZ'
      ),
      [multiaddr('/dns4/node-01.do-ams3.jdev.misc.statusim.net/tcp/443/wss')]
    );
  } catch (e) {
    console.log('Issue starting waku ', e);
  }
}

function decodeWakuMessage(data: Uint8Array): null | ChatMessage {
  const wakuMsg = WakuMessage.decode(data);
  if (!wakuMsg.payload) {
    return null;
  }
  return ChatMessage.decode(wakuMsg.payload);
}

function copyAndReplace<T>(
  newValues: Array<T>,
  currentValues: Array<T>,
  setter: (val: Array<T>) => void
) {
  const copy = currentValues.slice();
  setter(copy.concat(newValues));
}
