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
  if ((e.key === "q" || e.key === "Q") && socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ type: "ability" }));
  }
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
      let status;
      if (!me.alive) status = "💀 dead";
      else if (me.raging) status = `🔥 RAGE ${(me.rageMsLeft/1000).toFixed(1)}s`;
      else if (me.phasing) status = `🌀 PHASE ${(me.phaseMsLeft/1000).toFixed(1)}s`;
      else if (me.stunned) status = "⚡ stunned";
      else status = "alive";
      right = `<div class="pill">${role} • ${status}</div>`;
      if (me.alive && !me.raging && !me.phasing) {
        let q;
        if (me.role === "seeker") q = me.rageUsed ? "Q used" : "Q: RAGE (1×/round)";
        else q = me.phaseUsed ? "Q used" : "Q: PHASE (1×/round)";
        right += `<div class="pill" style="margin-top:6px;">${q}</div>`;
      }
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
    else if (p.phasing) ctx.globalAlpha = 0.5;

    // body
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = p.raging ? "#ffb347" : p.phasing ? "#b8f5ff" : color;
    ctx.fill();
    if (p.phasing) {
      ctx.shadowColor = "#7ad3ff";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(Date.now() / 80) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#7ad3ff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (p.raging) {
      ctx.shadowColor = "#ff6a00";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(Date.now() / 60) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff8c1a";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
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

  // Fog of war: seeker can only see inside a circle around themselves
  const me = getMyPlayer();
  if (me && me.role === "seeker" && state.phase === "playing") {
    const radius = 240;
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 12, 0.97)";
    ctx.beginPath();
    ctx.rect(0, 0, mapInfo.w, mapInfo.h);
    ctx.arc(me.x, me.y, radius, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    // soft edge ring
    const grad = ctx.createRadialGradient(me.x, me.y, radius - 40, me.x, me.y, radius);
    grad.addColorStop(0, "rgba(5,7,12,0)");
    grad.addColorStop(1, "rgba(5,7,12,0.85)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(me.x, me.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
draw();
