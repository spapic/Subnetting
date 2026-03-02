const form = document.getElementById('subnetForm');
const result = document.getElementById('result');
const error = document.getElementById('error');

const fields = {
  network: document.getElementById('network'),
  broadcast: document.getElementById('broadcast'),
  mask: document.getElementById('mask'),
  wildcard: document.getElementById('wildcard'),
  firstHost: document.getElementById('firstHost'),
  lastHost: document.getElementById('lastHost'),
  hostCount: document.getElementById('hostCount'),
  addressCount: document.getElementById('addressCount'),
};

function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new Error('Neispravna IPv4 adresa.');
  }

  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function intToIp(num) {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

function prefixToMask(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('CIDR prefiks mora biti između 0 i 32.');
  }

  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function calculateSubnet(ip, prefix) {
  const ipInt = ipToInt(ip);
  const mask = prefixToMask(prefix);
  const wildcard = (~mask) >>> 0;
  const network = ipInt & mask;
  const broadcast = network | wildcard;
  const addressCount = 2 ** (32 - prefix);

  let firstHost = network;
  let lastHost = broadcast;
  let hostCount = addressCount;

  if (prefix <= 30) {
    firstHost = network + 1;
    lastHost = broadcast - 1;
    hostCount = addressCount - 2;
  }

  return {
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    mask: intToIp(mask),
    wildcard: intToIp(wildcard),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    hostCount,
    addressCount,
  };
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  error.textContent = '';

  try {
    const ip = document.getElementById('ip').value.trim();
    const prefix = Number.parseInt(document.getElementById('prefix').value, 10);
    const subnet = calculateSubnet(ip, prefix);

    Object.entries(subnet).forEach(([key, value]) => {
      fields[key].textContent = String(value);
    });

    result.hidden = false;
  } catch (err) {
    result.hidden = true;
    error.textContent = err.message;
  }
});
