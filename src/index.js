import { Server, routePartykitRequest } from "partyserver";

const MAP_W = 1700;
const MAP_H = 1100;
const PLAYER_R = 18;
const PLAYER_SPEED = 220;
const SEEKER_SPEED_MULT = 1.2;
const BULLET_SPEED = 650;
const STUN_SPEED = 520;
const TICK_MS = 1000 / 30;
const ROUND_SECONDS = 150;
const STUN_MS = 4000;
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
const BOMB_SPEED = 430;
const BOMB_LIFE = 2.6;
const BOMB_RADIUS = 115;
const TELEPORT_SPEED = 780;
const TELEPORT_LIFE = 0.85;
const LASER_DURATION_MS = 5000;
const LASER_FIRE_MS = 70;
const LASER_SPEED = 950;
const CLONE_COUNT = 20;
const CLONE_SPEED = PLAYER_SPEED;
const PHASE_SPEED_MULT = 1.9;

const WALLS = [
  { x: 0, y: 0, w: MAP_W, h: 20 },
  { x: 0, y: MAP_H - 20, w: MAP_W, h: 20 },
  { x: 0, y: 0, w: 20, h: MAP_H },
  { x: MAP_W - 20, y: 0, w: 20, h: MAP_H },

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
];

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

function tryMove(x, y, r) {
  for (const w of WALLS) if (circleHitsRect(x, y, r, w)) return false;
  if (x - r < 0 || x + r > MAP_W || y - r < 0 || y + r > MAP_H) return false;
  return true;
}

function isInsideWall(x, y, r) {
  for (const w of WALLS) if (circleHitsRect(x, y, r, w)) return true;
  return false;
}

function resolveStuck(p, dirX, dirY) {
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
      if (nx - PLAYER_R < 0 || nx + PLAYER_R > MAP_W) continue;
      if (ny - PLAYER_R < 0 || ny + PLAYER_R > MAP_H) continue;
      if (!isInsideWall(nx, ny, PLAYER_R)) {
        p.x = nx; p.y = ny;
        return;
      }
    }
  }
  const s = randomSpawn();
  p.x = s.x; p.y = s.y;
}

function randomSpawn() {
  for (let i = 0; i < 200; i++) {
    const x = 40 + Math.random() * (MAP_W - 80);
    const y = 40 + Math.random() * (MAP_H - 80);
    if (tryMove(x, y, PLAYER_R + 4)) return { x, y };
  }
  return { x: MAP_W / 2, y: MAP_H / 2 };
}

export class GameRoom extends Server {
  static options = { hibernate: false };

  async onStart() {
    this.players = new Map();
    this.bullets = [];
    this.explosions = [];
    this.clones = [];
    this.nextBulletId = 1;
    this.nextCloneId = 1;
    this.phase = "lobby"; // lobby | playing | ended
    this.roundEndsAt = 0;
    this.startsAt = 0;
    this.winner = null;
    this.lastTick = Date.now();
    this.hostId = null;
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  onConnect(connection) {
    if (!this.hostId) this.hostId = connection.id;
    const spawn = randomSpawn();
    this.players.set(connection.id, {
      id: connection.id,
      name: "player",
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      role: "hider",
      alive: true,
      stunnedUntil: 0,
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
    connection.send(JSON.stringify({ type: "init", id: connection.id, map: { w: MAP_W, h: MAP_H, walls: WALLS } }));
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
    } else if (msg.type === "secret") {
      if (this.phase !== "playing" || !p.alive) return;
      const tnow = Date.now();
      if (tnow < this.startsAt) return;
      if (p.role === "seeker" && !p.laserUsed) {
        p.laserUsed = true;
        p.laserEndsAt = tnow + LASER_DURATION_MS;
      } else if (p.role === "hider" && !p.clonesUsed) {
        p.clonesUsed = true;
        for (let i = 0; i < CLONE_COUNT; i++) {
          let cx = p.x, cy = p.y;
          for (let tries = 0; tries < 8; tries++) {
            const a = Math.random() * Math.PI * 2;
            const d = 25 + Math.random() * 70;
            const tx = p.x + Math.cos(a) * d;
            const ty = p.y + Math.sin(a) * d;
            if (tx - PLAYER_R < 0 || tx + PLAYER_R > MAP_W) continue;
            if (ty - PLAYER_R < 0 || ty + PLAYER_R > MAP_H) continue;
            if (!isInsideWall(tx, ty, PLAYER_R)) { cx = tx; cy = ty; break; }
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
    } else if (msg.type === "restart" && connection.id === this.hostId && this.phase === "ended") {
      this.phase = "lobby";
      this.bullets = [];
      this.winner = null;
      for (const pl of this.players.values()) {
        pl.alive = true;
        pl.role = "hider";
        pl.stunnedUntil = 0;
        pl.rageEndsAt = 0;
        pl.rageUsed = false;
        pl.phaseEndsAt = 0;
        pl.phaseUsed = false;
        pl.bombsLeft = SECONDARY_USES;
        pl.teleportsLeft = SECONDARY_USES;
        pl.laserEndsAt = 0;
        pl.laserUsed = false;
        pl.clonesUsed = false;
        const s = randomSpawn();
        pl.x = s.x; pl.y = s.y;
      }
      this.clones = [];
      this.bullets = [];
      this.explosions = [];
    }
  }

  startGame() {
    const players = [...this.players.values()];
    if (players.length < 2) return;
    const wantSeeker = players.filter(p => p.preferred === "seeker");
    const noPref = players.filter(p => p.preferred === "any");
    let seekerId;
    if (wantSeeker.length > 0) {
      seekerId = wantSeeker[Math.floor(Math.random() * wantSeeker.length)].id;
    } else if (noPref.length > 0) {
      seekerId = noPref[Math.floor(Math.random() * noPref.length)].id;
    } else {
      seekerId = players[Math.floor(Math.random() * players.length)].id;
    }
    for (const p of players) {
      p.role = p.id === seekerId ? "seeker" : "hider";
      p.alive = true;
      p.stunnedUntil = 0;
      p.rageEndsAt = 0;
      p.rageUsed = false;
      p.phaseEndsAt = 0;
      p.phaseUsed = false;
      p.bombsLeft = SECONDARY_USES;
      p.teleportsLeft = SECONDARY_USES;
      p.laserEndsAt = 0;
      p.laserUsed = false;
      p.clonesUsed = false;
      const s = randomSpawn();
      p.x = s.x; p.y = s.y;
    }
    this.bullets = [];
    this.explosions = [];
    this.clones = [];
    this.phase = "playing";
    this.startsAt = Date.now() + HIDER_HEAD_START_MS;
    this.roundEndsAt = this.startsAt + ROUND_SECONDS * 1000;
    this.winner = null;
    this.lastPingAt = this.startsAt;
  }

  checkWin() {
    if (this.phase !== "playing") return;
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

    if (this.phase === "playing") {
      const seekerLocked = now < this.startsAt;

      for (const p of this.players.values()) {
        if (!p.alive) continue;
        const raging = now < p.rageEndsAt;
        const phasing = now < p.phaseEndsAt;
        if (p.wasPhasing && !phasing && isInsideWall(p.x, p.y, PLAYER_R)) {
          resolveStuck(p, p.lastDx, p.lastDy);
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
          const stuck = !phasing && WALLS.some(w => circleHitsRect(p.x, p.y, PLAYER_R, w));
          const freeMove = phasing || stuck;
          const okX = freeMove
            ? (nx - PLAYER_R >= 0 && nx + PLAYER_R <= MAP_W)
            : tryMove(nx, p.y, PLAYER_R);
          const okY = freeMove
            ? (ny - PLAYER_R >= 0 && ny + PLAYER_R <= MAP_H)
            : tryMove(p.x, ny, PLAYER_R);
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

        if (p.input.shoot && !stunned && !lockedByHeadStart && !lasering) {
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
        const outOfMap = b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H;
        let wallHit = false;
        if (b.kind !== "laser") {
          for (const w of WALLS) {
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

        if (b.kind === "bomb") {
          if (expired || outOfMap || wallHit || hitPlayer || hitClone) {
            for (const p of this.players.values()) {
              if (!p.alive) continue;
              const dx = p.x - b.x, dy = p.y - b.y;
              if (dx * dx + dy * dy < BOMB_RADIUS * BOMB_RADIUS) {
                if (p.role === "hider") p.alive = false;
                else if (p.id !== b.owner) p.stunnedUntil = now + STUN_MS;
              }
            }
            for (const c of this.clones) {
              if (!c.alive) continue;
              const dx = c.x - b.x, dy = c.y - b.y;
              if (dx * dx + dy * dy < BOMB_RADIUS * BOMB_RADIUS) c.alive = false;
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
              tx = Math.max(PLAYER_R + 2, Math.min(MAP_W - PLAYER_R - 2, tx));
              ty = Math.max(PLAYER_R + 2, Math.min(MAP_H - PLAYER_R - 2, ty));
              if (isInsideWall(tx, ty, PLAYER_R)) {
                const nudges = [[0,0],[24,0],[-24,0],[0,24],[0,-24],[40,0],[-40,0],[0,40],[0,-40],[28,28],[-28,-28],[28,-28],[-28,28]];
                let placed = false;
                for (const [ox, oy] of nudges) {
                  const nx = Math.max(PLAYER_R + 2, Math.min(MAP_W - PLAYER_R - 2, tx + ox));
                  const ny = Math.max(PLAYER_R + 2, Math.min(MAP_H - PLAYER_R - 2, ty + oy));
                  if (!isInsideWall(nx, ny, PLAYER_R)) { owner.x = nx; owner.y = ny; placed = true; break; }
                }
                if (!placed) { const s = randomSpawn(); owner.x = s.x; owner.y = s.y; }
              } else { owner.x = tx; owner.y = ty; }
            }
            continue;
          }
          next.push(b);
        } else if (b.kind === "laser") {
          if (expired || outOfMap) continue;
          if (hitPlayer) {
            if (hitPlayer.role === "hider") hitPlayer.alive = false;
            else hitPlayer.stunnedUntil = now + STUN_MS;
            continue;
          }
          if (hitClone) { hitClone.alive = false; continue; }
          next.push(b);
        } else {
          if (expired || outOfMap || wallHit) continue;
          if (hitPlayer) {
            if (b.kind === "lethal") {
              if (hitPlayer.role === "hider") hitPlayer.alive = false;
              else hitPlayer.stunnedUntil = now + STUN_MS;
            } else {
              hitPlayer.stunnedUntil = now + STUN_MS;
            }
            continue;
          }
          if (b.kind === "lethal" && hitClone) { hitClone.alive = false; continue; }
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
          c.angle = Math.atan2(-dy, -dx);
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
        if (tryMove(nx, c.y, PLAYER_R)) c.x = nx;
        if (tryMove(c.x, ny, PLAYER_R)) c.y = ny;
      }
      this.clones = this.clones.filter(c => c.alive);

      if (now >= this.startsAt && now - this.lastPingAt >= PING_INTERVAL_MS) {
        this.lastPingAt = now;
      }

      if (now >= this.roundEndsAt) {
        this.phase = "ended";
        this.winner = "hiders";
      } else {
        this.checkWin();
      }
    }

    const snapshot = {
      type: "state",
      phase: this.phase,
      hostId: this.hostId,
      winner: this.winner,
      timeLeft: this.phase === "playing" ? Math.max(0, Math.ceil((this.roundEndsAt - now) / 1000)) : 0,
      startsIn: this.phase === "playing" ? Math.max(0, Math.ceil((this.startsAt - now) / 1000)) : 0,
      pingActive: this.phase === "playing" && (now - this.lastPingAt) < PING_DURATION_MS,
      nextPingMs: this.phase === "playing" ? Math.max(0, this.lastPingAt + PING_INTERVAL_MS - now) : 0,
      players: [...this.players.values()].map(p => ({
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
