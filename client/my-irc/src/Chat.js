import React, { useEffect, useState } from 'react';
import './App.css';

function Chat({ socket, username, room }) {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    const [newChannel, setNewChannel] = useState("");
    const [channels, setChannels] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(null);

    const sendMessage = async () => {
        if (currentMessage !== "" && selectedChannel) {
            const messageData = {
                room: selectedChannel,
                author: username,
                message: currentMessage,
            };
            await socket.emit("send_message", messageData);
            setMessageList((list) => [...list, messageData]);
            setCurrentMessage("");
        }
    };

    const addChannel = () => {
        if (newChannel !== "") {
            socket.emit("add_channel", newChannel);
            setNewChannel("");
        }
    };

    useEffect(() => {
        socket.on("receive_msg", (data) => {
            setMessageList((list) => [...list, data]);
        });

        socket.on("message_history", (messages) => {
            setMessageList(messages);
        });
    }, [socket]);

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

    return (
        <div>
            <div className="chat-header">
            </div>
            
            <div className="channel-list">
                <h4>Channels existants</h4>
                <ul>
                    {channels.map((channel, index) => (
                        <li key={index} onClick={() => setSelectedChannel(channel)}>{channel}</li>
                    ))}
                </ul>
                
                <div className="channel-management">
                    <h4>Ajouter un nouveau channel</h4>
                    <input 
                        type="text" 
                        placeholder='Nom du salon' 
                        value={newChannel}
                        onChange={(event) => setNewChannel(event.target.value)}
                    />
                    <button onClick={addChannel}>Ajouter un channel</button>
                </div>
            </div>

            <div className="chat-body">
                <div className='content'></div>
                {messageList
                    .filter(message => message.room === selectedChannel)
                    .map((messageContent, index) => (
                        <div key={index} className="message">
                            <p>
                                <strong>{messageContent.author}:</strong> {messageContent.message}
                            </p>
                        </div>
                    ))}
                    
                <div className="chat-footer">
                    <input 
                        type="text"
                        value={currentMessage} 
                        placeholder="Ecrivez-ici..."
                        onChange={(event) => { setCurrentMessage(event.target.value); }}
                    />
                    <button onClick={sendMessage}>&#9658;</button>
                </div>
            </div>
        </div>
    );
}

export default Chat;
