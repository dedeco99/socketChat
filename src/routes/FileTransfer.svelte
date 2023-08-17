<script>
	import { socket } from "./socket";

	export let id;
	export let users;

	let showUsers = false;

	let to;
	let isSender = false;

	let filesToSend = [];
	let filesToReceive = [];
	let sendProgress = 0;
	let sendProgressMax = 0;
	let receiveProgress = 0;
	let receiveProgressMax = 0;
	let bitrate = "";
	let link = "";
	let fileName = "";
	let download = "";
	let status = "";

	let receiveBuffer = [];
	let receivedSize = 0;

	let bytesPrev = 0;
	let timestampPrev = 0;
	let timestampStart;
	let statsInterval = null;
	let bitrateMax = 0;

	const iceServers = {
		iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
	};
	let rtcPeerConnection;
	let sendChannel;
	let receiveChannel;
	let fileReader;

	function toggleUsers() {
		showUsers = !showUsers;
	}

	socket.on("receiveOffer", async event => {
		to = event.from;

		if (!isSender) {
			console.log("receive offer");

			filesToReceive = [event.file];
			console.log(event, filesToReceive);
			rtcPeerConnection = new RTCPeerConnection(iceServers);

			rtcPeerConnection.addEventListener("icecandidate", sendIceCandidate);
			rtcPeerConnection.addEventListener("datachannel", receiveChannelCallback);

			rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp));

			let sessionDescription;
			try {
				sessionDescription = await rtcPeerConnection.createAnswer();
				rtcPeerConnection.setLocalDescription(sessionDescription);
			} catch (error) {
				console.error(error);
			}
			console.log("send answer");
			socket.emit("createAnswer", {
				type: "createAnswer",
				from: id,
				to,
				sdp: sessionDescription,
			});
		}
	});

	socket.on("receiveAnswer", event => {
		console.log("receive answer");
		rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp));
	});

	socket.on("receiveIceCandidate", event => {
		console.log("receive ice candidate");
		if (rtcPeerConnection) {
			var candidate = new RTCIceCandidate({
				sdpMLineIndex: event.label,
				candidate: event.candidate,
			});

			rtcPeerConnection.addIceCandidate(candidate);
		}
	});

	async function connect(user, event) {
		to = user;

		if (event.target.files) {
			filesToSend = event.target.files;

			const file = filesToSend[0];

			rtcPeerConnection = new RTCPeerConnection(iceServers);
			console.log("Created local peer connection object rtcPeerConnection");

			sendChannel = rtcPeerConnection.createDataChannel("sendDataChannel");
			sendChannel.binaryType = "arraybuffer";
			console.log("Created send data channel");

			sendChannel.addEventListener("open", onSendChannelStateChange);
			sendChannel.addEventListener("close", onSendChannelStateChange);
			sendChannel.addEventListener("error", onError);

			rtcPeerConnection.addEventListener("icecandidate", sendIceCandidate);

			let sessionDescription;
			try {
				sessionDescription = await rtcPeerConnection.createOffer();
				rtcPeerConnection.setLocalDescription(sessionDescription);
			} catch (e) {
				console.log("Failed to create session description: ", e);
			}
			console.log("send offer");
			socket.emit("createOffer", {
				type: "createOffer",
				from: id,
				to,
				sdp: sessionDescription,
				file: { name: file.name, size: file.size },
			});
		}
	}

	function sendIceCandidate(event) {
		if (event.candidate) {
			console.log("send ice candidate");
			socket.emit("sendIceCandidate", {
				from: id,
				to,
				label: event.candidate.sdpMLineIndex,
				candidate: event.candidate.candidate,
			});
		}
	}

	function onSendChannelStateChange() {
		if (sendChannel) {
			const { readyState } = sendChannel;
			console.log(`Send channel state is: ${readyState}`);
			if (readyState === "open") {
				sendData();
			}
		}
	}

	function onError(error) {
		if (sendChannel) {
			console.error("Error in sendChannel:", error);
			return;
		}
		console.log("Error in sendChannel which is already closed:", error);
	}

	function receiveChannelCallback(event) {
		console.log("Receive Channel Callback");
		receiveChannel = event.channel;
		receiveChannel.binaryType = "arraybuffer";
		receiveChannel.onmessage = onReceiveMessageCallback;
		receiveChannel.onopen = onReceiveChannelStateChange;
		receiveChannel.onclose = onReceiveChannelStateChange;

		receivedSize = 0;
		bitrateMax = 0;
		download = "";
		if (link) URL.revokeObjectURL(link);
	}

	function onReceiveMessageCallback(event) {
		const file = filesToReceive[0];

		console.log(`Received Message ${event.data.byteLength}`);
		receiveBuffer.push(event.data);
		receivedSize += event.data.byteLength;
		receiveProgress = receivedSize;
		receiveProgressMax = file.size;

		if (receivedSize === file.size) {
			const received = new Blob(receiveBuffer);
			receiveBuffer = [];

			link = URL.createObjectURL(received);
			fileName = file.name;
			download = `Click to download '${file.name}' (${file.size} bytes)`;

			bitrate = Math.round((receivedSize * 8) / (new Date().getTime() - timestampStart));

			if (statsInterval) {
				clearInterval(statsInterval);
				statsInterval = null;
			}

			closeDataChannels();
		}
	}

	function sendData() {
		const file = filesToSend[0];
		console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(" ")}`);

		// Handle 0 size files.
		status = "";
		download = "";
		if (file.size === 0) {
			bitrate = 0;
			status = "File is empty, please select a non-empty file";
			closeDataChannels();
			return;
		}
		sendProgressMax = file.size;
		const chunkSize = 16384;
		fileReader = new FileReader();
		let offset = 0;
		fileReader.addEventListener("error", error => console.error("Error reading file:", error));
		fileReader.addEventListener("abort", event => console.log("File reading aborted:", event));
		fileReader.addEventListener("load", e => {
			console.log("FileRead.onload ", e);
			sendChannel.send(e.target.result);
			offset += e.target.result.byteLength;
			sendProgress = offset;
			if (offset < file.size) {
				readSlice(offset);
			}
		});
		const readSlice = o => {
			console.log("readSlice ", o);
			const slice = file.slice(offset, o + chunkSize);
			fileReader.readAsArrayBuffer(slice);
		};
		readSlice(0);
	}

	async function onReceiveChannelStateChange() {
		if (receiveChannel) {
			const readyState = receiveChannel.readyState;
			console.log(`Receive channel state is: ${readyState}`);
			if (readyState === "open") {
				timestampStart = new Date().getTime();
				timestampPrev = timestampStart;
				statsInterval = setInterval(displayStats, 500);
				await displayStats();
			}
		}
	}

	async function displayStats() {
		if (rtcPeerConnection && rtcPeerConnection.iceConnectionState === "connected") {
			const stats = await rtcPeerConnection.getStats();
			let activeCandidatePair;
			stats.forEach(report => {
				if (report.type === "transport") {
					activeCandidatePair = stats.get(report.selectedCandidatePairId);
				}
			});
			if (activeCandidatePair) {
				if (timestampPrev === activeCandidatePair.timestamp) {
					return;
				}
				// calculate current bitrate
				const bytesNow = activeCandidatePair.bytesReceived;
				bitrate = Math.round(((bytesNow - bytesPrev) * 8) / (activeCandidatePair.timestamp - timestampPrev));
				timestampPrev = activeCandidatePair.timestamp;
				bytesPrev = bytesNow;
				if (bitrate > bitrateMax) {
					bitrateMax = bitrate;
				}
			}
		}
	}

	function closeDataChannels() {
		console.log("Closing data channels");

		if (sendChannel) {
			sendChannel.close();
			console.log(`Closed data channel with label: ${sendChannel.label}`);
			sendChannel = null;
		}

		if (receiveChannel) {
			receiveChannel.close();
			console.log(`Closed data channel with label: ${receiveChannel.label}`);
			receiveChannel = null;
		}

		rtcPeerConnection.close();
		rtcPeerConnection = null;
		console.log("Closed peer connections");

		// re-enable the file select
		filesToSend = [];
	}
</script>

<div>
	<button on:click={toggleUsers}>File Transfer</button>
	{#if showUsers}
		<ul class="users">
			{#each users as user}
				{#if user.id !== id}
					<li key={user.id}>
						<label>
							<input type="file" on:input={event => connect(user.id, event)} />
							{user.handle}
						</label>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
	{#if sendProgress}
		<div>
			Send progress:
			<progress max={sendProgressMax} value={sendProgress} />
		</div>
	{/if}
	{#if receiveProgress}
		<div>
			Receive progress:
			<progress max={receiveProgressMax} value={receiveProgress} />
		</div>
	{/if}
	{#if bitrate}
		<div id="bitrate"><strong>Current Bitrate:</strong> {bitrate} kbits/sec</div>
	{/if}
	<a href={link} download={fileName}>{download}</a>
	<span>{status}</span>
</div>

<style lang="scss">
	.users {
		input[type="file"] {
			display: none;
		}
	}
</style>
