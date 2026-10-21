import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function Chat({ socket, username, room }) {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    const [newChannel, setNewChannel] = useState("");
    const [channels, setChannels] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(room);
    const [users, setUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [connected, setConnected] = useState(socket.connected);

    const typingTimeouts = useRef({});   // expiration locale de l'indicateur de chaque utilisateur
    const stopTypingTimer = useRef(null); // délai avant d'annoncer qu'on a arrêté d'écrire
    const isTypingRef = useRef(false);

    // ---------- Indicateur de saisie (envoi) ----------

    const emitTyping = (isTyping) => {
        if (selectedChannel) {
            socket.emit("typing", { channel: selectedChannel, isTyping });
        }
    };

    const stopTyping = () => {
        clearTimeout(stopTypingTimer.current);
        if (isTypingRef.current) {
            emitTyping(false);
            isTypingRef.current = false;
        }
    };

    const handleInputChange = (event) => {
        const value = event.target.value;
        setCurrentMessage(value);

        if (value === "") {
            stopTyping();
            return;
        }

        if (!isTypingRef.current) {
            emitTyping(true);
            isTypingRef.current = true;
        }

        clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = setTimeout(stopTyping, 2000);
    };

    // ---------- Actions ----------

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && selectedChannel) {
            const messageData = {
                room: selectedChannel,
                author: username,
                message: currentMessage,
            };
            stopTyping();
            socket.emit("send_message", messageData);
            setMessageList((list) => [...list, messageData]);
            setCurrentMessage("");
        }
    };

    const addChannel = () => {
        if (newChannel.trim() !== "") {
            socket.emit("add_channel", newChannel.trim());
            setNewChannel("");
        }
    };

    // ---------- Écouteurs socket (messages, présence, saisie) ----------

    useEffect(() => {
        const handleReceive = (data) => {
            setMessageList((list) => [...list, data]);
            // un message reçu = cette personne a fini d'écrire
            setTypingUsers((list) => list.filter((name) => name !== data.author));
        };

        const handleHistory = (messages) => {
            setMessageList(messages);
        };

        const handleUserList = ({ channel, users }) => {
            if (channel === selectedChannel) setUsers(users);
        };

        const handleUserTyping = ({ channel, username: who, isTyping }) => {
            if (channel !== selectedChannel) return;

            clearTimeout(typingTimeouts.current[who]);

            if (isTyping) {
                setTypingUsers((list) => (list.includes(who) ? list : [...list, who]));
                // sécurité : on efface l'indicateur au bout de 4 s sans nouvelles
                typingTimeouts.current[who] = setTimeout(() => {
                    setTypingUsers((list) => list.filter((name) => name !== who));
                }, 4000);
            } else {
                setTypingUsers((list) => list.filter((name) => name !== who));
            }
        };

        socket.on("receive_msg", handleReceive);
        socket.on("message_history", handleHistory);
        socket.on("user_list", handleUserList);
        socket.on("user_typing", handleUserTyping);

        return () => {
            socket.off("receive_msg", handleReceive);
            socket.off("message_history", handleHistory);
            socket.off("user_list", handleUserList);
            socket.off("user_typing", handleUserTyping);
        };
    }, [socket, selectedChannel]);

    // ---------- Rejoindre le channel sélectionné ----------
    // (doit rester APRÈS l'effet des écouteurs, pour ne pas rater l'historique)

    useEffect(() => {
        if (!selectedChannel) return;

        setMessageList([]);
        setUsers([]);
        setTypingUsers([]);
        Object.values(typingTimeouts.current).forEach(clearTimeout);
        typingTimeouts.current = {};

        socket.emit("join_channel", selectedChannel);

        return () => {
            clearTimeout(stopTypingTimer.current);
            isTypingRef.current = false;
        };
    }, [socket, selectedChannel]);

    // ---------- Perte / retour de connexion ----------
    // Après une coupure (ou un redémarrage du serveur), le socket reçoit un
    // nouvel identifiant : il faut se ré-enregistrer puis rejoindre le channel.

    useEffect(() => {
        const handleConnect = () => {
            setConnected(true);
            socket.emit("register", username, () => {
                socket.emit("get_channels");
                if (selectedChannel) socket.emit("join_channel", selectedChannel);
            });
        };
        const handleDisconnect = () => {
            setConnected(false);
            setUsers([]);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };
    }, [socket, username, selectedChannel]);

    // ---------- Liste des channels ----------

    useEffect(() => {
        socket.emit("get_channels");
        const handleChannels = (channelsList) => {
            setChannels(channelsList);
        };
        socket.on("channels", handleChannels);

        return () => {
            socket.off("channels", handleChannels);
        };
    }, [socket]);

    // ---------- Texte "est en train d'écrire" ----------

    let typingText = "";
    if (typingUsers.length === 1) {
        typingText = `${typingUsers[0]} écrit...`;
    } else if (typingUsers.length === 2) {
        typingText = `${typingUsers[0]} et ${typingUsers[1]} écrivent...`;
    } else if (typingUsers.length > 2) {
        typingText = "Plusieurs personnes écrivent...";
    }

    return (
        <div className="chat-container">
            <div className="chat-header"></div>

            <div className="channel-list">
                <h4>Channels existants</h4>
                <ul>
                    {channels.map((channel) => (
                        <li
                            key={channel}
                            className={channel === selectedChannel ? "active" : ""}
                            onClick={() => setSelectedChannel(channel)}
                        >
                            {channel}
                        </li>
                    ))}
                </ul>

                <div className="channel-management">
                    <h4>Ajouter un nouveau channel</h4>
                    <input
                        type="text"
                        placeholder="Nom du salon"
                        value={newChannel}
                        onChange={(event) => setNewChannel(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") addChannel();
                        }}
                    />
                    <button onClick={addChannel}>Ajouter un channel</button>
                </div>

                <div className="channel-management">
                    <h4>En ligne ({users.length})</h4>
                    <ul className="users">
                        {users.map((user) => (
                            <li key={user}>
                                {user}
                                {user === username ? " (toi)" : ""}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="chat-body">
                {!connected && (
                    <div className="status">Connexion perdue... reconnexion en cours</div>
                )}
                {messageList
                    .filter((message) => message.room === selectedChannel)
                    .map((messageContent, index) => (
                        <div
                            key={index}
                            className={`message ${messageContent.author === username ? "mine" : "theirs"}`}
                        >
                            <p>
                                <strong>{messageContent.author}:</strong> {messageContent.message}
                            </p>
                        </div>
                    ))}

                <div className="chat-footer">
                    <div className="typing">{typingText}</div>
                    <div className="chat-input-row">
                        <input
                            type="text"
                            value={currentMessage}
                            placeholder="Ecrivez-ici..."
                            onChange={handleInputChange}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") sendMessage();
                            }}
                        />
                        <button onClick={sendMessage}>&#9658;</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chat;