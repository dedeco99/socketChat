<script>
	import Chat from "./Chat.svelte";
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
		<Chat />
	</main>
</section>

<style>
	header {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	main {
		height: calc(100vh - 175px - 40px);
		min-height: 455px;
		margin-bottom: 20px;
	}
</style>
