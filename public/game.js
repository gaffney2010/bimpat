const SIZE = Math.max(3, Math.min(12, parseInt(new URLSearchParams(window.location.search).get('size') || '6', 10)));
const ROWS = SIZE;
const COLS = SIZE;

// Must match CSS values
const CELL     = 48;
const ROW_PAD_V = 4;
const ROW_PAD_H = 8;
const GAP       = 6;
const ROW_H     = CELL + 2 * ROW_PAD_V;   // 56
const STRIDE    = ROW_H + GAP;              // 62
const SVG_W     = 2 * ROW_PAD_H + COLS * CELL;          // 304
const SVG_H     = ROWS * ROW_H + (ROWS - 1) * GAP;      // 366

const BAR_OFFSET = 10;   // px left/right of dot center
const BAR_WIDTH  = 5;

const hasDot   = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
const rowColor = Array(ROWS).fill('blue');

// --- Matrix generation (GF(2)) ---

function rankGF2(matrix) {
  const m = matrix.map(row => row.slice());
  let rank = 0;
  let pivotRow = 0;
  for (let col = 0; col < COLS && pivotRow < ROWS; col++) {
    let found = -1;
    for (let r = pivotRow; r < ROWS; r++) {
      if (m[r][col]) { found = r; break; }
    }
    if (found === -1) continue;
    [m[pivotRow], m[found]] = [m[found], m[pivotRow]];
    for (let r = 0; r < ROWS; r++) {
      if (r !== pivotRow && m[r][col]) {
        for (let c = 0; c < COLS; c++) m[r][c] ^= m[pivotRow][c];
      }
    }
    rank++;
    pivotRow++;
  }
  return rank;
}

function nullSpaceGF2(matrix) {
  const m = matrix.map(row => row.slice());
  const pivotCols = [];
  let pivotRow = 0;
  for (let col = 0; col < COLS && pivotRow < ROWS; col++) {
    let found = -1;
    for (let r = pivotRow; r < ROWS; r++) if (m[r][col]) { found = r; break; }
    if (found === -1) continue;
    [m[pivotRow], m[found]] = [m[found], m[pivotRow]];
    for (let r = 0; r < ROWS; r++) {
      if (r !== pivotRow && m[r][col])
        for (let c = 0; c < COLS; c++) m[r][c] ^= m[pivotRow][c];
    }
    pivotCols.push(col);
    pivotRow++;
  }
  const freeCols = Array.from({ length: COLS }, (_, i) => i).filter(c => !pivotCols.includes(c));
  return freeCols.map(fc => {
    const v = Array(COLS).fill(0);
    v[fc] = 1;
    pivotCols.forEach((pc, i) => { v[pc] = m[i][fc]; });
    return v;
  });
}

// Rows a and b are connected if they share a 1 in some column.
// BAD = the union of all null-vector supports is disconnected under row connectivity.
// This is basis-independent and catches empty-row cases (isolated nodes).
function isBadMatrix(M, leftNullVecs) {
  for (let a = 0; a < ROWS; a++)
    for (let b = a + 1; b < ROWS; b++)
      if (M[a].every((v, c) => v === M[b][c])) return true;

  const inSupport = Array(ROWS).fill(false);
  for (const v of leftNullVecs) v.forEach((bit, i) => { if (bit) inSupport[i] = true; });
  const S = Array.from({ length: ROWS }, (_, i) => i).filter(i => inSupport[i]);
  if (S.length === 0) return true;

  const adj = new Map(S.map(r => [r, []]));
  for (let c = 0; c < COLS; c++) {
    const ones = S.filter(r => M[r][c] === 1);
    for (let a = 0; a < ones.length; a++)
      for (let b = a + 1; b < ones.length; b++) {
        adj.get(ones[a]).push(ones[b]);
        adj.get(ones[b]).push(ones[a]);
      }
  }

  const visited = new Set([S[0]]);
  const queue = [S[0]];
  while (queue.length) {
    const r = queue.shift();
    for (const nb of adj.get(r)) if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
  }
  return S.some(r => !visited.has(r));
}

function generateMatrix() {
  while (true) {
    const M = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    for (let r = 0; r < ROWS - 1; r++)
      for (let c = 0; c < COLS; c++)
        M[r][c] = Math.random() < 0.5 ? 1 : 0;
    // Checksum row: ensures each column has even sum
    for (let c = 0; c < COLS; c++) {
      let xor = 0;
      for (let r = 0; r < ROWS - 1; r++) xor ^= M[r][c];
      M[ROWS - 1][c] = xor;
    }
    if (rankGF2(M) !== COLS - 2) continue;  // null space dim must be 2
    const Mt = M[0].map((_, c) => M.map(row => row[c]));
    const leftNull = nullSpaceGF2(Mt);
    if (!isBadMatrix(M, leftNull)) return M;
  }
}

function dotCx(c) { return ROW_PAD_H + c * CELL + CELL / 2; }
function dotCy(r) { return r * STRIDE + ROW_PAD_V + CELL / 2; }

// Given an ordered list of same-color dot row indices, return pairs.
// Only consecutive entries (no same-color dot between them) are valid.
// Maximise pairs; for odd counts, randomly skip one even-index entry.
function pairPositions(positions, color) {
  const n = positions.length;
  if (n < 2) return [];

  let chosen;
  if (n % 2 === 0) {
    chosen = positions.slice();
  } else {
    // Even indices (0, 2, 4, …) are the only positions whose removal
    // still allows a maximum matching on the remaining consecutive pairs.
    const evens = [];
    for (let i = 0; i < n; i += 2) evens.push(i);
    const skipIdx = evens[Math.floor(Math.random() * evens.length)];
    chosen = positions.filter((_, i) => i !== skipIdx);
  }

  const pairs = [];
  for (let i = 0; i < chosen.length; i += 2) {
    pairs.push({ r1: chosen[i], r2: chosen[i + 1], color });
  }
  return pairs;
}

function computeAllPairs() {
  const all = [];
  for (let c = 0; c < COLS; c++) {
    const blue = [], red = [];
    for (let r = 0; r < ROWS; r++) {
      if (!hasDot[r][c]) continue;
      (rowColor[r] === 'blue' ? blue : red).push(r);
    }
    for (const p of pairPositions(blue, 'blue')) all.push({ ...p, col: c });
    for (const p of pairPositions(red,  'red'))  all.push({ ...p, col: c });
  }
  return all;
}

function updateCounters() {
  const blue = rowColor.filter(c => c === 'blue').length;
  document.getElementById('blue-count').textContent = blue;
  document.getElementById('red-count').textContent = ROWS - blue;
}

function renderBars() {
  const svg = document.getElementById('bars-svg');
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  for (const { r1, r2, col, color } of computeAllPairs()) {
    const x  = dotCx(col) + (color === 'blue' ? -BAR_OFFSET : BAR_OFFSET);
    const y1 = dotCy(r1);
    const y2 = dotCy(r2);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color === 'blue' ? '#7eb8ff' : '#ff8080');
    line.setAttribute('stroke-width', BAR_WIDTH);
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }
}

function flashElements(elements) {
  elements.forEach(el => {
    el.classList.remove('flashing');
    void el.offsetWidth; // force reflow so animation restarts
    el.classList.add('flashing');
    el.addEventListener('animationend', () => el.classList.remove('flashing'), { once: true });
  });
}

function getUnpairedDotElements() {
  const paired = new Set(
    computeAllPairs().flatMap(({ r1, r2, col }) => [`${r1},${col}`, `${r2},${col}`])
  );
  const rowEls = Array.from(document.querySelectorAll('#grid .row'));
  const unpaired = [];
  for (let r = 0; r < ROWS; r++) {
    const cells = rowEls[r].querySelectorAll('.cell');
    for (let c = 0; c < COLS; c++) {
      if (hasDot[r][c] && !paired.has(`${r},${c}`))
        unpaired.push(cells[c].querySelector('.dot'));
    }
  }
  return unpaired;
}

function handleSubmit() {
  const blueCount = rowColor.filter(c => c === 'blue').length;
  const redCount  = ROWS - blueCount;

  if (blueCount === 0) { flashElements([document.getElementById('blue-counter')]); return; }
  if (redCount  === 0) { flashElements([document.getElementById('red-counter')]);  return; }

  const unpaired = getUnpairedDotElements();
  if (unpaired.length > 0) { flashElements(unpaired); return; }

  document.getElementById('submit-btn').style.display = 'none';
  document.getElementById('congrats').style.display   = 'block';
}

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  rowColor.fill('blue');
  document.getElementById('submit-btn').style.display = 'inline-block';
  document.getElementById('congrats').style.display   = 'none';

  const M = generateMatrix();
  const Mt = M[0].map((_, c) => M.map(row => row[c]));
  const leftNullVecs = nullSpaceGF2(Mt);

  if (new URLSearchParams(window.location.search).get('debug') === 'true') {
    let dbg = document.getElementById('debug');
    if (!dbg) { dbg = document.createElement('div'); dbg.id = 'debug'; document.body.appendChild(dbg); }
    dbg.innerHTML = '<strong>Left null space (GF(2)) — vM = 0:</strong><br>' +
      leftNullVecs.map((v, i) => `v${i+1} = [${v.join(', ')}]`).join('<br>');
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      hasDot[r][c] = M[r][c] === 1;
    }

    const row = document.createElement('div');
    row.className = 'row';
    row.addEventListener('click', () => {
      rowColor[r] = rowColor[r] === 'blue' ? 'red' : 'blue';
      row.classList.toggle('selected');
      renderBars();
      updateCounters();
    });

    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (hasDot[r][c]) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        cell.appendChild(dot);
      }
      row.appendChild(cell);
    }

    grid.appendChild(row);
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'bars-svg';
  svg.setAttribute('width', SVG_W);
  svg.setAttribute('height', SVG_H);
  svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
  grid.appendChild(svg);

  renderBars();
  updateCounters();
}

buildGrid();
document.getElementById('submit-btn').addEventListener('click', handleSubmit);
document.getElementById('new-game-btn').addEventListener('click', buildGrid);
