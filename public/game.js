const ROWS = 6;
const COLS = 6;

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'row';

    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (Math.random() < 0.5) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        cell.appendChild(dot);
      }

      row.appendChild(cell);
    }

    grid.appendChild(row);
  }
}

buildGrid();
