/* ═══════════════════════════════════════════════════════
   Genshin Promote — Renderer  (runs in BrowserWindow)
   ═══════════════════════════════════════════════════════ */

// ── Property type → readable name ──
const PROP_NAME = {
  1: 'HP', 2: 'HP', 3: 'HP%',
  4: 'Base ATK', 5: 'ATK', 6: 'ATK%',
  7: 'DEF', 8: 'DEF%',
  20: 'CRIT Rate', 22: 'CRIT DMG',
  23: 'Energy Recharge', 26: 'Healing Bonus',
  27: 'Incoming Healing', 28: 'Elem. Mastery',
  29: 'Phys DMG%', 30: 'Phys DMG%',
  40: 'Pyro DMG%', 41: 'Electro DMG%',
  42: 'Hydro DMG%', 43: 'Dendro DMG%',
  44: 'Anemo DMG%', 45: 'Geo DMG%',
  46: 'Cryo DMG%'
};

const WEAPON_TYPE = { 1: 'Kılıç', 10: 'Kataliz', 11: 'Büyük Kılıç', 12: 'Yay', 13: 'Mızrak' };
const ARTIFACT_SLOT = { 1: 'Çiçek', 2: 'Tüy', 3: 'Kum Saati', 4: 'Kupa', 5: 'Taç' };

const ELEMENT_COLOURS = {
  Pyro: '#EF7938', Fire: '#EF7938',
  Hydro: '#4CC2F1', Water: '#4CC2F1',
  Anemo: '#74C2A8', Wind: '#74C2A8',
  Electro: '#B07ED8', Electric: '#B07ED8',
  Dendro: '#7BB42D', Grass: '#7BB42D',
  Cryo: '#9FD6E3', Ice: '#9FD6E3',
  Geo: '#F2B723', Rock: '#F2B723'
};

// ── Cache last fetched data ──
let charData = null;
let accountStats = null;

/* ═══════ DOM Refs ═══════ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const btnFetch      = $('#btn-fetch');
const charGrid      = $('#char-grid');
const loadingEl     = $('#loading');
const emptyEl       = $('#empty-state');
const errorEl       = $('#error-state');
const errorMsg      = $('#error-msg');
const statsBar      = $('#stats-bar');
const modalOverlay  = $('#modal-overlay');
const modalContent  = $('#modal-content');
const modalClose    = $('#modal-close');
const settingsForm  = $('#settings-form');
const saveStatus    = $('#save-status');

/* ═══════ Window Controls ═══════ */
document.getElementById('btn-minimize')?.addEventListener('click', () => api.minimize());
document.getElementById('btn-maximize')?.addEventListener('click', () => api.maximize());
document.getElementById('btn-close')?.addEventListener('click', () => api.close());

/* ═══════ Navigation ═══════ */
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.page').forEach(p => p.classList.remove('active'));
    $(`#page-${btn.dataset.page}`).classList.add('active');

    // Render weapons/artifacts on first visit if data exists
    if (btn.dataset.page === 'weapons' && charData && !weaponsRendered) renderWeapons();
    if (btn.dataset.page === 'artifacts' && charData && !artifactsRendered) renderArtifacts();
  });
});

let weaponsRendered = false;
let artifactsRendered = false;

/* ═══════ Settings ═══════ */
async function loadSettings() {
  const s = await api.getSettings();
  $('#inp-ltoken').value      = s.ltoken_v2 || '';
  $('#inp-ltuid').value       = s.ltuid_v2  || '';
  $('#inp-cookie-token').value = s.cookie_token_v2 || '';
  $('#inp-uid').value          = s.genshin_uid || '';
  $('#inp-server').value       = s.genshin_server || 'os_euro';
  $('#inp-gemini-key').value    = s.gemini_api_key || '';
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await api.setSettings({
    ltoken_v2:      $('#inp-ltoken').value.trim(),
    ltuid_v2:       $('#inp-ltuid').value.trim(),
    cookie_token_v2: $('#inp-cookie-token').value.trim(),
    genshin_uid:    $('#inp-uid').value.trim(),
    genshin_server: $('#inp-server').value,
    gemini_api_key: $('#inp-gemini-key').value.trim()
  });
  saveStatus.textContent = '✓ Kaydedildi';
  saveStatus.classList.add('show');
  setTimeout(() => saveStatus.classList.remove('show'), 2000);
});

/* ═══════ Fetch Characters ═══════ */
btnFetch.addEventListener('click', fetchCharacters);

async function fetchCharacters() {
  setState('loading');
  btnFetch.disabled = true;

  try {
    const result = await api.fetchData();

    if (result.error) {
      showError(result.error);
      return;
    }

    charData = result.avatars;
    accountStats = result.stats;

    if (accountStats) {
      $('#stat-days').textContent        = accountStats.active_day_number ?? '—';
      $('#stat-achievements').textContent = accountStats.achievement_number ?? '—';
      $('#stat-characters').textContent   = accountStats.avatar_number ?? '—';
      $('#stat-abyss').textContent        = accountStats.spiral_abyss ?? '—';
    }

    renderGrid(charData);
    setState('grid');

    // Mark sub-pages as needing re-render
    weaponsRendered = false;
    artifactsRendered = false;
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    btnFetch.disabled = false;
  }
}

function setState(s) {
  loadingEl.classList.toggle('hidden', s !== 'loading');
  emptyEl.classList.toggle('hidden',   s !== 'empty');
  errorEl.classList.toggle('hidden',   s !== 'error');
  charGrid.classList.toggle('hidden',  s !== 'grid');
  statsBar.classList.toggle('hidden',  s !== 'grid');
}

function showError(msg) {
  errorMsg.textContent = msg;
  setState('error');
}

/* ═══════ Render Grid ═══════ */
function renderGrid(avatars) {
  charGrid.innerHTML = '';

  avatars.forEach((av, i) => {
    const card = document.createElement('div');
    card.className = `char-card rarity-${av.rarity >= 5 ? 5 : av.rarity}`;
    card.addEventListener('click', () => openModal(i));

    const elemIcon = av.element ? getElementIcon(av.element) : '';
    const constellation = av.actived_constellation_num ?? 0;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${sanitizeUrl(av.icon)}" loading="lazy" alt="${esc(av.name)}">
        ${elemIcon ? `<div class="element-badge"><img src="${sanitizeUrl(elemIcon)}" alt=""></div>` : ''}
        <div class="card-constellation">C${constellation}</div>
      </div>
      <div class="card-info">
        <div class="card-name">${esc(av.name)}</div>
        <div class="card-level">Lv.${av.level}</div>
      </div>
    `;
    charGrid.appendChild(card);
  });
}

/* ═══════ Modal (Character Detail) ═══════ */
function openModal(idx) {
  const av = charData[idx];
  if (!av) return;

  const constellation = av.actived_constellation_num ?? 0;

  let html = `<div class="modal-header">`;
  html += `<div class="modal-avatar rarity-${av.rarity >= 5 ? 5 : av.rarity}">
    <img src="${sanitizeUrl(av.image || av.icon)}" alt="${esc(av.name)}">
  </div>`;
  html += `<div class="modal-info">
    <h2>${esc(av.name)}</h2>
    <div class="meta">
      <span>Lv.${av.level}</span>
      <span>⭐ ${av.rarity}</span>
      <span>C${constellation}</span>
      ${av.fetter ? `<span>❤ Dostluk ${av.fetter}</span>` : ''}
    </div>
  </div>`;
  html += `</div>`;

  // Constellations dots
  html += `<div class="constellations">`;
  for (let c = 1; c <= 6; c++) {
    html += `<div class="const-dot ${c <= constellation ? 'active' : 'inactive'}">C${c}</div>`;
  }
  html += `</div>`;

  // Weapon
  if (av.weapon) {
    const w = av.weapon;
    const wType = WEAPON_TYPE[w.type] || '';
    const mainProp = w.main_property;
    const subProp = w.sub_property;

    html += `<div class="detail-section"><h3>⚔ Silah</h3>`;
    html += `<div class="weapon-row">`;
    html += `<div class="weapon-icon rarity-${w.rarity >= 5 ? 5 : w.rarity}">
      <img src="${sanitizeUrl(w.icon)}" alt="">
    </div>`;
    html += `<div class="weapon-info">
      <div class="w-name">${esc(w.name)}</div>
      <div class="w-meta">Lv.${w.level} · R${w.affix_level} · ${wType} · ⭐${w.rarity}</div>
      <div class="w-stats">`;
    if (mainProp) {
      html += `<span>${esc(mainProp.property_type_name || propName(mainProp.property_type))}: <b>${esc(mainProp.value)}</b></span>`;
    }
    if (subProp && subProp.value) {
      html += `<span>${esc(subProp.property_type_name || propName(subProp.property_type))}: <b>${esc(subProp.value)}</b></span>`;
    }
    html += `</div></div></div></div>`;
  }

  // Artifacts
  if (av.relics && av.relics.length) {
    html += `<div class="detail-section"><h3>🏺 Eserler</h3>`;
    av.relics.forEach(r => {
      const slotName = ARTIFACT_SLOT[r.pos] || `Slot ${r.pos}`;
      html += `<div class="artifact-row">`;
      html += `<div class="artifact-icon rarity-${r.rarity >= 5 ? 5 : r.rarity}">
        <img src="${sanitizeUrl(r.icon)}" alt="">
      </div>`;
      html += `<div class="artifact-detail">
        <div class="a-name">${esc(r.name)} <small style="color:var(--text-light)">(${slotName})</small></div>`;

      if (r.main_property) {
        const mp = r.main_property;
        html += `<div class="a-main">${esc(mp.property_type_name || propName(mp.property_type))}: ${esc(mp.value)}</div>`;
      }

      if (r.sub_property_list && r.sub_property_list.length) {
        html += `<div class="a-subs">`;
        r.sub_property_list.forEach(sp => {
          const upgrades = sp.times > 0 ? `<span class="upgrade-count">(+${sp.times})</span>` : '';
          html += `<div class="sub-stat">
            <span>${esc(sp.property_type_name || propName(sp.property_type))}</span>
            <span class="sub-val">${esc(sp.value)}${upgrades}</span>
          </div>`;
        });
        html += `</div>`;
      }

      html += `</div></div>`;
    });
    html += `</div>`;
  }

  modalContent.innerHTML = html;
  modalOverlay.classList.remove('hidden');
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
function closeModal() { modalOverlay.classList.add('hidden'); }

/* ═══════ Weapons Page ═══════ */
function renderWeapons(filterType = null) {
  if (!charData) return;
  const grid = $('#weapons-grid');
  const empty = $('#weapons-empty');

  // Collect all weapons with their owner
  const weapons = [];
  charData.forEach(av => {
    if (av.weapon) {
      weapons.push({ weapon: av.weapon, owner: av });
    }
  });

  if (!weapons.length) { grid.classList.add('hidden'); empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.classList.remove('hidden');

  // Sort by rarity desc, then level desc
  weapons.sort((a, b) => b.weapon.rarity - a.weapon.rarity || b.weapon.level - a.weapon.level);

  // Filter
  const filtered = filterType ? weapons.filter(w => w.weapon.type === filterType) : weapons;

  grid.innerHTML = '';
  filtered.forEach(({ weapon: w, owner }) => {
    const mainProp = w.main_property;
    const subProp = w.sub_property;
    const wType = WEAPON_TYPE[w.type] || '';

    const card = document.createElement('div');
    card.className = 'weapon-card';
    card.innerHTML = `
      <div class="wc-icon rarity-${w.rarity >= 5 ? 5 : w.rarity}">
        <img src="${sanitizeUrl(w.icon)}" loading="lazy" alt="">
      </div>
      <div class="wc-body">
        <div class="wc-name">${esc(w.name)}</div>
        <div class="wc-meta">Lv.${w.level} · R${w.affix_level} · ${wType} · ⭐${w.rarity}</div>
        <div class="wc-stats">
          ${mainProp ? `<span>${esc(mainProp.property_type_name || propName(mainProp.property_type))}: <b>${esc(mainProp.value)}</b></span>` : ''}
          ${subProp && subProp.value ? `<span>${esc(subProp.property_type_name || propName(subProp.property_type))}: <b>${esc(subProp.value)}</b></span>` : ''}
        </div>
      </div>
      <div class="owner-badge">
        <div class="owner-avatar">
          <img src="${sanitizeUrl(owner.icon)}" alt="">
        </div>
        <div class="owner-tooltip">${esc(owner.name)} · Lv.${owner.level}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  weaponsRendered = true;
}

// Weapon type filter bar (injected once)
function ensureWeaponFilters() {
  if ($('#weapon-filters')) return;
  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.id = 'weapon-filters';

  const types = [
    { val: null, label: 'Tümü' },
    { val: 1, label: 'Kılıç' },
    { val: 11, label: 'Büyük Kılıç' },
    { val: 13, label: 'Mızrak' },
    { val: 12, label: 'Yay' },
    { val: 10, label: 'Kataliz' },
  ];
  types.forEach(t => {
    const btn = document.createElement('button');
    btn.className = `filter-btn${t.val === null ? ' active' : ''}`;
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWeapons(t.val);
    });
    bar.appendChild(btn);
  });

  const header = $('#page-weapons .page-header');
  header.after(bar);
}

/* ═══════ Artifacts Page ═══════ */
function renderArtifacts(filterSlot = null) {
  if (!charData) return;
  const grid = $('#artifacts-grid');
  const empty = $('#artifacts-empty');

  // Collect all artifacts with their owner
  const artifacts = [];
  charData.forEach(av => {
    (av.relics || []).forEach(r => {
      artifacts.push({ relic: r, owner: av });
    });
  });

  if (!artifacts.length) { grid.classList.add('hidden'); empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.classList.remove('hidden');

  // Sort by rarity desc, then slot
  artifacts.sort((a, b) => b.relic.rarity - a.relic.rarity || a.relic.pos - b.relic.pos);

  // Filter
  const filtered = filterSlot ? artifacts.filter(a => a.relic.pos === filterSlot) : artifacts;

  grid.innerHTML = '';
  filtered.forEach(({ relic: r, owner }) => {
    const slotName = ARTIFACT_SLOT[r.pos] || `Slot ${r.pos}`;
    const card = document.createElement('div');
    card.className = 'artifact-card';

    let subsHtml = '';
    if (r.sub_property_list && r.sub_property_list.length) {
      subsHtml = `<div class="ac-subs">`;
      r.sub_property_list.forEach(sp => {
        const upgrades = sp.times > 0 ? `<span class="upgrade-count">(+${sp.times})</span>` : '';
        subsHtml += `<div class="sub-stat">
          <span>${esc(sp.property_type_name || propName(sp.property_type))}</span>
          <span class="sub-val">${esc(sp.value)}${upgrades}</span>
        </div>`;
      });
      subsHtml += `</div>`;
    }

    card.innerHTML = `
      <div class="ac-icon rarity-${r.rarity >= 5 ? 5 : r.rarity}">
        <img src="${sanitizeUrl(r.icon)}" loading="lazy" alt="">
      </div>
      <div class="ac-body">
        <div class="ac-name">${esc(r.name)}</div>
        <div class="ac-slot">${slotName} · ⭐${r.rarity}</div>
        ${r.main_property ? `<div class="ac-main">${esc(r.main_property.property_type_name || propName(r.main_property.property_type))}: ${esc(r.main_property.value)}</div>` : ''}
        ${subsHtml}
      </div>
      <div class="owner-badge">
        <div class="owner-avatar">
          <img src="${sanitizeUrl(owner.icon)}" alt="">
        </div>
        <div class="owner-tooltip">${esc(owner.name)} · Lv.${owner.level}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  artifactsRendered = true;
}

// Artifact slot filter bar
function ensureArtifactFilters() {
  if ($('#artifact-filters')) return;
  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.id = 'artifact-filters';

  const slots = [
    { val: null, label: 'Tümü' },
    { val: 1, label: 'Çiçek' },
    { val: 2, label: 'Tüy' },
    { val: 3, label: 'Kum Saati' },
    { val: 4, label: 'Kupa' },
    { val: 5, label: 'Taç' },
  ];
  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.className = `filter-btn${s.val === null ? ' active' : ''}`;
    btn.textContent = s.label;
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderArtifacts(s.val);
    });
    bar.appendChild(btn);
  });

  const header = $('#page-artifacts .page-header');
  header.after(bar);
}

// Wrap to auto-inject filter bars before rendering
const _origRW = renderWeapons;
renderWeapons = function(f) { ensureWeaponFilters(); return _origRW(f); };
const _origRA = renderArtifacts;
renderArtifacts = function(f) { ensureArtifactFilters(); return _origRA(f); };

/* ═══════ Helpers ═══════ */
function propName(type) {
  return PROP_NAME[type] || `Prop(${type})`;
}

function getElementIcon(element) {
  // HoYoLAB sometimes provides element as English or icon URL
  // Use wiki icons for elements
  const elMap = {
    Fire: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Pyro.png',
    Water: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Hydro.png',
    Wind: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Anemo.png',
    Electric: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Electro.png',
    Grass: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Dendro.png',
    Ice: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Cryo.png',
    Rock: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Geo.png',
    Pyro: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Pyro.png',
    Hydro: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Hydro.png',
    Anemo: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Anemo.png',
    Electro: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Electro.png',
    Dendro: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Dendro.png',
    Cryo: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Cryo.png',
    Geo: 'https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/UI_Gacha_AvatarImg_Side_Geo.png',
  };
  return elMap[element] || '';
}

function sanitizeUrl(url) {
  if (!url) return '';
  // Only allow https URLs from known HoYoLAB CDN domains
  try {
    const parsed = new URL(url);
    const allowed = ['mihoyo.com', 'hoyolab.com', 'hoyoverse.com'];
    if (parsed.protocol === 'https:' && allowed.some(d => parsed.hostname.endsWith(d))) {
      return url;
    }
  } catch {
    // invalid URL
  }
  return '';
}

function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

/* ═══════ AI Team Builder ═══════ */
function initAITeamBuilder() {
  const btnAI       = $('#btn-ai-build');
  const aiEmpty     = $('#ai-empty');
  const aiLoading   = $('#ai-loading');
  const aiLoadText  = $('#ai-loading-text');
  const aiLoadRetry = $('#ai-loading-retry');
  const aiError     = $('#ai-error');
  const aiErrorMsg  = $('#ai-error-msg');
  const aiCooldown  = $('#ai-cooldown-msg');
  const btnRetry    = $('#btn-ai-retry');
  const aiResults   = $('#ai-results');
  const aiSources   = $('#ai-sources');

  // Mode buttons
  const modeBtns    = document.querySelectorAll('.ai-mode-btn');
  const charWrap    = $('#ai-char-select-wrap');
  const patchWrap   = $('#ai-patch-wrap');
  const charSelect  = $('#ai-char-select');
  const patchSelect = $('#ai-patch-select');
  const patchCustom = $('#ai-patch-custom');
  const countSelect = $('#ai-team-count');

  let currentMode = 'general';
  let cooldownTimer = null;
  let lastRequestArgs = null;



  // Retry button for rate limit errors
  btnRetry.addEventListener('click', () => {
    if (lastRequestArgs) {
      btnAI.click();
    }
  });

  function startCooldown(seconds) {
    btnAI.disabled = true;
    btnRetry.classList.add('hidden');
    aiCooldown.classList.remove('hidden');
    let remaining = seconds;
    const tick = () => {
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        btnAI.disabled = false;
        aiCooldown.classList.add('hidden');
        btnRetry.classList.remove('hidden');
        return;
      }
      aiCooldown.textContent = `⏳ Rate limit — ${remaining}sn sonra tekrar deneyebilirsin`;
      remaining--;
    };
    tick();
    cooldownTimer = setInterval(tick, 1000);
  }

  // Custom patch input toggle
  patchSelect.addEventListener('change', () => {
    patchCustom.classList.toggle('hidden', patchSelect.value !== 'custom');
  });

  function getPatchVersion() {
    if (patchSelect.value === 'custom') {
      return patchCustom.value.trim() || '6.4';
    }
    return patchSelect.value;
  }

  // Mode switching
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;

      charWrap.classList.toggle('hidden', currentMode !== 'character');
      patchWrap.classList.toggle('hidden', currentMode !== 'abyss');

      // Populate character dropdown when switching to character mode
      if (currentMode === 'character') populateCharSelect();
    });
  });

  function populateCharSelect() {
    if (!charData || !charData.length) return;
    const prev = charSelect.value;
    charSelect.innerHTML = '<option value="">-- Karakter seç --</option>';
    charData.forEach(av => {
      const opt = document.createElement('option');
      opt.value = av.name;
      opt.textContent = `${av.name} (Lv.${av.level} C${av.actived_constellation_num ?? 0})`;
      charSelect.appendChild(opt);
    });
    if (prev) charSelect.value = prev;
  }

  function setAIState(s) {
    aiEmpty.classList.toggle('hidden',    s !== 'empty');
    aiLoading.classList.toggle('hidden',  s !== 'loading');
    aiError.classList.toggle('hidden',    s !== 'error');
    aiResults.classList.toggle('hidden',  s !== 'results');
    aiSources.classList.toggle('hidden',  s !== 'results');
  }

  btnAI.addEventListener('click', async () => {
    if (!charData || !charData.length) {
      setAIState('error');
      aiErrorMsg.textContent = 'Önce Karakterler sekmesinden verileri çek.';
      return;
    }

    if (currentMode === 'character' && !charSelect.value) {
      setAIState('error');
      aiErrorMsg.textContent = 'Lütfen bir karakter seçin.';
      return;
    }

    setAIState('loading');
    aiLoadText.textContent = 'Gemini analiz ediyor…';
    aiLoadRetry.classList.add('hidden');
    btnAI.disabled = true;

    try {
      const teamCount = parseInt(countSelect.value, 10) || 2;
      let result;

      if (currentMode === 'general') {
        result = await api.buildGeneral({ avatars: charData, teamCount });
      } else if (currentMode === 'character') {
        result = await api.buildCharTeam({
          avatars: charData,
          characterName: charSelect.value,
          teamCount,
        });
      } else if (currentMode === 'abyss') {
        result = await api.buildAbyssTeam({
          avatars: charData,
          patchVersion: getPatchVersion(),
          teamCount,
        });
      }

      if (result.error) {
        setAIState('error');
        aiErrorMsg.textContent = result.error;
        // Detect rate limit and start cooldown
        const errLower = result.error.toLowerCase();
        if (errLower.includes('quota') || errLower.includes('rate') || errLower.includes('429')
            || errLower.includes('high demand') || errLower.includes('resource_exhausted')) {
          startCooldown(65);
        }
        return;
      }

      if (!result.teams || !result.teams.length) {
        setAIState('error');
        aiErrorMsg.textContent = 'Gemini takım önerisi döndürmedi.';
        return;
      }

      renderTeams(result.teams, result.metaSource);
      renderSources(result.sources);
      setAIState('results');
    } catch (err) {
      setAIState('error');
      aiErrorMsg.textContent = err.message || String(err);
    } finally {
      btnAI.disabled = false;
    }
  });

  function renderTeams(teams, metaSource) {
    aiResults.innerHTML = '';

    teams.forEach(team => {
      const card = document.createElement('div');
      card.className = 'team-card';

      // Header
      let headerHtml = `<div class="team-card-header">
        <h3>${esc(team.team_name)}${team.abyss_half ? `<span class="abyss-half-label">Half ${esc(team.abyss_half)}</span>` : ''}</h3>
        <span class="team-dmg-type">${esc(team.damage_type)}</span>
      </div>`;

      // Team members with character images
      let membersHtml = `<div class="team-members">`;
      (team.characters || []).forEach(charName => {
        const av = findCharByName(charName);
        if (av) {
          membersHtml += `
            <div class="team-member">
              <div class="tm-avatar rarity-${av.rarity >= 5 ? 5 : av.rarity}">
                <img src="${sanitizeUrl(av.icon)}" alt="${esc(av.name)}">
              </div>
              <div class="tm-name">${esc(av.name)}</div>
              <div class="tm-level">Lv.${av.level} C${av.actived_constellation_num ?? 0}</div>
            </div>`;
        } else {
          membersHtml += `
            <div class="team-member">
              <div class="tm-avatar rarity-4" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--border)">?</div>
              <div class="tm-name">${esc(charName)}</div>
              <div class="tm-level">–</div>
            </div>`;
        }
      });
      membersHtml += `</div>`;

      // Detail sections
      let detailsHtml = `<div class="team-detail-sections">`;

      if (team.estimated_dps) {
        const dpsVal = String(team.estimated_dps);
        const formatted = dpsVal.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        detailsHtml += `<div class="team-detail-section">
          <h4>📈 Tahmini DPS</h4>
          <span class="dps-badge">${esc(formatted)}</span>
        </div>`;
      }

      if (team.reasoning) {
        detailsHtml += `<div class="team-detail-section">
          <h4>🔍 Analiz</h4>
          <p>${esc(team.reasoning)}</p>
        </div>`;
      }

      if (team.rotation_guide) {
        detailsHtml += `<div class="team-detail-section">
          <h4>🔄 Rotasyon Rehberi</h4>
          <div class="rotation-code">${esc(team.rotation_guide)}</div>
        </div>`;
      }

      if (team.alternative_substitute) {
        detailsHtml += `<div class="team-detail-section">
          <h4>🔁 Alternatif Aday</h4>
          <p>${esc(team.alternative_substitute)}</p>
        </div>`;
      }

      detailsHtml += `</div>`;

      card.innerHTML = headerHtml + membersHtml + detailsHtml;
      aiResults.appendChild(card);
    });

    // Meta source info
    if (metaSource) {
      const metaDiv = document.createElement('div');
      metaDiv.className = 'ai-meta-source';
      metaDiv.textContent = `📌 ${metaSource}`;
      aiResults.appendChild(metaDiv);
    }
  }

  function renderSources(sources) {
    aiSources.innerHTML = '';
    if (!sources || !sources.length) {
      aiSources.classList.add('hidden');
      return;
    }

    let html = '<h4>🌐 İnternet Kaynakları</h4><ul>';
    sources.forEach(s => {
      const title = esc(s.title || s.url);
      // Only render URLs from known safe domains or display as text
      html += `<li>📄 ${title}</li>`;
    });
    html += '</ul>';
    aiSources.innerHTML = html;
    aiSources.classList.remove('hidden');
  }

  /** Find a character from charData by name (fuzzy) */
  function findCharByName(name) {
    if (!charData) return null;
    const lower = name.toLowerCase().trim();
    return charData.find(av => av.name.toLowerCase() === lower)
        || charData.find(av => av.name.toLowerCase().includes(lower))
        || charData.find(av => lower.includes(av.name.toLowerCase()));
  }
}

/* ═══════ Team Rating ═══════ */
function initTeamRating() {
  const btnRate     = $('#btn-rate');
  const rateEmpty   = $('#rate-empty');
  const rateLoading = $('#rate-loading');
  const rateError   = $('#rate-error');
  const rateErrMsg  = $('#rate-error-msg');
  const rateResult  = $('#rate-result');
  const slots       = document.querySelectorAll('.rate-slot');
  const selects     = document.querySelectorAll('.rate-char-select');

  function setRateState(s) {
    rateEmpty.classList.toggle('hidden',   s !== 'empty');
    rateLoading.classList.toggle('hidden', s !== 'loading');
    rateError.classList.toggle('hidden',   s !== 'error');
    rateResult.classList.toggle('hidden',  s !== 'results');
  }

  function populateRateSelects() {
    if (!charData?.length) return;
    selects.forEach(sel => {
      const prev = sel.value;
      const fragment = document.createDocumentFragment();
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Seç...';
      fragment.appendChild(defaultOpt);
      
      charData.forEach(av => {
        const opt = document.createElement('option');
        opt.value = av.name;
        opt.textContent = `${av.name} (Lv.${av.level} C${av.actived_constellation_num ?? 0})`;
        fragment.appendChild(opt);
      });
      
      sel.innerHTML = '';
      sel.appendChild(fragment);
      if (prev) sel.value = prev;
    });
  }

  // Update avatar preview when select changes
  selects.forEach((sel, i) => {
    sel.addEventListener('change', () => {
      const slot = slots[i];
      const avatarDiv = slot.querySelector('.rate-slot-avatar');
      const av = charData?.find(a => a.name === sel.value);
      if (av) {
        avatarDiv.innerHTML = `<img src="${sanitizeUrl(av.icon)}" alt="${esc(av.name)}">`;
        avatarDiv.classList.add('filled');
      } else {
        avatarDiv.innerHTML = '<span>+</span>';
        avatarDiv.classList.remove('filled');
      }
      // Enable button if 4 selected
      const count = [...selects].filter(s => s.value).length;
      btnRate.disabled = count < 4;
    });
  });

  // Watch for charData updates — populate selects when navigating to this page
  const ratePage = document.querySelector('#page-team-rate');
  if (ratePage) {
    const observer = new MutationObserver(() => {
      if (!ratePage.classList.contains('active')) return;
      populateRateSelects();
    });
    observer.observe(ratePage, { attributes: true, attributeFilter: ['class'] });
  }

  btnRate.addEventListener('click', async () => {
    const team = [...selects].map(s => s.value).filter(Boolean);
    if (team.length < 4) return;

    // Check duplicates
    if (new Set(team).size < 4) {
      setRateState('error');
      rateErrMsg.textContent = 'Aynı karakteri birden fazla seçemezsin.';
      return;
    }

    if (!charData?.length) {
      setRateState('error');
      rateErrMsg.textContent = 'Önce Karakterler sekmesinden verileri çek.';
      return;
    }

    setRateState('loading');
    btnRate.disabled = true;

    try {
      const result = await api.rateTeam({ avatars: charData, team });

      if (result.error) {
        setRateState('error');
        rateErrMsg.textContent = result.error;
        return;
      }

      if (!result.rating) {
        setRateState('error');
        rateErrMsg.textContent = 'Gemini değerlendirme döndürmedi.';
        return;
      }

      renderRating(result.rating);
      setRateState('results');
    } catch (err) {
      setRateState('error');
      rateErrMsg.textContent = err.message || String(err);
    } finally {
      btnRate.disabled = [...selects].filter(s => s.value).length < 4;
    }
  });

  function renderRating(r) {
    const grade = (r.grade || 'B').toUpperCase();
    const score = r.score ?? 0;

    let html = `<div class="rate-card">`;

    // Score row
    html += `<div class="rate-score-row">
      <div class="rate-score-circle grade-${grade}">${score}</div>
      <div>
        <div class="rate-grade grade-${grade}">${grade} Rank</div>
        <div class="rate-verdict">${esc(r.verdict || '')}</div>
      </div>
    </div>`;

    // Strengths
    if (r.strengths?.length) {
      html += `<div class="rate-section"><h4>✅ Güçlü Yönler</h4><ul>`;
      r.strengths.forEach(s => { html += `<li>${esc(s)}</li>`; });
      html += `</ul></div>`;
    }

    // Weaknesses
    if (r.weaknesses?.length) {
      html += `<div class="rate-section"><h4>⚠️ Zayıf Yönler</h4><ul>`;
      r.weaknesses.forEach(w => { html += `<li>${esc(w)}</li>`; });
      html += `</ul></div>`;
    }

    // Suggestion
    if (r.suggestion && r.suggestion.replace) {
      html += `<div class="rate-suggestion">
        <strong>💡 Öneri:</strong> 
        <span class="swap-arrow">${esc(r.suggestion.replace)} → ${esc(r.suggestion.with)}</span>
        <br><small>${esc(r.suggestion.reason || '')}</small>
      </div>`;
    } else {
      html += `<div class="rate-optimal">⭐ Bu takım zaten optimal seviyede!</div>`;
    }

    html += `</div>`;
    rateResult.innerHTML = html;
  }
}

/* ═══════ Init ═══════ */
loadSettings();
initAITeamBuilder();
initTeamRating();
