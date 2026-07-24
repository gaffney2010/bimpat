const ROWS = 6;
const COLS = 6;

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

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      hasDot[r][c] = Math.random() < 0.5;
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
