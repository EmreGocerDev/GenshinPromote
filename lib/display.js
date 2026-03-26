/**
 * Terminal çıktı biçimlendirme modülü
 * Chalk v4 (CommonJS) kullanılır.
 */

const chalk = require('chalk');

// ─────────────────────────────────────────────
//  Yardımcı sabitler
// ─────────────────────────────────────────────
const ELEMENT_COLORS = {
    Pyro:     chalk.hex('#FF6B35'),
    Hydro:    chalk.hex('#4FAFFF'),
    Anemo:    chalk.hex('#74C69D'),
    Electro:  chalk.hex('#C77DFF'),
    Dendro:   chalk.hex('#70E000'),
    Cryo:     chalk.hex('#A8DADC'),
    Geo:      chalk.hex('#FFD166'),
};

const RARITY_STARS = {
    5: chalk.hex('#FFD700'),
    4: chalk.hex('#C77DFF'),
    3: chalk.hex('#4FAFFF'),
    2: chalk.hex('#74C69D'),
    1: chalk.white,
};

const ARTIFACT_SLOTS = {
    1: 'Çiçek',
    2: 'Tüy',
    3: 'Kum Saati',
    4: 'Kupa',
    5: 'Taç',
};

const WEAPON_TYPES = {
    1: 'Kılıç', 10: 'Kataliz', 11: 'Büyük Kılıç', 12: 'Yay', 13: 'Mızrak',
};

// ─────────────────────────────────────────────
//  Küçük yardımcılar
// ─────────────────────────────────────────────

/** n yıldız karakteri döndürür */
function stars(n) {
    const fn = RARITY_STARS[n] ?? chalk.white;
    return fn('★'.repeat(n));
}

/** Eleman adını renkli döndürür */
function colorElement(elem) {
    const fn = ELEMENT_COLORS[elem] ?? chalk.white;
    return fn(elem ?? 'Bilinmiyor');
}

/** Bölüm başlığı çizer */
function sectionHeader(title) {
    const line = '═'.repeat(68);
    console.log('\n' + chalk.cyan(`╔${line}╗`));
    console.log(chalk.cyan('║') + chalk.bold.white(` ${title}`.padEnd(68)) + chalk.cyan('║'));
    console.log(chalk.cyan(`╚${line}╝`));
}

/** İnce ayırıcı çizer */
function divider() {
    console.log(chalk.gray('  ' + '─'.repeat(64)));
}

// ─────────────────────────────────────────────
//  Genel hesap özeti
// ─────────────────────────────────────────────
function printAccountSummary(indexData, uid, server) {
    const s = indexData.stats;
    sectionHeader(`🎮  Hesap Özeti  —  UID: ${uid}  |  Sunucu: ${server}`);

    const rows = [
        ['Aktif Gün',          s.active_day_number],
        ['Başarım',            s.achievement_number],
        ['Karakter Sayısı',    s.avatar_number],
        ['Spiral Abyss',       s.spiral_abyss],
        ['Waypoint Kilidi',    s.way_point_number],
        ['Alan Kilidi',        s.domain_number],
        ['Kazılmış Sandık',    `${s.common_chest_number + s.exquisite_chest_number + s.precious_chest_number + s.luxurious_chest_number}`],
        ['Anemoculus',         s.anemoculus_number],
        ['Geoculus',           s.geoculus_number],
        ['Electroculus',       s.electroculus_number],
        ['Dendroculus',        s.dendroculus_number],
        ['Hydroculus',         s.hydroculus_number],
    ];

    const half = Math.ceil(rows.length / 2);
    for (let i = 0; i < half; i++) {
        const left  = rows[i];
        const right = rows[i + half];
        const lStr = chalk.gray(`  ${left[0]}:`.padEnd(24)) + chalk.yellow(String(left[1]).padEnd(12));
        const rStr = right
            ? chalk.gray(`${right[0]}:`.padEnd(22)) + chalk.yellow(String(right[1]))
            : '';
        console.log(lStr + rStr);
    }
}

// ─────────────────────────────────────────────
//  Stat property_type → İngilizce ad haritasi
//  (API property_map Çince isim döndürür; burada sabit İngilizce kullanıyız)
// ─────────────────────────────────────────────
const PROP_NAME = {
    1:  'HP',             2:  'HP',            3:  'HP%',
    4:  'Base ATK',       5:  'ATK',           6:  'ATK%',
    7:  'DEF',            8:  'DEF',           9:  'DEF%',
    20: 'CRIT Rate',      22: 'CRIT DMG',      23: 'Energy Recharge',
    26: 'Healing Bonus',  27: 'Inc. Healing',  28: 'Elem. Mastery',
    29: 'Physical DMG%',
    30: 'Pyro DMG%',      31: 'Electro DMG%',  32: 'Hydro DMG%',
    33: 'Dendro DMG%',    34: 'Anemo DMG%',    35: 'Geo DMG%',
    36: 'Cryo DMG%',
    2000: 'HP (total)',   2001: 'ATK (total)', 2002: 'DEF (total)',
};

/** property_type numarasından okunabilir stat adı üretir */
function propName(type) {
    return PROP_NAME[type] ?? `Prop${type}`;
}

// ─────────────────────────────────────────────
//  Silah bloğu
// ─────────────────────────────────────────────
function printWeapon(weapon) {
    if (!weapon) {
        console.log(chalk.gray('    Silah verisi yok'));
        return;
    }

    const refinement = weapon.affix_level ?? 1;
    const typeName   = weapon.type_name ?? WEAPON_TYPES[weapon.type] ?? 'Silah';

    console.log(
        chalk.bold.magenta(`  ⚔  ${weapon.name}`) +
        chalk.gray(`  (${typeName})`)
    );
    console.log(
        chalk.gray('     ') +
        stars(weapon.rarity ?? 4) +
        chalk.gray('  ') +
        chalk.green(`Lv.${weapon.level}`) +
        chalk.gray('   Refinement: ') +
        chalk.hex('#FFD166')(`R${refinement}`)
    );

    // Ana stat (new format: property_type + final)
    const mainP = weapon.main_property;
    if (mainP) {
        const name = propName(mainP.property_type);
        const val  = mainP.final ?? mainP.value ?? mainP.base ?? '';
        console.log(chalk.gray('     Stat: ') + chalk.white(name.padEnd(22)) + chalk.yellow(val));
    }

    // Alt stat
    const subP = weapon.sub_property;
    if (subP && subP.property_type) {
        const name = propName(subP.property_type);
        const val  = subP.final ?? subP.value ?? subP.base ?? '';
        console.log(chalk.gray('     Alt Stat: ') + chalk.white(name.padEnd(18)) + chalk.cyan(val));
    }
}

// ─────────────────────────────────────────────
//  Eser (Artifact) bloğu
// ─────────────────────────────────────────────
function printReliquary(rel) {
    const slotName = ARTIFACT_SLOTS[rel.pos] ?? rel.pos_name ?? `Slot ${rel.pos}`;
    console.log(
        chalk.bold.hex('#FFD166')(`  ◆ ${slotName}`) +
        chalk.gray(` — ${rel.name}`) +
        chalk.gray(`  [${rel.set?.name ?? ''}]`) +
        chalk.gray(`  Lv.${rel.level}  `) +
        stars(rel.rarity ?? 5)
    );

    // Ana stat (new: property_type + value)
    const main = rel.main_property;
    if (main) {
        const name = propName(main.property_type);
        console.log(
            chalk.gray('    Ana: ') +
            chalk.white(name.padEnd(24)) +
            chalk.yellow(main.value ?? main.final ?? '')
        );
    }

    // Alt statlar (sub_property_list)
    const subs = rel.sub_property_list ?? [];
    if (subs.length > 0) {
        console.log(chalk.gray('    Alt Statlar:'));
        subs.forEach((sp) => {
            const name = propName(sp.property_type).padEnd(24);
            const val  = sp.value ?? sp.final ?? '';
            const roll = sp.times > 0 ? chalk.hex('#FFD166')(` (+${sp.times})`) : '';
            console.log(chalk.gray(`      • `) + chalk.white(name) + chalk.cyan(val) + roll);
        });
    }
}

// ─────────────────────────────────────────────

//  Tek karakter kartı
// ─────────────────────────────────────────────
function printCharacter(avatar, index, total, propertyMap) {
    const elemFn = ELEMENT_COLORS[avatar.element] ?? chalk.white;
    // API actived_constellation_num alanını doğrudan verir
    const c6 = avatar.actived_constellation_num ?? '?';

    console.log('');
    console.log(
        chalk.bold.white(`  [${String(index).padStart(2, '0')}/${total}]  `) +
        chalk.bold(elemFn(`${avatar.element ?? '?'}`)) +
        chalk.bold.white(` · ${avatar.name}`) +
        chalk.gray(`  (ID: ${avatar.id})`)
    );
    console.log(
        chalk.gray('        ') +
        stars(avatar.rarity ?? 5) +
        chalk.gray('   ') +
        chalk.green(`Lv.${avatar.level}`) +
        chalk.gray('   Dostluk: ') +
        chalk.hex('#FF6B35')(`❤ ${avatar.fetter}/10`) +
        chalk.gray('   Takımyıldızı: ') +
        chalk.hex('#C77DFF')(`C${c6}`)
    );

    // Silah
    printWeapon(avatar.weapon);

    // Eserler — yeni yapıda alan adı 'relics'
    const relics = avatar.relics ?? avatar.reliquaries ?? [];
    if (relics.length > 0) {
        console.log('');
        console.log(chalk.gray('  Eserler:'));
        const sorted = [...relics].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
        sorted.forEach((rel) => printReliquary(rel));

        // Set bonusları
        const setMap = {};
        sorted.forEach((rel) => {
            if (rel.set?.name) setMap[rel.set.name] = (setMap[rel.set.name] ?? 0) + 1;
        });
        const bonuses = Object.entries(setMap)
            .filter(([, count]) => count >= 2)
            .map(([name, count]) => `${count}× ${name}`)
            .join('  |  ');
        if (bonuses) {
            console.log('');
            console.log(chalk.gray('  Set Bonusları: ') + chalk.hex('#70E000')(bonuses));
        }
    } else {
        console.log(chalk.gray('  Eser takılı değil.'));
    }

    divider();
}

// ─────────────────────────────────────────────
//  Tüm karakter listesi
// ─────────────────────────────────────────────
function printAllCharacters(avatars, propertyMap) {
    sectionHeader(`🧙  Karakter Detayları  (${avatars.length} karakter)`);
    avatars.forEach((av, i) => printCharacter(av, i + 1, avatars.length, propertyMap));
}

// ─────────────────────────────────────────────
//  İstatistik özeti tablosu
// ─────────────────────────────────────────────
function printCharacterTable(avatars) {
    sectionHeader('📊  Karakter Hızlı Bakış');

    const header =
        chalk.bold.white('  #  ') +
        chalk.bold.white('Karakter'.padEnd(18)) +
        chalk.bold.white('Element'.padEnd(12)) +
        chalk.bold.white('Lv'.padEnd(5)) +
        chalk.bold.white('C#'.padEnd(5)) +
        chalk.bold.white('Dostluk'.padEnd(10)) +
        chalk.bold.white('Silah'.padEnd(22)) +
        chalk.bold.white('S.Lv  R#');

    console.log(header);
    console.log(chalk.gray('  ' + '─'.repeat(90)));

    avatars.forEach((av, i) => {
        const elemFn = ELEMENT_COLORS[av.element] ?? chalk.white;
        const c6     = av.actived_constellation_num ?? '?';
        const wpName = av.weapon?.name ?? '—';
        const wpLv   = av.weapon?.level ?? '—';
        const wpR    = av.weapon?.affix_level ?? '—';

        console.log(
            chalk.gray(`  ${String(i + 1).padStart(2, '0')} `) +
            chalk.white(av.name.padEnd(18)) +
            elemFn((av.element ?? '?').padEnd(12)) +
            chalk.green(String(av.level).padEnd(5)) +
            chalk.hex('#C77DFF')(`C${c6}`.padEnd(5)) +
            chalk.hex('#FF6B35')(`❤${av.fetter}`.padEnd(10)) +
            chalk.magenta(wpName.slice(0, 20).padEnd(22)) +
            chalk.cyan(`${wpLv}`.padEnd(6)) +
            chalk.hex('#FFD166')(`R${wpR}`)
        );
    });
}

// ─────────────────────────────────────────────
//  Hata mesajı
// ─────────────────────────────────────────────
function printError(err) {
    console.error('\n' + chalk.bold.red('✖  HATA:'), chalk.red(err.message));
}

module.exports = {
    printAccountSummary,
    printAllCharacters,
    printCharacterTable,
    printError,
};
