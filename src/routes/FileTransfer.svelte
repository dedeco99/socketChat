<script>
	import { socket } from "./socket";

	const users = [];
	let roomId = "teste";
	let isRoomCreator = false;

	const iceServers = {
		iceServers: [{ urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] }],
	};
	let localStream;
	let rtcPeerConnection;

	if (typeof window !== "undefined") {
		socket.on("roomCreated", async () => {
			isRoomCreator = true;
			console.log("room created");
		});

		socket.on("roomJoined", async () => {
			socket.emit("startCall", roomId);
			console.log("room joined");
		});

		socket.on("startCall", async () => {
			console.log("start call", isRoomCreator);
			if (isRoomCreator) {
				rtcPeerConnection = new RTCPeerConnection(iceServers);

				localStream.getTracks().forEach(track => {
					rtcPeerConnection.addTrack(track, localStream);
				});

				rtcPeerConnection.ontrack = setRemoteStream;
				rtcPeerConnection.onicecandidate = sendIceCandidate;

				let sessionDescription;
				try {
					sessionDescription = await rtcPeerConnection.createOffer();
					rtcPeerConnection.setLocalDescription(sessionDescription);
				} catch (error) {
					console.error(error);
				}

				socket.emit("createOffer", {
					type: "createOffer",
					sdp: sessionDescription,
					roomId,
				});
			}
		});

		socket.on("createOffer", async event => {
			console.log("create offer");
			if (!isRoomCreator) {
				rtcPeerConnection = new RTCPeerConnection(iceServers);

				localStream.getTracks().forEach(track => {
					rtcPeerConnection.addTrack(track, localStream);
				});

				rtcPeerConnection.ontrack = setRemoteStream;
				rtcPeerConnection.onicecandidate = sendIceCandidate;
				rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

				let sessionDescription;
				try {
					sessionDescription = await rtcPeerConnection.createAnswer();
					rtcPeerConnection.setLocalDescription(sessionDescription);
				} catch (error) {
					console.error(error);
				}

				socket.emit("createAnswer", {
					type: "createAnswer",
					sdp: sessionDescription,
					roomId,
				});
			}
		});

		socket.on("createAnswer", event => {
			console.log("create answer");
			rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
		});

		socket.on("sendIceCandidate", event => {
			console.log("send ice candidate");
			if (rtcPeerConnection) {
				var candidate = new RTCIceCandidate({
					sdpMLineIndex: event.label,
					candidate: event.candidate,
				});

				rtcPeerConnection.addIceCandidate(candidate);
			}
		});

		init();
	}

	async function init() {
		localStream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		});

		const localVideoElement = document.getElementById("localVideo");
		localVideoElement.srcObject = localStream;
	}

	async function userConnected() {
		socket.emit("userConnected", roomId);
	}

	async function callUser() {
		socket.emit("callUser", roomId);
	}

	function setRemoteStream(event) {
		const remoteVideoElement = document.getElementById("remoteVideo");
		remoteVideoElement.srcObject = event.streams[0];
	}

	function sendIceCandidate(event) {
		if (event.candidate) {
			socket.emit("sendIceCandidate", {
				roomId,
				label: event.candidate.sdpMLineIndex,
				candidate: event.candidate.candidate,
			});
		}
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

	<form on:submit={userConnected}>
		<input type="text" placeholder="Room" bind:value={roomId} />
		<button type="submit">Send</button>
	</form>
	<br /><br />
	<video id="localVideo" style="border: 1px solid red;width:300px" muted autoplay />
	<video id="remoteVideo" style="border: 1px solid green;width:300px" autoplay />
</div>
