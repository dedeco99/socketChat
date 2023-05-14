import { Server } from "socket.io";

export default function injectSocketIO(server) {
	const io = new Server(server);

	io.on("connection", socket => {
		console.log("Connected", socket.id);

		socket.emit("message", `${socket.id} connected`);

		socket.on("increment", () => socket.broadcast.emit("increment"));

		socket.on("decrement", () => socket.broadcast.emit("decrement"));

		socket.on("typing", data => {
			socket.broadcast.emit("typing", data);
		});

		socket.on("disconnect", () => {
			console.log("Disconnected", socket.id);
		});
	});
}
