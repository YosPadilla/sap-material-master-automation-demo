import { DemoStateMachine } from './state-machine.js';
import { loadMaterials, createSyntheticMaterials } from './demo-data.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const params = new URLSearchParams(location.search);
const captureMode = params.get('capture') === '1';
const autoplay = params.get('director') === '1' || params.get('autoplay') === '1';
const requestedScene = params.get('scene');
const speed = Math.max(.35, Math.min(2, Number(params.get('speed')) || 1));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches && !captureMode;

if (captureMode) document.body.classList.add('capture-mode');

const machine = new DemoStateMachine('idle');
let materials = createSyntheticMaterials();
let directorRunning = false;
let automationRunning = false;
let issueResolved = false;
let logClock = { h: 9, m: 42, s: 18 };

const els = {
  sourceCard: $('#sourceCard'), sourceName: $('#sourceName'), sourceDetail: $('#sourceDetail'),
  readyCount: $('#readyCount'), reviewCount: $('#reviewCount'), validationMessage: $('#validationMessage'),
  validationSection: $('.validation-section'), issueEditor: $('#issueEditor'), correctionInput: $('#correctionInput'), applyCorrection: $('#applyCorrection'),
  currentMaterial: $('#currentMaterial'), currentTransaction: $('#currentTransaction'), currentStage: $('#currentStage'),
  runningIndicator: $('#runningIndicator'), activityLog: $('#activityLog'), primaryAction: $('#primaryAction'), actionHint: $('#actionHint'),
  erpPanel: $('#erpPanel'), erpContent: $('#erpContent'), erpTitle: $('#erpTransactionTitle'), erpStatusbar: $('#erpStatusbar'), erpCommandField: $('#erpCommandField'),
  dataTableBody: $('#dataTableBody'), rowCountBadge: $('#rowCountBadge'), previewStatus: $('#previewStatus'),
  batchStatus: $('#batchStatus'), batchCounter: $('#batchCounter'), batchProgress: $('#batchProgress'), workflowFill: $('#workflowFill'),
  resetButton: $('#resetButton'), directorButton: $('#directorButton'), directorOverlay: $('#directorOverlay'), directorCountdown: $('#directorCountdown'),
  impactScene: $('#impactScene'), impactClose: $('#impactClose')
};

const stateConfig = {
  idle: { step: 0, action: 'Load demo batch', hint: '100 synthetic materials · no SAP connection' },
  loading: { step: 0, action: 'Loading…', hint: 'Reading synthetic source data' },
  batchLoaded: { step: 0, action: 'Validate batch', hint: 'Check source records before execution' },
  validating: { step: 1, action: 'Validating…', hint: 'Scanning required input' },
  validationFailed: { step: 1, action: 'Resolve issue', hint: '1 source record requires attention' },
  resolving: { step: 1, action: 'Applying correction…', hint: 'Updating the synthetic record' },
  ready: { step: 1, action: 'Start automation', hint: '100 / 100 records ready' },
  mm01_material: { step: 2, action: 'Automation running', hint: 'MM01 · material definition' },
  mm01_views: { step: 2, action: 'Automation running', hint: 'MM01 · view selection' },
  mm01_org: { step: 2, action: 'Automation running', hint: 'MM01 · organizational levels' },
  mm01_accounting: { step: 2, action: 'Automation running', hint: 'MM01 · accounting data' },
  mm01_costing1: { step: 2, action: 'Automation running', hint: 'MM01 · costing 1' },
  mm01_costing2: { step: 2, action: 'Automation running', hint: 'MM01 · costing 2' },
  materialCreated: { step: 2, action: 'Automation running', hint: 'MM01 complete · switching transaction' },
  mm02_open: { step: 3, action: 'Automation running', hint: 'MM02 · change material' },
  mm02_costing: { step: 3, action: 'Automation running', hint: 'MM02 · costing 1' },
  mm02_complete: { step: 3, action: 'Automation running', hint: 'First material complete' },
  batchRunning: { step: 3, action: 'Batch running', hint: 'Accelerated representation of remaining records' },
  batchComplete: { step: 4, action: 'View measured change', hint: '100 processed · 0 pending' },
  impact: { step: 4, action: 'Replay demo', hint: 'Approximate original workflow benchmark' }
};

function wait(ms) { return new Promise(resolve => setTimeout(resolve, reducedMotion ? 20 : ms * speed)); }
function formatTime() {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(logClock.h)}:${pad(logClock.m)}:${pad(logClock.s)}`;
}
function tick(seconds = 1) {
  logClock.s += seconds;
  while (logClock.s >= 60) { logClock.s -= 60; logClock.m += 1; }
  while (logClock.m >= 60) { logClock.m -= 60; logClock.h += 1; }
}
function clearLogs() { els.activityLog.innerHTML = '<div class="log-empty">Demo ready.</div>'; }
function addLog(message, type = '') {
  const empty = els.activityLog.querySelector('.log-empty');
  if (empty) empty.remove();
  const row = document.createElement('div');
  row.className = `log-row ${type ? `is-${type}` : ''}`;
  row.innerHTML = `<time>${formatTime()}</time><span>${message}</span>`;
  els.activityLog.appendChild(row);
  while (els.activityLog.children.length > 7) els.activityLog.firstElementChild.remove();
  tick();
}
async function markShot(name) {
  window.__lastDemoMarker = name;
  document.documentElement.dataset.demoMarker = name;
  if (typeof window.onDemoMarker === 'function') {
    try { await window.onDemoMarker(name); } catch (_) {}
  }
  document.dispatchEvent(new CustomEvent('demo:marker', { detail: { name } }));
}

function renderWorkflow(stepIndex) {
  const steps = $$('.workflow-step');
  steps.forEach((step, index) => {
    step.classList.toggle('is-active', index === stepIndex);
    step.classList.toggle('is-done', index < stepIndex);
  });
  const pct = stepIndex === 0 ? 0 : (stepIndex / (steps.length - 1)) * 100;
  els.workflowFill.style.width = `${pct}%`;
}

function setRunning(mode, label) {
  els.runningIndicator.classList.toggle('is-running', mode === 'running');
  els.runningIndicator.classList.toggle('is-complete', mode === 'complete');
  els.runningIndicator.querySelector('span').textContent = label;
}

function statusBar(message, type = 'neutral') {
  els.erpStatusbar.classList.remove('is-success', 'is-warning');
  if (type === 'success') els.erpStatusbar.classList.add('is-success');
  if (type === 'warning') els.erpStatusbar.classList.add('is-warning');
  els.erpStatusbar.querySelector('.erp-status-icon').textContent = type === 'success' ? '✓' : type === 'warning' ? '!' : '○';
  els.erpStatusbar.querySelector('p').textContent = message;
}

function setErpContext(title, command = '/n') {
  els.erpTitle.textContent = title;
  if (els.erpCommandField) els.erpCommandField.textContent = command;
}

function erpOverview() {
  setErpContext('Easy Access', '/n');
  statusBar('Ready');
  els.erpContent.innerHTML = `
    <div class="erp-overview erp-screen">
      <aside class="erp-overview-nav">
        <div class="erp-tree-title">Navigation</div>
        <div class="erp-tree">
          <div>▾ Favorites</div>
          <div>▾ ERP Menu</div>
          <div class="indent1">▾ Logistics</div>
          <div class="indent2">▾ Materials Management</div>
          <div class="indent2 selected">Material Master</div>
          <div class="indent1">Production</div>
          <div class="indent1">Controlling</div>
        </div>
      </aside>
      <div class="erp-overview-main">
        <div>
          <div class="erp-overview-icon"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 9h8M8 13h5M8 17h7"/></svg></div>
          <h2>Material Master</h2>
          <p>Training interface controlled by the automation layer. Synthetic values only; no live enterprise connection.</p>
          <div class="erp-overview-flow"><span>Input</span><i></i><span>Validate</span><i></i><span>MM01</span><i></i><span>MM02</span></div>
        </div>
      </div>
    </div>`;
}

function materialForm(active = '') {
  setErpContext('Create Material (Initial Screen)', '/nMM01');
  els.erpContent.innerHTML = `
    <div class="erp-screen">
      <div class="erp-kicker">Transaction MM01</div>
      <h2 class="erp-title">Create Material</h2>
      <p class="erp-subtitle">Synthetic values used for portfolio demonstration.</p>
      <div class="erp-group">
        <span class="erp-group-title">Material identification</span>
        <div class="erp-form">
          <label>Material</label><div class="erp-field ${active==='material'?'is-active field-flash':''}"><span>7001001</span><em>Internal ID</em></div>
          <label>Industry Sector</label><div class="erp-field ${active==='industry'?'is-active field-flash':''}"><span>M · Mechanical Engineering</span><em>Selected</em></div>
          <label>Material Type</label><div class="erp-field ${active==='type'?'is-active field-flash':''}"><span>ZDEM · Demo Component</span><em>Selected</em></div>
          <div class="erp-actions-row"><button class="erp-button primary">Select View(s)</button></div>
        </div>
      </div>
    </div>`;
  statusBar('Enter material, industry sector and material type');
}

function viewsScreen() {
  setErpContext('Create Material: Select View(s)', '/nMM01');
  els.erpContent.innerHTML = `
    <div class="erp-screen">
      <div class="erp-kicker">Transaction MM01</div><h2 class="erp-title">Select View(s)</h2>
      <div class="view-list">
        ${[['Basic Data',false],['Purchasing',false],['Accounting 1',true],['Costing 1',true],['Costing 2',true],['Sales',false],['Warehouse',false]].map(([name,selected]) => `<div class="view-row ${selected?'is-selected':''}"><span class="erp-check">${selected?'✓':''}</span><strong>${name}</strong><small>${selected?'Selected':'Not required'}</small></div>`).join('')}
      </div>
      <div class="erp-actions-row"><button class="erp-button primary">Continue</button></div>
    </div>`;
  statusBar('3 views selected');
}

function orgScreen() {
  setErpContext('Create Material: Organizational Levels', '/nMM01');
  els.erpContent.innerHTML = `
    <div class="erp-screen">
      <div class="erp-kicker">Transaction MM01</div><h2 class="erp-title">Organizational Levels</h2>
      <div class="erp-group">
        <span class="erp-group-title">Organizational level</span>
        <div class="erp-form">
          <label>Plant</label><div class="erp-field is-active field-flash"><span>1000</span><em>Demo plant</em></div>
          <label>Valuation Area</label><div class="erp-field"><span>1000</span><em>Demo area</em></div>
          <div class="erp-actions-row"><button class="erp-button primary">Continue</button></div>
        </div>
      </div>
    </div>`;
  statusBar('Organizational levels set');
}

function accountingScreen() {
  setErpContext('Create Material: Accounting 1', '/nMM01');
  els.erpContent.innerHTML = `
    <div class="erp-screen">
      <div class="erp-tabs"><span>Basic Data</span><span class="is-active">Accounting 1</span><span>Costing 1</span><span>Costing 2</span></div>
      <div class="erp-kicker">Transaction MM01 · Accounting 1</div><h2 class="erp-title">Valuation data</h2>
      <div class="erp-group">
        <span class="erp-group-title">Current valuation</span>
        <div class="erp-form">
          <label>Valuation Class</label><div class="erp-field is-active field-flash"><span>3000</span><em>Demo class</em></div>
          <label>Price Control</label><div class="erp-field"><span>S · Standard Price</span><em>Selected</em></div>
          <label>Standard Price</label><div class="erp-field"><span>—</span><em>Not used in demo</em></div>
        </div>
      </div>
    </div>`;
  statusBar('Accounting data validated');
}

function costingScreen(tab = 1) {
  setErpContext(`Create Material: Costing ${tab}`, '/nMM01');
  els.erpContent.innerHTML = `
    <div class="erp-screen">
      <div class="erp-tabs"><span>Accounting 1</span><span class="${tab===1?'is-active':''}">Costing 1</span><span class="${tab===2?'is-active':''}">Costing 2</span></div>
      <div class="erp-kicker">Transaction MM01 · Costing ${tab}</div><h2 class="erp-title">Costing configuration</h2>
      <div class="erp-group">
        <span class="erp-group-title">Cost estimate data</span>
        <div class="erp-info-grid">
          <div class="erp-info-box"><span>Material</span><strong>7001001</strong></div>
          <div class="erp-info-box"><span>Validation</span><strong>Configuration ready</strong></div>
        </div>
        <div class="erp-status-card"><i></i><span>Required costing configuration validated for this synthetic demonstration.</span></div>
      </div>
    </div>`;
  statusBar(`Costing ${tab} validated`);
}

function mm02Screen(doNotCost = false) {
  setErpContext('Change Material: Costing 1', '/nMM02');
  els.erpContent.innerHTML = `
    <div class="erp-screen">
      <div class="erp-tabs"><span>Material</span><span class="is-active">Costing 1</span></div>
      <div class="erp-kicker">Transaction MM02</div><h2 class="erp-title">Change Material</h2>
      <div class="erp-group">
        <span class="erp-group-title">Costing 1</span>
        <div class="erp-form">
          <label>Material</label><div class="erp-field"><span>7001001</span><em>Created in MM01</em></div>
          <label>Do Not Cost</label><div class="erp-field ${doNotCost?'is-active field-flash':''}"><span>${doNotCost?'☑ Enabled':'☐ Disabled'}</span><em>${doNotCost?'Updated':'Current value'}</em></div>
        </div>
      </div>
    </div>`;
  statusBar(doNotCost ? 'Costing setting updated' : 'Material loaded');
}

function batchScreen(progress = 0) {
  setErpContext('Batch Processing Monitor', '/nMM01 + MM02');
  const completed = Math.min(100, Math.max(0, progress));
  const base = Math.max(1, completed - 3);
  const rows = Array.from({length:4}, (_, i) => {
    const num = base + i;
    const status = num < completed ? 'Complete' : num === completed ? 'Running' : 'Pending';
    const cls = status.toLowerCase();
    return `<div class="batch-mini-row"><span>${7001000 + Math.min(num,100)}</span><span class="${num<=completed?'ok':'pending'}">${num<=completed?'✓':'—'}</span><span class="${num<completed?'ok':num===completed?'running':'pending'}">${num<completed?'✓':num===completed?'…':'—'}</span><span class="${cls}">${status}</span></div>`;
  }).join('');
  els.erpContent.innerHTML = `
    <div class="batch-erp erp-screen">
      <div class="batch-summary"><span>Batch progress</span><strong>${completed} / 100</strong><p>First material shown in detail. Remaining records are accelerated for the portfolio demonstration.</p></div>
      <div class="batch-mini-table"><div class="batch-mini-row head"><span>Material</span><span>MM01</span><span>MM02</span><span>Status</span></div>${rows}</div>
    </div>`;
  statusBar(completed === 100 ? 'Batch completed successfully' : `Processing material ${completed} of 100`, completed === 100 ? 'success' : 'neutral');
}

function renderDataPreview(mode = 'loaded') {
  const issueIndex = 36;
  const indexes = (mode === 'issue' || mode === 'resolved') ? [35,36,37] : [0,1,2];
  els.dataTableBody.innerHTML = indexes.map((idx) => {
    const m = materials[idx] || {row:idx+2,internalPartNumber:'',validation:'pending'};
    const isIssue = idx === issueIndex && !m.internalPartNumber;
    const status = mode === 'loaded' ? 'Not checked' : isIssue ? 'Requires attention' : 'Ready';
    const statusClass = mode === 'loaded' ? '' : isIssue ? 'status-review' : 'status-ready';
    return `<tr class="${isIssue?'issue-row':''}" data-row="${idx}"><td>${m.row}</td><td>${m.internalPartNumber || '—'}</td><td class="${statusClass}">${status}</td></tr>`;
  }).join('');
}

function renderState(state) {
  const cfg = stateConfig[state] || stateConfig.idle;
  renderWorkflow(cfg.step);
  els.primaryAction.textContent = cfg.action;
  els.actionHint.textContent = cfg.hint;
  els.primaryAction.disabled = ['loading','validating','resolving','mm01_material','mm01_views','mm01_org','mm01_accounting','mm01_costing1','mm01_costing2','materialCreated','mm02_open','mm02_costing','mm02_complete','batchRunning'].includes(state);

  if (state === 'idle') {
    els.sourceName.textContent = 'No batch loaded'; els.sourceDetail.textContent = 'Load the synthetic workbook to begin.';
    els.readyCount.textContent = '—'; els.reviewCount.textContent = '—'; els.validationMessage.textContent = 'Not started';
    els.validationSection.classList.remove('has-issue','is-ready'); els.issueEditor.hidden = true;
    els.currentMaterial.textContent = '—'; els.currentTransaction.textContent = '—'; els.currentStage.textContent = 'Waiting for input'; setRunning('idle','Idle');
    els.rowCountBadge.textContent = '0 rows'; els.previewStatus.textContent = 'Not loaded'; els.dataTableBody.innerHTML='';
    els.batchStatus.textContent = 'Awaiting batch'; els.batchCounter.textContent = '0 / 100'; els.batchProgress.style.width='0%'; erpOverview();
  }
  if (state === 'loading') { setRunning('running','Loading source'); }
  if (state === 'batchLoaded') {
    els.sourceName.textContent='MATERIAL_MASTER_DEMO.xlsx'; els.sourceDetail.textContent='100 synthetic material records loaded.';
    els.readyCount.textContent='—'; els.reviewCount.textContent='—'; els.validationMessage.textContent='Not validated';
    els.rowCountBadge.textContent='100 rows'; els.previewStatus.textContent='Loaded'; renderDataPreview('loaded'); setRunning('idle','Source loaded');
  }
  if (state === 'validating') { els.validationMessage.textContent='Scanning required input…'; setRunning('running','Validating'); }
  if (state === 'validationFailed') {
    els.readyCount.textContent='99'; els.reviewCount.textContent='1'; els.validationMessage.textContent='Missing internal part number detected.';
    els.validationSection.classList.add('has-issue'); els.issueEditor.hidden = false; renderDataPreview('issue'); setRunning('idle','Validation paused');
    els.currentStage.textContent='Input validation'; els.previewStatus.textContent='1 issue';
  }
  if (state === 'resolving') { setRunning('running','Applying correction'); }
  if (state === 'ready') {
    els.readyCount.textContent='100'; els.reviewCount.textContent='0'; els.validationMessage.textContent='Batch ready for execution.';
    els.validationSection.classList.remove('has-issue'); els.validationSection.classList.add('is-ready'); els.issueEditor.hidden=true;
    els.currentStage.textContent='Validated batch'; els.previewStatus.textContent='Ready'; renderDataPreview('resolved'); setRunning('complete','Ready');
  }
  if (state.startsWith('mm01') || state==='materialCreated') {
    els.currentMaterial.textContent='7001001'; els.currentTransaction.textContent='MM01'; setRunning('running','Running');
  }
  if (state==='mm01_material') { els.currentStage.textContent='Material definition'; materialForm('material'); }
  if (state==='mm01_views') { els.currentStage.textContent='Select View(s)'; viewsScreen(); }
  if (state==='mm01_org') { els.currentStage.textContent='Organizational Levels'; orgScreen(); }
  if (state==='mm01_accounting') { els.currentStage.textContent='Accounting 1'; accountingScreen(); }
  if (state==='mm01_costing1') { els.currentStage.textContent='Costing 1'; costingScreen(1); }
  if (state==='mm01_costing2') { els.currentStage.textContent='Costing 2'; costingScreen(2); }
  if (state==='materialCreated') { els.currentStage.textContent='Material created'; costingScreen(2); statusBar('Material 7001001 created','success'); }
  if (state.startsWith('mm02')) { els.currentMaterial.textContent='7001001'; els.currentTransaction.textContent='MM02'; setRunning('running','Running'); }
  if (state==='mm02_open') { els.currentStage.textContent='Change Material'; mm02Screen(false); }
  if (state==='mm02_costing') { els.currentStage.textContent='Costing 1 · Do Not Cost'; mm02Screen(true); }
  if (state==='mm02_complete') { els.currentStage.textContent='First material complete'; mm02Screen(true); statusBar('Material 7001001 updated','success'); setRunning('complete','First record complete'); }
  if (state==='batchRunning') { els.currentTransaction.textContent='MM01 / MM02'; els.currentStage.textContent='Batch execution'; setRunning('running','Batch running'); }
  if (state==='batchComplete') { els.currentTransaction.textContent='MM01 / MM02'; els.currentStage.textContent='Batch complete'; setRunning('complete','Complete'); els.batchStatus.textContent='Batch complete'; els.batchCounter.textContent='100 / 100'; els.batchProgress.style.width='100%'; batchScreen(100); }
  if (state==='impact') { setRunning('complete','Complete'); }
}

machine.subscribe(renderState);

async function loadBatch() {
  machine.transition('loading');
  await wait(280);
  materials = await loadMaterials();
  issueResolved = Boolean(materials[36]?.internalPartNumber);
  machine.transition('batchLoaded');
  addLog('Synthetic batch loaded');
  await markShot('hero');
}

async function validateBatch() {
  machine.transition('validating');
  addLog('Validation started');
  const rows = Array.from(els.dataTableBody.querySelectorAll('tr[data-row]'));
  for (const row of rows.slice(0,6)) {
    row.classList.add('scan-row'); await wait(65); row.classList.remove('scan-row');
  }
  await wait(280);
  if (!materials[36].internalPartNumber) {
    machine.transition('validationFailed');
    addLog('1 issue detected', 'warning');
    await wait(120);
    await markShot('validation');
  } else {
    machine.transition('ready');
    addLog('100 records ready', 'success');
  }
}

function openIssueEditor() {
  els.issueEditor.hidden = false;
  els.correctionInput.focus();
  els.correctionInput.value = '7001037';
  els.issueEditor.classList.add('issue-shake');
  setTimeout(()=>els.issueEditor.classList.remove('issue-shake'),400);
}

async function resolveIssue(auto = false) {
  if (machine.state !== 'validationFailed' && machine.state !== 'resolving') return;
  if (!auto && !els.correctionInput.value.trim()) { openIssueEditor(); return; }
  machine.transition('resolving');
  if (auto) { els.correctionInput.value = '7001037'; await wait(360); }
  const value = els.correctionInput.value.trim() || '7001037';
  materials[36].internalPartNumber = value;
  materials[36].validation = 'ready';
  issueResolved = true;
  addLog(`Row 37 corrected → ${value}`, 'success');
  await wait(420);
  machine.transition('ready');
  addLog('100 records ready', 'success');
  await animateCounter(els.readyCount, 99, 100, 260);
  els.reviewCount.textContent='0';
}

async function runAutomation() {
  if (automationRunning || !issueResolved) return;
  automationRunning = true;
  els.batchStatus.textContent='Executing first material';
  els.batchCounter.textContent='1 / 100'; els.batchProgress.style.width='1%';

  machine.transition('mm01_material'); addLog('Opening MM01'); await wait(520);
  materialForm('industry'); addLog('Industry sector selected'); await wait(420);
  materialForm('type'); addLog('Material type selected'); await wait(430);
  machine.transition('mm01_views'); addLog('Required views selected'); await wait(600);
  machine.transition('mm01_org'); addLog('Organizational levels set'); await wait(550);
  machine.transition('mm01_accounting'); addLog('Accounting data validated'); await wait(720); await markShot('mm01');
  machine.transition('mm01_costing1'); addLog('Costing 1 validated'); await wait(480);
  machine.transition('mm01_costing2'); addLog('Costing 2 validated'); await wait(500);
  machine.transition('materialCreated'); addLog('Material 7001001 created', 'success'); await wait(800); await markShot('material-created');
  machine.transition('mm02_open'); addLog('Opening MM02'); await wait(560);
  machine.transition('mm02_costing'); addLog('Do Not Cost enabled'); await wait(650);
  machine.transition('mm02_complete'); addLog('Material 7001001 updated', 'success'); await wait(700); await markShot('mm02-complete');

  machine.transition('batchRunning');
  els.batchStatus.textContent='Batch execution';
  for (const pct of [8,18,34,51,73,88,100]) {
    els.batchCounter.textContent=`${pct} / 100`;
    els.batchProgress.style.width=`${pct}%`;
    batchScreen(pct);
    await wait(pct===100?560:260);
  }
  machine.transition('batchComplete'); addLog('100 records processed', 'success'); await wait(650); await markShot('batch-complete');
  automationRunning = false;
}

function animateCounter(element, from, to, duration = 800) {
  return new Promise(resolve => {
    if (reducedMotion) { element.textContent=String(to); resolve(); return; }
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now-start)/duration);
      const eased = 1 - Math.pow(1-p,3);
      element.textContent=String(Math.round(from+(to-from)*eased));
      if (p < 1) requestAnimationFrame(frame); else resolve();
    }
    requestAnimationFrame(frame);
  });
}

async function showImpact() {
  machine.transition('impact');
  els.impactScene.classList.add('is-visible');
  els.impactScene.setAttribute('aria-hidden','false');
  const metrics = $$('.metric-number');
  metrics.forEach(el=>el.textContent='0');
  await wait(300);
  await animateCounter(metrics[0],0,90,900);
  await wait(250);
  await animateCounter(metrics[1],0,10,650);
  await wait(380);
  await animateCounter(metrics[2],0,89,850);
  await wait(250);
  await markShot('impact');
}

function hideImpact() {
  els.impactScene.classList.remove('is-visible');
  els.impactScene.setAttribute('aria-hidden','true');
  if (machine.state==='impact') machine.transition('batchComplete');
}

async function resetDemo() {
  directorRunning=false; automationRunning=false; issueResolved=false; materials=createSyntheticMaterials();
  document.body.classList.remove('director-running');
  els.impactScene.classList.remove('is-visible'); els.impactScene.setAttribute('aria-hidden','true');
  els.correctionInput.value=''; els.validationSection.classList.remove('has-issue','is-ready'); clearLogs();
  logClock={h:9,m:42,s:18}; window.__demoComplete=false; machine.transition('idle');
}

async function countdown() {
  els.directorOverlay.classList.add('is-visible'); els.directorOverlay.setAttribute('aria-hidden','false');
  for (const n of [3,2,1]) { els.directorCountdown.textContent=String(n); await wait(480); }
  els.directorCountdown.textContent='GO'; await wait(260);
  els.directorOverlay.classList.remove('is-visible'); els.directorOverlay.setAttribute('aria-hidden','true');
}

async function runDirectorSequence({skipCountdown=false}={}) {
  if (directorRunning) return;
  directorRunning=true; document.body.classList.add('director-running');
  await resetDemo(); directorRunning=true; document.body.classList.add('director-running');
  if (!skipCountdown && !captureMode) await countdown();
  await wait(350);
  await loadBatch(); await wait(620);
  await validateBatch(); await wait(780);
  openIssueEditor(); await wait(520);
  await resolveIssue(true); await wait(620);
  await runAutomation(); await wait(750);
  await showImpact(); await wait(1350);
  window.__demoComplete=true;
  document.documentElement.dataset.demoComplete='true';
  if (typeof window.onDemoComplete === 'function') { try{window.onDemoComplete();}catch(_){} }
  directorRunning=false; document.body.classList.remove('director-running');
}

els.primaryAction.addEventListener('click', async () => {
  if (machine.state==='idle') return loadBatch();
  if (machine.state==='batchLoaded') return validateBatch();
  if (machine.state==='validationFailed') return openIssueEditor();
  if (machine.state==='ready') return runAutomation();
  if (machine.state==='batchComplete') return showImpact();
  if (machine.state==='impact') { hideImpact(); await resetDemo(); return; }
});
els.applyCorrection.addEventListener('click',()=>resolveIssue(false));
els.correctionInput.addEventListener('keydown',e=>{if(e.key==='Enter') resolveIssue(false)});
els.resetButton.addEventListener('click',resetDemo);
els.directorButton.addEventListener('click',()=>runDirectorSequence());
els.impactClose.addEventListener('click',hideImpact);

window.demo = { run: runDirectorSequence, reset: resetDemo, state: () => machine.state, showImpact };
window.__demoComplete=false;
window.__demoState='idle';
window.__demoHistory=[];

renderState('idle');

if (requestedScene === 'impact') {
  materials=createSyntheticMaterials(); materials[36].internalPartNumber='7001037'; issueResolved=true;
  machine.transition('batchComplete'); setTimeout(()=>showImpact(),300);
} else if (autoplay) {
  setTimeout(()=>runDirectorSequence({skipCountdown:true}), captureMode ? 600 : 900);
}
