/**
 * BI Central — Drive Sync V3 Diagnostic
 * Compatible Cockpit Projets BI V6.4R+
 */
const BI_SNAPSHOT_FOLDER_ID = '1vemQOTid5tu43bALM9Jr1BwIw8q3BoY7';
const BI_CURRENT_FILE_NAME = 'CURRENT_Cockpit_Projets_BI.json';
const BI_SNAPSHOT_RETENTION_MAX = 10;
const BI_SYNC_TOKEN = '';

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    if (BI_SYNC_TOKEN && p.token !== BI_SYNC_TOKEN) return outputResponse({ok:false,error:'token invalide',time:new Date().toISOString()}, p.callback);
    if (String(p.action || '').toLowerCase() === 'diagnostic') return outputResponse(buildDriveDiagnostic(), p.callback);
    return outputResponse({ok:true,service:'BI Central Drive Sync V3 Diagnostic',actions:['diagnostic'],folderId:BI_SNAPSHOT_FOLDER_ID,time:new Date().toISOString()}, p.callback);
  } catch (err) {
    return outputResponse({ok:false,error:String(err),time:new Date().toISOString()}, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    if (BI_SYNC_TOKEN && payload.token !== BI_SYNC_TOKEN) return jsonOutput({ok:false,error:'token invalide',time:new Date().toISOString()});
    const folder = DriveApp.getFolderById(BI_SNAPSHOT_FOLDER_ID);
    const mode = String(payload.mode || 'snapshot').toLowerCase();
    if (mode === 'current') return saveCurrent(folder, payload);
    return saveSnapshot(folder, payload);
  } catch (err) {
    return jsonOutput({ok:false,error:String(err),time:new Date().toISOString()});
  }
}

function buildDriveDiagnostic() {
  const folder = DriveApp.getFolderById(BI_SNAPSHOT_FOLDER_ID);
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const name = f.getName();
    const isCurrent = name === BI_CURRENT_FILE_NAME;
    const isSnapshot = name.indexOf('SNAPSHOT_') === 0 && name.slice(-5).toLowerCase() === '.json';
    const isJson = name.slice(-5).toLowerCase() === '.json';
    if (isCurrent || isSnapshot || isJson) {
      files.push({
        name:name,
        id:f.getId(),
        url:f.getUrl(),
        size:f.getSize(),
        created:f.getDateCreated().toISOString(),
        updated:f.getLastUpdated().toISOString(),
        kind:isCurrent ? 'current' : isSnapshot ? 'snapshot' : 'json'
      });
    }
  }
  files.sort(function(a,b){return String(b.updated).localeCompare(String(a.updated));});
  const currents = files.filter(function(f){return f.kind === 'current';});
  const snapshots = files.filter(function(f){return f.kind === 'snapshot';});
  const jsonOthers = files.filter(function(f){return f.kind === 'json';});
  return {
    ok:true,
    mode:'diagnostic',
    source:'Google Drive réel via Apps Script',
    folderId:BI_SNAPSHOT_FOLDER_ID,
    folderName:folder.getName(),
    folderUrl:folder.getUrl(),
    currentFileName:BI_CURRENT_FILE_NAME,
    retentionMax:BI_SNAPSHOT_RETENTION_MAX,
    counts:{totalJsonKnown:files.length,current:currents.length,snapshots:snapshots.length,otherJson:jsonOthers.length},
    latest:{current:currents[0]||null,snapshot:snapshots[0]||null},
    warnings:{duplicateCurrent:currents.length>1,snapshotsOverRetention:snapshots.length>BI_SNAPSHOT_RETENTION_MAX},
    files:files.slice(0,40),
    time:new Date().toISOString()
  };
}

function saveCurrent(folder, payload) {
  const json = JSON.stringify(payload, null, 2);
  const existing = folder.getFilesByName(BI_CURRENT_FILE_NAME);
  let file;
  if (existing.hasNext()) {
    file = existing.next();
    file.setContent(json);
    file.setDescription('BI Central — état courant remplacé — ' + new Date().toISOString());
    while (existing.hasNext()) existing.next().setTrashed(true);
    return jsonOutput({ok:true,mode:'current',action:'updated',fileName:BI_CURRENT_FILE_NAME,fileId:file.getId(),fileUrl:file.getUrl(),diagnostic:buildDriveDiagnostic(),time:new Date().toISOString()});
  }
  file = folder.createFile(BI_CURRENT_FILE_NAME, json, MimeType.PLAIN_TEXT);
  file.setDescription('BI Central — état courant créé — ' + new Date().toISOString());
  return jsonOutput({ok:true,mode:'current',action:'created',fileName:BI_CURRENT_FILE_NAME,fileId:file.getId(),fileUrl:file.getUrl(),diagnostic:buildDriveDiagnostic(),time:new Date().toISOString()});
}

function saveSnapshot(folder, payload) {
  const app = cleanName(payload.app || 'BI_CENTRAL');
  const version = cleanName(payload.version || 'VERSION');
  const action = cleanName(payload.action || 'snapshot');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  const fileName = 'SNAPSHOT_' + app + '_' + version + '_' + action + '_' + stamp + '.json';
  const file = folder.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  file.setDescription('Snapshot BI Central — ' + fileName);
  const purge = pruneSnapshots(folder, BI_SNAPSHOT_RETENTION_MAX);
  return jsonOutput({ok:true,mode:'snapshot',action:'created',fileName:fileName,fileId:file.getId(),fileUrl:file.getUrl(),purged:purge.purged,kept:purge.kept,diagnostic:buildDriveDiagnostic(),time:new Date().toISOString()});
}

function pruneSnapshots(folder, maxCount) {
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const name = f.getName();
    if (name.indexOf('SNAPSHOT_') === 0 && name.slice(-5).toLowerCase() === '.json') files.push({file:f,created:f.getDateCreated().getTime()});
  }
  files.sort(function(a,b){return b.created-a.created;});
  const remove = files.slice(maxCount);
  remove.forEach(function(item){item.file.setTrashed(true);});
  return {kept:Math.min(files.length,maxCount),purged:remove.length};
}

function cleanName(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80) || 'NA';
}
function outputResponse(obj, callback) {
  if (callback) {
    const safe = String(callback).replace(/[^a-zA-Z0-9_.$]/g,'');
    return ContentService.createTextOutput(safe + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonOutput(obj);
}
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
