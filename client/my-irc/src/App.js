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
  const [error, setError] = useState("");

  const connectUser = () => {
    const clean = username.trim();
    if (clean === "") return;

    socket.emit("register", clean, (response) => {
      if (response.ok) {
        setUsername(response.username);
        setIsUserConnected(true);
        setError("");
      } else {
        setError(response.error);
      }
    });
  };

  const joinRoom = () => {
    const clean = room.trim();
    if (clean !== "") {
      // le chat rejoint ce channel lui-même (événement join_channel)
      setRoom(clean);
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
            placeholder="Pseudo"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") connectUser();
            }}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={connectUser}>Se connecter</button>
        </div>
      ) : !isRoomJoined ? (
        <div>
          <h3>Rejoindre un salon</h3>
          <input
            type="text"
            placeholder="Code du salon"
            value={room}
            onChange={(event) => setRoom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") joinRoom();
            }}
          />
          <button onClick={joinRoom}>Rejoindre</button>
        </div>
      ) : null}

      {isUserConnected && isRoomJoined && (
        <Chat socket={socket} username={username} room={room} />
      )}
    </div>
  );
}

export default App;