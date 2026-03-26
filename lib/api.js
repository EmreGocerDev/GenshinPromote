/**
 * HoYoLAB Genshin Impact API çağrıları
 *
 * Kullanılan endpoint'ler:
 *   GET  /game_record/genshin/api/index            → Hesap özeti + kısa karakter listesi
 *   POST /game_record/genshin/api/character/detail  → Karakter detayları (silah + eserler)
 */

const axios = require('axios');
const { generateDS } = require('./ds');

const BASE_URL = 'https://bbs-api-os.hoyolab.com/game_record/genshin/api';
const APP_VERSION = '2.34.1';
const REFERER = 'https://act.hoyolab.com';

/** Ortak (salt-bağımsız) header'lar */
function baseHeaders(cookie) {
    return {
        'Cookie': cookie,
        'x-rpc-client_type': '5',
        'x-rpc-app_version': APP_VERSION,
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': REFERER + '/',
        'Origin': REFERER,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'x-rpc-language': 'en-us',
    };
}

/** GET istek header'ları (DS v1) */
function buildHeaders(cookie) {
    return { ...baseHeaders(cookie), 'DS': generateDS() };
}

/** POST istek header'ları */
function buildPostHeaders(cookie) {
    return {
        ...baseHeaders(cookie),
        'DS': generateDS(),
        'Content-Type': 'application/json',
    };
}

/**
 * API yanıtını doğrular; hata varsa açıklayıcı mesajla fırlatır.
 */
function assertOk(data, endpointName) {
    if (data.retcode !== 0) {
        const hints = {
            '-100': 'Cookie geçersiz veya süresi dolmuş. Tarayıcıdan yeni değerleri kopyala.',
            '-1':   [
                'cookie_token_v2 eksik veya yanlış.',
                'F12 → Application → Cookies → hoyolab.com listesinde cookie_token_v2 değerini bul.',
                '.env dosyasında COOKIE_TOKEN_V2=<değer> satırını ekle/güncelle.',
            ].join('\n  → '),
            '10001': 'Cookie eksik veya yanlış.',
            '10102': 'Hesap veya UID gizli. HoYoLAB profilini herkese açık yap.',
        };
        const hint = hints[String(data.retcode)] ?? '';
        throw new Error(
            `[${endpointName}] retcode=${data.retcode} — ${data.message}` +
            (hint ? `\n  → ${hint}` : '')
        );
    }
}

/**
 * Hesap özetini çeker: genel istatistikler + kısa karakter listesi.
 * @returns {{ stats, world_explorations, avatars }}
 */
async function getIndex(uid, server, cookie) {
    const response = await axios.get(`${BASE_URL}/index`, {
        params: { role_id: uid, server },
        headers: buildHeaders(cookie),
        timeout: 12000,
    });
    assertOk(response.data, 'index');
    return response.data.data;
}

/**
 * Karakter detaylarını çeker: silah, eser (relics) ve sub-statlar.
 * /character/detail endpoint'i kullanır ve listeyi düz karakter dizisine dönüştürr.
 * @returns {{ avatars: object[], propertyMap: object }}
 */
async function getCharacterDetails(uid, server, cookie, characterIds) {
    const body = { character_ids: characterIds, role_id: uid, server };
    const bodyStr = JSON.stringify(body);

    const response = await axios.post(
        `${BASE_URL}/character/detail`,
        bodyStr,
        { headers: buildPostHeaders(cookie), timeout: 12000 }
    );
    assertOk(response.data, 'character/detail');

    const data = response.data.data;
    // property_map: { "20": { property_type, name, filter_name }, ... }
    const propertyMap = data.property_map ?? {};

    // list'i düz avatar nesnelerine çevir:
    // base + weapon + relics + aktif constellation sayısı tek objede topla
    const avatars = (data.list ?? []).map((item) => ({
        ...item.base,
        weapon: item.weapon,
        relics: item.relics ?? [],
        constellations: item.constellations ?? [],
        skills: item.skills ?? [],
        selected_properties: item.selected_properties ?? [],
    }));

    return { avatars, propertyMap };
}

module.exports = { getIndex, getCharacterDetails };
