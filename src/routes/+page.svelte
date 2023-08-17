<script>
	import { socket } from "./socket";

	import Chat from "./Chat.svelte";
	import FileTransfer from "./FileTransfer.svelte";

	let id;
	let handle;
	let users = [];

	function changeHandle() {
		socket.emit("changeHandle", handle);
	}

	socket.on("connect", function () {
		id = socket.id;
		handle = id;
	});

	socket.on("updateUsers", update => {
		users = Object.entries(update).map(([id, { handle }]) => ({ id, handle }));
	});
</script>

<svelte:head>
	<title>RabbitChat</title>
	<meta name="description" content="Chat app using web sockets" />
</svelte:head>

<section>
	<header>
		<h1>RabbitChat</h1>
	</header>
	<main>
		<div class="usersContainer">
			<form on:submit={changeHandle}>
				<input id="handle" type="text" placeholder="Handle" bind:value={handle} />
				<button on:click={changeHandle}>Change</button>
			</form>
			Users
			<ul class="users">
				{#each users as user}
					{#if user.id !== id}
						<li key={user.id}>
							{user.handle}
						</li>
					{/if}
				{/each}
			</ul>
			<FileTransfer {id} {users} />
		</div>
		<div class="chatContainer">
			<Chat {handle} />
		</div>
	</main>
</section>

<style lang="scss">
	header {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	main {
		width: 800px;
		height: calc(100vh - 150px);
		min-height: 455px;
		display: flex;
		gap: 10px;
	}

	.chatContainer {
		width: 100%;
	}

	@mixin containerBox {
		background: #444;
		border-radius: 5px;
	}

	.usersContainer {
		@include containerBox;

		padding: 10px;
	}
</style>
