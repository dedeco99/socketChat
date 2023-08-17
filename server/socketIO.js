import { Server } from "socket.io";

const sockets = {};

export default function injectSocketIO(server) {
	const io = new Server(server);

	io.on("connection", socket => {
		console.log("Connected", socket.id);

		sockets[socket.id] = { handle: socket.id };

		io.emit("updateUsers", sockets);

		socket.on("disconnecting", () => {
			console.log("Disconnected", socket.id);

			delete sockets[socket.id];

			io.emit("updateUsers", sockets);
		});

		socket.on("changeHandle", handle => {
			sockets[socket.id].handle = handle;

			io.emit("updateUsers", sockets);
		});

		socket.on("joinRoom", room => {
			socket.join(room);

			const users = Array.from(io.sockets.adapter.rooms.get(room));

			io.to(room).emit("updateUsers", users);
		});

		// Chat
		socket.on("typing", data => {
			socket.broadcast.emit("typing", data);
		});

		socket.on("message", message => {
			io.emit("message", message);
		});

		// File Transfer
		socket.on("createOffer", event => {
			socket.broadcast.to(event.to).emit("receiveOffer", event);
		});

		socket.on("createAnswer", event => {
			socket.broadcast.to(event.to).emit("receiveAnswer", event);
		});

		socket.on("sendIceCandidate", event => {
			socket.broadcast.to(event.to).emit("receiveIceCandidate", event);
		});
	});
}
