function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new Error('Neispravna IPv4 adresa.');
  }
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
}

function intToIp(num) {
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}

function prefixToMask(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('CIDR prefiks mora biti između 0 i 32.');
  }
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function parseCidr(value) {
  const [ip, prefixText] = value.trim().split('/');
  const prefix = Number.parseInt(prefixText, 10);
  if (!ip || Number.isNaN(prefix)) {
    throw new Error(`Neispravan CIDR zapis: ${value}`);
  }
  const ipInt = ipToInt(ip);
  const mask = prefixToMask(prefix);
  return { ipInt, prefix, network: ipInt & mask };
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

function requiredPrefixForHosts(hosts) {
  if (!Number.isInteger(hosts) || hosts < 1) {
    throw new Error('Broj korisnika mora biti pozitivan cijeli broj.');
  }
  let hostBits = 0;
  while (2 ** hostBits - 2 < hosts) {
    hostBits += 1;
  }
  return 32 - hostBits;
}

function calculateVlsm(baseCidr, hostRequirementsText) {
  const { network: baseNetwork, prefix: basePrefix } = parseCidr(baseCidr);
  const baseSize = 2 ** (32 - basePrefix);
  const baseEnd = baseNetwork + baseSize - 1;

  const requirements = hostRequirementsText
    .split(/[\n,; ]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => Number.parseInt(v, 10));

  if (!requirements.length || requirements.some((v) => Number.isNaN(v) || v < 1)) {
    throw new Error('Unesi valjane brojeve korisnika (npr. 120,60,30).');
  }

  const plan = requirements
    .map((hosts, idx) => ({ id: idx + 1, hosts, prefix: requiredPrefixForHosts(hosts) }))
    .sort((a, b) => a.prefix - b.prefix || b.hosts - a.hosts);

  let cursor = baseNetwork;
  const allocations = [];

  for (const item of plan) {
    const size = 2 ** (32 - item.prefix);
    const aligned = Math.ceil(cursor / size) * size;
    const broadcast = aligned + size - 1;

    if (broadcast > baseEnd) {
      throw new Error('Nema dovoljno adresa u velikoj mreži za zadane korisnike.');
    }

    allocations.push({
      subnet: item.id,
      trazeniKorisnici: item.hosts,
      cidr: `${intToIp(aligned)}/${item.prefix}`,
      hostovaMaks: size - 2,
      prviHost: intToIp(aligned + 1),
      zadnjiHost: intToIp(broadcast - 1),
      broadcast: intToIp(broadcast),
    });

    cursor = broadcast + 1;
  }

  return {
    base: `${intToIp(baseNetwork)}/${basePrefix}`,
    ukupnoAdresa: baseSize,
    iskoristenoAdresa: cursor - baseNetwork,
    allocations,
  };
}

function calculateSubnetCount(parentCidr, childPrefix) {
  const { network: parentNetwork, prefix: parentPrefix } = parseCidr(parentCidr);
  const child = Number.parseInt(childPrefix, 10);

  if (!Number.isInteger(child) || child < parentPrefix || child > 32) {
    throw new Error('Prefiks podmreže mora biti između prefiksa velike mreže i 32.');
  }

  const borrowedBits = child - parentPrefix;
  const subnetCount = 2 ** borrowedBits;
  const addressesPerSubnet = 2 ** (32 - child);
  const hostsPerSubnet = child <= 30 ? addressesPerSubnet - 2 : addressesPerSubnet;

  return {
    velikaMreza: `${intToIp(parentNetwork)}/${parentPrefix}`,
    prefiksPodmreze: `/${child}`,
    brojPodmreza: subnetCount,
    adresaPoPodmrezi: addressesPerSubnet,
    hostovaPoPodmrezi: hostsPerSubnet,
  };
}

function summarizeNetworks(lines) {
  const cidrs = lines
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);

  if (cidrs.length < 2) {
    throw new Error('Za sažimanje unesi barem dvije mreže.');
  }

  const ranges = cidrs.map((cidr) => {
    const { network, prefix } = parseCidr(cidr);
    const size = 2 ** (32 - prefix);
    return { start: network, end: network + size - 1, cidr: `${intToIp(network)}/${prefix}` };
  });

  const min = Math.min(...ranges.map((r) => r.start));
  const max = Math.max(...ranges.map((r) => r.end));

  let prefix = 0;
  for (let bit = 31; bit >= 0; bit -= 1) {
    const same = ((min >>> bit) & 1) === ((max >>> bit) & 1);
    if (!same) {
      break;
    }
    prefix += 1;
  }

  const mask = prefixToMask(prefix);
  const summaryNetwork = min & mask;
  const summarySize = 2 ** (32 - prefix);
  const exact = summaryNetwork === min && summaryNetwork + summarySize - 1 === max;

  return {
    uneseneMreze: ranges.map((r) => r.cidr),
    raspon: `${intToIp(min)} - ${intToIp(max)}`,
    sazetak: `${intToIp(summaryNetwork)}/${prefix}`,
    tocnoBezViska: exact ? 'DA' : 'NE (sažetak pokriva i dodatne adrese)',
  };
}

function renderKeyValues(container, data) {
  const dl = document.createElement('dl');
  dl.className = 'result-grid';

  Object.entries(data).forEach(([key, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = key;
    const dd = document.createElement('dd');
    dd.textContent = String(value);
    dl.append(dt, dd);
  });

  container.innerHTML = '';
  container.appendChild(dl);
}

function renderTable(container, rows) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const body = document.createElement('tbody');
  const keys = Object.keys(rows[0]);

  const hr = document.createElement('tr');
  keys.forEach((k) => {
    const th = document.createElement('th');
    th.textContent = k;
    hr.appendChild(th);
  });
  head.appendChild(hr);

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    keys.forEach((k) => {
      const td = document.createElement('td');
      td.textContent = String(row[k]);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  table.append(head, body);
  container.appendChild(table);
}

if (typeof document !== 'undefined') {
  const mode = document.getElementById('mode');
  const panels = document.querySelectorAll('.mode-panel');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  function switchMode() {
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.mode !== mode.value;
    });
    result.innerHTML = '';
    error.textContent = '';
  }

  mode.addEventListener('change', switchMode);
  switchMode();

  document.getElementById('basicForm').addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    try {
      const ip = document.getElementById('ip').value.trim();
      const prefix = Number.parseInt(document.getElementById('prefix').value, 10);
      renderKeyValues(result, calculateSubnet(ip, prefix));
    } catch (err) {
      result.innerHTML = '';
      error.textContent = err.message;
    }
  });

  document.getElementById('vlsmForm').addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    result.innerHTML = '';
    try {
      const data = calculateVlsm(
        document.getElementById('baseNetwork').value,
        document.getElementById('hostRequirements').value,
      );
      renderKeyValues(result, {
        velikaMreza: data.base,
        ukupnoAdresa: data.ukupnoAdresa,
        iskoristenoAdresa: data.iskoristenoAdresa,
      });
      renderTable(result, data.allocations);
    } catch (err) {
      error.textContent = err.message;
    }
  });

  document.getElementById('subnetCountForm').addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    try {
      const data = calculateSubnetCount(
        document.getElementById('parentNetwork').value,
        document.getElementById('childPrefix').value,
      );
      renderKeyValues(result, data);
    } catch (err) {
      result.innerHTML = '';
      error.textContent = err.message;
    }
  });

  document.getElementById('summarizeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    try {
      renderKeyValues(result, summarizeNetworks(document.getElementById('networks').value));
    } catch (err) {
      result.innerHTML = '';
      error.textContent = err.message;
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    ipToInt,
    intToIp,
    prefixToMask,
    parseCidr,
    calculateSubnet,
    calculateVlsm,
    calculateSubnetCount,
    summarizeNetworks,
  };
}
