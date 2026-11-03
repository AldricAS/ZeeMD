import { AIRich } from '../lib/message-builder.js'

const BASE = String.raw`<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
html,body{background:transparent;color:#ece8df;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden}
.card{width:100%;max-width:340px;margin:8px auto;padding:14px;border-radius:22px;background:#17181b;border:1px solid rgba(255,255,255,.08)}
.top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;gap:10px}
.name{font-size:16px;font-weight:700;letter-spacing:.02em}
.hint{font-size:11px;color:#8a877e;margin-top:3px}
.stats{display:flex;gap:14px}
.stat{font-size:10px;color:#8a877e;text-align:right;text-transform:uppercase;letter-spacing:.08em}
.stat b{display:block;font-size:18px;color:#ece8df;letter-spacing:0;font-variant-numeric:tabular-nums}
.btn{border:0;border-radius:12px;background:#26282d;color:#ece8df;font-family:inherit;font-weight:600;font-size:14px;padding:11px 14px;cursor:pointer}
.btn:active{background:#34373d}
.btn.pri{background:#e8b04a;color:#17130a}
.btn.on{background:#e8b04a;color:#17130a}
.row{display:flex;gap:8px;margin-top:12px}
.row .btn{flex:1}
.msg{min-height:18px;margin-top:10px;font-size:13px;color:#e8b04a;text-align:center;font-weight:600}
</style>`

const SNAKE = String.raw`<div class="card">
<div class="top"><div><div class="name">Snake</div><div class="hint">Geser di papan atau pakai tombol</div></div>
<div class="stats"><div class="stat">Skor<b id="sc">0</b></div><div class="stat">Terbaik<b id="bs">0</b></div></div></div>
<div style="position:relative;border-radius:14px;overflow:hidden;background:#101113">
<canvas id="cv" width="300" height="300" style="display:block;width:100%;touch-action:none"></canvas>
<div id="ov" style="position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;background:rgba(16,17,19,.82)">
<div id="ot" style="font-size:15px;font-weight:700">Siap main?</div><button class="btn pri" id="ob">Mulai</button></div></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">
<span></span><button class="btn" data-d="0,-1">&#9650;</button><span></span>
<button class="btn" data-d="-1,0">&#9664;</button><button class="btn" data-d="0,1">&#9660;</button><button class="btn" data-d="1,0">&#9654;</button></div></div>
<script>
(function(){
var N=15,C=20,cv=document.getElementById('cv'),g=cv.getContext('2d');
var scEl=document.getElementById('sc'),bsEl=document.getElementById('bs');
var ov=document.getElementById('ov'),ot=document.getElementById('ot'),ob=document.getElementById('ob');
var snake,dir,next,food,score=0,best=0,timer=null,running=false;
function free(){var f=[];for(var x=0;x<N;x++)for(var y=0;y<N;y++){var hit=false;for(var i=0;i<snake.length;i++)if(snake[i].x===x&&snake[i].y===y){hit=true;break}if(!hit)f.push({x:x,y:y})}return f}
function place(){var f=free();food=f.length?f[Math.floor(Math.random()*f.length)]:null}
function reset(){snake=[{x:7,y:7},{x:6,y:7},{x:5,y:7}];dir={x:1,y:0};next=dir;score=0;place();stats();draw()}
function stats(){scEl.textContent=score;bsEl.textContent=best}
function draw(){
g.fillStyle='#101113';g.fillRect(0,0,300,300);
g.fillStyle='#17181b';for(var x=0;x<N;x++)for(var y=0;y<N;y++)if((x+y)%2===0)g.fillRect(x*C,y*C,C,C);
if(food){g.fillStyle='#e0614f';g.beginPath();g.arc(food.x*C+C/2,food.y*C+C/2,C*0.34,0,6.2832);g.fill()}
for(var i=snake.length-1;i>=0;i--){g.fillStyle=i===0?'#f2c46d':'#e8b04a';g.globalAlpha=i===0?1:Math.max(.45,1-i*0.025);g.beginPath();
if(g.roundRect)g.roundRect(snake[i].x*C+1,snake[i].y*C+1,C-2,C-2,5);else g.rect(snake[i].x*C+1,snake[i].y*C+1,C-2,C-2);g.fill()}
g.globalAlpha=1}
function end(win){running=false;clearTimeout(timer);if(score>best)best=score;stats();ot.textContent=(win?'Menang! ':'Game over. ')+'Skor '+score;ob.textContent='Main lagi';ov.style.display='flex'}
function step(){
dir=next;var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
if(h.x<0||h.y<0||h.x>=N||h.y>=N)return end(false);
var eat=food&&h.x===food.x&&h.y===food.y,len=eat?snake.length:snake.length-1;
for(var i=0;i<len;i++)if(snake[i].x===h.x&&snake[i].y===h.y)return end(false);
snake.unshift(h);
if(eat){score+=10;if(score>best)best=score;place();stats();if(!food){draw();return end(true)}}else snake.pop();
draw();timer=setTimeout(step,Math.max(65,140-Math.floor(score/10)*4))}
function start(){reset();ov.style.display='none';running=true;timer=setTimeout(step,300)}
function turn(dx,dy){if(!running){if(ov.style.display!=='none')start();return}if(dx===-dir.x&&dy===-dir.y)return;next={x:dx,y:dy}}
ob.addEventListener('click',start);
var btns=document.querySelectorAll('[data-d]');
for(var b=0;b<btns.length;b++)btns[b].addEventListener('click',function(){var d=this.getAttribute('data-d').split(',');turn(+d[0],+d[1])});
var sx=0,sy=0;
cv.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY});
cv.addEventListener('pointerup',function(e){var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;if(Math.abs(dx)>Math.abs(dy))turn(dx>0?1:-1,0);else turn(0,dy>0?1:-1)});
document.addEventListener('keydown',function(e){var k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(k){e.preventDefault();turn(k[0],k[1])}});
reset();
})();
</script>`

const G2048 = String.raw`<style>
.board{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;border-radius:14px;background:#101113;touch-action:none}
.t{aspect-ratio:1;border-radius:9px;background:#1d1f23;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#ece8df;font-variant-numeric:tabular-nums}
.t.l{font-size:18px}.t.xl{font-size:14px}
.v2{background:#2b2c30}.v4{background:#3a362d}.v8{background:#6b4f1d}.v16{background:#8c6420}.v32{background:#b07a22}.v64{background:#cf8f2a}
.v128,.v256,.v512,.v1024,.v2048,.vbig{color:#17130a}
.v128{background:#e8b04a}.v256{background:#eebc5f}.v512{background:#f2c673}.v1024{background:#f6d18a}.v2048{background:#fde6b8}.vbig{background:#fff3d6}
</style>
<div class="card">
<div class="top"><div><div class="name">2048</div><div class="hint">Geser papan untuk menggabung angka</div></div>
<div class="stats"><div class="stat">Skor<b id="sc">0</b></div><div class="stat">Terbaik<b id="bs">0</b></div></div></div>
<div class="board" id="bd"></div>
<div class="msg" id="ms"></div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px">
<span></span><button class="btn" data-m="1">&#9650;</button><span></span>
<button class="btn" data-m="0">&#9664;</button><button class="btn" data-m="3">&#9660;</button><button class="btn" data-m="2">&#9654;</button></div>
<div class="row"><button class="btn pri" id="nw">Game baru</button></div></div>
<script>
(function(){
var grid,score=0,best=0,won=false,over=false;
var bd=document.getElementById('bd'),scEl=document.getElementById('sc'),bsEl=document.getElementById('bs'),ms=document.getElementById('ms');
var cells=[];for(var i=0;i<16;i++){var c=document.createElement('div');bd.appendChild(c);cells.push(c)}
function pos(i,j,d){return d===0?[i,j]:d===2?[i,3-j]:d===1?[j,i]:[3-j,i]}
function add(){var e=[];for(var r=0;r<4;r++)for(var c=0;c<4;c++)if(!grid[r][c])e.push([r,c]);if(!e.length)return;var p=e[Math.floor(Math.random()*e.length)];grid[p[0]][p[1]]=Math.random()<0.9?2:4}
function slide(a){var r=a.filter(Boolean),out=[],gain=0;for(var i=0;i<r.length;i++){if(r[i]===r[i+1]){out.push(r[i]*2);gain+=r[i]*2;i++}else out.push(r[i])}while(out.length<4)out.push(0);return{out:out,gain:gain}}
function can(){for(var r=0;r<4;r++)for(var c=0;c<4;c++){if(!grid[r][c])return true;if(c<3&&grid[r][c]===grid[r][c+1])return true;if(r<3&&grid[r][c]===grid[r+1][c])return true}return false}
function render(){
for(var r=0;r<4;r++)for(var c=0;c<4;c++){var v=grid[r][c],el=cells[r*4+c];el.className='t'+(v>=1000?' xl':v>=100?' l':'')+(v?(v>2048?' vbig':' v'+v):'');el.textContent=v||''}
scEl.textContent=score;bsEl.textContent=best}
function move(d){
if(over)return;var moved=false,gain=0;
for(var i=0;i<4;i++){var line=[];for(var j=0;j<4;j++){var p=pos(i,j,d);line.push(grid[p[0]][p[1]])}
var s=slide(line);gain+=s.gain;for(var j2=0;j2<4;j2++){var q=pos(i,j2,d);if(grid[q[0]][q[1]]!==s.out[j2]){moved=true;grid[q[0]][q[1]]=s.out[j2]}}}
if(!moved)return;score+=gain;if(score>best)best=score;add();render();
var max=0;for(var r=0;r<4;r++)for(var c=0;c<4;c++)if(grid[r][c]>max)max=grid[r][c];
if(max>=2048&&!won){won=true;ms.textContent='2048! Lanjut terus kalau mau.'}
if(!can()){over=true;ms.textContent='Tidak ada gerakan lagi. Skor '+score}}
function init(){grid=[];for(var r=0;r<4;r++)grid.push([0,0,0,0]);score=0;won=false;over=false;ms.textContent='';add();add();render()}
var mb=document.querySelectorAll('[data-m]');for(var b=0;b<mb.length;b++)mb[b].addEventListener('click',function(){move(+this.getAttribute('data-m'))});
document.getElementById('nw').addEventListener('click',init);
var sx=0,sy=0;
bd.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY});
bd.addEventListener('pointerup',function(e){var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?2:0);else move(dy>0?3:1)});
document.addEventListener('keydown',function(e){var k={ArrowLeft:0,ArrowUp:1,ArrowRight:2,ArrowDown:3}[e.key];if(k!==undefined){e.preventDefault();move(k)}});
init();
})();
</script>`

const MEMORY = String.raw`<style>
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.k{aspect-ratio:1;border:0;border-radius:12px;background:#26282d;color:transparent;font-size:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}
.k.up{background:#1d1f23;color:#ece8df}
.k.ok{background:#3a2f17;color:#e8b04a}
</style>
<div class="card">
<div class="top"><div><div class="name">Memory</div><div class="hint">Cocokkan 8 pasang simbol</div></div>
<div class="stats"><div class="stat">Langkah<b id="mv">0</b></div><div class="stat">Waktu<b id="tm">0s</b></div></div></div>
<div class="grid" id="gd"></div>
<div class="msg" id="ms"></div>
<div class="row"><button class="btn pri" id="nw">Acak ulang</button></div></div>
<script>
(function(){
var sym=['\u25C6','\u25CF','\u25B2','\u25A0','\u2605','\u271A','\u263E','\u2665'];
var gd=document.getElementById('gd'),mvEl=document.getElementById('mv'),tmEl=document.getElementById('tm'),ms=document.getElementById('ms');
var cards,open,moves,found,lock,t0,tick;
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function init(){
clearInterval(tick);tick=null;t0=0;moves=0;found=0;lock=false;open=[];ms.textContent='';mvEl.textContent='0';tmEl.textContent='0s';
cards=shuffle(sym.concat(sym));gd.innerHTML='';
cards.forEach(function(s,i){var b=document.createElement('button');b.className='k';b.setAttribute('data-i',i);b.addEventListener('click',function(){flip(i,b)});gd.appendChild(b)})}
function flip(i,b){
if(lock||b.className!=='k')return;
if(!t0){t0=Date.now();tick=setInterval(function(){tmEl.textContent=Math.floor((Date.now()-t0)/1000)+'s'},500)}
b.className='k up';b.textContent=cards[i];open.push({i:i,b:b});
if(open.length<2)return;
moves++;mvEl.textContent=moves;var a=open[0],c=open[1];open=[];
if(cards[a.i]===cards[c.i]){a.b.className='k ok';c.b.className='k ok';found++;
if(found===8){clearInterval(tick);var s=Math.floor((Date.now()-t0)/1000);tmEl.textContent=s+'s';ms.textContent='Selesai dalam '+moves+' langkah, '+s+' detik'}}
else{lock=true;setTimeout(function(){a.b.className='k';a.b.textContent='';c.b.className='k';c.b.textContent='';lock=false},700)}}
document.getElementById('nw').addEventListener('click',init);
init();
})();
</script>`

const XO = String.raw`<style>
.xo{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.c{aspect-ratio:1;border:0;border-radius:14px;background:#1d1f23;color:#ece8df;font-family:inherit;font-size:44px;font-weight:800;cursor:pointer}
.c.x{color:#e8b04a}.c.o{color:#8fb7d9}
.c.w{background:#3a2f17}
</style>
<div class="card">
<div class="top"><div><div class="name">Tic Tac Toe</div><div class="hint" id="hn">Kamu X, bot O</div></div>
<div class="stats"><div class="stat">Kamu<b id="w1">0</b></div><div class="stat">Seri<b id="w2">0</b></div><div class="stat">Bot<b id="w3">0</b></div></div></div>
<div class="xo" id="bd"></div>
<div class="msg" id="ms"></div>
<div class="row"><button class="btn on" id="m1">Mudah</button><button class="btn" id="m2">Susah</button></div>
<div class="row"><button class="btn pri" id="nw">Ronde baru</button></div></div>
<script>
(function(){
var L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
var b,done,hard=false,round=0,tally=[0,0,0];
var bd=document.getElementById('bd'),ms=document.getElementById('ms'),els=[];
for(var i=0;i<9;i++)(function(i){var e=document.createElement('button');e.className='c';e.addEventListener('click',function(){play(i)});bd.appendChild(e);els.push(e)})(i);
function win(s,p){for(var i=0;i<8;i++){var l=L[i];if(s[l[0]]===p&&s[l[1]]===p&&s[l[2]]===p)return l}return null}
function full(s){return s.every(Boolean)}
function empties(s){var r=[];for(var i=0;i<9;i++)if(!s[i])r.push(i);return r}
function mm(s,p){
if(win(s,'O'))return 1;if(win(s,'X'))return -1;if(full(s))return 0;
var best=p==='O'?-2:2;
empties(s).forEach(function(i){s[i]=p;var v=mm(s,p==='O'?'X':'O');s[i]=null;if(p==='O'?v>best:v<best)best=v});
return best}
function pick(){
var e=empties(b),i,j;
for(i=0;i<e.length;i++){b[e[i]]='O';var w=win(b,'O');b[e[i]]=null;if(w)return e[i]}
for(i=0;i<e.length;i++){b[e[i]]='X';var w2=win(b,'X');b[e[i]]=null;if(w2)return e[i]}
if(!hard)return e[Math.floor(Math.random()*e.length)];
var bv=-2,bm=[];
for(j=0;j<e.length;j++){b[e[j]]='O';var v=mm(b,'X');b[e[j]]=null;if(v>bv){bv=v;bm=[e[j]]}else if(v===bv)bm.push(e[j])}
return bm[Math.floor(Math.random()*bm.length)]}
function paint(){for(var i=0;i<9;i++){els[i].textContent=b[i]||'';els[i].className='c'+(b[i]?' '+b[i].toLowerCase():'')}}
function finish(){
var w=win(b,'X')||win(b,'O');
if(w){w.forEach(function(i){els[i].className+=' w'});var me=b[w[0]]==='X';tally[me?0:2]++;ms.textContent=me?'Kamu menang':'Bot menang'}
else{tally[1]++;ms.textContent='Seri'}
document.getElementById('w1').textContent=tally[0];document.getElementById('w2').textContent=tally[1];document.getElementById('w3').textContent=tally[2];done=true}
function play(i){
if(done||b[i])return;b[i]='X';paint();
if(win(b,'X')||full(b))return finish();
b[pick()]='O';paint();
if(win(b,'O')||full(b))finish()}
function init(){b=[];for(var i=0;i<9;i++)b.push(null);done=false;ms.textContent='';round++;paint();
if(round%2===0){b[pick()]='O';paint()}
document.getElementById('hn').textContent=round%2===0?'Bot jalan duluan':'Kamu jalan duluan'}
function mode(h){hard=h;document.getElementById('m1').className='btn'+(h?'':' on');document.getElementById('m2').className='btn'+(h?' on':'')}
document.getElementById('m1').addEventListener('click',function(){mode(false)});
document.getElementById('m2').addEventListener('click',function(){mode(true)});
document.getElementById('nw').addEventListener('click',init);
init();
})();
</script>`

const GAMES = {
	snake: { title: 'Snake', html: SNAKE },
	'2048': { title: '2048', html: G2048 },
	memory: { title: 'Memory', html: MEMORY },
	xo: { title: 'Tic Tac Toe', html: XO }
}

const ALIAS = { g2048: '2048', tictactoe: 'xo', ttt: 'xo' }

const handler = async (m, { conn, args, usedPrefix, command }) => {
	let key = command === 'game' ? (args[0] || '').toLowerCase() : command
	key = ALIAS[key] || key
	const game = GAMES[key]

	if (!game) {
		const list = Object.entries(GAMES).map(([id, g]) => `• ${usedPrefix}${id}  ${g.title}`).join('\n')
		return m.reply(`*Game*\n${list}`)
	}

	const rich = new AIRich(conn)
	rich.setTitle(game.title)
	rich.addSection(
		AIRich.newLayout('Single', {
			__typename: 'GenAIaeacdsnwHtmlPrimitive',
			trusted_sources: [],
			payload: BASE + game.html
		})
	)
	await rich.send(m.chat, { quoted: m })
}

handler.command = ['game', 'snake', '2048', 'g2048', 'memory', 'xo', 'tictactoe']
handler.tags = ['fun']
handler.help = ['game', 'snake', '2048', 'memory', 'xo']

export default handler
