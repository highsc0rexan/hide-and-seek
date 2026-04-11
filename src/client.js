import PartySocket from "partysocket";

const $ = (id) => document.getElementById(id);

const menu = $("menu");
const game = $("game");
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const hud = $("hud");
const lobbyOverlay = $("lobby-overlay");
const endOverlay = $("end-overlay");
const roomCodeDisplay = $("room-code-display");
const lobbyPlayers = $("lobby-players");
const startBtn = $("start-btn");
const restartBtn = $("restart-btn");
const endTitle = $("end-title");
const endSub = $("end-sub");
const menuErr = $("menu-err");
const nameInput = $("name-input");
const createBtn = $("create-btn");
const joinBtn = $("join-btn");
const codeInput = $("code-input");

const ROLE_COLORS = { seeker: "#ff5a5a", hider: "#5acbff" };
const STORAGE_NAME = "hns_name";

nameInput.value = localStorage.getItem(STORAGE_NAME) || "";

let socket = null;
let myId = null;
let mapInfo = null;
let state = null;
const keys = { w: false, a: false, s: false, d: false };
let mouse = { x: 0, y: 0, down: false };
let cameraScale = 1;

function randomCode() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}

function joinRoom(code) {
  const name = (nameInput.value || "player").trim().slice(0, 16) || "player";
  localStorage.setItem(STORAGE_NAME, name);
  socket = new PartySocket({
    host: location.host,
    party: "game-room",
    room: code,
  });
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "name", name }));
  });
  socket.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "init") {
      myId = msg.id;
      mapInfo = msg.map;
      menu.style.display = "none";
      game.style.display = "block";
      roomCodeDisplay.textContent = code;
      resize();
    } else if (msg.type === "state") {
      state = msg;
      renderHud();
      renderOverlays();
    }
  });
  socket.addEventListener("close", () => {
    menuErr.textContent = "Disconnected. Reload to try again.";
  });
}

createBtn.addEventListener("click", () => {
  const code = randomCode();
  joinRoom(code);
});

joinBtn.addEventListener("click", () => {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length < 3) { menuErr.textContent = "Enter a room code"; return; }
  joinRoom(code);
});

codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinBtn.click(); });
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createBtn.click(); });

startBtn.addEventListener("click", () => {
  if (socket) socket.send(JSON.stringify({ type: "start" }));
});
restartBtn.addEventListener("click", () => {
  if (socket) socket.send(JSON.stringify({ type: "restart" }));
});

document.querySelectorAll("#role-picker button").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: "preferred", role: btn.dataset.role }));
  });
});

window.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "W") keys.w = true;
  if (e.key === "a" || e.key === "A") keys.a = true;
  if (e.key === "s" || e.key === "S") keys.s = true;
  if (e.key === "d" || e.key === "D") keys.d = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "W") keys.w = false;
  if (e.key === "a" || e.key === "A") keys.a = false;
  if (e.key === "s" || e.key === "S") keys.s = false;
  if (e.key === "d" || e.key === "D") keys.d = false;
});
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener("mousedown", (e) => { e.preventDefault(); mouse.down = true; });
canvas.addEventListener("mouseup", () => { mouse.down = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function resize() {
  if (!mapInfo) return;
  const pad = 24;
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - pad * 2;
  const scale = Math.min(maxW / mapInfo.w, maxH / mapInfo.h, 1);
  canvas.style.width = mapInfo.w * scale + "px";
  canvas.style.height = mapInfo.h * scale + "px";
  canvas.width = mapInfo.w;
  canvas.height = mapInfo.h;
  cameraScale = scale;
}
window.addEventListener("resize", resize);

function getMyPlayer() {
  if (!state) return null;
  return state.players.find(p => p.id === myId);
}

function sendInputLoop() {
  if (socket && socket.readyState === 1 && state && state.phase === "playing") {
    const me = getMyPlayer();
    if (me) {
      const angle = Math.atan2(mouse.y - me.y, mouse.x - me.x);
      socket.send(JSON.stringify({
        type: "input",
        up: keys.w, down: keys.s, left: keys.a, right: keys.d,
        shoot: mouse.down,
        angle,
      }));
    }
  }
  setTimeout(sendInputLoop, 50);
}
sendInputLoop();

function renderHud() {
  if (!state) { hud.innerHTML = ""; return; }
  const me = getMyPlayer();
  let left = "";
  let right = "";
  if (state.phase === "playing") {
    if (state.startsIn > 0) {
      left = `<div class="pill">Hiders hide! Seeker released in ${state.startsIn}s</div>`;
    } else {
      left = `<div class="pill">Time: ${state.timeLeft}s</div>`;
    }
    if (me) {
      const role = me.role === "seeker" ? "🔫 Seeker" : "⚡ Hider";
      const status = !me.alive ? "💀 dead" : me.stunned ? "⚡ stunned" : "alive";
      right = `<div class="pill">${role} • ${status}</div>`;
    }
  }
  hud.innerHTML = `<div>${left}</div><div>${right}</div>`;
}

function renderOverlays() {
  if (!state) return;
  if (state.phase === "lobby") {
    lobbyOverlay.style.display = "flex";
    endOverlay.style.display = "none";
    const isHost = myId === state.hostId;
    const roleLabel = (r) => r === "seeker" ? " — wants 🔫" : r === "hider" ? " — wants ⚡" : "";
    lobbyPlayers.innerHTML = state.players
      .map(p => `<div class="${p.id === myId ? "me" : ""}">• ${escapeHtml(p.name)}${p.id === state.hostId ? " (host)" : ""}${roleLabel(p.preferred)}</div>`)
      .join("");
    const me = state.players.find(p => p.id === myId);
    document.querySelectorAll("#role-picker button").forEach(b => {
      b.classList.toggle("active", me && b.dataset.role === me.preferred);
    });
    if (state.players.length >= 2 && isHost) {
      startBtn.disabled = false;
      startBtn.textContent = `Start game (${state.players.length} players)`;
    } else if (isHost) {
      startBtn.disabled = true;
      startBtn.textContent = "Waiting for players (need 2+)";
    } else {
      startBtn.disabled = true;
      startBtn.textContent = "Waiting for host to start";
    }
  } else if (state.phase === "playing") {
    lobbyOverlay.style.display = "none";
    endOverlay.style.display = "none";
  } else if (state.phase === "ended") {
    lobbyOverlay.style.display = "none";
    endOverlay.style.display = "flex";
    endTitle.textContent = state.winner === "seeker" ? "Seeker wins!" : "Hiders win!";
    endSub.textContent = myId === state.hostId ? "You're host — return to lobby." : "Waiting for host…";
    restartBtn.disabled = myId !== state.hostId;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function draw() {
  requestAnimationFrame(draw);
  if (!mapInfo) return;
  ctx.fillStyle = "#14171f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid
  ctx.strokeStyle = "#1c2030";
  ctx.lineWidth = 1;
  for (let x = 0; x < mapInfo.w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapInfo.h); ctx.stroke();
  }
  for (let y = 0; y < mapInfo.h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapInfo.w, y); ctx.stroke();
  }

  // walls
  ctx.fillStyle = "#3a4258";
  ctx.strokeStyle = "#525c78";
  ctx.lineWidth = 2;
  for (const w of mapInfo.walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }

  if (!state) return;

  // bullets
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.kind === "lethal" ? 4 : 5, 0, Math.PI * 2);
    ctx.fillStyle = b.kind === "lethal" ? "#ffd24a" : "#7ad3ff";
    ctx.fill();
    if (b.kind === "stun") {
      ctx.strokeStyle = "rgba(122,211,255,.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // players
  for (const p of state.players) {
    const color = ROLE_COLORS[p.role] || "#aaa";
    ctx.save();
    ctx.translate(p.x, p.y);
    if (!p.alive) ctx.globalAlpha = 0.3;

    // body
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = p.id === myId ? "#ffffff" : "rgba(0,0,0,.4)";
    ctx.stroke();

    // gun
    ctx.rotate(p.angle);
    ctx.fillStyle = "#202533";
    ctx.fillRect(10, -3, 18, 6);

    ctx.restore();

    if (p.stunned && p.alive) {
      ctx.strokeStyle = "#7ad3ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24 + Math.sin(Date.now() / 100) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // name label
    if (p.alive || p.id === myId) {
      ctx.fillStyle = "#e6e8ee";
      ctx.font = "12px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.name, p.x, p.y - 26);
    }
  }
}
draw();
