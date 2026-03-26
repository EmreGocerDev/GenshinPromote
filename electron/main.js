const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const { getIndex, getCharacterDetails } = require('../lib/api');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const store = new Store({
    name: 'genshin-promote-settings',
    defaults: {
        ltoken_v2: '',
        ltuid_v2: '',
        cookie_token_v2: '',
        genshin_uid: '',
        genshin_server: 'os_euro',
        gemini_api_key: '',
    },
});

function getGeminiUrl() {
    const key = store.get('gemini_api_key') || '';
    return `${GEMINI_BASE}?key=${key}`;
}

let mainWindow;

// Disable GPU hardware acceleration to prevent crashes on some systems
app.disableHardwareAcceleration();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 960,
        minHeight: 640,
        title: 'Genshin Promote',
        frame: false,
        backgroundColor: '#F5F0E8',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    
    // Open DevTools in development mode (comment out for production)
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ── IPC: Window controls ────────────────────────────────────────
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());

// ── IPC: Settings ───────────────────────────────────────────────
ipcMain.handle('settings:get', () => store.store);
ipcMain.handle('settings:set', (_e, data) => {
    store.set(data);
    return true;
});

// ── IPC: Fetch data ─────────────────────────────────────────────
function buildCookie() {
    const s = store.store;
    return [
        `ltoken_v2=${s.ltoken_v2}`,
        `ltuid_v2=${s.ltuid_v2}`,
        `cookie_token_v2=${s.cookie_token_v2}`,
        `account_id_v2=${s.ltuid_v2}`,
    ].join('; ') + ';';
}

ipcMain.handle('genshin:fetch', async () => {
    try {
        const s = store.store;
        if (!s.ltoken_v2 || !s.ltuid_v2 || !s.genshin_uid) {
            return { error: 'Ayarlar eksik. Lütfen Cookie ve UID bilgilerini gir.' };
        }

        const cookie = buildCookie();
        const uid    = s.genshin_uid;
        const server = s.genshin_server || 'os_euro';

        // 1. Index
        const indexData = await getIndex(uid, server, cookie);

        // 2. Character details
        const characterIds = (indexData.avatars ?? []).map((a) => a.id);
        const { avatars, propertyMap } = await getCharacterDetails(uid, server, cookie, characterIds);

        // Sort by level desc
        avatars.sort((a, b) => b.level - a.level || b.rarity - a.rarity);

        return { stats: indexData.stats, avatars, propertyMap };
    } catch (err) {
        return { error: err.message || String(err) };
    }
});

// ── IPC: Gemini AI Team Builder ─────────────────────────────────

const PROP_NAME = {
    1: 'HP', 2: 'HP', 3: 'HP%',
    4: 'Base ATK', 5: 'ATK', 6: 'ATK%',
    7: 'DEF', 8: 'DEF%',
    20: 'CRIT Rate', 22: 'CRIT DMG',
    23: 'Energy Recharge', 26: 'Healing Bonus',
    28: 'Elem. Mastery',
    40: 'Pyro DMG%', 41: 'Electro DMG%',
    42: 'Hydro DMG%', 43: 'Dendro DMG%',
    44: 'Anemo DMG%', 45: 'Geo DMG%',
    46: 'Cryo DMG%',
};

/**
 * Compress avatar data into minimal token format.
 * Format: {n:name, l:level, r:rarity, c:constellation, e:element, w:"WeaponName R3 Lv90", art:"SetAbbrev"}
 * This cuts token usage by ~80% compared to full artifact sub-stat dumps.
 */
function cleanAvatarsForAI(avatars) {
    return avatars.map((av) => {
        const d = {
            n: av.name,
            l: av.level,
            r: av.rarity,
            c: av.actived_constellation_num ?? 0,
            e: av.element,
        };
        if (av.weapon) {
            const w = av.weapon;
            d.w = `${w.name} R${w.affix_level} Lv${w.level}`;
        }
        if (av.relics?.length) {
            // Detect set bonuses using the proper set.name field
            const setCounts = {};
            av.relics.forEach((relic) => {
                const setName = relic.set?.name || 'Unknown';
                setCounts[setName] = (setCounts[setName] || 0) + 1;
            });
            const sorted = Object.entries(setCounts).sort((a, b) => b[1] - a[1]);
            if (sorted[0]?.[1] >= 4) {
                d.art = `${sorted[0][0]}4`;
            } else if (sorted[0]?.[1] >= 2 && sorted[1]?.[1] >= 2) {
                d.art = `${sorted[0][0]}2+${sorted[1][0]}2`;
            } else if (sorted[0]?.[1] >= 2) {
                d.art = `${sorted[0][0]}2`;
            } else {
                d.art = 'mixed';
            }
            // Add key main stats (sands/goblet/circlet) as compact string
            const keySlots = av.relics.filter(r => r.pos >= 3 && r.main_property);
            if (keySlots.length) {
                d.ms = keySlots.map(r => PROP_NAME[r.main_property.property_type] || '?').join('/');
            }
        }
        return d;
    });
}

const JSON_FORMAT = `{
  "team_recommendations": [
    {
      "team_name": "Takım İsmi",
      "characters": ["C1","C2","C3","C4"],
      "damage_type": "Reaksiyon",
      "estimated_dps": 85000,
      "reasoning": "Kısa analiz (2-3 cümle, Türkçe)",
      "rotation_guide": "E>Q sırası",
      "alternative_substitute": "Alt karakter"
    }
  ]
}`;

// ── Shared CoT + Fallback instructions ──

const COT_INSTRUCTION = `
Düşünce Zinciri (Chain of Thought) — JSON döndürmeden ÖNCE arka planda şu adımları sırasıyla uygula:

VERİ FORMATI: n=name, l=level, r=rarity, c=constellation, e=element, w=weapon, art=artifact set (4=4pc, 2+2=2pc combo), ms=main stats (sands/goblet/circlet)

ADIM 1: Tüm karakterlerden en yüksek yatırıma sahip (l:level, r:rarity, c:constellation) ilk 10 karakteri seç.
ADIM 2: Bu 10 karakter arasındaki en güçlü element reaksiyonlarını (Hyperbloom, Vaporize, Melt, Aggravate, Burgeon vb.) tespit et.
ADIM 3: ÖNEMLİ — Özel mekanizmalı karakterleri kontrol et:
  - Chasca: Nightsoul mermisi farklı elementlerden tetiklenir → takımda EN AZ 3 FARKLI element ŞART
  - Columbina: HP drain mekanizması → healer partner gerekir
  - Lauma/Citlali gibi yeni karakterler: element gereksinimlerini özel olarak doğrula
  - Chiori: Geo construct synergy → Zhongli/Albedo ile güçlenir
ADIM 4: Enerji döngüsünü doğrula — Xiangling(80), Beidou(80), Faruzan(80) gibi yüksek burst maliyetli karakterlerin yanında aynı elementten Battery var mı?
ADIM 5: Set bonuslarını art alanından kontrol et (4=4pc aktif, 2+X2=2pc combo). ms alanından doğru main stat mı bakıldığını doğrula.
ADIM 6: Tüm bu analizlerden sonra takımı JSON olarak döndür.
Bu adımları yalnızca arka planda yap, JSON çıktısına EKLEME.`;

const FALLBACK_INSTRUCTION = `
Eksik Veri Kuralı: Eğer bir karakterin veya eserin verisi eksikse, modelin güncel veri tabanında o karakterin pasifleri tam tanımlı değilse, veya karakter çok yeni ise — o karakteri "Düşük Güven" olarak değerlendir ve varsa en bilindik Meta takımlara yönel. reasoning alanında "(düşük güven — veri eksik)" notu ekle.`;

const NEGATIVE_CONSTRAINTS = `
YASAK KURALLAR (bunları kesinlikle ihlal etme):
1. AYNI ELEMENTTEN 4 KARAKTER: Aynı elementten 4 karakteri asla aynı takıma koyma. Mono-element takımı SADECE o element için özel bir mekanik varsa (orn: Mono Geo Itto + Gorou) kabul edilir, aksi halde yasak.
2. BATTERY EKSİKLİĞİ: Enerji ihtiyacı yüksek karakterlerin (Xiangling 80, Beidou 80, Faruzan 80, Xiao 70 vb.) yanına aynı elementten bir Battery (enerji üreten) karakter koymadıysan o takımı ÖNERME. Örn: Xiangling varsa Bennett veya başka Pyro olmalı.
3. CHASCA/ÖZEL MERMİ MEKANİĞİ: Chasca gibi farklı elementlerden mermi atan karakterlerde "Anemo Rezonansı" yerine "Element Çeşitliliği" bonusunu önceliklendir. Takımda en az 3 FARKLI element olmalı.
4. İKİ MAIN DPS: Aynı takıma 2 Main DPS (ikisi de field time isteyen) koyma. Biri Main DPS, diğeri Sub DPS veya Support olmalı.
5. İYİLEŞTİRME EKSİKLİĞİ: Saf hasar takımı kururken bile en az 1 şifacı/kalkancı (healer/shielder) bulundur, yoksa o takımı önerme.`;

// ── Prompts for each mode ──

const PROMPT_GENERAL = `Sen dünyanın en iyi Genshin Impact Theorycrafter uzmanısın. Şu an 2026 yılındayız. Güncel meta bilgilerine göre analiz yap.
${COT_INSTRUCTION}
${FALLBACK_INSTRUCTION}
${NEGATIVE_CONSTRAINTS}

Analiz Kriterlerin:
- Elemental Reaksiyonlar (Vaporize, Melt, Hyperbloom, Aggravate vb.)
- Sinerji ve Bufflar (Bennett ATK, Kazuha elem DMG, Furina fanfar vb.)
- Yadigâr Kalitesi (Crit Rate/DMG, EM, Set Bonus)
- Enerji Yönetimi (Battery kontrolü)

Görev: Kullanıcının verisiyle EN YÜKSEK HASAR VEREN TAM OLARAK {TEAM_COUNT} FARKLI TAKIM kur. Takım sayısı kesinlikle {TEAM_COUNT} olmalı, ne eksik ne fazla.
estimated_dps alanına sayısal DPS miktarı yaz (örn: 45000, 80000, 150000).
Kısa ve öz yaz. JSON kesilmesin.
Yanıt sadece JSON: ${JSON_FORMAT}`;

const PROMPT_CHARACTER = `Sen dünyanın en iyi Genshin Impact Theorycrafter uzmanısın. Şu an 2026 yılındayız. Güncel meta bilgilerine göre analiz yap.
${COT_INSTRUCTION}
${FALLBACK_INSTRUCTION}
${NEGATIVE_CONSTRAINTS}

Görev: Kullanıcının belirttiği KARAKTERİ MUTLAKA İÇEREN TAM OLARAK {TEAM_COUNT} FARKLI TAKIM oluştur. Takım sayısı kesinlikle {TEAM_COUNT} olmalı.
Seçilen karakter her takımda OLMALI. Diğer 3 slotu onun sinerjisine göre doldur.

Analiz Kriterlerin:
- Seçilen karakterin element reaksiyonları ve rolü (Main DPS / Sub DPS / Support)
- En iyi sinerji partnerleri
- Özel mekanizmalar (Chasca farklı element, Chiori Geo construct, Furina fanfare vb.)
- Yadigâr kalitesine göre kimin daha güçlü olduğu
- Enerji yönetimi

estimated_dps alanına sayısal DPS miktarı yaz (örn: 45000, 80000, 150000).
Kısa ve öz yaz. JSON kesilmesin.
Yanıt sadece JSON: ${JSON_FORMAT}`;

const PROMPT_ABYSS = `Sen dünyanın en iyi Genshin Impact Theorycrafter ve Spiral Abyss uzmanısın. Şu an 2026 yılındayız. Güncel meta bilgilerine göre analiz yap.
${COT_INSTRUCTION}
${FALLBACK_INSTRUCTION}
${NEGATIVE_CONSTRAINTS}

ÖNEMLİ: Google Search ile güncel Spiral Abyss bilgilerini ara. Şu anki ve bir sonraki rotasyondaki düşman tiplerini, element gereksinimlerini ve buff/debuff bilgilerini bul.

Görev: Kullanıcının karakterleriyle Spiral Abyss Floor 12 (tüm odalar) için TAM OLARAK {TEAM_COUNT} FARKLI TAKIM kur. Takım sayısı kesinlikle {TEAM_COUNT} olmalı.
Her takımda 4 karakter olacak. Aynı karakter farklı takımlarda kullanılabilir ama aynı Half içinde olamaz.
Half 1 ve Half 2 olarak ayır. Düşman tiplerini ve element shield gereksinimlerini göz önünde bulundur.

Ekstra JSON alanı: Her takımda "abyss_half": "1" veya "2" belirt.
estimated_dps alanına sayısal DPS miktarı yaz (örn: 45000, 80000, 150000).
Ayrıca "meta_source" alanında hangi kaynaktan/tarihten bilgi aldığını yaz.

Kısa ve öz yaz. JSON kesilmesin.
Yanıtı SADECE JSON olarak ver, başka metin ekleme: ${JSON_FORMAT}`;

const RATE_JSON_FORMAT = `{
  "score": 8.5,
  "grade": "A",
  "strengths": ["Güçlü yön 1", "Güçlü yön 2"],
  "weaknesses": ["Zayıf yön 1"],
  "suggestion": {
    "replace": "Karakter Adi",
    "with": "Önerilen Karakter",
    "reason": "Neden"
  },
  "verdict": "1-2 cümle genel değerlendirme"
}`;

const PROMPT_RATE = `Sen dünyanın en iyi Genshin Impact Theorycrafter uzmanısın. Şu an 2026 yılındayız.
${COT_INSTRUCTION}
${NEGATIVE_CONSTRAINTS}

Görev: Kullanıcının kurduğu 4 kişilik takımı analiz et ve PUANLA.

Puanlama Kriterleri (her biri 0-10):
1. Element Sinerjisi — Reaksiyon potansiyeli, element çeşitliliği
2. Rol Dağılımı — Main DPS, Sub DPS, Support, Healer/Shielder dengesi
3. Enerji Döngüsü — Battery yeterliliği, burst maliyetleri
4. Yadigâr Uyumu — Set bonusları, main stat uygunluğu
5. Yatırım Seviyesi — Level, constellation, weapon refinement

Genel skor: 10 üzerinden (0.5 hassasiyetinde). Harf notu: S(9.5+), A(8-9.5), B(6.5-8), C(5-6.5), D(<5)

Eğer takım zaten optimal seviyedeyse, suggestion alanını null yap ve verdict'te "Bu takım zaten çok güçlü" yaz.
Eğer iyileştirilebilirse, kullanıcının MEVCUT karakter havuzundan bir değişiklik öner.

Yanıt sadece JSON: ${RATE_JSON_FORMAT}`;

/**
 * Generic Gemini call with optional Google Search grounding
 */
async function callGemini(systemPrompt, userMessage, useGrounding = false, teamCount = 2) {
    const fullPrompt = systemPrompt.replaceAll('{TEAM_COUNT}', String(teamCount));

    const body = {
        system_instruction: { parts: [{ text: fullPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
            temperature: 0.1,
            topP: 0.1,
            maxOutputTokens: 8192,
        },
    };

    // Google Search grounding is incompatible with responseMimeType: 'application/json'
    if (useGrounding) {
        body.tools = [{ google_search: {} }];
    } else {
        body.generationConfig.responseMimeType = 'application/json';
    }

    // Single attempt — no retry loop to avoid burning free-tier quota
    const doRequest = async () => {
        const apiKey = store.get('gemini_api_key');
        if (!apiKey) throw new Error('Gemini API Key ayarlanmadı. Ayarlar sayfasından API Key girin.');
        const response = await axios.post(getGeminiUrl(), body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000,
        });

        const candidate = response.data?.candidates?.[0];
        if (!candidate) throw new Error('Gemini yanıt vermedi.');

        // Combine all text parts (grounding responses can have multiple parts)
        let text = (candidate.content?.parts || [])
            .filter(p => p.text)
            .map(p => p.text)
            .join('\n');

        // Extract grounding metadata if available
        const groundingMeta = candidate.groundingMetadata;
        let sources = [];
        if (groundingMeta?.groundingChunks) {
            sources = groundingMeta.groundingChunks
                .filter((c) => c.web)
                .map((c) => ({ title: c.web.title, url: c.web.uri }));
        }

        // Robust JSON extraction — try multiple strategies
        let jsonStr = text;

        // Strategy 1: code fence
        const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
        if (fenceMatch) {
            jsonStr = fenceMatch[1].trim();
        } else {
            // Strategy 2: find outermost { ... } that contains "team_recommendations"
            const teamIdx = text.indexOf('team_recommendations');
            if (teamIdx !== -1) {
                // Walk backwards to find opening brace
                let braceStart = text.lastIndexOf('{', teamIdx);
                if (braceStart !== -1) {
                    // Walk forward to find matching closing brace
                    let depth = 0;
                    let braceEnd = -1;
                    for (let i = braceStart; i < text.length; i++) {
                        if (text[i] === '{') depth++;
                        else if (text[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } }
                    }
                    if (braceEnd !== -1) jsonStr = text.substring(braceStart, braceEnd + 1);
                }
            } else {
                // Strategy 3: first { to last }
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    jsonStr = text.substring(firstBrace, lastBrace + 1);
                }
            }
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            // Try to repair truncated JSON
            let repaired = jsonStr
                .replace(/,\s*$/, '')
                .replace(/"[^"]*$/, '"')
                .replace(/,\s*"[^"]*$/, '');
            const stack = [];
            for (const ch of repaired) {
                if (ch === '{') stack.push('}');
                else if (ch === '[') stack.push(']');
                else if (ch === '}' || ch === ']') stack.pop();
            }
            repaired += stack.reverse().join('');
            try {
                parsed = JSON.parse(repaired);
            } catch {
                const preview = text.length > 400 ? text.substring(0, 400) + '…' : text;
                throw new Error(`Gemini geçersiz JSON döndürdü:\n${preview}`);
            }
        }

        return {
            teams: parsed.team_recommendations ?? [],
            metaSource: parsed.meta_source || null,
            sources,
        };
    };

    try {
        return await doRequest();
    } catch (err) {
        const msg = err.response?.data?.error?.message || err.message || '';

        // If grounding caused the error, retry once without it
        if (useGrounding && (msg.includes('Tool use') || msg.includes('google_search') || msg.includes('grounding'))) {
            delete body.tools;
            body.generationConfig.responseMimeType = 'application/json';
            return await doRequest();
        }

        throw err;
    }
}

// ── Mode: General team build ──
ipcMain.handle('gemini:general', async (_e, { avatars, teamCount }) => {
    try {
        if (!avatars?.length) return { error: 'Önce karakter verilerini çek.' };
        const cleaned = cleanAvatarsForAI(avatars);
        const result = await callGemini(PROMPT_GENERAL, JSON.stringify(cleaned), false, teamCount || 2);
        return result;
    } catch (err) {
        const msg = err.response?.data?.error?.message || err.message || String(err);
        return { error: `Gemini API hatası: ${msg}` };
    }
});

// ── Mode: Character-specific team build ──
ipcMain.handle('gemini:character', async (_e, { avatars, characterName, teamCount }) => {
    try {
        if (!avatars?.length) return { error: 'Önce karakter verilerini çek.' };
        const cleaned = cleanAvatarsForAI(avatars);
        const msg = `Seçilen karakter: ${characterName}\n\nKarakter havuzum:\n${JSON.stringify(cleaned)}`;
        const result = await callGemini(PROMPT_CHARACTER, msg, false, teamCount || 3);
        return result;
    } catch (err) {
        const msg2 = err.response?.data?.error?.message || err.message || String(err);
        return { error: `Gemini API hatası: ${msg2}` };
    }
});

// ── Mode: Abyss team build (with Google Search grounding) ──
ipcMain.handle('gemini:abyss', async (_e, { avatars, patchVersion, teamCount }) => {
    try {
        if (!avatars?.length) return { error: 'Önce karakter verilerini çek.' };
        const cleaned = cleanAvatarsForAI(avatars);
        const today = new Date().toISOString().split('T')[0];
        const msg = `Bugünün tarihi: ${today}\nGenshin Impact Patch: ${patchVersion}\n\nİnternette "${patchVersion} spiral abyss floor 12 guide" ve "${patchVersion} abyss enemy lineup" araması yap.\nGüncel Spiral Abyss düşman listesini ve tavsiye edilen elementleri bul.\n\nKarakter havuzum:\n${JSON.stringify(cleaned)}`;
        const result = await callGemini(PROMPT_ABYSS, msg, true, teamCount || 2);
        return result;
    } catch (err) {
        const msg2 = err.response?.data?.error?.message || err.message || String(err);
        return { error: `Gemini API hatası: ${msg2}` };
    }
});

// ── Keep old handler as alias for backward compat ──
ipcMain.handle('gemini:team-build', async (_e, avatars) => {
    try {
        if (!avatars?.length) return { error: 'Önce karakter verilerini çek.' };
        const cleaned = cleanAvatarsForAI(avatars);
        const result = await callGemini(PROMPT_GENERAL, JSON.stringify(cleaned), false, 2);
        return { ...result };
    } catch (err) {
        const msg = err.response?.data?.error?.message || err.message || String(err);
        return { error: `Gemini API hatası: ${msg}` };
    }
});

// ── Mode: Rate a user-built team ──
ipcMain.handle('gemini:rate', async (_e, { avatars, team }) => {
    try {
        if (!team?.length) return { error: 'Takım boş. En az 1 karakter seçin.' };
        const cleaned = cleanAvatarsForAI(avatars);
        const teamNames = team.map(t => t.name || t);
        const msg = `Değerlendirilecek takım: ${JSON.stringify(teamNames)}\n\nTüm karakter havuzum (alternatif önerirken buradan seç):\n${JSON.stringify(cleaned)}`;

        const apiKey = store.get('gemini_api_key');
        if (!apiKey) return { error: 'Gemini API Key ayarlanmadı. Ayarlar sayfasından API Key girin.' };

        const body = {
            system_instruction: { parts: [{ text: PROMPT_RATE }] },
            contents: [{ role: 'user', parts: [{ text: msg }] }],
            generationConfig: {
                temperature: 0.1,
                topP: 0.1,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
        };

        const response = await axios.post(getGeminiUrl(), body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000,
        });

        const candidate = response.data?.candidates?.[0];
        if (!candidate) return { error: 'Gemini yanıt vermedi.' };

        let text = (candidate.content?.parts || []).filter(p => p.text).map(p => p.text).join('\n');
        let jsonStr = text;
        const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
        if (fenceMatch) jsonStr = fenceMatch[1].trim();
        else {
            const f = text.indexOf('{'), l = text.lastIndexOf('}');
            if (f !== -1 && l > f) jsonStr = text.substring(f, l + 1);
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            // Try to repair truncated JSON by closing open strings/arrays/objects
            let repaired = jsonStr
                .replace(/,\s*$/, '')           // trailing comma
                .replace(/"[^"]*$/, '"')         // close unterminated string
                .replace(/,\s*"[^"]*$/, '');     // remove last incomplete key-value
            // Count and close open brackets
            const opens = (repaired.match(/[\[{]/g) || []);
            const closes = (repaired.match(/[\]}]/g) || []);
            let need = opens.length - closes.length;
            // Close in reverse order of opens
            const stack = [];
            for (const ch of repaired) {
                if (ch === '{') stack.push('}');
                else if (ch === '[') stack.push(']');
                else if (ch === '}' || ch === ']') stack.pop();
            }
            repaired += stack.reverse().join('');
            try {
                parsed = JSON.parse(repaired);
            } catch (e2) {
                const preview = text.length > 400 ? text.substring(0, 400) + '…' : text;
                throw new Error(`Gemini geçersiz JSON döndürdü:\n${preview}`);
            }
        }
        return { rating: parsed };
    } catch (err) {
        const msg = err.response?.data?.error?.message || err.message || String(err);
        return { error: `Gemini API hatası: ${msg}` };
    }
});
