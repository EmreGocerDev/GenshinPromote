/**
 * HoYoLAB Dynamic Secret (DS) Üreteci
 *
 * DS v1 → GET istekleri (hesap özeti vb.)
 *   Algoritma: MD5( "salt=<SALT>&t=<ts>&r=<random>" )
 *
 * DS v2 → POST istekleri (karakter detayları vb.)
 *   Algoritma: MD5( "salt=<SALT>&t=<ts>&r=<random>&b=<bodyJson>&q=<queryStr>" )
 *
 * Salt değerleri HoYoLAB overseas istemci sabitlerinden alınmıştır.
 * Eğer -1 hatası alınırsa salt değeri değişmiş olabilir:
 *   → GitHub'da "hoyolab ds salt" veya "genshin.py constants" ara.
 */

const crypto = require('crypto');

// GET istekleri için v1 salt
const SALT_V1 = '6s2ec5wv464u5p9s8p77v2vpf9teu68z';

// POST istekleri (game_record) için v2 salt
const SALT_V2 = '6s2ec5wv464u5p9s8p77v2vpf9teu68z';

/** 6 haneli alfanümerik random string */
function randomStr() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
}

/**
 * DS v1 — GET istekleri için
 * @returns {string}
 */
function generateDS() {
    const t = Math.floor(Date.now() / 1000);
    const r = randomStr();
    const raw = `salt=${SALT_V1}&t=${t}&r=${r}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex');
    return `${t},${r},${hash}`;
}

/**
 * DS v2 — POST istekleri için (body JSON'u hash'e dahil edilir)
 * @param {string} bodyStr  JSON.stringify(requestBody)
 * @param {string} queryStr URL query parametreleri (ör: "role_id=xxx&server=yyy")
 * @returns {string}
 */
function generateDSv2(bodyStr = '', queryStr = '') {
    const t = Math.floor(Date.now() / 1000);
    const r = randomStr();
    const raw = `salt=${SALT_V2}&t=${t}&r=${r}&b=${bodyStr}&q=${queryStr}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex');
    return `${t},${r},${hash}`;
}

module.exports = { generateDS, generateDSv2 };
