import { Server } from "socket.io";

const sockets = {};

function getRooms(io) {
	const rooms = [];
	for (const [key, value] of io.sockets.adapter.rooms) {
		if (!sockets[key]) rooms.push({ id: key, users: Array.from(value) });
	}

	return rooms;
}

export default function injectSocketIO(server) {
	const io = new Server(server);

	io.on("connection", socket => {
		console.log("Connected", socket.id);

		sockets[socket.id] = { handle: socket.id };

		io.emit("updateUsers", sockets);

		io.emit("updateRooms", getRooms(io));

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

			io.emit("updateRooms", getRooms(io));
		});

		socket.on("leaveRoom", room => {
			socket.leave(room);

			io.emit("updateRooms", getRooms(io));
		});

		socket.on("deleteRoom", room => {
			io.socketsLeave(room);

			io.emit("updateRooms", getRooms(io));
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
