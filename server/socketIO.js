import { Server } from "socket.io";

export default function injectSocketIO(server) {
	const io = new Server(server);

	io.on("connection", socket => {
		console.log("Connected", socket.id);

		socket.on("typing", user => {
			socket.broadcast.emit("typing", user);
		});

		socket.on("message", message => {
			console.log(message);
			io.emit("message", message);
		});

		socket.on("disconnect", () => {
			console.log("Disconnected", socket.id);
		});
	});
}
