/* eslint-disable no-undef */
const peerConnections = {};
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

const allNames = ["largewheel", "rugbyconfront", "hopglaring", "delightgod"];

const yourName =
  new URLSearchParams(window.location.search).get("name") || "largewheel";

const youCall = allNames.slice(allNames.indexOf(yourName) + 1);

const yourNameEl = document.getElementById("yourName");
const youCallEl = document.getElementById("youCall");
const callOthersBtn = document.getElementById("call");
const theirAudio = document.getElementById("audio-wrapper");
// const myAudio = document.getElementById("my-audio");

let peerSockets = {};
let peerSocketsByName = {};
let myStream;

if (yourNameEl) {
  yourNameEl.textContent = yourName;
}

if (youCallEl) {
  youCallEl.textContent = youCall.join(", ");
}

if (callOthersBtn) {
  callOthersBtn.addEventListener("click", () => {
    youCall.forEach((name) => {
      const peerSocket = peerSocketsByName[name];
      if (peerSocket) {
        console.log("creating connection to ", name);
        const peerConnection = new RTCPeerConnection(config);
        peerConnections[peerSocket.id] = peerConnection;

        // add the audio tracks from the stream to the
        myStream
          .getTracks()
          .forEach((track) => peerConnection.addTrack(track, myStream));

        peerConnection.ontrack = (event) =>
          createAudioElement(peerSocket.name, event);

        peerConnection.onicecandidate = (event) => {
          console.log(
            yourName,
            " received ice candidate for ",
            name,
            ": ",
            event
          );
          if (event.candidate) {
            socket.emit("candidate", peerSocket.id, event.candidate);
          }
        };

        peerConnection
          .createOffer()
          .then((sdp) => peerConnection.setLocalDescription(sdp))
          .then(() => {
            socket.emit(
              "offer",
              peerSocket.id,
              peerConnection.localDescription
            );
          });
      }
    });
  });
}

socket.on("peersReady", (peers) => {
  console.log("Peers ready so far: ", peers);
  peerSockets = peers.reduce((agg, peer) => {
    agg[peer.id] = peer;
    return agg;
  }, {});
  peerSocketsByName = peers.reduce((agg, peer) => {
    agg[peer.name] = peer;
    return agg;
  }, {});
  const allConnected = allNames.every(
    (n) => peers.find((p) => p.name === n) !== undefined
  );
  // callOthersBtn.disabled = !allConnected;
});

socket.on("answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
});

socket.on("offer", (id, description) => {
  const peerSocket = peerSockets[id];
  console.log(yourName, " received an offer from ", peerSocket.name);
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  // does this make it bi-directional
  myStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, myStream));

  peerConnection
    .setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("answer", id, peerConnection.localDescription);
    });
  peerConnection.ontrack = (event) =>
    createAudioElement(peerSocket.name, event);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});

function createAudioElement(name, event) {
  let audio = document.getElementById(`audio_${name}`);
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = `audio_${name}`;
    theirAudio.appendChild(audio);
  }
  audio.autoplay = true;
  audio.controls = true;
  audio.title = name;
  audio.srcObject = event.streams[0];
}

// socket.on("callee", (id) => {
//   const peerConnection = new RTCPeerConnection(config);
//   peerConnections[id] = peerConnection;

//   let stream = audioElement.srcObject;
//   stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

//   peerConnection.onicecandidate = (event) => {
//     if (event.candidate) {
//       socket.emit("candidate", id, event.candidate);
//     }
//   };

//   peerConnection
//     .createOffer()
//     .then((sdp) => peerConnection.setLocalDescription(sdp))
//     .then(() => {
//       socket.emit("offer", id, peerConnection.localDescription);
//     });
// });

socket.on("candidate", (id, candidate) => {
  peerConnections[id]
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch((e) => console.error(e));
});

socket.on("disconnectPeer", (id) => {
  peerConnections[id].close();
  delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
getStream();

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  return navigator.mediaDevices
    .getUserMedia({
      // video: {
      //   facingMode: "environment",
      //   frameRate: { min: 1, max: 15 },
      //   width: 320,
      //   height: 240,
      // },
      // video: true,
      audio: true,
    })
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  myStream = stream;

  // so we have our audio stream - we now need to to call everyone with a higher index than us
  //myAudio.srcObject = stream;

  // socket.emit("caller");
  socket.emit("peerReady", yourName);
}

function handleError(error) {
  console.error("Error: ", error);
}
