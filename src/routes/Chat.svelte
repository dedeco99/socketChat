<script>
	import { io } from "socket.io-client";

	let animate = false;
	let messages = [];
	let message = "";
	let handle = "";
	let isTyping = [];
	let isTypingSent = false;

	const socket = io();

	socket.on("typing", data => {
		if (data.isTyping) {
			if (!isTyping.includes(data.handle)) isTyping = [...isTyping, data.handle];
		} else {
			if (isTyping.includes(data.handle)) isTyping = isTyping.filter(u => u !== data.handle);
		}
	});

	socket.on("message", message => {
		messages = [...messages, message];

		isTyping = isTyping.filter(u => u !== message.handle);

		animate = false;
		setTimeout(() => (animate = true), 100);

		goToEndOfChat();
	});

	function sendIsTyping(e) {
		if (!["Tab", "Enter"].includes(e.key) && (!isTypingSent || message === "")) {
			socket.emit("typing", { handle, isTyping: message !== "" });
			isTypingSent = message !== "";
		}
	}

	function sendMessage(e) {
		e.preventDefault();

		socket.emit("message", { handle, message });

		message = "";
		isTypingSent = false;

		goToEndOfChat();
	}

	function goToEndOfChat() {
		setTimeout(() => {
			const chat = document.getElementById("chat");
			chat.scrollTop = chat.scrollHeight;
		}, 10);
	}
</script>

<div id="chat" class="chatContainer">
	<div class="chat">
		{#each messages as message, index}
			<div
				class="message {index === messages.length - 1 && animate ? 'animate' : ''} {message.handle === handle
					? 'right'
					: ''}"
			>
				{message.handle}: {message.message}
			</div>
		{/each}
	</div>
</div>
<form class="promptContainer" on:submit={sendMessage}>
	<input id="handle" class="prompt" type="text" placeholder="Handle" bind:value={handle} />
	<input
		id="message"
		class="prompt"
		type="text"
		placeholder="Message"
		bind:value={message}
		on:keyup={sendIsTyping}
	/>
	<button type="submit">Send</button>
</form>
{#if isTyping.length}
	{isTyping.join(", ")}
	{#if isTyping.length > 1} are {:else} is{/if} typing
{/if}

<style lang="scss">
	@mixin containerBox {
		width: 600px;
		background: #444;
		border-radius: 5px;
		margin: 5px 0px;
	}

	.chatContainer {
		@include containerBox;

		height: 100%;
		overflow: auto;
		display: flex;
		justify-content: flex-end;

		.chat {
			width: 100%;
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			padding: 0px 10px;
			overflow: hidden;

			.message {
				align-self: flex-start;
				opacity: 0;
				background: #333;
				border-radius: 5px;
				padding: 10px;
				margin: 10px 0px;
				font-size: 0.85em;
				transition: background 250ms ease-in-out;

				&.right {
					align-self: flex-end;
					background-color: #555;
				}

				&.animate {
					opacity: 1;
					animation: drop 1s ease-in-out forwards, fadeIn 500ms ease-in;
				}

				&:not(:last-child) {
					opacity: 1;
				}

				&:hover {
					background: #555;
				}
			}
		}
	}

	.promptContainer {
		display: flex;
		align-items: center;
		position: relative;

		input {
			@include containerBox;

			color: white;
			font-size: 1.25em;
			margin-right: 10px;
		}

		.prompt {
			width: var(--width);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes drop {
		0% {
			transform: translateY(100%);
		}
		50% {
			transform: translateY(5%);
		}
		100% {
			transform: translateY(0%);
		}
	}
</style>
