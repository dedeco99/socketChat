import { Server } from "socket.io";

export default function injectSocketIO(server) {
	const io = new Server(server);

	const users = {};

	const socketToRoom = {};

	io.on("connection", socket => {
		console.log("Connected", socket.id);

		// Chat
		socket.on("typing", data => {
			socket.broadcast.emit("typing", data);
		});

		socket.on("message", message => {
			console.log(message);
			io.emit("message", message);
		});

		// File Transfer
		socket.on("userConnected", roomId => {
			console.log(socket.id, "joined room", roomId);

			if (users[roomId]) {
				users[roomId].push(socket.id);

				socket.join(roomId);
				socket.emit("roomJoined", roomId);
			} else {
				users[roomId] = [socket.id];

				socket.join(roomId);
				socket.emit("roomCreated", roomId);
			}
			console.log(users);
		});

		socket.on("startCall", roomId => {
			socket.broadcast.to(roomId).emit("startCall");
		});

		socket.on("createOffer", event => {
			socket.broadcast.to(event.roomId).emit("createOffer", event.sdp);
		});

		socket.on("createAnswer", event => {
			socket.broadcast.to(event.roomId).emit("createAnswer", event.sdp);
		});

		socket.on("sendIceCandidate", event => {
			socket.broadcast.to(event.roomId).emit("sendIceCandidate", event);
		});

		socket.on("disconnect", () => {
			console.log(socket.id, "disconnected");
			const roomId = socketToRoom[socket.id];
			let room = users[roomId];
			if (room) {
				room = room.filter(id => id !== socket.id);
				users[roomId] = room;

				for (const user of users[roomId]) {
					const usersInThisRoom = users[roomId].filter(id => id !== user);

					io.to(user).emit("usersInRoom", usersInThisRoom);
				}
			}
			console.log(users);
		});
	});
}
