const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

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
let usersInRooms = {};

app.get('/', (req, res) => {
    res.send('<h1>Hello world</h1>');
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);


    socket.on("register", (username) => {
        socket.username = username;
        console.log(`User registered: ${username}`);
    });

 
    socket.on("get_channels", () => {
        socket.emit("channels", Object.keys(channels));
    });


    socket.on("add_channel", (newChannel) => {
        if (!channels[newChannel]) {
            channels[newChannel] = [];
            io.emit("channels", Object.keys(channels));
            console.log(`Channel ${newChannel} added`);
        } else {
            console.log(`Channel ${newChannel} already exists`);
        }
    });

  
    socket.on("join_room", (data) => {
        socket.join(data.room);

        if (!usersInRooms[data.room]) {
            usersInRooms[data.room] = [];
        }

        usersInRooms[data.room].push(data.username);
        io.to(data.room).emit("user_list", usersInRooms[data.room]);

        if (channels[data.room]) {
            socket.emit("message_history", channels[data.room]);
        } else {
            console.log(`Channel ${data.room} does not exist`);
        }
    });

    socket.on("send_message", (data) => {
        if (data.room && data.message && data.author) {
            const messageData = {
                author: data.author,
                message: data.message,
                createdAt: new Date(),
            };

            channels[data.room].push(messageData);
            io.to(data.room).emit("receive_msg", messageData);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);

        for (const room in usersInRooms) {
            usersInRooms[room] = usersInRooms[room].filter(
                (username) => username !== socket.username
            );
            io.to(room).emit("user_list", usersInRooms[room]);
        }
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
