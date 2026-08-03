const fs = require('fs');
const path = require('path');

// 設定
const INSTANCES_FILE = path.join(__dirname, '../../instances/invidious.json');
const OUTPUT_DIR = path.join(__dirname, '../../lists');
const TIMEOUT_MS = 5000; // タイムアウト（5秒）

const ENDPOINTS = [
  { name: 'search', path: '/api/v1/search?q=test' },
  { name: 'video', path: '/api/v1/videos/dQw4w9WgXcQ' }, // テスト用動画ID
  { name: 'trending', path: '/api/v1/trending' }
];

async function checkUrl(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response.ok;
  } catch (error) {
    clearTimeout(id);
    return false;
  }
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));

  const results = {};
  ENDPOINTS.forEach(ep => {
    results[ep.name] = [];
  });

  console.log(`Starting health check for ${instances.length} instances...`);


  for (const instance of instances) {
    const baseUrl = instance.replace(/\/$/, '');

    for (const ep of ENDPOINTS) {
      const targetUrl = `${baseUrl}${ep.path}`;
      const isAlive = await checkUrl(targetUrl);

      if (isAlive) {
        results[ep.name].push(baseUrl);
        console.log(`[OK] ${ep.name}: ${baseUrl}`);
      } else {
        console.log(`[NG] ${ep.name}: ${baseUrl}`);
      }
    }
  }

  for (const ep of ENDPOINTS) {
    const filePath = path.join(OUTPUT_DIR, `${ep.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(results[ep.name], null, 2));
    console.log(`Saved: ${filePath}`);
  }
}

run().catch(err => {
  console.error("Error during execution:", err);
  process.exit(1);
});
