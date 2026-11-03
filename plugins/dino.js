import { randomUUID } from 'crypto'

function createDinoGame() {
  return `
<style>
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
body {
  margin: 0;
  background: transparent;
  font-family: Arial, sans-serif;
  color: #eee;
  touch-action: manipulation;
  cursor: pointer;
}
.wrap {
  width: 100%;
  max-width: 620px;
  margin: auto;
  padding: 16px;
  box-sizing: border-box;
}
.card {
  background: rgba(255,255,255,.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.35);
}
.head {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255,255,255,.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.head-left .label {
  font-size: 11px;
  letter-spacing: 1.5px;
  color: rgba(255,255,255,.45);
}
.head-left .title {
  font-size: 21px;
  font-weight: bold;
  color: #fff;
}
.head-right {
  text-align: right;
}
.head-right .score {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 10px rgba(108,92,231,.85);
  transition: transform .15s;
}
.head-right .best {
  font-size: 10px;
  color: rgba(255,255,255,.4);
  margin-top: 2px;
}
.body {
  padding: 18px;
}
canvas {
  width: 100%;
  height: auto;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  display: block;
}
.status {
  text-align: center;
  margin-top: 10px;
  font-size: 12px;
  color: rgba(255,255,255,.55);
}
</style>
<div class="wrap">
<div class="card">
<div class="head">
<div class="head-left">
<div class="label">NOX DINO</div>
<div class="title">Dino Runner</div>
</div>
<div class="head-right">
<div class="score" id="score">00000</div>
<div class="best" id="best">BEST 00000</div>
</div>
</div>
<div class="body">
<canvas id="game" width="560" height="190"></canvas>
<div class="status" id="status">Speed 5.0x</div>
</div>
</div>
</div>
<script>
(function(){
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');

const GY = 170;
let dino, obstacles, clouds, particles, ambient, trail, score, best, speed, gameOver, last, shake, flash, runT, spawnTimer, milestone, squash;

function loadBest() {
  let vals = [];
  try { let v = localStorage.getItem('dino_best'); if (v) vals.push(parseInt(v,10)); } catch(e) {}
  try { let v = sessionStorage.getItem('dino_best'); if (v) vals.push(parseInt(v,10)); } catch(e) {}
  try { let m = document.cookie.match(/(?:^|;s*)dino_best=(\\d+)/); if (m) vals.push(parseInt(m[1],10)); } catch(e) {}
  return vals.length ? Math.max(...vals.filter(v => !isNaN(v))) : 0;
}

function saveBest(v) {
  let val = String(Math.floor(v));
  try { localStorage.setItem('dino_best', val); } catch(e) {}
  try { sessionStorage.setItem('dino_best', val); } catch(e) {}
  try { document.cookie = 'dino_best='+val+';max-age=31536000;path=/'; } catch(e) {}
  try {
    let rq = indexedDB.open('dino_db',1);
    rq.onupgradeneeded = () => { rq.result.createObjectStore('kv'); };
    rq.onsuccess = () => {
      try { rq.result.transaction('kv','readwrite').objectStore('kv').put(val,'dino_best'); } catch(e) {}
    };
  } catch(e) {}
}

best = loadBest();
bestEl.textContent = 'BEST ' + String(Math.floor(best)).padStart(5,'0');

function reset() {
  dino = { x:55, y:132, w:27, h:30, vy:0, jumping:false };
  obstacles = [];
  clouds = [
    { x:120, y:32, w:44, s:.35 },
    { x:300, y:52, w:60, s:.22 },
    { x:460, y:26, w:36, s:.4 },
    { x:560, y:70, w:50, s:.18 }
  ];
  particles = [];
  trail = [];
  if (!ambient) {
    ambient = [];
    for (let i=0; i<18; i++) {
      ambient.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, r:.5+Math.random()*1.5, vx:.1+Math.random()*.3, ph:Math.random()*10 });
    }
  }
  score = 0;
  speed = 5;
  gameOver = false;
  last = 0;
  shake = 0;
  flash = 0;
  runT = 0;
  milestone = 0;
  squash = 1;
  spawnTimer = 70 + Math.random()*30;
  statusEl.textContent = 'Speed 5.0x';
  bestEl.textContent = 'BEST ' + String(Math.floor(best)).padStart(5,'0');
}

function burst(px, py, n, col, spd) {
  for (let i=0; i<n; i++) {
    particles.push({
      x: px, y: py,
      vx: (Math.random()-.5)*spd,
      vy: -Math.random()*spd,
      life: 1,
      col: col,
      size: 2+Math.random()*2
    });
  }
}

function jump() {
  if (gameOver) { reset(); return; }
  if (!dino.jumping) {
    dino.jumping = true;
    dino.vy = -13;
    squash = .7;
    burst(dino.x+13, dino.y+30, 10, '255,255,255', 4);
  }
}

function spawnCactus() {
  let h = 24 + Math.random()*24;
  obstacles.push({ x: canvas.width+20, y: GY-h, w: 16+Math.random()*6, h });
  if (Math.random() < .22) {
    obstacles.push({ x: canvas.width+20+34+Math.random()*10, y: GY-(20+Math.random()*18), w:16, h:20+Math.random()*18 });
  }
}

function hit(a,b) {
  return a.x+4 < b.x+b.w && a.x+a.w-4 > b.x && a.y+4 < b.y+b.h && a.y+a.h > b.y;
}

function drawTrail() {
  trail.forEach((p,i) => {
    ctx.fillStyle = 'rgba(108,92,231,' + (.25*(i/trail.length)) + ')';
    ctx.fillRect(p.x, p.y, 27, 30);
  });
}

function drawDino() {
  ctx.save();
  let cx = dino.x+13, cy = dino.y+30;
  ctx.translate(cx, cy);
  ctx.scale(1/squash, squash);
  ctx.translate(-cx, -cy);
  let legOff = dino.jumping ? 0 : Math.sin(runT*.5)*5;
  ctx.fillStyle = '#eaeaea';
  ctx.fillRect(dino.x, dino.y, 27, 30);
  ctx.fillRect(dino.x+22, dino.y+5, 13, 18);
  ctx.fillStyle = '#6c5ce7';
  ctx.fillRect(dino.x+29, dino.y+8, 4, 4);
  ctx.fillStyle = '#eaeaea';
  ctx.fillRect(dino.x+5, dino.y+30, 6, 8+legOff);
  ctx.fillRect(dino.x+20, dino.y+30, 6, 8-legOff);
  ctx.restore();
}

function drawCactus(o) {
  ctx.save();
  ctx.shadowColor = 'rgba(255,90,90,.35)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#e17a7a';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.fillRect(o.x-7, o.y+10, 7, 6);
  ctx.fillRect(o.x-7, o.y+4, 6, 12);
  ctx.fillRect(o.x+o.w, o.y+18, 7, 6);
  ctx.fillRect(o.x+o.w+1, o.y+12, 6, 12);
  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.fillStyle = 'rgba(' + p.col + ',' + Math.max(p.life,0) + ')';
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
}

function drawAmbient() {
  ambient.forEach(p => {
    let a = .15 + Math.sin(runT*.05 + p.ph) * .1;
    ctx.fillStyle = 'rgba(180,160,255,' + a + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 7);
    ctx.fill();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random()-.5)*shake, (Math.random()-.5)*shake);
  }
  drawAmbient();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  clouds.forEach(c => {
    let b = Math.sin(runT*.03 + c.x) * 2;
    ctx.fillRect(c.x, c.y+b, c.w, 5);
    ctx.fillRect(c.x+10, c.y+b-5, c.w*.45, 10);
  });
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10,8]);
  ctx.lineDashOffset = -runT * speed * .6;
  ctx.beginPath();
  ctx.moveTo(0, GY);
  ctx.lineTo(canvas.width, GY);
  ctx.stroke();
  ctx.setLineDash([]);
  drawTrail();
  drawDino();
  obstacles.forEach(drawCactus);
  drawParticles();
  if (flash > 0) {
    ctx.fillStyle = 'rgba(255,60,60,' + (flash*.35) + ')';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
  if (gameOver) {
    ctx.fillStyle = 'rgba(15,15,25,.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('GAME OVER', canvas.width/2, 85);
    ctx.font = '14px Arial';
    ctx.fillText('Tap layar untuk main lagi', canvas.width/2, 112);
    ctx.textAlign = 'left';
  }
}

function loop(t) {
  if (!last) last = t;
  let dt = Math.min((t-last)/16.67, 2);
  last = t;
  runT += dt;
  if (!gameOver) {
    dino.y += dino.vy * dt;
    dino.vy += .75 * dt;
    if (dino.y >= 132) {
      if (dino.jumping) {
        burst(dino.x+13, GY, 10, '255,255,255', 3.5);
        squash = 1.35;
      }
      dino.y = 132;
      dino.vy = 0;
      dino.jumping = false;
    }
    if (dino.jumping) trail.push({ x: dino.x, y: dino.y });
    if (trail.length > 6) trail.shift();
    if (!dino.jumping) trail.length = 0;
    squash += (1 - squash) * .18 * dt;
    if (!dino.jumping && Math.floor(runT)%8===0 && Math.random()<.4) {
      burst(dino.x+6, GY-2, 1, '255,255,255', 1.5);
    }
    ambient.forEach(p => {
      p.x -= p.vx * dt;
      if (p.x < -4) p.x = canvas.width + 4;
    });
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnCactus();
      spawnTimer = Math.max(38, 62 - speed*1.4) + Math.random()*30;
    }
    obstacles.forEach(o => o.x -= speed * dt);
    obstacles = obstacles.filter(o => o.x > -40);
    clouds.forEach(c => {
      c.x -= c.s * dt;
      if (c.x < -80) c.x = canvas.width + Math.random()*100;
    });
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += .3 * dt;
      p.life -= .03 * dt;
    });
    particles = particles.filter(p => p.life > 0);
    speed = Math.min(11, speed + .0018 * dt);
    score += dt * .6;
    if (score > best) best = score;
    if (Math.floor(score/500) > milestone) {
      milestone = Math.floor(score/500);
      scoreEl.style.transform = 'scale(1.35)';
      setTimeout(() => scoreEl.style.transform = 'scale(1)', 150);
    }
    scoreEl.textContent = String(Math.floor(score)).padStart(5,'0');
    bestEl.textContent = 'BEST ' + String(Math.floor(best)).padStart(5,'0');
    statusEl.textContent = 'Speed ' + speed.toFixed(1) + 'x';
    for (const o of obstacles) {
      if (hit(dino, o)) {
        gameOver = true;
        shake = 14;
        flash = 1;
        saveBest(best);
        burst(dino.x+13, dino.y+15, 18, '255,90,90', 5);
        break;
      }
    }
  }
  if (shake > 0) shake = Math.max(0, shake - .6 * dt);
  if (flash > 0) flash = Math.max(0, flash - .05 * dt);
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
reset();
requestAnimationFrame(loop);
})();
</script>
`
}

async function sendDinoGame(conn, m, html) {
  const responseId = randomUUID()
  await conn.relayMessage(
    m.chat,
    {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: '',
          botResponseId: responseId,
          verificationMetadata: {
            proofs: [
              {
                version: 1,
                useCase: 1,
                signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
                certificateChain: [
                  'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                  'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
                ]
              }
            ]
          }
        }
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [
              {
                messageType: 2,
                messageText: 'Dino Runner'
              }
            ],
            unifiedResponse: {
              data: Buffer.from(
                JSON.stringify({
                  response_id: responseId,
                  sections: [
                    {
                      view_model: {
                        primitive: {
                          __typename: 'GenAIaeacdsnwHtmlPrimitive',
                          payload: html,
                          trusted_sources: ['nox.dev']
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                      }
                    }
                  ]
                })
              ).toString('base64')
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: {
                botJid: '867051314767696@bot'
              },
              forwardOrigin: 4
            }
          }
        }
      }
    },
    { messageId: responseId }
  )
}

let handler = async (m, { conn }) => {
  await m.react('🦕')
  try {
    const html = createDinoGame()
    await sendDinoGame(conn, m, html)
    await m.react('✅')
  } catch (error) {
    console.error('[DINO ERROR]', error)
    await m.react('❌')
    await m.reply('❌ Game gagal dijalankan, coba lagi ya.\n\n> ' + (error?.message || 'Unknown error'))
  }
}

handler.command = ['dino', 'dinorun', 'dinosaur']
handler.tags = ['game']
handler.desc = 'Mainkan Dino Runner di chat'
handler.help = 'dino'
handler.limit = 1

export default handler