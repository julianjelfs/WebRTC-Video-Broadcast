/* eslint-disable no-undef */

let peerConnection;
const config = {
  iceServers: [
    {
      urls: "stun:testnet.dfinity.network:5349",
      username: "anon",
      credential: "anon",
    },
    {
      urls: "turn:testnet.dfinity.network:5349",
      username: "anon",
      credential: "anon",
    },
  ],
};

const socket = io.connect(window.location.origin);
const audio = document.querySelector("audio");

socket.on("offer", (id, description) => {
  peerConnection = new RTCPeerConnection(config);
  peerConnection
    .setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("answer", id, peerConnection.localDescription);
    });
  peerConnection.ontrack = (event) => {
    audio.srcObject = event.streams[0];
  };
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});

socket.on("candidate", (id, candidate) => {
  peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch((e) => console.error(e));
});

socket.on("connect", () => {
  socket.emit("callee");
});

socket.on("caller", () => {
  socket.emit("callee");
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
  peerConnection.close();
};
