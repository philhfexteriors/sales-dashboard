import fs from 'fs';

// Load .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const apiKey = envVars.CC_API_KEY;
const baseUrl = envVars.CC_API_BASE_URL || 'https://classic-api.contractorscloud.com/api/v1';

console.log('Base URL:', baseUrl);
console.log('API Key length:', apiKey ? apiKey.length : 0);

if (!apiKey) { console.log('No CC_API_KEY found'); process.exit(1); }

const headers = { 'Authorization': 'Bearer ' + apiKey, 'Accept': 'application/json' };

async function tryEndpoint(label, url) {
  console.log(`\n--- ${label} ---`);
  console.log('  URL:', url);
  try {
    const res = await fetch(url, { headers });
    console.log('  Status:', res.status, res.statusText);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const data = json.data || (Array.isArray(json) ? json : null);
      if (data && data.length > 0) {
        console.log('  Count:', data.length);
        console.log('  Keys:', Object.keys(data[0]).join(', '));
        data.forEach((item, i) => {
          if (i < 30) console.log(`  [${i}]`, JSON.stringify(item));
        });
        return data;
      } else if (json.data && json.data.length === 0) {
        console.log('  Empty data array');
      } else {
        console.log('  Response:', JSON.stringify(json).substring(0, 500));
      }
    } catch {
      console.log('  Raw:', text.substring(0, 500));
    }
  } catch (err) {
    console.log('  Error:', err.message);
  }
  return null;
}

async function run() {
  // First, get company_id from a project
  const projRes = await fetch(baseUrl + '/projects?page[size]=1&page[number]=1', { headers });
  const projData = await projRes.json();
  const companyId = projData.data?.[0]?.company_id;
  const tenantId = projData.data?.[0]?.tenant_id;
  console.log('Company ID:', companyId);
  console.log('Tenant ID:', tenantId);

  // Try various endpoints that might list file types/folders
  await tryEndpoint('GET /file-types', baseUrl + '/file-types');
  await tryEndpoint('GET /file-types?page[size]=100', baseUrl + '/file-types?page[size]=100');
  if (companyId) {
    await tryEndpoint(`GET /companies/${companyId}/file-types`, baseUrl + `/companies/${companyId}/file-types`);
    await tryEndpoint(`GET /companies/${companyId}/file-descriptions`, baseUrl + `/companies/${companyId}/file-descriptions`);
  }
  await tryEndpoint('GET /file-descriptions', baseUrl + '/file-descriptions');
  await tryEndpoint('GET /file-descriptions?page[size]=100', baseUrl + '/file-descriptions?page[size]=100');

  // Scan older projects that are more likely to have files
  // Use page 50+ to get established projects
  console.log('\n--- Scanning projects for files ---');
  const allTypes = new Map();
  let totalFilesFound = 0;
  let projectsChecked = 0;
  let sampleShown = false;

  for (const pageNum of [50, 100, 200, 500, 1, 2, 3, 4, 5]) {
    const res = await fetch(baseUrl + `/projects?page[size]=20&page[number]=${pageNum}&sort=-created_at`, { headers });
    const data = await res.json();
    if (!data.data || data.data.length === 0) continue;

    for (const project of data.data) {
      projectsChecked++;
      const filesRes = await fetch(baseUrl + `/projects/${project.id}/files?page[size]=100`, { headers });
      const filesData = await filesRes.json();
      const files = filesData.data || (Array.isArray(filesData) ? filesData : []);

      if (files.length > 0) {
        totalFilesFound += files.length;
        console.log(`  Project ${project.id} (page ${pageNum}): ${files.length} files`);

        if (!sampleShown) {
          console.log('  File keys:', Object.keys(files[0]).join(', '));
          console.log('  Sample file:', JSON.stringify(files[0], null, 2));
          sampleShown = true;
        }

        files.forEach(f => {
          const typeId = f.file_type_id;
          const key = String(typeId || 'null');
          if (!allTypes.has(key)) {
            allTypes.set(key, { id: typeId, names: new Set(), count: 0 });
          }
          allTypes.get(key).count++;
          // Collect any name-like fields
          for (const field of ['file_type_name', 'folder_name', 'type_name', 'category', 'description']) {
            if (f[field]) allTypes.get(key).names.add(f[field]);
          }
          if (f.file_type && typeof f.file_type === 'object' && f.file_type.name) {
            allTypes.get(key).names.add(f.file_type.name);
          }
        });
      }

      // Stop early if we've found enough
      if (totalFilesFound >= 50) break;
    }
    if (totalFilesFound >= 50) break;
  }

  console.log(`\nChecked ${projectsChecked} projects, found ${totalFilesFound} total files`);
  console.log('\n=== FILE TYPE IDS FOUND ===');
  for (const [, v] of [...allTypes.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const names = [...v.names].join(', ') || '(no name found)';
    console.log(`  ID: ${v.id} | Names: ${names} | Count: ${v.count}`);
  }

  // If we found type IDs, try to get their names via include
  if (allTypes.size > 0) {
    console.log('\n--- Trying to get file type names ---');
    // Try fetching a file with include=file_type
    const sampleProject = projData.data[0];
    for (const pageNum of [50, 100, 200]) {
      const res = await fetch(baseUrl + `/projects?page[size]=5&page[number]=${pageNum}`, { headers });
      const pd = await res.json();
      for (const p of (pd.data || [])) {
        const fr = await fetch(baseUrl + `/projects/${p.id}/files?page[size]=10&include=file_type`, { headers });
        const fd = await fr.json();
        const fls = fd.data || [];
        if (fls.length > 0) {
          console.log('  Files with include=file_type:');
          fls.forEach(f => console.log(`    ${f.id}: type_id=${f.file_type_id}, file_type=`, JSON.stringify(f.file_type || f.fileType || '(none)')));
          return; // Found what we need
        }
      }
    }
  }
}

run().catch(err => console.error('Error:', err.message));
