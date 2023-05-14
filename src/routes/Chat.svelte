<script>
	import { io } from "socket.io-client";

	let messages = [];
	let message = "";
	let handle = "";
	let isTyping = [];

	const socket = io();

	socket.on("typing", user => {
		console.log(user, isTyping.includes(user));

		isTyping = isTyping.includes(user) ? isTyping.filter(u => u !== user) : [...isTyping, user];
		console.log(isTyping);
	});

	socket.on("message", message => {
		messages = [...messages, message];

		isTyping = isTyping.filter(u => u !== message.handle);

		console.log(message);
	});

	function sendIsTyping() {
		console.log(message);
		if (message === "") socket.emit("typing", handle);
	}

	function sendMessage() {
		socket.emit("message", { handle, message });
	}
</script>

<div id="chat">
	<h2>Chat</h2>
	<div id="chat-window">
		<ul>
			{#each messages as message}
				<li>{message.handle}: {message.message}</li>
			{/each}
		</ul>
	</div>
	<div id="feedback">
		{#if isTyping.length}
			{isTyping.join(", ")}
			{#if isTyping.length > 1} are {:else} is{/if} typing
		{/if}
	</div>
	<form on:submit={sendMessage}>
		<input id="handle" type="text" placeholder="Handle" bind:value={handle} />
		<input id="message" type="text" placeholder="Message" bind:value={message} on:keyup={sendIsTyping} />
		<button id="send">Send</button>
	</form>
</div>

<style>
	#chat {
		max-width: 600px;
		margin: 30px auto;
		border: 1px solid #ddd;
		box-shadow: 1px 3px 5px rgba(0, 0, 0, 0.05);
		border-radius: 2px;
	}

	#chat-window {
		height: 400px;
		overflow: auto;
	}

	label {
		box-sizing: border-box;
		display: block;
		padding: 10px 20px;
	}

	input {
		padding: 10px 20px;
		box-sizing: border-box;
		background: #142634;
		color: white;
		border: 0;
		display: block;
		width: 100%;
		border-bottom: 1px solid #eee;
		font-family: Nunito;
		font-size: 16px;
	}

	button {
		background: #ddca7e;
		font-size: 18px;
		border: 0;
		padding: 12px 0;
		width: 100%;
		border-radius: 0 0 2px 2px;
	}
</style>
