const contentCache = {};
let currentTab = null;

async function loadTab(tabName) {
  if (tabName === currentTab) return;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  const container = document.getElementById('tab-content');
  currentTab = tabName;

  if (contentCache[tabName]) {
    container.innerHTML = contentCache[tabName];
    setupTab(tabName);
    return;
  }

  container.innerHTML = '<p class="loading">loading...</p>';

  try {
    const res = await fetch(tabName + '.html');
    if (!res.ok) throw new Error('Not found');
    const html = await res.text();
    contentCache[tabName] = html;
    container.innerHTML = html;
    setupTab(tabName);
  } catch {
    container.innerHTML = '<p class="loading" style="color:var(--amber-dim)">error: could not load ' + tabName + '</p>';
  }
}

function setupTab(tabName) {
  const container = document.getElementById('tab-content');
  container.removeEventListener('click', handleTileToggle);
  container.addEventListener('click', handleTileToggle);

  if (tabName === 'tools') {
    setupCalculator();
  }
}

function handleTileToggle(e) {
  const header = e.target.closest('.tile-header');
  if (!header) return;
  const tile = header.closest('.tile-collapsible');
  if (!tile) return;
  tile.classList.toggle('expanded');
}

function setupCalculator() {
  const btn = document.getElementById('calc-btn');
  if (btn) {
    btn.addEventListener('click', calculateTransferTime);
  }
}

function calculateTransferTime() {
  const sizeInput = document.getElementById('data-size');
  const sizeUnit = document.getElementById('data-unit');
  const speedInput = document.getElementById('transfer-speed');
  const speedUnit = document.getElementById('speed-unit');
  const resultEl = document.getElementById('calc-result');

  const size = parseFloat(sizeInput.value);
  const speed = parseFloat(speedInput.value);

  if (isNaN(size) || isNaN(speed) || size <= 0 || speed <= 0) {
    resultEl.innerHTML = '<span class="result-value">invalid input</span>';
    return;
  }

  const sizeUnits = {
    'B': 1,
    'kB': 1e3,
    'MB': 1e6,
    'GB': 1e9,
    'TB': 1e12
  };

  const speedUnits = {
    'bit/s': 1 / 8,
    'kbit/s': 1e3 / 8,
    'Mbit/s': 1e6 / 8,
    'Gbit/s': 1e9 / 8,
    'B/s': 1,
    'kB/s': 1e3,
    'MB/s': 1e6,
    'GB/s': 1e9
  };

  const sizeBytes = size * (sizeUnits[sizeUnit.value] || 1);
  const speedBps = speed * (speedUnits[speedUnit.value] || 1);

  const totalSeconds = sizeBytes / speedBps;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  resultEl.innerHTML = '<span class="result-value">' + hours + ' h ' + minutes + ' min ' + secs + ' sec</span>';
}

document.addEventListener('DOMContentLoaded', function () {
  loadTab('projects');

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadTab(btn.dataset.tab);
    });
  });
});
