const express = require("express");
const app = express();

let peers = [];
let caller;
const port = process.env.PORT || 4000;

const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server);
app.use(express.static(__dirname + "/public"));

io.sockets.on("error", (e) => console.log(e));
io.sockets.on("connection", (socket) => {
  socket.on("caller", () => {
    console.log("caller connected");
    caller = socket.id;
    socket.broadcast.emit("caller");
  });
  socket.on("peerReady", (name) => {
    console.log("peer connected", name);
    peers.push({ id: socket.id, name });
    io.emit("peersReady", peers);
  });
  socket.on("callee", () => {
    console.log("callee connected");
    socket.to(caller).emit("callee", socket.id);
  });
  socket.on("offer", (id, message) => {
    socket.to(id).emit("offer", socket.id, message);
  });
  socket.on("answer", (id, message) => {
    socket.to(id).emit("answer", socket.id, message);
  });
  socket.on("candidate", (id, message) => {
    socket.to(id).emit("candidate", socket.id, message);
  });
  socket.on("disconnect", () => {
    peers = peers.filter((p) => p.id !== socket.id);
    socket.to(caller).emit("disconnectPeer", socket.id);
    io.emit("peersReady", peers);
  });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));
