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

let currentTag = 'all';

function setupTab(tabName) {
  if (tabName === 'tools') {
    setupCalculator();
    setupSubnetCalculator();
    setupToolSearch();
    setupToolFilters();
    setupFileHasher();
    setupCompass();
    setupHikingCalculator();
  }
}

function filterTools() {
  const term = document.getElementById('tool-search').value.toLowerCase().trim();
  const tiles = document.querySelectorAll('#tab-tools .tile');

  tiles.forEach(function (tile) {
    const tag = tile.dataset.tag || '';
    const matchesTag = currentTag === 'all' || tag === currentTag;
    const matchesSearch = !term || tile.textContent.toLowerCase().includes(term);
    tile.style.display = matchesTag && matchesSearch ? '' : 'none';
  });
}

function setupToolSearch() {
  const searchInput = document.getElementById('tool-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', filterTools);
}

function setupToolFilters() {
  const buttons = document.querySelectorAll('.tag-btn');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentTag = this.dataset.tag;
      filterTools();
    });
  });
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

  loadTab('tools');

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      if (currentTab === 'tools') {
        e.preventDefault();
        const searchInput = document.getElementById('tool-search');
        if (searchInput) searchInput.focus();
      }
    }
  });

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      loadTab(btn.dataset.tab);
    });
  });

  /* ---- PWA ---- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }

  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hideInstallBtn();
  });

  var installBtn = document.getElementById('install-btn');
  var pwaModal = document.getElementById('pwa-modal');
  var pwaModalClose = document.getElementById('pwa-modal-close');
  var pwaModalBody = document.getElementById('pwa-modal-body');
  var pwaModalIos = document.getElementById('pwa-modal-ios');
  var pwaModalAndroid = document.getElementById('pwa-modal-android');

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (isStandalone()) return;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice.outcome === 'accepted') {
            hideInstallBtn();
          }
          deferredPrompt = null;
        });
      } else if (isiOS()) {
        showIosModal();
      } else if (isAndroid()) {
        showAndroidModal();
      } else {
        showMessageModal('Open this site in Chrome or a mobile browser to install the app.');
      }
    });
  }

  if (pwaModalClose) {
    pwaModalClose.addEventListener('click', hidePwaModal);
  }

  if (pwaModal) {
    pwaModal.addEventListener('click', function (e) {
      if (e.target === pwaModal) hidePwaModal();
    });
  }
});

function hideInstallBtn() {
  var btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
}

function isiOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function showPwaModal() {
  var modal = document.getElementById('pwa-modal');
  if (modal) modal.hidden = false;
}

function hidePwaModal() {
  var modal = document.getElementById('pwa-modal');
  if (modal) modal.hidden = true;
  var ios = document.getElementById('pwa-modal-ios');
  var android = document.getElementById('pwa-modal-android');
  if (ios) ios.hidden = true;
  if (android) android.hidden = true;
}

function showIosModal() {
  var body = document.getElementById('pwa-modal-body');
  var ios = document.getElementById('pwa-modal-ios');
  var android = document.getElementById('pwa-modal-android');
  if (body) body.innerHTML = '';
  if (ios) ios.hidden = false;
  if (android) android.hidden = true;
  showPwaModal();
}

function showAndroidModal() {
  var body = document.getElementById('pwa-modal-body');
  var ios = document.getElementById('pwa-modal-ios');
  var android = document.getElementById('pwa-modal-android');
  if (body) body.innerHTML = '';
  if (ios) ios.hidden = true;
  if (android) android.hidden = false;
  showPwaModal();
}

function showMessageModal(msg) {
  var body = document.getElementById('pwa-modal-body');
  var ios = document.getElementById('pwa-modal-ios');
  var android = document.getElementById('pwa-modal-android');
  if (body) body.innerHTML = '<p>' + msg + '</p>';
  if (ios) ios.hidden = true;
  if (android) android.hidden = true;
  showPwaModal();
}

/* ---- File Hash Calculator ---- */
function setupFileHasher() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const clearBtn = document.getElementById('clear-btn');
  if (!dropZone || !fileInput || !clearBtn) return;

  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) handleFile(this.files[0]);
    this.value = '';
  });

  clearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    clearFile();
  });
}

function clearFile() {
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');
  const resultDiv = document.getElementById('hash-results');
  const sha256El = document.getElementById('hash-sha256');
  const sha1El = document.getElementById('hash-sha1');

  fileInput.value = '';
  fileInfo.hidden = true;
  resultDiv.hidden = true;
  sha256El.textContent = '_';
  sha1El.textContent = '_';
}

function handleFile(file) {
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('file-name');
  const resultDiv = document.getElementById('hash-results');
  const sha256El = document.getElementById('hash-sha256');
  const sha1El = document.getElementById('hash-sha1');

  fileName.textContent = file.name;
  fileInfo.hidden = false;
  resultDiv.hidden = false;
  sha256El.textContent = 'computing...';
  sha1El.textContent = 'computing...';

  const reader = new FileReader();
  reader.onload = async function (e) {
    const arrayBuffer = e.target.result;

    try {
      const [sha256, sha1] = await Promise.all([
        computeHash('SHA-256', arrayBuffer),
        computeHash('SHA-1', arrayBuffer)
      ]);
      sha256El.textContent = sha256;
      sha1El.textContent = sha1;
    } catch {
      sha256El.textContent = 'error';
      sha1El.textContent = 'error';
    }
  };
  reader.onerror = function () {
    sha256El.textContent = 'error reading file';
    sha1El.textContent = 'error reading file';
  };
  reader.readAsArrayBuffer(file);
}

/* ---- Compass ---- */
function setupCompass() {
  var startBtn = document.getElementById('compass-start-btn');
  var modal = document.getElementById('compass-modal');
  var closeBtn = document.getElementById('compass-modal-close');
  var ring = document.getElementById('compass-ring');
  var headingEl = document.getElementById('compass-heading');
  var errorEl = document.getElementById('compass-error');

  if (!startBtn || !modal || !ring) return;

  var listeners = [];
  var sensor = null;
  var timeoutId = null;
  var running = false;

  var directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  var currentAngle = 0;
  var lastHeading = null;

  function getDirection(deg) {
    return directions[Math.round(deg / 45) % 8];
  }

  function processHeading(raw) {
    if (!running) return;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    var h = Math.round(raw);

    if (lastHeading === null) {
      currentAngle = h;
    } else {
      var delta = h - lastHeading;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      currentAngle += delta;
    }
    lastHeading = h;

    var dir = getDirection(h);
    errorEl.hidden = true;
    ring.style.transform = 'rotate(' + currentAngle + 'deg)';
    headingEl.textContent = h + '\u00B0 ' + dir;
  }

  function onOrientation(event) {
    if (!running) return;

    var heading = null;

    if (event.webkitCompassHeading != null) {
      heading = event.webkitCompassHeading;
    } else if (event.absolute && event.alpha != null) {
      heading = event.alpha;
    }

    if (heading == null) return;
    processHeading(heading);
  }

  function startCompass() {
    modal.hidden = false;
    errorEl.hidden = true;
    headingEl.textContent = '--\u00B0 ---';
    lastHeading = null;
    currentAngle = 0;
    ring.style.transform = 'rotate(0deg)';
    running = true;

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === 'granted') {
          addOrientationListeners();
        } else {
          errorEl.hidden = false;
          errorEl.textContent = 'permission denied. allow sensor access and try again.';
        }
      }).catch(function () {
        errorEl.hidden = false;
        errorEl.textContent = 'permission request failed.';
      });
    } else {
      addOrientationListeners();
    }

    timeoutId = setTimeout(function () {
      if (running && headingEl.textContent === '--\u00B0 ---') {
        errorEl.hidden = false;
        errorEl.textContent = 'no compass sensor detected on this device.';
      }
    }, 5000);
  }

  function addOrientationListeners() {
    listeners = [];
    var f = onOrientation;
    window.addEventListener('deviceorientation', f);
    listeners.push({ target: window, type: 'deviceorientation', fn: f });

    window.addEventListener('deviceorientationabsolute', f);
    listeners.push({ target: window, type: 'deviceorientationabsolute', fn: f });
  }

  function stopCompass() {
    running = false;

    for (var i = 0; i < listeners.length; i++) {
      var l = listeners[i];
      l.target.removeEventListener(l.type, l.fn);
    }
    listeners = [];

    if (sensor) {
      try { sensor.stop(); } catch (e) {}
      sensor = null;
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    ring.style.transform = 'rotate(0deg)';
    headingEl.textContent = '--\u00B0 ---';
    errorEl.hidden = true;
    modal.hidden = true;
  }

  startBtn.addEventListener('click', startCompass);
  closeBtn.addEventListener('click', stopCompass);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) stopCompass();
  });
}

/* ---- Hiking Time Calculator ---- */
function setupHikingCalculator() {
  const ids = ['hike-distance', 'hike-ascent', 'hike-descent'];
  ids.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateHikingTime);
    }
  });
  calculateHikingTime();
}

function calculateHikingTime() {
  const dist = parseFloat(document.getElementById('hike-distance').value);
  const ascent = parseFloat(document.getElementById('hike-ascent').value);
  const descent = parseFloat(document.getElementById('hike-descent').value);
  const netEl = document.getElementById('hike-result-net');
  const realisticEl = document.getElementById('hike-result-realistic');

  if (isNaN(dist) || isNaN(ascent) || isNaN(descent) || dist < 0 || ascent < 0 || descent < 0) {
    netEl.textContent = 'invalid input';
    realisticEl.textContent = '';
    return;
  }

  if (dist === 0 && ascent === 0 && descent === 0) {
    netEl.textContent = '\u2014';
    realisticEl.textContent = '';
    return;
  }

  const timeH = dist / 4;
  const timeV = ascent / 300 + descent / 500;
  const netHours = Math.max(timeH, timeV) + Math.min(timeH, timeV) / 2;
  const realisticHours = netHours * 1.2;

  function formatTime(hours) {
    const h = Math.floor(hours);
    const min = Math.round((hours - h) * 60);
    if (h === 0) return min + ' min';
    if (min === 0) return h + ' h';
    return h + ' h ' + min + ' min';
  }

  netEl.textContent = formatTime(netHours);
  realisticEl.textContent = formatTime(realisticHours) + ' (+20 % for breaks)';
}

async function computeHash(algorithm, buffer) {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return arrayBufferToHex(hashBuffer);
}

function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    hex += (b >>> 4).toString(16) + (b & 0x0F).toString(16);
  }
  return hex;
}
