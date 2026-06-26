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
  if (tabName === 'tools') {
    setupCalculator();
    setupSubnetCalculator();
  }
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

function setupSubnetCalculator() {
  const ids = ['subnet-ip', 'subnet-cidr', 'subnet-mask', 'subnet-hosts'];
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function () {
        calculateSubnet(this.id);
      });
    }
  });
  calculateSubnet('subnet-cidr');
}

var subnetRecalculating = false;

function calculateSubnet(sourceId) {
  if (subnetRecalculating) return;
  subnetRecalculating = true;

  try {
    var ipStr = document.getElementById('subnet-ip').value.trim();
    var ipInt = ipToInt(ipStr);
    if (ipInt === null) return;

    var cidr;
    var sourceEl = document.getElementById(sourceId);

    if (sourceId === 'subnet-cidr') {
      cidr = parseInt(sourceEl.value, 10);
    } else if (sourceId === 'subnet-mask') {
      var maskInt = maskToInt(sourceEl.value);
      if (maskInt === null) return;
      cidr = intToCidr(maskInt);
    } else if (sourceId === 'subnet-hosts') {
      var hosts = parseInt(sourceEl.value, 10);
      if (isNaN(hosts) || hosts < 0) return;
      cidr = hostsToCidr(hosts);
    } else {
      cidr = parseInt(document.getElementById('subnet-cidr').value, 10);
    }

    if (isNaN(cidr) || cidr < 0 || cidr > 32) return;

    var maskInt = cidrToMaskInt(cidr);
    var networkInt = ipInt & maskInt;
    var broadcastInt = (ipInt | (~maskInt >>> 0)) >>> 0;

    var maxHosts = cidrToMaxHosts(cidr);

    if (sourceId !== 'subnet-cidr') {
      document.getElementById('subnet-cidr').value = cidr;
    }
    if (sourceId !== 'subnet-mask') {
      document.getElementById('subnet-mask').value = intToIp(maskInt);
    }
    if (sourceId !== 'subnet-hosts') {
      document.getElementById('subnet-hosts').value = maxHosts;
    }

    document.getElementById('subnet-network').textContent = intToIp(networkInt);
    document.getElementById('subnet-broadcast').textContent = intToIp(broadcastInt);
    document.getElementById('subnet-maxhosts').textContent = maxHosts;
    document.getElementById('subnet-class').textContent = getIpClass(ipInt);

    if (cidr === 32) {
      document.getElementById('subnet-range').textContent = intToIp(networkInt) + ' (single host)';
    } else if (cidr === 31) {
      document.getElementById('subnet-range').textContent = intToIp(networkInt) + ' - ' + intToIp(broadcastInt);
    } else if (maxHosts === 0) {
      document.getElementById('subnet-range').textContent = 'none';
    } else {
      var firstHost = (networkInt + 1) >>> 0;
      var lastHost = (broadcastInt - 1) >>> 0;
      document.getElementById('subnet-range').textContent = intToIp(firstHost) + ' - ' + intToIp(lastHost);
    }
  } finally {
    subnetRecalculating = false;
  }
}

function ipToInt(ip) {
  var parts = ip.split('.');
  if (parts.length !== 4) return null;
  var result = 0;
  for (var i = 0; i < 4; i++) {
    var octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    result = ((result << 8) | octet) >>> 0;
  }
  return result;
}

function intToIp(n) {
  return ((n >>> 24) & 0xFF) + '.' + ((n >>> 16) & 0xFF) + '.' + ((n >>> 8) & 0xFF) + '.' + (n & 0xFF);
}

function maskToInt(mask) {
  var parts = mask.split('.');
  if (parts.length !== 4) return null;
  var result = 0;
  for (var i = 0; i < 4; i++) {
    var octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    result = ((result << 8) | octet) >>> 0;
  }
  return result;
}

function cidrToMaskInt(cidr) {
  if (cidr === 0) return 0;
  if (cidr === 32) return 0xFFFFFFFF;
  return (~((1 << (32 - cidr)) - 1)) >>> 0;
}

function intToCidr(mask) {
  var count = 0;
  for (var i = 31; i >= 0; i--) {
    if ((mask >>> i) & 1) count++;
    else break;
  }
  return count;
}

function hostsToCidr(hosts) {
  if (isNaN(hosts) || hosts < 0) return 32;
  if (hosts <= 1) return 32;
  if (hosts === 2) return 31;
  var total = hosts + 2;
  var bits = 0;
  while ((1 << bits) < total) bits++;
  return Math.max(0, Math.min(32, 32 - bits));
}

function cidrToMaxHosts(cidr) {
  if (cidr === 32) return 1;
  if (cidr === 31) return 2;
  return Math.pow(2, 32 - cidr) - 2;
}

function getIpClass(ipInt) {
  var first = (ipInt >>> 24) & 0xFF;
  if (first <= 127) return 'A';
  if (first <= 191) return 'B';
  if (first <= 223) return 'C';
  if (first <= 239) return 'D';
  return 'E';
}

/* ---- Theme ---- */
function getPreferredTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

document.addEventListener('DOMContentLoaded', function () {
  setTheme(getPreferredTheme());

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'light' : 'dark');
    }
  });

  loadTab('projects');

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadTab(btn.dataset.tab);
    });
  });
});
