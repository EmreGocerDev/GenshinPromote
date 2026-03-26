/**
 * Genshin Promote — Ana Giriş Noktası
 *
 * Kullanım:
 *   1. .env.example → .env olarak kopyala
 *   2. .env içindeki değerleri doldur
 *   3. npm install
 *   4. node index.js
 */

require('dotenv').config();
const chalk = require('chalk');
const { getIndex, getCharacterDetails } = require('./lib/api');
const {
    printAccountSummary,
    printAllCharacters,
    printCharacterTable,
    printError,
} = require('./lib/display');

// ── Ortam değişkeni doğrulama ────────────────────────────────────────────────
const REQUIRED_VARS = ['LTOKEN_V2', 'LTUID_V2', 'GENSHIN_UID', 'COOKIE_TOKEN_V2'];
const PLACEHOLDER_RE = /^buraya_|^SENIN_|^xxxx|^yyyy|^zzzz/i;

const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error(
        chalk.red('\n✖  Eksik ortam değişkeni:'),
        missing.join(', '),
        chalk.yellow('\n   .env dosyasına ilgili değerleri gir.\n')
    );
    process.exit(1);
}

const placeholderVars = REQUIRED_VARS.filter((k) => PLACEHOLDER_RE.test(process.env[k]));
if (placeholderVars.length > 0) {
    console.error(
        chalk.red('\n✖  Hâlâ şablon değeri içeren değişkenler:'),
        placeholderVars.join(', ')
    );
    console.error(chalk.yellow('   .env dosyasındaki placeholder değerleri gerçek cookie değerleriyle değiştir.'));
    console.error(chalk.yellow('   Chrome/Edge → hoyolab.com → F12 → Application → Cookies → ltuid_v2 değerini kopyala.\n'));
    process.exit(1);
}

// Cookie string'i oluştur — cookie_token_v2 dahil
const _parts = [
    `ltoken_v2=${process.env.LTOKEN_V2}`,
    `ltuid_v2=${process.env.LTUID_V2}`,
    `cookie_token_v2=${process.env.COOKIE_TOKEN_V2}`,
    // account_id_v2 = ltuid_v2 ile aynıdır; /character endpoint'i için gerekli
    `account_id_v2=${process.env.LTUID_V2}`,
];
// Opsiyonel ek cookie'ler
if (process.env.ACCOUNT_ID_V2 && !PLACEHOLDER_RE.test(process.env.ACCOUNT_ID_V2)) {
    _parts.push(`account_id_v2=${process.env.ACCOUNT_ID_V2}`);
}
const COOKIE = _parts.join('; ') + ';';

const UID    = process.env.GENSHIN_UID;
const SERVER = process.env.GENSHIN_SERVER ?? 'os_euro';

// ── Ana akış ────────────────────────────────────────────────────────────────
async function main() {
    console.log(chalk.bold.cyan('\n  Genshin Promote — HoYoLAB Veri Çekici'));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log(chalk.gray(`  UID    : ${UID}`));
    console.log(chalk.gray(`  Sunucu : ${SERVER}\n`));

    // 1. Hesap özeti + hızlı karakter listesi
    console.log(chalk.gray('  [1/3] Hesap özeti alınıyor...'));
    const indexData = await getIndex(UID, SERVER, COOKIE);

    printAccountSummary(indexData, UID, SERVER);

    // 2. Tüm karakter ID'lerini topla
    const basicAvatars = indexData.avatars ?? [];
    if (basicAvatars.length === 0) {
        console.log(chalk.yellow('\n  Hesapta karakter bulunamadı veya profil gizli.'));
        return;
    }

    const characterIds = basicAvatars.map((a) => a.id);

    // 3. Detaylı karakter verisini çek (silah + eser)
    console.log(chalk.gray(`\n  [2/3] ${characterIds.length} karakter için detaylı veri alınıyor...`));
    const { avatars: detailedAvatars, propertyMap } = await getCharacterDetails(UID, SERVER, COOKIE, characterIds);

    // Seviyeye göre sırala (en yüksek önce)
    detailedAvatars.sort((a, b) => b.level - a.level || b.rarity - a.rarity);

    // 4. Ekrana bas
    console.log(chalk.gray('  [3/3] Sonuçlar yazdırılıyor...\n'));

    printCharacterTable(detailedAvatars);
    printAllCharacters(detailedAvatars, propertyMap);

    console.log(chalk.bold.green('\n  ✔  Tamamlandı.\n'));
}

main().catch((err) => {
    printError(err);
    process.exit(1);
});
