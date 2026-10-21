const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"],
    },
});

let channels = {
    general: [],
};
const usersInChannels = {};           // channel -> [pseudos]
const takenUsernames = new Map();     // pseudo en minuscules -> socket.id

const MAX_CHANNEL_LENGTH = 30;

app.get('/', (req, res) => {
    res.send('<h1>Hello world</h1>');
});

// Quitte le channel courant (présence + indicateur de saisie)
function leaveCurrentChannel(socket) {
    const channel = socket.currentChannel;
    if (!channel) return;

    socket.leave(channel);
    usersInChannels[channel] = (usersInChannels[channel] || []).filter(
        (username) => username !== socket.username
    );

    io.to(channel).emit("user_list", { channel, users: usersInChannels[channel] });
    io.to(channel).emit("user_typing", {
        channel,
        username: socket.username,
        isTyping: false,
    });

    socket.currentChannel = null;
}

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Enregistrement du pseudo (unique, insensible à la casse)
    socket.on("register", (username, callback) => {
        const clean = String(username || "").trim();

        if (clean === "" || clean.length > 20) {
            return callback?.({ ok: false, error: "Pseudo invalide (1 à 20 caractères)." });
        }

        const key = clean.toLowerCase();
        const ownerId = takenUsernames.get(key);
        // pris seulement si un AUTRE socket encore connecté l'utilise
        if (ownerId && ownerId !== socket.id && io.sockets.sockets.has(ownerId)) {
            return callback?.({ ok: false, error: "Ce pseudo est déjà pris." });
        }

        if (socket.username) takenUsernames.delete(socket.username.toLowerCase());

        takenUsernames.set(key, socket.id);
        socket.username = clean;
        console.log(`User registered: ${clean}`);
        callback?.({ ok: true, username: clean });
    });

    socket.on("get_channels", () => {
        socket.emit("channels", Object.keys(channels));
    });

    socket.on("add_channel", (newChannel) => {
        const name = String(newChannel || "").trim();
        if (name === "" || name.length > MAX_CHANNEL_LENGTH) return;

        if (!channels[name]) {
            channels[name] = [];
            io.emit("channels", Object.keys(channels));
            console.log(`Channel ${name} added`);
        } else {
            console.log(`Channel ${name} already exists`);
        }
    });

    // Rejoindre un channel (au clic, ou au démarrage du chat)
    socket.on("join_channel", (channelName) => {
        const channel = String(channelName || "").trim();
        console.log(`join_channel: ${socket.username || "(non enregistré)"} -> ${channel}`);
        if (!socket.username || channel === "" || channel.length > MAX_CHANNEL_LENGTH) return;

        // le channel est créé s'il n'existe pas encore
        if (!channels[channel]) {
            channels[channel] = [];
            io.emit("channels", Object.keys(channels));
        }

        if (socket.currentChannel !== channel) {
            leaveCurrentChannel(socket);
            socket.join(channel);
            socket.currentChannel = channel;

            if (!usersInChannels[channel]) usersInChannels[channel] = [];
            if (!usersInChannels[channel].includes(socket.username)) {
                usersInChannels[channel].push(socket.username);
            }
        }

        io.to(channel).emit("user_list", { channel, users: usersInChannels[channel] });
        socket.emit("message_history", channels[channel]);
    });

    socket.on("send_message", (data) => {
        // il faut être dans le channel pour y écrire
        if (data.room && data.message && socket.username && socket.rooms.has(data.room) && channels[data.room]) {
            const messageData = {
                room: data.room,
                author: socket.username,
                message: data.message,
                createdAt: new Date(),
            };

            channels[data.room].push(messageData);
            // à tout le monde sauf l'expéditeur (il ajoute son message localement)
            socket.to(data.room).emit("receive_msg", messageData);
        }
    });

    // Indicateur "est en train d'écrire"
    socket.on("typing", ({ channel, isTyping }) => {
        if (!socket.username || !socket.rooms.has(channel)) return;

        socket.to(channel).emit("user_typing", {
            channel,
            username: socket.username,
            isTyping: Boolean(isTyping),
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);

        leaveCurrentChannel(socket);

        if (socket.username) {
            takenUsernames.delete(socket.username.toLowerCase());
        }
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});