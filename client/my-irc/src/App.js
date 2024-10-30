import React, { useState } from 'react';
import './App.css';
import io from 'socket.io-client';
import Chat from './Chat';

const socket = io.connect("http://localhost:3000");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [isUserConnected, setIsUserConnected] = useState(false);
  const [isRoomJoined, setIsRoomJoined] = useState(false);

  const connectUser = () => {
    if (username !== "") {
      socket.emit("register", username);
      setIsUserConnected(true);
    }
  };

  const joinRoom = () => {
    if (room !== "") {
      socket.emit("join_room", { room, username });
      setIsRoomJoined(true);
    }
  };

  return (
    <div className="App">
      {!isUserConnected ? (
        <div>
          <h3>Connexion</h3>
          <input 
            type="text" 
            placeholder='Pseudo' 
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <button onClick={connectUser}>Se connecter</button>
        </div>
      ) : !isRoomJoined ? (
        <div>
          <h3>Rejoindre un salon</h3>
          <input 
            type="text" 
            placeholder='Code du salon'
            value={room}
            onChange={(event) => setRoom(event.target.value)}
          />
          <button onClick={joinRoom}>Rejoindre</button>
        </div>
      ) : null}

      {isUserConnected && isRoomJoined && <Chat socket={socket} username={username} room={room} />}
    </div>
  );
}

export default App;
