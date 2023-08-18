<script>
	import { socket } from "./socket";

	import Chat from "./Chat.svelte";
	import FileTransfer from "./FileTransfer.svelte";

	let id;
	let handle;
	let users = [];
	let rooms = [];

	let dialog;
	let room = "";

	function changeHandle() {
		socket.emit("changeHandle", handle);
	}

	function createRoom() {
		joinRoom(room);

		dialog.close();

		room = "";
	}

	function deleteRoom(room) {
		socket.emit("deleteRoom", room);
	}

	function joinRoom(room) {
		socket.emit("joinRoom", room);
	}

	socket.on("connect", function () {
		id = socket.id;
		handle = id;
	});

	socket.on("updateUsers", update => {
		users = Object.entries(update).map(([id, { handle, rooms }]) => ({ id, handle, rooms }));
	});

	socket.on("updateRooms", update => {
		rooms = update;
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
			<form class="handleContainer" on:submit={changeHandle}>
				<input type="text" placeholder="Handle" bind:value={handle} />
				<button on:click={changeHandle}>Change</button>
			</form>
			<hr />
			Users
			<ul>
				{#each users as user}
					{#if user.id !== id}
						<li key={user.id}>
							{user.handle}
						</li>
					{/if}
				{/each}
			</ul>
			<hr />
			Rooms
			<button on:click={() => dialog.showModal()}>+</button>
			<ul>
				{#each rooms as room}
					<li key={room.id}>
						<button on:click={() => joinRoom(room.id)} disabled={room.users.includes(id)}>{room.id}</button>
						{#if room.users.includes(id)}
							<button on:click={() => deleteRoom(room.id)}>-</button>
						{/if}
					</li>
				{/each}
			</ul>
			<hr />
			<FileTransfer {id} {users} />
		</div>
		<div class="chatContainer">
			<Chat {handle} />
		</div>
		<dialog bind:this={dialog}>
			Create Room
			<br />
			<input bind:value={room} placeholder="Name" />
			<br />
			<button on:click={createRoom}>Create</button>
			<button on:click={() => dialog.close()}>Close</button>
		</dialog>
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
