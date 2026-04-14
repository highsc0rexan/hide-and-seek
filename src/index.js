import { Server, routePartykitRequest } from "partyserver";

const PLAYER_R = 18;
const PLAYER_SPEED = 220;
const SEEKER_SPEED_MULT = 1.2;
const BULLET_SPEED = 650;
const STUN_SPEED = 520;
const TICK_MS = 1000 / 30;
const ROUND_SECONDS = 150;
const STUN_MS = 4000;
const STUN_IMMUNITY_MS = 2000;
const SEEKER_STUN_IMMUNITY_MS = 6000;
const SEEKER_FIRE_MS = 400;
const HIDER_FIRE_MS = 900;
const HIDER_HEAD_START_MS = 8000;
const RAGE_DURATION_MS = 5000;
const RAGE_SPEED_MULT = 1.35;
const RAGE_FIRE_MS = 550;
const SHOTGUN_PELLETS = 6;
const SHOTGUN_SPREAD = 0.42;
const PHASE_DURATION_MS = RAGE_DURATION_MS;
const PING_INTERVAL_MS = 5000;
const PING_DURATION_MS = 600;
const SECONDARY_USES = 4;
const SECONDARY_COOLDOWN_MS = 350;
const BOMB_SPEED = 820;
const BOMB_LIFE = 1.6;
const BOMB_RADIUS = 115;
const TELEPORT_SPEED = 780;
const TELEPORT_LIFE = 0.85;
const LASER_DURATION_MS = 5000;
const LASER_FIRE_MS = 70;
const LASER_SPEED = 950;
const CLONE_COUNT = 20;
const CLONE_SPEED = PLAYER_SPEED;
const CLONE_SHOT_RANGE = 520;
const CLONE_FIRE_MIN_MS = 900;
const CLONE_FIRE_JITTER_MS = 700;
const PHASE_SPEED_MULT = 1.9;

function makeMap(id, name, w, h, interior) {
  const walls = [
    { x: 0, y: 0, w, h: 20 },
    { x: 0, y: h - 20, w, h: 20 },
    { x: 0, y: 0, w: 20, h },
    { x: w - 20, y: 0, w: 20, h },
    ...interior,
  ];
  return { id, name, w, h, walls };
}

const MAPS = [
  makeMap("classic", "Classic", 1700, 1100, [
    { x: 150, y: 120, w: 260, h: 30 },
    { x: 150, y: 120, w: 30, h: 200 },
    { x: 520, y: 200, w: 30, h: 280 },
    { x: 520, y: 200, w: 220, h: 30 },
    { x: 880, y: 130, w: 30, h: 260 },
    { x: 880, y: 130, w: 240, h: 30 },
    { x: 1260, y: 110, w: 280, h: 30 },
    { x: 1510, y: 110, w: 30, h: 220 },
    { x: 100, y: 420, w: 200, h: 30 },
    { x: 270, y: 420, w: 30, h: 180 },
    { x: 460, y: 540, w: 280, h: 30 },
    { x: 820, y: 470, w: 30, h: 240 },
    { x: 820, y: 470, w: 240, h: 30 },
    { x: 1100, y: 380, w: 30, h: 260 },
    { x: 1280, y: 470, w: 240, h: 30 },
    { x: 1490, y: 470, w: 30, h: 220 },
    { x: 220, y: 760, w: 260, h: 30 },
    { x: 460, y: 760, w: 30, h: 220 },
    { x: 600, y: 880, w: 240, h: 30 },
    { x: 900, y: 760, w: 30, h: 220 },
    { x: 900, y: 760, w: 260, h: 30 },
    { x: 1230, y: 880, w: 280, h: 30 },
    { x: 1480, y: 760, w: 30, h: 180 },
  ]),
  makeMap("arena", "Arena", 1200, 800, [
    { x: 300, y: 260, w: 200, h: 30 },
    { x: 700, y: 260, w: 200, h: 30 },
    { x: 300, y: 510, w: 200, h: 30 },
    { x: 700, y: 510, w: 200, h: 30 },
    { x: 560, y: 360, w: 80, h: 80 },
  ]),
  makeMap("maze", "Maze", 1900, 1300, [
    { x: 180, y: 180, w: 400, h: 30 },
    { x: 180, y: 180, w: 30, h: 300 },
    { x: 680, y: 180, w: 30, h: 420 },
    { x: 680, y: 180, w: 400, h: 30 },
    { x: 1180, y: 180, w: 30, h: 300 },
    { x: 1180, y: 180, w: 400, h: 30 },
    { x: 1680, y: 180, w: 30, h: 420 },
    { x: 280, y: 380, w: 300, h: 30 },
    { x: 280, y: 580, w: 30, h: 200 },
    { x: 400, y: 580, w: 300, h: 30 },
    { x: 800, y: 380, w: 30, h: 300 },
    { x: 900, y: 580, w: 200, h: 30 },
    { x: 1080, y: 380, w: 30, h: 300 },
    { x: 1280, y: 480, w: 30, h: 300 },
    { x: 1280, y: 480, w: 300, h: 30 },
    { x: 1480, y: 580, w: 200, h: 30 },
    { x: 180, y: 820, w: 400, h: 30 },
    { x: 180, y: 820, w: 30, h: 260 },
    { x: 680, y: 780, w: 30, h: 300 },
    { x: 780, y: 880, w: 300, h: 30 },
    { x: 1080, y: 780, w: 30, h: 300 },
    { x: 1180, y: 880, w: 400, h: 30 },
    { x: 1580, y: 780, w: 30, h: 300 },
    { x: 380, y: 1080, w: 1200, h: 30 },
    { x: 380, y: 1080, w: 30, h: 180 },
    { x: 1580, y: 1080, w: 30, h: 180 },
  ]),
  makeMap("islands", "Islands", 1800, 1200, [
    { x: 200, y: 180, w: 220, h: 30 },
    { x: 200, y: 180, w: 30, h: 160 },
    { x: 390, y: 180, w: 30, h: 160 },
    { x: 200, y: 310, w: 220, h: 30 },
    { x: 680, y: 140, w: 260, h: 30 },
    { x: 680, y: 140, w: 30, h: 180 },
    { x: 910, y: 140, w: 30, h: 180 },
    { x: 1200, y: 240, w: 200, h: 30 },
    { x: 1200, y: 240, w: 30, h: 200 },
    { x: 1370, y: 240, w: 30, h: 200 },
    { x: 1540, y: 140, w: 180, h: 30 },
    { x: 1540, y: 140, w: 30, h: 260 },
    { x: 1690, y: 140, w: 30, h: 260 },
    { x: 340, y: 560, w: 260, h: 30 },
    { x: 340, y: 560, w: 30, h: 220 },
    { x: 570, y: 560, w: 30, h: 220 },
    { x: 340, y: 750, w: 260, h: 30 },
    { x: 820, y: 480, w: 240, h: 30 },
    { x: 820, y: 480, w: 30, h: 260 },
    { x: 1030, y: 480, w: 30, h: 260 },
    { x: 820, y: 710, w: 240, h: 30 },
    { x: 1280, y: 620, w: 220, h: 30 },
    { x: 1280, y: 620, w: 30, h: 180 },
    { x: 1470, y: 620, w: 30, h: 180 },
    { x: 280, y: 900, w: 260, h: 30 },
    { x: 640, y: 920, w: 260, h: 30 },
    { x: 1000, y: 940, w: 260, h: 30 },
    { x: 1400, y: 900, w: 260, h: 30 },
  ]),
  makeMap("grid", "Grid", 1600, 1000, [
    { x: 240, y: 180, w: 60, h: 60 },
    { x: 520, y: 180, w: 60, h: 60 },
    { x: 800, y: 180, w: 60, h: 60 },
    { x: 1080, y: 180, w: 60, h: 60 },
    { x: 1360, y: 180, w: 60, h: 60 },
    { x: 240, y: 420, w: 60, h: 60 },
    { x: 520, y: 420, w: 60, h: 60 },
    { x: 800, y: 420, w: 60, h: 60 },
    { x: 1080, y: 420, w: 60, h: 60 },
    { x: 1360, y: 420, w: 60, h: 60 },
    { x: 240, y: 660, w: 60, h: 60 },
    { x: 520, y: 660, w: 60, h: 60 },
    { x: 800, y: 660, w: 60, h: 60 },
    { x: 1080, y: 660, w: 60, h: 60 },
    { x: 1360, y: 660, w: 60, h: 60 },
    { x: 140, y: 300, w: 30, h: 180 },
    { x: 1430, y: 300, w: 30, h: 180 },
    { x: 640, y: 540, w: 320, h: 30 },
  ]),
];

function getMap(id) {
  return MAPS.find(m => m.id === id) || MAPS[0];
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleHitsRect(cx, cy, cr, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

function tryMove(x, y, r, map) {
  for (const w of map.walls) if (circleHitsRect(x, y, r, w)) return false;
  if (x - r < 0 || x + r > map.w || y - r < 0 || y + r > map.h) return false;
  return true;
}

function isInsideWall(x, y, r, map) {
  for (const w of map.walls) if (circleHitsRect(x, y, r, w)) return true;
  return false;
}

function resolveStuck(p, dirX, dirY, map) {
  const dirs = [];
  if (dirX || dirY) {
    const len = Math.hypot(dirX, dirY);
    dirs.push([dirX / len, dirY / len]);
  }
  for (const c of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
    const len = Math.hypot(c[0], c[1]);
    dirs.push([c[0] / len, c[1] / len]);
  }
  for (const [dx, dy] of dirs) {
    for (let dist = 4; dist <= 240; dist += 4) {
      const nx = p.x + dx * dist;
      const ny = p.y + dy * dist;
      if (nx - PLAYER_R < 0 || nx + PLAYER_R > map.w) continue;
      if (ny - PLAYER_R < 0 || ny + PLAYER_R > map.h) continue;
      if (!isInsideWall(nx, ny, PLAYER_R, map)) {
        p.x = nx; p.y = ny;
        return;
      }
    }
  }
  const s = randomSpawn(map);
  p.x = s.x; p.y = s.y;
}

function applyStun(target, now) {
  if (now < (target.stunImmuneUntil || 0)) return;
  target.stunnedUntil = now + STUN_MS;
  const immunity = target.role === "seeker" ? SEEKER_STUN_IMMUNITY_MS : STUN_IMMUNITY_MS;
  target.stunImmuneUntil = target.stunnedUntil + immunity;
}

function randomSpawn(map) {
  for (let i = 0; i < 200; i++) {
    const x = 40 + Math.random() * (map.w - 80);
    const y = 40 + Math.random() * (map.h - 80);
    if (tryMove(x, y, PLAYER_R + 4, map)) return { x, y };
  }
  return { x: map.w / 2, y: map.h / 2 };
}

export class GameRoom extends Server {
  static options = { hibernate: false };

  async onStart() {
    this.players = new Map();
    this.bullets = [];
    this.explosions = [];
    this.clones = [];
    this.bots = [];
    this.nextBulletId = 1;
    this.nextCloneId = 1;
    this.nextBotId = 1;
    this.phase = "lobby"; // lobby | playing | ended
    this.testMode = false;
    this.map = MAPS[0];
    this.settings = { seekerLaser: true, hiderClones: true, hiderStun: true };
    this.roundEndsAt = 0;
    this.startsAt = 0;
    this.winner = null;
    this.lastTick = Date.now();
    this.hostId = null;
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  onConnect(connection) {
    if (!this.hostId) this.hostId = connection.id;
    const spawn = randomSpawn(this.map);
    this.players.set(connection.id, {
      id: connection.id,
      name: "player",
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      role: "hider",
      alive: true,
      stunnedUntil: 0,
      stunImmuneUntil: 0,
      lastShotAt: 0,
      input: { up: false, down: false, left: false, right: false, shoot: false, angle: 0 },
      ready: false,
      preferred: "any",
      rageEndsAt: 0,
      rageUsed: false,
      phaseEndsAt: 0,
      phaseUsed: false,
      wasPhasing: false,
      lastDx: 0,
      lastDy: 0,
      bombsLeft: SECONDARY_USES,
      teleportsLeft: SECONDARY_USES,
      laserEndsAt: 0,
      laserUsed: false,
      clonesUsed: false,
      lastSecondaryAt: 0,
      lastLaserShotAt: 0,
    });
    connection.send(JSON.stringify({ type: "init", id: connection.id, map: { id: this.map.id, name: this.map.name, w: this.map.w, h: this.map.h, walls: this.map.walls } }));
  }

  onClose(connection) {
    this.players.delete(connection.id);
    if (this.hostId === connection.id) {
      this.hostId = this.players.keys().next().value || null;
    }
    if (this.phase === "playing") this.checkWin();
  }

  onMessage(connection, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const p = this.players.get(connection.id);
    if (!p) return;

    if (msg.type === "name") {
      p.name = String(msg.name || "player").slice(0, 16);
    } else if (msg.type === "preferred") {
      const v = msg.role;
      if (v === "seeker" || v === "hider" || v === "any") p.preferred = v;
    } else if (msg.type === "input") {
      p.input.up = !!msg.up;
      p.input.down = !!msg.down;
      p.input.left = !!msg.left;
      p.input.right = !!msg.right;
      p.input.shoot = !!msg.shoot;
      p.input.angle = +msg.angle || 0;
    } else if (msg.type === "secondary") {
      if (this.phase !== "playing" || !p.alive) return;
      const tnow = Date.now();
      if (tnow < this.startsAt) return;
      if (tnow - p.lastSecondaryAt < SECONDARY_COOLDOWN_MS) return;
      if (p.role === "seeker" && p.bombsLeft > 0) {
        p.bombsLeft--;
        p.lastSecondaryAt = tnow;
        this.bullets.push({
          id: this.nextBulletId++,
          x: p.x + Math.cos(p.angle) * (PLAYER_R + 4),
          y: p.y + Math.sin(p.angle) * (PLAYER_R + 4),
          vx: Math.cos(p.angle) * BOMB_SPEED,
          vy: Math.sin(p.angle) * BOMB_SPEED,
          owner: p.id,
          kind: "bomb",
          life: BOMB_LIFE,
        });
      } else if (p.role === "hider" && p.teleportsLeft > 0) {
        p.teleportsLeft--;
        p.lastSecondaryAt = tnow;
        this.bullets.push({
          id: this.nextBulletId++,
          x: p.x + Math.cos(p.angle) * (PLAYER_R + 4),
          y: p.y + Math.sin(p.angle) * (PLAYER_R + 4),
          vx: Math.cos(p.angle) * TELEPORT_SPEED,
          vy: Math.sin(p.angle) * TELEPORT_SPEED,
          owner: p.id,
          kind: "teleport",
          life: TELEPORT_LIFE,
        });
      }
    } else if (msg.type === "setting") {
      if (connection.id !== this.hostId) return;
      if (this.phase !== "lobby") return;
      const { key, value } = msg;
      if (key === "seekerLaser" || key === "hiderClones" || key === "hiderStun") {
        this.settings[key] = !!value;
      }
    } else if (msg.type === "setMap") {
      if (connection.id !== this.hostId) return;
      if (this.phase !== "lobby") return;
      const next = getMap(msg.mapId);
      if (!next) return;
      this.map = next;
      this.broadcast(JSON.stringify({
        type: "mapUpdate",
        map: { id: next.id, name: next.name, w: next.w, h: next.h, walls: next.walls },
      }));
      for (const pl of this.players.values()) {
        const s = randomSpawn(this.map);
        pl.x = s.x; pl.y = s.y;
      }
    } else if (msg.type === "secret") {
      if (this.phase !== "playing" || !p.alive) return;
      const tnow = Date.now();
      if (tnow < this.startsAt) return;
      if (p.role === "seeker" && !p.laserUsed && this.settings.seekerLaser) {
        p.laserUsed = true;
        p.laserEndsAt = Number.MAX_SAFE_INTEGER;
      } else if (p.role === "hider" && !p.clonesUsed && this.settings.hiderClones) {
        p.clonesUsed = true;
        for (let i = 0; i < CLONE_COUNT; i++) {
          let cx = p.x, cy = p.y;
          for (let tries = 0; tries < 8; tries++) {
            const a = Math.random() * Math.PI * 2;
            const d = 25 + Math.random() * 70;
            const tx = p.x + Math.cos(a) * d;
            const ty = p.y + Math.sin(a) * d;
            if (tx - PLAYER_R < 0 || tx + PLAYER_R > this.map.w) continue;
            if (ty - PLAYER_R < 0 || ty + PLAYER_R > this.map.h) continue;
            if (!isInsideWall(tx, ty, PLAYER_R, this.map)) { cx = tx; cy = ty; break; }
          }
          this.clones.push({
            id: this.nextCloneId++,
            owner: p.id,
            name: p.name,
            x: cx, y: cy,
            angle: Math.random() * Math.PI * 2,
            alive: true,
            wanderUntil: 0,
            wanderDx: 0, wanderDy: 0,
            lastShotAt: Date.now() - Math.floor(Math.random() * CLONE_FIRE_MIN_MS),
            nextFireIn: Math.floor(Math.random() * CLONE_FIRE_JITTER_MS),
          });
        }
      }
    } else if (msg.type === "ability") {
      if (this.phase !== "playing" || !p.alive) return;
      const now2 = Date.now();
      if (now2 < this.startsAt) return;
      if (p.role === "seeker" && !p.rageUsed) {
        p.rageUsed = true;
        p.rageEndsAt = now2 + RAGE_DURATION_MS;
      } else if (p.role === "hider" && !p.phaseUsed) {
        p.phaseUsed = true;
        p.phaseEndsAt = now2 + PHASE_DURATION_MS;
      }
    } else if (msg.type === "start" && connection.id === this.hostId && this.phase !== "playing") {
      this.startGame();
    } else if (msg.type === "startTest" && connection.id === this.hostId && this.phase !== "playing" && this.players.size === 1) {
      this.startGame(true);
    } else if (msg.type === "restart" && connection.id === this.hostId && (this.phase === "ended" || this.testMode)) {
      this.phase = "lobby";
      this.testMode = false;
      this.bullets = [];
      this.winner = null;
      for (const pl of this.players.values()) {
        pl.alive = true;
        pl.role = "hider";
        pl.stunnedUntil = 0;
        pl.stunImmuneUntil = 0;
        pl.rageEndsAt = 0;
        pl.rageUsed = false;
        pl.phaseEndsAt = 0;
        pl.phaseUsed = false;
        pl.bombsLeft = SECONDARY_USES;
        pl.teleportsLeft = SECONDARY_USES;
        pl.laserEndsAt = 0;
        pl.laserUsed = false;
        pl.clonesUsed = false;
        const s = randomSpawn(this.map);
        pl.x = s.x; pl.y = s.y;
      }
      this.clones = [];
      this.bots = [];
      this.bullets = [];
      this.explosions = [];
    }
  }

  makeBot(role) {
    const s = randomSpawn(this.map);
    return {
      id: `bot-${this.nextBotId++}`,
      name: role === "seeker" ? "seeker-bot" : "hider-bot",
      role,
      x: s.x, y: s.y, angle: 0,
      alive: true,
      stunnedUntil: 0,
      stunImmuneUntil: 0,
      respawnAt: 0,
      lastShotAt: 0,
      wanderDx: 0, wanderDy: 0, wanderUntil: 0,
    };
  }

  startGame(test = false) {
    const players = [...this.players.values()];
    if (!test && players.length < 2) return;
    if (test && players.length !== 1) return;
    this.testMode = test;
    let seekerId;
    if (test) {
      const solo = players[0];
      seekerId = solo.preferred === "hider" ? null : solo.id;
    } else {
      const wantSeeker = players.filter(p => p.preferred === "seeker");
      const noPref = players.filter(p => p.preferred === "any");
      if (wantSeeker.length > 0) {
        seekerId = wantSeeker[Math.floor(Math.random() * wantSeeker.length)].id;
      } else if (noPref.length > 0) {
        seekerId = noPref[Math.floor(Math.random() * noPref.length)].id;
      } else {
        seekerId = players[Math.floor(Math.random() * players.length)].id;
      }
    }
    for (const p of players) {
      p.role = p.id === seekerId ? "seeker" : "hider";
      p.alive = true;
      p.stunnedUntil = 0;
      p.stunImmuneUntil = 0;
      p.rageEndsAt = 0;
      p.rageUsed = false;
      p.phaseEndsAt = 0;
      p.phaseUsed = false;
      p.bombsLeft = SECONDARY_USES;
      p.teleportsLeft = SECONDARY_USES;
      p.laserEndsAt = 0;
      p.laserUsed = false;
      p.clonesUsed = false;
      const s = randomSpawn(this.map);
      p.x = s.x; p.y = s.y;
    }
    this.bullets = [];
    this.explosions = [];
    this.clones = [];
    this.bots = [];
    if (test) {
      const solo = players[0];
      const botRole = solo.role === "seeker" ? "hider" : "seeker";
      this.bots.push(this.makeBot(botRole));
    }
    this.phase = "playing";
    this.startsAt = Date.now() + (test ? 0 : HIDER_HEAD_START_MS);
    this.roundEndsAt = this.startsAt + ROUND_SECONDS * 1000;
    this.winner = null;
    this.lastPingAt = this.startsAt;
  }

  checkWin() {
    if (this.phase !== "playing" || this.testMode) return;
    const players = [...this.players.values()];
    const hidersAlive = players.filter(p => p.role === "hider" && p.alive).length;
    const seekers = players.filter(p => p.role === "seeker");
    const seekerAlive = seekers.length > 0 && seekers.some(s => s.alive);
    if (!seekerAlive) {
      this.phase = "ended"; this.winner = "hiders";
    } else if (hidersAlive === 0) {
      this.phase = "ended"; this.winner = "seeker";
    }
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const map = this.map;

    if (this.phase === "playing") {
      const seekerLocked = now < this.startsAt;

      for (const p of this.players.values()) {
        if (!p.alive) continue;
        const raging = now < p.rageEndsAt;
        const phasing = now < p.phaseEndsAt;
        if (p.wasPhasing && !phasing && isInsideWall(p.x, p.y, PLAYER_R, map)) {
          resolveStuck(p, p.lastDx, p.lastDy, map);
        }
        p.wasPhasing = phasing;
        if (raging || phasing) p.stunnedUntil = 0;
        const stunned = now < p.stunnedUntil;
        const lockedByHeadStart = seekerLocked && p.role === "seeker";
        if (!stunned && !lockedByHeadStart) {
          let dx = 0, dy = 0;
          if (p.input.up) dy -= 1;
          if (p.input.down) dy += 1;
          if (p.input.left) dx -= 1;
          if (p.input.right) dx += 1;
          const len = Math.hypot(dx, dy);
          if (len > 0) { dx /= len; dy /= len; p.lastDx = dx; p.lastDy = dy; }
          const baseMult = p.role === "seeker" ? SEEKER_SPEED_MULT : 1;
          const mult = raging ? RAGE_SPEED_MULT : phasing ? PHASE_SPEED_MULT : baseMult;
          const speed = PLAYER_SPEED * mult;
          const nx = p.x + dx * speed * dt;
          const ny = p.y + dy * speed * dt;
          const stuck = !phasing && map.walls.some(w => circleHitsRect(p.x, p.y, PLAYER_R, w));
          const freeMove = phasing || stuck;
          const okX = freeMove
            ? (nx - PLAYER_R >= 0 && nx + PLAYER_R <= map.w)
            : tryMove(nx, p.y, PLAYER_R, map);
          const okY = freeMove
            ? (ny - PLAYER_R >= 0 && ny + PLAYER_R <= map.h)
            : tryMove(p.x, ny, PLAYER_R, map);
          if (okX) p.x = nx;
          if (okY) p.y = ny;
        }
        p.angle = p.input.angle;

        const lasering = now < p.laserEndsAt;
        if (lasering && p.input.shoot && !stunned && !lockedByHeadStart) {
          if (now - p.lastLaserShotAt >= LASER_FIRE_MS) {
            p.lastLaserShotAt = now;
            this.bullets.push({
              id: this.nextBulletId++,
              x: p.x + Math.cos(p.angle) * (PLAYER_R + 2),
              y: p.y + Math.sin(p.angle) * (PLAYER_R + 2),
              vx: Math.cos(p.angle) * LASER_SPEED,
              vy: Math.sin(p.angle) * LASER_SPEED,
              owner: p.id,
              kind: "laser",
              life: 1.4,
            });
          }
        }

        const canShoot = p.role === "seeker" || this.settings.hiderStun;
        if (canShoot && p.input.shoot && !stunned && !lockedByHeadStart && !lasering) {
          const cd = raging ? RAGE_FIRE_MS : (p.role === "seeker" ? SEEKER_FIRE_MS : HIDER_FIRE_MS);
          if (now - p.lastShotAt >= cd) {
            p.lastShotAt = now;
            const speed = p.role === "seeker" ? BULLET_SPEED : STUN_SPEED;
            const kind = p.role === "seeker" ? "lethal" : "stun";
            const pellets = raging ? SHOTGUN_PELLETS : 1;
            for (let i = 0; i < pellets; i++) {
              const spread = pellets > 1 ? (Math.random() - 0.5) * SHOTGUN_SPREAD : 0;
              const a = p.angle + spread;
              const v = speed * (raging ? 0.95 + Math.random() * 0.15 : 1);
              this.bullets.push({
                id: this.nextBulletId++,
                x: p.x + Math.cos(a) * (PLAYER_R + 2),
                y: p.y + Math.sin(a) * (PLAYER_R + 2),
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                owner: p.id,
                kind,
                life: raging ? 0.9 : 1.6,
              });
            }
          }
        }
      }

      const next = [];
      for (const b of this.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        const expired = b.life <= 0;
        const outOfMap = b.x < 0 || b.x > map.w || b.y < 0 || b.y > map.h;
        let wallHit = false;
        if (b.kind !== "laser") {
          for (const w of map.walls) {
            if (b.x >= w.x && b.x <= w.x + w.w && b.y >= w.y && b.y <= w.y + w.h) {
              wallHit = true; break;
            }
          }
        }
        let hitPlayer = null;
        for (const p of this.players.values()) {
          if (!p.alive || p.id === b.owner) continue;
          const dx = p.x - b.x, dy = p.y - b.y;
          if (dx * dx + dy * dy < PLAYER_R * PLAYER_R) { hitPlayer = p; break; }
        }
        let hitClone = null;
        if (b.kind === "lethal" || b.kind === "laser" || b.kind === "bomb") {
          for (const c of this.clones) {
            if (!c.alive) continue;
            const dx = c.x - b.x, dy = c.y - b.y;
            if (dx * dx + dy * dy < PLAYER_R * PLAYER_R) { hitClone = c; break; }
          }
        }
        let hitBot = null;
        for (const bot of this.bots) {
          if (!bot.alive || bot.id === b.owner) continue;
          const dx = bot.x - b.x, dy = bot.y - b.y;
          if (dx * dx + dy * dy < PLAYER_R * PLAYER_R) { hitBot = bot; break; }
        }

        if (b.kind === "bomb") {
          if (expired || outOfMap || wallHit || hitPlayer || hitClone || hitBot) {
            for (const p of this.players.values()) {
              if (!p.alive) continue;
              const dx = p.x - b.x, dy = p.y - b.y;
              if (dx * dx + dy * dy < BOMB_RADIUS * BOMB_RADIUS) {
                if (p.role === "hider") p.alive = false;
                else if (p.id !== b.owner) applyStun(p, now);
              }
            }
            for (const c of this.clones) {
              if (!c.alive) continue;
              const dx = c.x - b.x, dy = c.y - b.y;
              if (dx * dx + dy * dy < BOMB_RADIUS * BOMB_RADIUS) c.alive = false;
            }
            for (const bot of this.bots) {
              if (!bot.alive) continue;
              const dx = bot.x - b.x, dy = bot.y - b.y;
              if (dx * dx + dy * dy < BOMB_RADIUS * BOMB_RADIUS) {
                if (bot.role === "hider") { bot.alive = false; bot.respawnAt = now + 3000; }
                else applyStun(bot, now);
              }
            }
            this.explosions.push({ id: this.nextBulletId++, x: b.x, y: b.y, r: BOMB_RADIUS, expiresAt: now + 700 });
            continue;
          }
          next.push(b);
        } else if (b.kind === "teleport") {
          if (expired || outOfMap || wallHit || hitPlayer) {
            const owner = this.players.get(b.owner);
            if (owner && owner.alive) {
              let tx = b.x, ty = b.y;
              if (wallHit) { tx -= b.vx * dt * 1.2; ty -= b.vy * dt * 1.2; }
              tx = Math.max(PLAYER_R + 2, Math.min(map.w - PLAYER_R - 2, tx));
              ty = Math.max(PLAYER_R + 2, Math.min(map.h - PLAYER_R - 2, ty));
              if (isInsideWall(tx, ty, PLAYER_R, map)) {
                const nudges = [[0,0],[24,0],[-24,0],[0,24],[0,-24],[40,0],[-40,0],[0,40],[0,-40],[28,28],[-28,-28],[28,-28],[-28,28]];
                let placed = false;
                for (const [ox, oy] of nudges) {
                  const nx = Math.max(PLAYER_R + 2, Math.min(map.w - PLAYER_R - 2, tx + ox));
                  const ny = Math.max(PLAYER_R + 2, Math.min(map.h - PLAYER_R - 2, ty + oy));
                  if (!isInsideWall(nx, ny, PLAYER_R, map)) { owner.x = nx; owner.y = ny; placed = true; break; }
                }
                if (!placed) { const s = randomSpawn(map); owner.x = s.x; owner.y = s.y; }
              } else { owner.x = tx; owner.y = ty; }
            }
            continue;
          }
          next.push(b);
        } else if (b.kind === "laser") {
          if (expired || outOfMap) continue;
          if (hitPlayer) {
            if (hitPlayer.role === "hider") hitPlayer.alive = false;
            else applyStun(hitPlayer, now);
            continue;
          }
          if (hitClone) { hitClone.alive = false; continue; }
          if (hitBot) {
            if (hitBot.role === "hider") { hitBot.alive = false; hitBot.respawnAt = now + 3000; }
            else applyStun(hitBot, now);
            continue;
          }
          next.push(b);
        } else {
          if (expired || outOfMap || wallHit) continue;
          if (hitPlayer) {
            if (b.kind === "lethal") {
              if (hitPlayer.role === "hider") hitPlayer.alive = false;
              else applyStun(hitPlayer, now);
            } else {
              applyStun(hitPlayer, now);
            }
            continue;
          }
          if (b.kind === "lethal" && hitClone) { hitClone.alive = false; continue; }
          if (hitBot) {
            if (b.kind === "lethal") {
              if (hitBot.role === "hider") { hitBot.alive = false; hitBot.respawnAt = now + 3000; }
              else applyStun(hitBot, now);
            } else if (hitBot.role === "seeker") {
              applyStun(hitBot, now);
            }
            continue;
          }
          next.push(b);
        }
      }
      this.bullets = next;
      this.explosions = this.explosions.filter(e => e.expiresAt > now);

      // Clone AI: flee nearest alive seeker
      for (const c of this.clones) {
        if (!c.alive) continue;
        let nearest = null, bestD = Infinity;
        for (const p of this.players.values()) {
          if (p.role !== "seeker" || !p.alive) continue;
          const dx = c.x - p.x, dy = c.y - p.y;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; nearest = p; }
        }
        let dx, dy;
        if (nearest && bestD < 600 * 600) {
          dx = c.x - nearest.x;
          dy = c.y - nearest.y;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          c.angle = Math.atan2(nearest.y - c.y, nearest.x - c.x);
        } else {
          if (now > c.wanderUntil) {
            const a = Math.random() * Math.PI * 2;
            c.wanderDx = Math.cos(a);
            c.wanderDy = Math.sin(a);
            c.wanderUntil = now + 800 + Math.random() * 1200;
          }
          dx = c.wanderDx; dy = c.wanderDy;
          c.angle = Math.atan2(dy, dx);
        }
        const step = CLONE_SPEED * dt;
        const nx = c.x + dx * step;
        const ny = c.y + dy * step;
        if (tryMove(nx, c.y, PLAYER_R, map)) c.x = nx;
        if (tryMove(c.x, ny, PLAYER_R, map)) c.y = ny;

        // fake stun shots at nearest seeker
        if (nearest && bestD < CLONE_SHOT_RANGE * CLONE_SHOT_RANGE) {
          const cd = CLONE_FIRE_MIN_MS + c.nextFireIn;
          if (now - c.lastShotAt >= cd) {
            c.lastShotAt = now;
            c.nextFireIn = Math.floor(Math.random() * CLONE_FIRE_JITTER_MS);
            const ang = Math.atan2(nearest.y - c.y, nearest.x - c.x) + (Math.random() - 0.5) * 0.15;
            this.bullets.push({
              id: this.nextBulletId++,
              x: c.x + Math.cos(ang) * (PLAYER_R + 2),
              y: c.y + Math.sin(ang) * (PLAYER_R + 2),
              vx: Math.cos(ang) * STUN_SPEED,
              vy: Math.sin(ang) * STUN_SPEED,
              owner: c.owner,
              kind: "stun",
              life: 1.6,
            });
          }
        }
      }
      this.clones = this.clones.filter(c => c.alive);

      // Bot AI (test mode)
      for (const bot of this.bots) {
        if (!bot.alive) {
          if (now >= bot.respawnAt) {
            const s = randomSpawn(map);
            bot.x = s.x; bot.y = s.y;
            bot.alive = true;
            bot.stunnedUntil = 0;
          }
          continue;
        }
        if (now < bot.stunnedUntil) continue;

        if (bot.role === "seeker") {
          let target = null, bestD = Infinity;
          for (const p of this.players.values()) {
            if (p.role !== "hider" || !p.alive) continue;
            const dx = p.x - bot.x, dy = p.y - bot.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; target = p; }
          }
          for (const c of this.clones) {
            if (!c.alive) continue;
            const dx = c.x - bot.x, dy = c.y - bot.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; target = c; }
          }
          if (target) {
            const dx = target.x - bot.x, dy = target.y - bot.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = bot.x + (dx / len) * PLAYER_SPEED * SEEKER_SPEED_MULT * dt;
            const ny = bot.y + (dy / len) * PLAYER_SPEED * SEEKER_SPEED_MULT * dt;
            if (tryMove(nx, bot.y, PLAYER_R, map)) bot.x = nx;
            if (tryMove(bot.x, ny, PLAYER_R, map)) bot.y = ny;
            bot.angle = Math.atan2(dy, dx);
            if (bestD < 420 * 420 && now - bot.lastShotAt >= SEEKER_FIRE_MS * 1.3) {
              bot.lastShotAt = now;
              const a = bot.angle + (Math.random() - 0.5) * 0.12;
              this.bullets.push({
                id: this.nextBulletId++,
                x: bot.x + Math.cos(a) * (PLAYER_R + 2),
                y: bot.y + Math.sin(a) * (PLAYER_R + 2),
                vx: Math.cos(a) * BULLET_SPEED,
                vy: Math.sin(a) * BULLET_SPEED,
                owner: bot.id,
                kind: "lethal",
                life: 1.6,
              });
            }
          } else {
            if (now > bot.wanderUntil) {
              const a = Math.random() * Math.PI * 2;
              bot.wanderDx = Math.cos(a);
              bot.wanderDy = Math.sin(a);
              bot.wanderUntil = now + 1000 + Math.random() * 1000;
            }
            const nx = bot.x + bot.wanderDx * PLAYER_SPEED * dt;
            const ny = bot.y + bot.wanderDy * PLAYER_SPEED * dt;
            if (tryMove(nx, bot.y, PLAYER_R, map)) bot.x = nx;
            if (tryMove(bot.x, ny, PLAYER_R, map)) bot.y = ny;
            bot.angle = Math.atan2(bot.wanderDy, bot.wanderDx);
          }
        } else {
          // hider bot: flee nearest seeker, wander if far
          let nearest = null, bestD = Infinity;
          for (const p of this.players.values()) {
            if (p.role !== "seeker" || !p.alive) continue;
            const dx = bot.x - p.x, dy = bot.y - p.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; nearest = p; }
          }
          let dx, dy;
          if (nearest && bestD < 500 * 500) {
            dx = bot.x - nearest.x;
            dy = bot.y - nearest.y;
            const len = Math.hypot(dx, dy) || 1;
            dx /= len; dy /= len;
            bot.angle = Math.atan2(nearest.y - bot.y, nearest.x - bot.x);
          } else {
            if (now > bot.wanderUntil) {
              const a = Math.random() * Math.PI * 2;
              bot.wanderDx = Math.cos(a);
              bot.wanderDy = Math.sin(a);
              bot.wanderUntil = now + 800 + Math.random() * 1200;
            }
            dx = bot.wanderDx; dy = bot.wanderDy;
            bot.angle = Math.atan2(dy, dx);
          }
          const nx = bot.x + dx * PLAYER_SPEED * dt;
          const ny = bot.y + dy * PLAYER_SPEED * dt;
          if (tryMove(nx, bot.y, PLAYER_R, map)) bot.x = nx;
          if (tryMove(bot.x, ny, PLAYER_R, map)) bot.y = ny;
          if (nearest && bestD < CLONE_SHOT_RANGE * CLONE_SHOT_RANGE && now - bot.lastShotAt >= HIDER_FIRE_MS) {
            bot.lastShotAt = now;
            const a = Math.atan2(nearest.y - bot.y, nearest.x - bot.x) + (Math.random() - 0.5) * 0.15;
            this.bullets.push({
              id: this.nextBulletId++,
              x: bot.x + Math.cos(a) * (PLAYER_R + 2),
              y: bot.y + Math.sin(a) * (PLAYER_R + 2),
              vx: Math.cos(a) * STUN_SPEED,
              vy: Math.sin(a) * STUN_SPEED,
              owner: bot.id,
              kind: "stun",
              life: 1.6,
            });
          }
        }
      }

      if (now >= this.startsAt && now - this.lastPingAt >= PING_INTERVAL_MS) {
        this.lastPingAt = now;
      }

      if (!this.testMode && now >= this.roundEndsAt) {
        this.phase = "ended";
        this.winner = "hiders";
      } else {
        this.checkWin();
      }
    }

    const snapshot = {
      type: "state",
      phase: this.phase,
      testMode: this.testMode,
      hostId: this.hostId,
      mapId: this.map.id,
      settings: this.settings,
      winner: this.winner,
      timeLeft: this.phase === "playing" ? Math.max(0, Math.ceil((this.roundEndsAt - now) / 1000)) : 0,
      startsIn: this.phase === "playing" ? Math.max(0, Math.ceil((this.startsAt - now) / 1000)) : 0,
      pingActive: this.phase === "playing" && (now - this.lastPingAt) < PING_DURATION_MS,
      nextPingMs: this.phase === "playing" ? Math.max(0, this.lastPingAt + PING_INTERVAL_MS - now) : 0,
      players: [
        ...[...this.players.values()].map(p => ({
          id: p.id, name: p.name, x: Math.round(p.x), y: Math.round(p.y),
          angle: +p.angle.toFixed(2), role: p.role, alive: p.alive,
          stunned: now < p.stunnedUntil, preferred: p.preferred,
          raging: now < p.rageEndsAt,
          rageMsLeft: Math.max(0, p.rageEndsAt - now),
          rageUsed: p.rageUsed,
          phasing: now < p.phaseEndsAt,
          phaseMsLeft: Math.max(0, p.phaseEndsAt - now),
          phaseUsed: p.phaseUsed,
          bombsLeft: p.bombsLeft,
          teleportsLeft: p.teleportsLeft,
          lasering: now < p.laserEndsAt,
          laserMsLeft: Math.max(0, p.laserEndsAt - now),
          laserUsed: p.laserUsed,
          clonesUsed: p.clonesUsed,
        })),
        ...this.bots.filter(b => b.alive).map(b => ({
          id: b.id, name: b.name, x: Math.round(b.x), y: Math.round(b.y),
          angle: +b.angle.toFixed(2), role: b.role, alive: b.alive,
          stunned: now < b.stunnedUntil, isBot: true,
        })),
      ],
      bullets: this.bullets.map(b => ({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), kind: b.kind })),
      explosions: this.explosions.map(e => ({ id: e.id, x: e.x, y: e.y, r: e.r, ttl: e.expiresAt - now })),
      clones: this.clones.filter(c => c.alive).map(c => ({
        id: c.id, x: Math.round(c.x), y: Math.round(c.y), angle: +c.angle.toFixed(2), name: c.name, owner: c.owner,
      })),
    };
    this.broadcast(JSON.stringify(snapshot));
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, env)) ||
      env.ASSETS.fetch(request)
    );
  },
};
