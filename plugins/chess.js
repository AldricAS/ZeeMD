import { randomUUID } from 'crypto'

// chess.js
// Main catur lawan bot langsung di chat (widget HTML interaktif).
// 100% self-contained (tanpa fetch resource dari luar) supaya nggak
// kena masalah "stuck/hang" kayak player musik kemarin.
//
// Bot pakai minimax + alpha-beta pruning (depth 3) + piece-square table
// sederhana buat pion & kuda, jadi mainnya nggak asal-asalan.

function createChessHtml() {
	return `
<style>
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  box-sizing: border-box;
}
body {
  margin: 0;
  background: transparent;
  font-family: Arial, sans-serif;
  color: #eee;
}
.wrap {
  width: 100%;
  max-width: 460px;
  margin: auto;
  padding: 16px;
}
.card {
  position: relative;
  background: linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  padding: 18px;
}
.header {
  text-align: center;
  margin-bottom: 12px;
}
.title {
  font-size: 17px;
  font-weight: bold;
  color: #fff;
}
.subtitle {
  font-size: 10.5px;
  color: rgba(255,255,255,.4);
  margin-top: 2px;
}
.turn {
  margin-top: 8px;
  font-size: 12.5px;
  color: rgba(255,255,255,.7);
  min-height: 16px;
}
.board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,.18);
}
.square {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 6.6vw;
  max-font-size: 30px;
  cursor: pointer;
}
.square.light { background: #cfc7ec; }
.square.dark { background: #5a4bbf; }
.square.selected { box-shadow: inset 0 0 0 3px #ffd76a; }
.square.lastmove { background: rgba(255, 215, 100, .35); }
.square.check { background: rgba(255, 70, 70, .65) !important; }
.square.legal::after {
  content: '';
  position: absolute;
  width: 24%;
  height: 24%;
  border-radius: 50%;
  background: rgba(40, 190, 100, .75);
}
.square.legal-capture::after {
  content: '';
  position: absolute;
  inset: 8%;
  border: 3.5px solid rgba(255, 80, 80, .8);
  border-radius: 50%;
}
.piece { font-size: 6.6vw; line-height: 1; position: relative; z-index: 2; }
.piece.white { color: #f7f7f7; -webkit-text-stroke: 1px #1a1a1a; }
.piece.black { color: #161616; -webkit-text-stroke: 1px #f2f2f2; }
.footer {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}
.reset-btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.06);
  color: #eee;
  font-size: 13px;
  cursor: pointer;
}
.reset-btn:active { background: rgba(255,255,255,.12); }
.end-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 8, 20, .78);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s ease;
}
.end-overlay.show { opacity: 1; pointer-events: auto; }
.end-card {
  text-align: center;
  padding: 20px;
}
.end-text {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16px;
}
</style>
<div class="wrap">
  <div class="card" id="card">
    <div class="header">
      <div class="title">&#9823; Catur vs Bot</div>
      <div class="subtitle">Promosi otomatis jadi Ratu &bull; Bot level menengah</div>
      <div class="turn" id="turnIndicator">Giliran: Kamu (Putih)</div>
    </div>
    <div class="board" id="board"></div>
    <div class="footer">
      <button class="reset-btn" id="resetBtn">Main Ulang</button>
    </div>
    <div class="end-overlay" id="endOverlay">
      <div class="end-card">
        <div class="end-text" id="endText"></div>
        <button class="reset-btn" id="endResetBtn">Main Lagi</button>
      </div>
    </div>
  </div>
</div>
<script>
(function(){

  // ---------- helper dasar ----------
  function rc(i){ return [i >> 3, i & 7]; }
  function idx(r,c){ return r * 8 + c; }
  function inBounds(r,c){ return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function pieceColor(p){ return p === p.toUpperCase() ? 'w' : 'b'; }

  var KNIGHT_OFFS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  var KING_OFFS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  var BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  var ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
  var QUEEN_DIRS = BISHOP_DIRS.concat(ROOK_DIRS);

  var PIECE_VALUES = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
  var PIECE_UNICODE = { K:'\\u265A', Q:'\\u265B', R:'\\u265C', B:'\\u265D', N:'\\u265E', P:'\\u265F' };

  var PAWN_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
   50, 50, 50, 50, 50, 50, 50, 50,
   10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
  ];
  var KNIGHT_PST = [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50
  ];

  // ---------- state ----------
  function createInitialState(){
    var board = new Array(64).fill(null);
    var backRank = ['R','N','B','Q','K','B','N','R'];
    for (var c = 0; c < 8; c++) {
      board[idx(0,c)] = backRank[c].toLowerCase();
      board[idx(1,c)] = 'p';
      board[idx(6,c)] = 'P';
      board[idx(7,c)] = backRank[c];
    }
    return { board: board, turn: 'w', castling: { wK:true, wQ:true, bK:true, bQ:true }, ep: null };
  }

  function cloneState(state){
    return {
      board: state.board.slice(),
      turn: state.turn,
      castling: { wK: state.castling.wK, wQ: state.castling.wQ, bK: state.castling.bK, bQ: state.castling.bQ },
      ep: state.ep
    };
  }

  // ---------- deteksi serangan ----------
  function isAttacked(board, sq, byColor){
    var pos = rc(sq); var r = pos[0]; var c = pos[1];
    var pawnChar = byColor === 'w' ? 'P' : 'p';
    var pr = byColor === 'w' ? r + 1 : r - 1;
    for (var i = 0; i < 2; i++) {
      var pc = c + (i === 0 ? -1 : 1);
      if (inBounds(pr, pc) && board[idx(pr, pc)] === pawnChar) return true;
    }
    var knightChar = byColor === 'w' ? 'N' : 'n';
    for (var k = 0; k < KNIGHT_OFFS.length; k++) {
      var nr = r + KNIGHT_OFFS[k][0], nc = c + KNIGHT_OFFS[k][1];
      if (inBounds(nr, nc) && board[idx(nr, nc)] === knightChar) return true;
    }
    var kingChar = byColor === 'w' ? 'K' : 'k';
    for (var kk = 0; kk < KING_OFFS.length; kk++) {
      var knr = r + KING_OFFS[kk][0], knc = c + KING_OFFS[kk][1];
      if (inBounds(knr, knc) && board[idx(knr, knc)] === kingChar) return true;
    }
    var bishopChar = byColor === 'w' ? 'B' : 'b';
    var queenChar = byColor === 'w' ? 'Q' : 'q';
    var rookChar = byColor === 'w' ? 'R' : 'r';
    for (var d = 0; d < BISHOP_DIRS.length; d++) {
      var dr = BISHOP_DIRS[d][0], dc = BISHOP_DIRS[d][1];
      var xr = r + dr, xc = c + dc;
      while (inBounds(xr, xc)) {
        var p = board[idx(xr, xc)];
        if (p) { if (p === bishopChar || p === queenChar) return true; break; }
        xr += dr; xc += dc;
      }
    }
    for (var d2 = 0; d2 < ROOK_DIRS.length; d2++) {
      var rdr = ROOK_DIRS[d2][0], rdc = ROOK_DIRS[d2][1];
      var yr = r + rdr, yc = c + rdc;
      while (inBounds(yr, yc)) {
        var p2 = board[idx(yr, yc)];
        if (p2) { if (p2 === rookChar || p2 === queenChar) return true; break; }
        yr += rdr; yc += rdc;
      }
    }
    return false;
  }

  function findKing(board, side){
    var kingChar = side === 'w' ? 'K' : 'k';
    return board.indexOf(kingChar);
  }
  function isInCheck(state, side){
    var kIdx = findKing(state.board, side);
    if (kIdx < 0) return false;
    return isAttacked(state.board, kIdx, side === 'w' ? 'b' : 'w');
  }

  // ---------- generate pseudo moves ----------
  function genPawnMoves(state, from, side, moves){
    var board = state.board;
    var pos = rc(from); var r = pos[0]; var c = pos[1];
    var dir = side === 'w' ? -1 : 1;
    var startRow = side === 'w' ? 6 : 1;
    var promoRow = side === 'w' ? 0 : 7;
    var oneR = r + dir;
    if (inBounds(oneR, c) && !board[idx(oneR, c)]) {
      moves.push({ from: from, to: idx(oneR, c), capturedSquare: null, capturedPiece: null, isEp: false, isCastle: null, promotion: oneR === promoRow, doubleStep: false });
      var twoR = r + 2 * dir;
      if (r === startRow && !board[idx(twoR, c)]) {
        moves.push({ from: from, to: idx(twoR, c), capturedSquare: null, capturedPiece: null, isEp: false, isCastle: null, promotion: false, doubleStep: true });
      }
    }
    for (var i = 0; i < 2; i++) {
      var nc = c + (i === 0 ? -1 : 1);
      if (!inBounds(oneR, nc)) continue;
      var t = idx(oneR, nc);
      var tp = board[t];
      if (tp && pieceColor(tp) !== side) {
        moves.push({ from: from, to: t, capturedSquare: t, capturedPiece: tp, isEp: false, isCastle: null, promotion: oneR === promoRow, doubleStep: false });
      } else if (!tp && state.ep === t) {
        var capSq = idx(r, nc);
        moves.push({ from: from, to: t, capturedSquare: capSq, capturedPiece: board[capSq], isEp: true, isCastle: null, promotion: false, doubleStep: false });
      }
    }
  }

  function genKnightMoves(state, from, side, moves){
    var pos = rc(from); var r = pos[0]; var c = pos[1];
    for (var i = 0; i < KNIGHT_OFFS.length; i++) {
      var nr = r + KNIGHT_OFFS[i][0], nc = c + KNIGHT_OFFS[i][1];
      if (!inBounds(nr, nc)) continue;
      var t = idx(nr, nc);
      var tp = state.board[t];
      if (!tp || pieceColor(tp) !== side) {
        moves.push({ from: from, to: t, capturedSquare: tp ? t : null, capturedPiece: tp || null, isEp: false, isCastle: null, promotion: false, doubleStep: false });
      }
    }
  }

  function genSlidingMoves(state, from, side, dirs, moves){
    var pos = rc(from); var r = pos[0]; var c = pos[1];
    for (var d = 0; d < dirs.length; d++) {
      var dr = dirs[d][0], dc = dirs[d][1];
      var nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        var t = idx(nr, nc);
        var tp = state.board[t];
        if (!tp) {
          moves.push({ from: from, to: t, capturedSquare: null, capturedPiece: null, isEp: false, isCastle: null, promotion: false, doubleStep: false });
        } else {
          if (pieceColor(tp) !== side) {
            moves.push({ from: from, to: t, capturedSquare: t, capturedPiece: tp, isEp: false, isCastle: null, promotion: false, doubleStep: false });
          }
          break;
        }
        nr += dr; nc += dc;
      }
    }
  }

  function genKingMoves(state, from, side, moves){
    var pos = rc(from); var r = pos[0]; var c = pos[1];
    for (var i = 0; i < KING_OFFS.length; i++) {
      var nr = r + KING_OFFS[i][0], nc = c + KING_OFFS[i][1];
      if (!inBounds(nr, nc)) continue;
      var t = idx(nr, nc);
      var tp = state.board[t];
      if (!tp || pieceColor(tp) !== side) {
        moves.push({ from: from, to: t, capturedSquare: tp ? t : null, capturedPiece: tp || null, isEp: false, isCastle: null, promotion: false, doubleStep: false });
      }
    }
    var rights = state.castling;
    var homeRow = side === 'w' ? 7 : 0;
    if (from === idx(homeRow, 4)) {
      var oppSide = side === 'w' ? 'b' : 'w';
      if (!isAttacked(state.board, from, oppSide)) {
        var kOk = side === 'w' ? rights.wK : rights.bK;
        if (kOk && !state.board[idx(homeRow, 5)] && !state.board[idx(homeRow, 6)] &&
            !isAttacked(state.board, idx(homeRow, 5), oppSide) &&
            !isAttacked(state.board, idx(homeRow, 6), oppSide) &&
            state.board[idx(homeRow, 7)] === (side === 'w' ? 'R' : 'r')) {
          moves.push({ from: from, to: idx(homeRow, 6), capturedSquare: null, capturedPiece: null, isEp: false, isCastle: 'K', promotion: false, doubleStep: false });
        }
        var qOk = side === 'w' ? rights.wQ : rights.bQ;
        if (qOk && !state.board[idx(homeRow, 3)] && !state.board[idx(homeRow, 2)] && !state.board[idx(homeRow, 1)] &&
            !isAttacked(state.board, idx(homeRow, 3), oppSide) &&
            !isAttacked(state.board, idx(homeRow, 2), oppSide) &&
            state.board[idx(homeRow, 0)] === (side === 'w' ? 'R' : 'r')) {
          moves.push({ from: from, to: idx(homeRow, 2), capturedSquare: null, capturedPiece: null, isEp: false, isCastle: 'Q', promotion: false, doubleStep: false });
        }
      }
    }
  }

  function generatePseudoMoves(state, side){
    var moves = [];
    for (var i = 0; i < 64; i++) {
      var p = state.board[i];
      if (!p || pieceColor(p) !== side) continue;
      var type = p.toUpperCase();
      if (type === 'P') genPawnMoves(state, i, side, moves);
      else if (type === 'N') genKnightMoves(state, i, side, moves);
      else if (type === 'B') genSlidingMoves(state, i, side, BISHOP_DIRS, moves);
      else if (type === 'R') genSlidingMoves(state, i, side, ROOK_DIRS, moves);
      else if (type === 'Q') genSlidingMoves(state, i, side, QUEEN_DIRS, moves);
      else if (type === 'K') genKingMoves(state, i, side, moves);
    }
    return moves;
  }

  function applyMove(state, move){
    var ns = cloneState(state);
    var piece = ns.board[move.from];
    var side = pieceColor(piece);
    if (move.capturedSquare !== null) ns.board[move.capturedSquare] = null;
    ns.board[move.to] = piece;
    ns.board[move.from] = null;
    if (move.promotion) ns.board[move.to] = side === 'w' ? 'Q' : 'q';
    if (move.isCastle === 'K') {
      var homeRowK = side === 'w' ? 7 : 0;
      ns.board[idx(homeRowK, 5)] = ns.board[idx(homeRowK, 7)];
      ns.board[idx(homeRowK, 7)] = null;
    } else if (move.isCastle === 'Q') {
      var homeRowQ = side === 'w' ? 7 : 0;
      ns.board[idx(homeRowQ, 3)] = ns.board[idx(homeRowQ, 0)];
      ns.board[idx(homeRowQ, 0)] = null;
    }
    var type = piece.toUpperCase();
    if (type === 'K') {
      if (side === 'w') { ns.castling.wK = false; ns.castling.wQ = false; }
      else { ns.castling.bK = false; ns.castling.bQ = false; }
    }
    if (type === 'R') {
      if (move.from === idx(7,0)) ns.castling.wQ = false;
      if (move.from === idx(7,7)) ns.castling.wK = false;
      if (move.from === idx(0,0)) ns.castling.bQ = false;
      if (move.from === idx(0,7)) ns.castling.bK = false;
    }
    if (move.capturedSquare === idx(7,0)) ns.castling.wQ = false;
    if (move.capturedSquare === idx(7,7)) ns.castling.wK = false;
    if (move.capturedSquare === idx(0,0)) ns.castling.bQ = false;
    if (move.capturedSquare === idx(0,7)) ns.castling.bK = false;
    ns.ep = move.doubleStep ? (move.from + move.to) / 2 : null;
    ns.turn = side === 'w' ? 'b' : 'w';
    return ns;
  }

  function generateLegalMoves(state, side){
    var pseudo = generatePseudoMoves(state, side);
    var legal = [];
    for (var i = 0; i < pseudo.length; i++) {
      var m = pseudo[i];
      var ns = applyMove(state, m);
      if (!isInCheck(ns, side)) legal.push(m);
    }
    return legal;
  }

  // ---------- evaluasi & AI ----------
  function evaluate(state){
    var score = 0;
    for (var i = 0; i < 64; i++) {
      var p = state.board[i];
      if (!p) continue;
      var isWhite = p === p.toUpperCase();
      var type = p.toUpperCase();
      var val = PIECE_VALUES[type];
      if (type === 'P') val += isWhite ? PAWN_PST[i] : PAWN_PST[63 - i];
      if (type === 'N') val += isWhite ? KNIGHT_PST[i] : KNIGHT_PST[63 - i];
      score += isWhite ? val : -val;
    }
    return score + (Math.random() - 0.5) * 4;
  }

  function orderMoves(moves){
    return moves.slice().sort(function(a, b){
      var av = a.capturedPiece ? PIECE_VALUES[a.capturedPiece.toUpperCase()] : 0;
      var bv = b.capturedPiece ? PIECE_VALUES[b.capturedPiece.toUpperCase()] : 0;
      return bv - av;
    });
  }

  var nodeBudget = 0;
  var MAX_NODES = 120000;

  function minimax(state, depth, alpha, beta, side){
    nodeBudget++;
    var legal = generateLegalMoves(state, side);
    if (legal.length === 0) {
      if (isInCheck(state, side)) return { score: side === 'w' ? -100000 - depth : 100000 + depth, move: null };
      return { score: 0, move: null };
    }
    if (depth === 0 || nodeBudget > MAX_NODES) {
      return { score: evaluate(state), move: null };
    }
    var ordered = orderMoves(legal);
    var bestMove = ordered[0];
    if (side === 'w') {
      var best = -Infinity;
      for (var i = 0; i < ordered.length; i++) {
        var ns = applyMove(state, ordered[i]);
        var res = minimax(ns, depth - 1, alpha, beta, 'b');
        if (res.score > best) { best = res.score; bestMove = ordered[i]; }
        alpha = Math.max(alpha, best);
        if (beta <= alpha || nodeBudget > MAX_NODES) break;
      }
      return { score: best, move: bestMove };
    } else {
      var best2 = Infinity;
      for (var j = 0; j < ordered.length; j++) {
        var ns2 = applyMove(state, ordered[j]);
        var res2 = minimax(ns2, depth - 1, alpha, beta, 'w');
        if (res2.score < best2) { best2 = res2.score; bestMove = ordered[j]; }
        beta = Math.min(beta, best2);
        if (beta <= alpha || nodeBudget > MAX_NODES) break;
      }
      return { score: best2, move: bestMove };
    }
  }

  function findBestMove(state, side, maxDepth){
    nodeBudget = 0;
    var bestMove = null;
    for (var d = 1; d <= maxDepth; d++) {
      var res = minimax(state, d, -Infinity, Infinity, side);
      if (res.move) bestMove = res.move;
      if (nodeBudget > MAX_NODES) break;
    }
    return bestMove;
  }

  // ---------- UI ----------
  var playerColor = 'w', aiColor = 'b';
  var state = createInitialState();
  var selected = null;
  var legalTargets = [];
  var lastMove = null;
  var gameOver = false;

  var boardEl = document.getElementById('board');
  var turnEl = document.getElementById('turnIndicator');
  var endOverlay = document.getElementById('endOverlay');
  var endText = document.getElementById('endText');

  function updateTurnIndicator(thinking){
    if (gameOver) return;
    if (thinking) {
      turnEl.textContent = 'Giliran: Bot (Hitam) \\u2014 sedang berpikir...';
    } else if (state.turn === playerColor) {
      turnEl.textContent = 'Giliran: Kamu (Putih)';
    } else {
      turnEl.textContent = 'Giliran: Bot (Hitam)';
    }
  }

  function showEndOverlay(text){
    endText.textContent = text;
    endOverlay.classList.add('show');
  }
  function hideEndOverlay(){
    endOverlay.classList.remove('show');
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    var checkSide = isInCheck(state, state.turn) ? state.turn : null;
    var kingIdx = checkSide ? findKing(state.board, checkSide) : -1;
    for (var i = 0; i < 64; i++) {
      var pos = rc(i); var r = pos[0]; var c = pos[1];
      var sq = document.createElement('div');
      sq.className = 'square ' + (((r + c) % 2 === 0) ? 'light' : 'dark');
      if (selected === i) sq.classList.add('selected');
      if (lastMove && (lastMove.from === i || lastMove.to === i)) sq.classList.add('lastmove');
      if (i === kingIdx) sq.classList.add('check');
      var lm = null;
      for (var k = 0; k < legalTargets.length; k++) { if (legalTargets[k].to === i) { lm = legalTargets[k]; break; } }
      if (lm) sq.classList.add(lm.capturedPiece ? 'legal-capture' : 'legal');
      var piece = state.board[i];
      if (piece) {
        var span = document.createElement('span');
        var type = piece.toUpperCase();
        span.className = 'piece ' + (piece === type ? 'white' : 'black');
        span.textContent = PIECE_UNICODE[type];
        sq.appendChild(span);
      }
      (function(sqIdx){
        sq.addEventListener('click', function(){ onSquareClick(sqIdx); });
      })(i);
      boardEl.appendChild(sq);
    }
  }

  function checkGameEnd(){
    var legal = generateLegalMoves(state, state.turn);
    if (legal.length === 0) {
      gameOver = true;
      var inCheck = isInCheck(state, state.turn);
      var text;
      if (inCheck) {
        text = state.turn === playerColor ? 'Skak Mat! Bot Menang' : 'Skak Mat! Kamu Menang!';
      } else {
        text = 'Seri (Stalemate)';
      }
      showEndOverlay(text);
      return true;
    }
    return false;
  }

  function doAiMove(){
    var best = findBestMove(state, aiColor, 3);
    if (best) {
      state = applyMove(state, best);
      lastMove = { from: best.from, to: best.to };
    }
    renderBoard();
    if (!checkGameEnd()) updateTurnIndicator(false);
  }

  function makePlayerMove(move){
    state = applyMove(state, move);
    lastMove = { from: move.from, to: move.to };
    selected = null;
    legalTargets = [];
    renderBoard();
    if (!checkGameEnd()) {
      updateTurnIndicator(true);
      setTimeout(doAiMove, 80);
    }
  }

  function onSquareClick(sqIdx){
    if (gameOver || state.turn !== playerColor) return;
    var hit = null;
    for (var k = 0; k < legalTargets.length; k++) { if (legalTargets[k].to === sqIdx) { hit = legalTargets[k]; break; } }
    if (selected !== null && hit) {
      makePlayerMove(hit);
      return;
    }
    var piece = state.board[sqIdx];
    if (piece && pieceColor(piece) === playerColor) {
      selected = sqIdx;
      var allLegal = generateLegalMoves(state, playerColor);
      legalTargets = allLegal.filter(function(m){ return m.from === sqIdx; });
    } else {
      selected = null;
      legalTargets = [];
    }
    renderBoard();
  }

  function resetGame(){
    state = createInitialState();
    selected = null;
    legalTargets = [];
    lastMove = null;
    gameOver = false;
    hideEndOverlay();
    renderBoard();
    updateTurnIndicator(false);
  }

  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document.getElementById('endResetBtn').addEventListener('click', resetGame);

  renderBoard();
  updateTurnIndicator(false);
})();
</script>
`
}

// ---------- Pengirim kartu HTML (rich message) ----------

async function sendRichHtml(conn, jid, html, headerText) {
	const responseId = randomUUID()
	await conn.relayMessage(
		jid,
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
									'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'
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
								messageText: headerText || 'Catur vs Bot'
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

// ---------- Handler ----------

let handler = async (m, { conn }) => {
	try {
		await m.react('\u265F')
		const html = createChessHtml()
		await sendRichHtml(conn, m.chat, html, 'Catur vs Bot')
		await m.react('\u2705')
	} catch (e) {
		console.error('[CHESS ERROR]', e)
		await m.react('\u274C')
		await m.reply('\u274C Gagal membuka papan catur.\n\n> ' + (e?.message || String(e)))
	}
}

handler.help = ['catur']
handler.tags = ['game']
handler.command = /^(catur|chess)$/i

export default handler
