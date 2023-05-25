<script>
	import { socket } from "./socket";

	const users = [];
	let roomId = "teste";
	let isRoomCreator = false;

	let files = [];
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
	let localConnection;
	let remoteConnection;
	let sendChannel;
	let receiveChannel;
	let fileReader;

	async function connect() {
		localConnection = new RTCPeerConnection(); // iceServers
		console.log("Created local peer connection object localConnection");

		sendChannel = localConnection.createDataChannel("sendDataChannel");
		sendChannel.binaryType = "arraybuffer";
		console.log("Created send data channel");

		sendChannel.addEventListener("open", onSendChannelStateChange);
		sendChannel.addEventListener("close", onSendChannelStateChange);
		sendChannel.addEventListener("error", onError);

		localConnection.addEventListener("icecandidate", async event => {
			console.log("Local ICE candidate: ", event.candidate);
			await remoteConnection.addIceCandidate(event.candidate);
		});

		remoteConnection = new RTCPeerConnection(); // iceServers
		console.log("Created remote peer connection object remoteConnection");

		remoteConnection.addEventListener("icecandidate", async event => {
			console.log("Remote ICE candidate: ", event.candidate);
			await localConnection.addIceCandidate(event.candidate);
		});
		remoteConnection.addEventListener("datachannel", receiveChannelCallback);

		try {
			const offer = await localConnection.createOffer();
			await gotLocalDescription(offer);
		} catch (e) {
			console.log("Failed to create session description: ", e);
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
		console.log(`Received Message ${event.data.byteLength}`);
		receiveBuffer.push(event.data);
		receivedSize += event.data.byteLength;
		receiveProgress = receivedSize;

		// we are assuming that our signaling protocol told
		// about the expected file size (and name, hash, etc).
		const file = files[0];
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

	async function gotLocalDescription(desc) {
		await localConnection.setLocalDescription(desc);
		console.log(`Offer from localConnection\n ${desc.sdp}`);
		await remoteConnection.setRemoteDescription(desc);
		try {
			const answer = await remoteConnection.createAnswer();
			await gotRemoteDescription(answer);
		} catch (e) {
			console.log("Failed to create session description: ", e);
		}
	}

	async function gotRemoteDescription(desc) {
		await remoteConnection.setLocalDescription(desc);
		console.log(`Answer from remoteConnection\n ${desc.sdp}`);
		await localConnection.setRemoteDescription(desc);
	}

	function sendData() {
		const file = files[0];
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
		receiveProgressMax = file.size;
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
		if (remoteConnection && remoteConnection.iceConnectionState === "connected") {
			const stats = await remoteConnection.getStats();
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
		sendChannel.close();
		console.log(`Closed data channel with label: ${sendChannel.label}`);
		sendChannel = null;
		if (receiveChannel) {
			receiveChannel.close();
			console.log(`Closed data channel with label: ${receiveChannel.label}`);
			receiveChannel = null;
		}
		localConnection.close();
		remoteConnection.close();
		localConnection = null;
		remoteConnection = null;
		console.log("Closed peer connections");

		// re-enable the file select
		files = [];
	}
</script>

<div>
	<ul>
		{#each users as user, index}
			<li key={u} onClick={() => callUser(u)}>
				{u}
			</li>
		{/each}
	</ul>
	<form id="fileInfo" on:submit={connect}>
		<input type="file" on:input={event => (files = event.target.files)} />
		<button disabled={!files.length} id="sendFile">Send</button>
	</form>
	<div>
		Send progress:
		<progress max={sendProgressMax} value={sendProgress} />
	</div>
	<div>
		Receive progress:
		<progress max={receiveProgressMax} value={receiveProgress} />
	</div>
	<div id="bitrate"><strong>Current Bitrate:</strong> {bitrate} kbits/sec</div>
	<a href={link} download={fileName}>{download}</a>
	<span>{status}</span>
</div>
