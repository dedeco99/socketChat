import { Server } from "socket.io";

export default function injectSocketIO(server) {
	const io = new Server(server);

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
		socket.on("connected", ip => {
			console.log(socket.id, "joined", ip);

			socket.join(ip);

			const users = Array.from(io.sockets.adapter.rooms.get(ip));

			io.to(ip).emit("updateUsers", users);
		});

		socket.on("startCall", ip => {
			socket.broadcast.to(ip).emit("startCall");
		});

		socket.on("createOffer", event => {
			socket.broadcast.to(event.ip).emit("receiveOffer", event);
		});

		socket.on("createAnswer", event => {
			socket.broadcast.to(event.ip).emit("receiveAnswer", event);
		});

		socket.on("sendIceCandidate", event => {
			socket.broadcast.to(event.ip).emit("receiveIceCandidate", event);
		});

		socket.on("disconnecting", () => {
			const ip = Array.from(socket.rooms)[1];

			console.log(socket.id, "disconnected", ip);

			const room = io.sockets.adapter.rooms.get(ip);
			if (room) {
				const users = Array.from(room).filter(id => id !== socket.id);

				io.to(ip).emit("updateUsers", users);
			}
		});
	});
}
