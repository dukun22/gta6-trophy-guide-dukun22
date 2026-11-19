// Leonida Trophy Guide: an offline checklist and tracker for the 55 GTA VI trophies.
// Data lives in data/trophies.json (official list plus our own cited guides) and
// data/roadmap.json (the three stages to the platinum). Progress is saved in the
// browser only, and can be exported to a file and imported back.
const EARNED_KEY = 'leonida-trophy-guide-earned-v1';
const SPOILER_KEY = 'leonida-trophy-guide-spoiler-v1';

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPane');
const noteEl = document.getElementById('listNote');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const earnedEl = document.getElementById('earnedFilter');
const spoilerEl = document.getElementById('spoilerToggle');

let trophies = [];
let roadmap = null;
let earned = new Set(loadEarned());
let spoiler = localStorage.getItem(SPOILER_KEY) === '1';
let kind = 'all';
let selectedId = null;
let tab = 'checklist';

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
}

function trophyById(id) {
  return trophies.find((t) => t.id === id) ?? null;
}

function isHidden(t) {
  return t.hidden && !earned.has(t.id);
}

function displayName(t) {
  return spoiler && isHidden(t) ? 'Hidden trophy' : t.name;
}

function displayDescription(t) {
  return spoiler && isHidden(t) ? 'Hidden on PlayStation until earned.' : t.description;
}

function gradeCounts() {
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    counts[t.grade][1] += 1;
    if (earned.has(t.id)) counts[t.grade][0] += 1;
  }
  return counts;
}

function renderProgress() {
  const total = trophies.length;
  document.getElementById('progressText').textContent = `${earned.size} of ${total} earned`;
  document.getElementById('progressFill').style.width = total ? `${(earned.size / total) * 100}%` : '0%';
  const counts = gradeCounts();
  document.getElementById('gradeCounts').textContent =
    `Platinum ${counts.platinum[0]}/${counts.platinum[1]} · Gold ${counts.gold[0]}/${counts.gold[1]} · Silver ${counts.silver[0]}/${counts.silver[1]} · Bronze ${counts.bronze[0]}/${counts.bronze[1]}`;
}

function matchesFilters(t) {
  if (kind === 'online') return false;
  if (kind === 'missable' && !t.missable) return false;
  if (kind !== 'all' && kind !== 'missable' && !t.kinds.includes(kind)) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedEl.value === 'todo' && earned.has(t.id)) return false;
  if (earnedEl.value === 'earned' && !earned.has(t.id)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
  return true;
}

function renderList() {
  const visible = trophies.filter(matchesFilters);
  listEl.replaceChildren();
  if (kind === 'online') {
    noteEl.textContent = 'No online trophies in this list — all 55 are single-player, offline only (PowerPyx).';
  } else if (visible.length === 0) {
    noteEl.textContent = 'No trophies match these filters.';
  } else {
    noteEl.textContent = `Showing ${visible.length} of ${trophies.length} trophies.`;
  }
  for (const t of visible) {
    const li = document.createElement('li');
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'trophy-row' + (earned.has(t.id) ? ' earned' : '') + (t.id === selectedId ? ' selected' : '');
    row.dataset.trophyId = String(t.id);
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${displayName(t)}`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveEarned();
      renderAll();
    });
    const main = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = displayName(t);
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = displayDescription(t);
    main.append(name, document.createElement('br'), desc);
    const tags = document.createElement('span');
    tags.className = 'trophy-tags';
    if (t.missable) {
      const tag = document.createElement('span');
      tag.className = 'tag missable';
      tag.textContent = 'Missable';
      tags.append(tag);
    }
    if (t.hidden) {
      const tag = document.createElement('span');
      tag.className = 'tag hidden-flag';
      tag.textContent = 'Hidden';
      tags.append(tag);
    }
    if (t.countLabel) {
      const count = document.createElement('span');
      count.className = 'count-label';
      count.textContent = t.countLabel;
      tags.append(count);
    }
    main.append(tags);
    const badge = document.createElement('span');
    badge.className = `grade-badge grade-${t.grade}`;
    badge.textContent = t.grade;
    row.append(box, main, badge);
    row.addEventListener('click', () => selectTrophy(t.id, true));
    li.append(row);
    listEl.append(li);
  }
}

function renderDetail() {
  const t = trophyById(selectedId);
  if (!t) {
    detailEl.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Pick a trophy on the left to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  detailEl.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = displayName(t);
  const badge = document.createElement('span');
  badge.className = `grade-badge grade-${t.grade}`;
  badge.textContent = t.grade;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = displayDescription(t);
  detailEl.append(heading, badge, official);
  if (t.countLabel) {
    const count = document.createElement('p');
    count.className = 'count-label';
    count.textContent = `Count: ${t.countLabel}`;
    detailEl.append(count);
  }
  const stage = document.createElement('p');
  stage.className = 'stage-label';
  stage.textContent = `Roadmap stage ${t.stage} · Kinds: ${t.kinds.length ? t.kinds.join(', ') : 'platinum'}`;
  detailEl.append(stage);
  const guideHeading = document.createElement('h3');
  guideHeading.textContent = 'Guide';
  detailEl.append(guideHeading);
  const guide = document.createElement('p');
  if (spoiler && isHidden(t)) {
    guide.textContent = 'This trophy is hidden on PlayStation until you earn it. Tick it off in the checklist to reveal its guide here.';
  } else {
    guide.textContent = t.guide;
  }
  detailEl.append(guide);
  if (!(spoiler && isHidden(t))) {
    const sourcesHeading = document.createElement('h3');
    sourcesHeading.textContent = 'Sources';
    const list = document.createElement('ul');
    list.className = 'sources';
    for (const s of t.sources) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = s.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = s.name;
      item.append(link);
      list.append(item);
    }
    detailEl.append(sourcesHeading, list);
  }
}

function renderRoadmap() {
  if (!roadmap) return;
  document.getElementById('roadmapIntro').textContent = `${roadmap.note} Estimated time to the platinum: ${roadmap.hours}.`;
  const wrap = document.getElementById('roadmapStages');
  wrap.replaceChildren();
  for (const stage of roadmap.stages) {
    const card = document.createElement('article');
    card.className = 'stage-card';
    const heading = document.createElement('h2');
    heading.textContent = `Stage ${stage.id}: ${stage.title}`;
    const hours = document.createElement('p');
    hours.className = 'hours';
    hours.textContent = stage.hours;
    const text = document.createElement('p');
    text.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const id of stage.trophies) {
      const chip = document.createElement('span');
      const t = trophyById(id);
      chip.textContent = t ? t.name : `#${id}`;
      chips.append(chip);
    }
    card.append(heading, hours, text, chips);
    wrap.append(card);
  }
}

function renderMissables() {
  const wrap = document.getElementById('missableList');
  wrap.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const heading = document.createElement('h2');
    heading.textContent = `${t.name} — the only potentially missable trophy`;
    const guide = document.createElement('p');
    guide.textContent = t.guide;
    const sources = document.createElement('p');
    sources.className = 'sources';
    sources.textContent = 'Sources: ' + t.sources.map((s) => s.name).join(', ') + '.';
    card.append(heading, guide, sources);
    wrap.append(card);
  }
  const note = document.createElement('p');
  note.textContent = 'Everything else can be done after the story in free-roam, including every story trophy and every item on the 100% checklist. (PowerPyx)';
  wrap.append(note);
}

function renderTabs() {
  document.getElementById('tabChecklist').classList.toggle('active', tab === 'checklist');
  document.getElementById('tabRoadmap').classList.toggle('active', tab === 'roadmap');
  document.getElementById('tabMissables').classList.toggle('active', tab === 'missables');
  document.getElementById('viewChecklist').classList.toggle('hidden', tab !== 'checklist');
  document.getElementById('viewRoadmap').classList.toggle('hidden', tab !== 'roadmap');
  document.getElementById('viewMissables').classList.toggle('hidden', tab !== 'missables');
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderTabs();
}

function selectTrophy(id, pushHash) {
  selectedId = id;
  if (pushHash) history.replaceState(null, '', `#/trophy/${id}`);
  renderList();
  renderDetail();
}

function exportJSON() {
  return JSON.stringify({ game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) }, null, 2);
}

function importJSON(text) {
  const parsed = JSON.parse(text);
  const raw = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(raw)) throw new Error('Import file must hold a list of trophy ids or names.');
  const byName = new Map(trophies.map((t) => [t.name.toLowerCase(), t.id]));
  const next = new Set();
  for (const item of raw) {
    if (Number.isInteger(item) && trophyById(item)) next.add(item);
    else if (typeof item === 'string' && byName.has(item.toLowerCase())) next.add(byName.get(item.toLowerCase()));
  }
  earned = next;
  saveEarned();
  renderAll();
  return earned.size;
}

function setTab(next, pushHash) {
  tab = next;
  if (pushHash) history.replaceState(null, '', next === 'checklist' ? '#/checklist' : `#/${next}`);
  renderTabs();
}

function applyHash() {
  const hash = location.hash;
  const trophyMatch = hash.match(/^#\/trophy\/(\d+)$/);
  if (trophyMatch && trophyById(Number(trophyMatch[1]))) {
    tab = 'checklist';
    selectedId = Number(trophyMatch[1]);
    return;
  }
  if (hash === '#/roadmap') tab = 'roadmap';
  else if (hash === '#/missables') tab = 'missables';
  else tab = 'checklist';
}

async function loadData() {
  const trophyResponse = await fetch('data/trophies.json');
  const trophyDoc = await trophyResponse.json();
  trophies = trophyDoc.trophies;
  const roadmapResponse = await fetch('data/roadmap.json');
  roadmap = await roadmapResponse.json();
}

function wireControls() {
  document.getElementById('tabChecklist').addEventListener('click', () => setTab('checklist', true));
  document.getElementById('tabRoadmap').addEventListener('click', () => setTab('roadmap', true));
  document.getElementById('tabMissables').addEventListener('click', () => setTab('missables', true));
  document.getElementById('kindRow').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-kind]');
    if (!button) return;
    kind = button.dataset.kind;
    for (const b of document.querySelectorAll('#kindRow button')) b.classList.toggle('active', b === button);
    renderList();
  });
  gradeEl.addEventListener('change', renderList);
  earnedEl.addEventListener('change', renderList);
  searchEl.addEventListener('input', renderList);
  spoilerEl.checked = spoiler;
  spoilerEl.addEventListener('change', () => {
    spoiler = spoilerEl.checked;
    saveSpoiler();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    link.download = 'gta6-trophy-progress.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const count = importJSON(await file.text());
      noteEl.textContent = `Imported progress: ${count} trophies earned.`;
    } catch (error) {
      noteEl.textContent = `Import failed: ${error.message}`;
    }
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear all earned trophies?')) return;
    earned = new Set();
    saveEarned();
    renderAll();
  });
  window.addEventListener('hashchange', () => {
    applyHash();
    renderAll();
  });
}

await loadData();
applyHash();
if (!selectedId) selectedId = trophies[0] ? trophies[0].id : null;
wireControls();
renderRoadmap();
renderMissables();
renderAll();

// A small handle for automated checks: read progress, export and import without a mouse.
window.__trophyGuide = { getState: () => ({ earned: [...earned], spoiler, tab }), exportJSON, importJSON, setSpoiler: (value) => { spoiler = value; spoilerEl.checked = value; saveSpoiler(); renderAll(); }, selectTrophy: (id) => selectTrophy(id, false) };
