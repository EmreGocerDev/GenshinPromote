<p align="center">
  <img src="assets/logo.png" width="80" alt="logo">
</p>

<h1 align="center">Genshin Promote</h1>
<p align="center">HoYoLAB hesabındaki karakterleri, silahları ve yadigarları gösteren Electron masaüstü uygulaması.<br>Gemini AI ile takım kurma, değerlendirme ve Spiral Abyss analizi özelliği içerir.</p>

---

## Özellikler

- 📋 **Karakterler** — Seviye, constellation, silah, yadigâr seti
- 🗡 **Silahlar** — Tüm silahlar, sahibi, refinement ve seviye
- 🏺 **Yadigarlar** — Slot filtreleme, set bonus tespiti
- 🧠 **AI Takım Kurucu** — Gemini 2.0 ile 3 mod:
  - Genel en iyi takım
  - Seçilen karakter bazlı takım
  - Spiral Abyss Floor 12 takımı (Google Search grounding)
- 🏆 **Takım Değerlendir** — Kurduğun takımı AI'a puanlat, iyileştirme önerisi al

---
## Kurulum 
- Kurulum için (https://drive.google.com/file/d/1sjqFGGVkJwUy0jAWjy1ZWZ8tx9qGoQ42/view?usp=sharing) Exe dosyasını indirebilirsiniz.
---
## Gereksinimler

- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- HoYoLAB hesabı
- [Gemini API Key](https://aistudio.google.com/apikey) (ücretsiz)

---

## Kurulum

```bash
# Repoyu klonla
git clone https://github.com/KULLANICI_ADIN/genshinPromote.git
cd genshinPromote

# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

---

## İlk Kullanım

### 1. Cookie Bilgilerini Al

1. Chrome/Edge'de [hoyolab.com](https://www.hoyolab.com) adresine gir ve giriş yap
2. **F12** → **Application** → **Cookies** → `hoyolab.com`
3. Şu değerleri kopyala:

| Cookie | Açıklama |
|--------|----------|
| `ltoken_v2` | Oturum jetonu (uzun string) |
| `ltuid_v2` | HoYoLAB hesap numarası |
| `cookie_token_v2` | İkincil token |

### 2. Gemini API Key Al

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresine git
2. **"Create API Key"** tıkla — ücretsiz, günlük 1500 istek hakkı var

### 3. Uygulamada Ayarları Doldur

Uygulamayı aç → ⚙ **Ayarlar** sekmesi:
- `ltoken_v2`, `ltuid_v2`, `cookie_token_v2` alanlarını doldur
- Genshin UID'ini gir (oyun içi Paimon Menüsü → Profil → UID)
- Sunucunu seç (Avrupa/Amerika/Asya)
- Gemini API Key'i gir
- **💾 Kaydet**'e tıkla

---

## GitHub'a Yükleme

### İlk Kez Yüklemek İçin

**1. GitHub'da yeni repo oluştur**
1. [github.com](https://github.com) → Sağ üstte **"+"** → **"New repository"**
2. Repository name: `genshinPromote`
3. Public veya Private — istediğini seç
4. **"Create repository"** tıkla

**2. Terminalde şu komutları sırayla çalıştır** (W:\genshinPromote klasöründe):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/genshinPromote.git
git push -u origin main
```

> `KULLANICI_ADIN` kısmını kendi GitHub kullanıcı adınla değiştir!

### Sonraki Güncellemeleri Push Etmek İçin

```bash
git add .
git commit -m "Açıklama yaz buraya"
git push
```

### Git Kurulu Değilse

1. [git-scm.com](https://git-scm.com/download/win) adresinden indir ve kur
2. Kurulumdan sonra terminali **kapatıp tekrar aç**
3. `git --version` yazarak kurulumu doğrula

---

## Güvenlik

> ⚠️ **ÖNEMLİ:** `.env` dosyası `.gitignore`'a eklenmiştir ve GitHub'a yüklenmez.
> Cookie bilgilerini ve API key'ini asla paylaşma.
> Uygulamayı sadece kendi hesabın için kullan.

---

## Proje Yapısı

```
genshinPromote/
├── electron/
│   ├── main.js         ← Ana Electron process, Gemini API, IPC
│   └── preload.js      ← Güvenli köprü (contextBridge)
├── renderer/
│   ├── index.html      ← Uygulama arayüzü
│   ├── renderer.js     ← Frontend mantığı
│   └── style.css       ← Genshin temalı tasarım
├── lib/
│   ├── api.js          ← HoYoLAB API çağrıları
│   ├── ds.js           ← Dynamic Secret üreteci
│   └── display.js      ← CLI görselleştirme
├── assets/
│   └── logo.svg
├── package.json
└── README.md
```

---

## Bağımlılıklar

| Paket | Amaç |
|-------|------|
| `electron` | Masaüstü pencere |
| `electron-store` | Ayarları kalıcı sakla |
| `axios` | HTTP istekleri |
| `chalk` | Renkli CLI çıktısı |
| `dotenv` | .env yükleme |


---

## Proje Yapısı

```
genshinPromote/
├── index.js            ← Ana giriş noktası
├── lib/
│   ├── api.js          ← HoYoLAB API çağrıları
│   ├── ds.js           ← Dynamic Secret üreteci
│   └── display.js      ← Terminal görselleştirme (chalk)
├── .env                ← KİMSEYLE PAYLAŞMA! (cookie'lerin buraya girer)
├── .env.example        ← Örnek şablon
├── .gitignore
├── package.json
└── README.md
```

---

## Ön Koşullar

- **Node.js 18+** → https://nodejs.org/
- **npm** (Node.js ile birlikte gelir)

---

## Adım 1 — Kimlik Bilgilerini Almak

HoYoLAB'da oturum açık cookie'lerin olmadan API hiçbir veri vermez. Şu adımları izle:

### 1.1 Tarayıcıda HoYoLAB'a giriş yap

1. Chrome veya Edge'i aç.
2. [https://www.hoyolab.com](https://www.hoyolab.com) adresine git.
3. Hesabınla giriş yap.

### 1.2 Cookie'leri kopyala

1. Sayfada **F12** → **Application** sekmesine tıkla.
2. Sol panelde **Storage → Cookies** → `https://www.hoyolab.com` seç.
3. Listede şu iki satırı bul:

| Cookie Adı    | Açıklama                             |
|---------------|--------------------------------------|
| `ltoken_v2`   | Uzun oturum jetonu (büyük ihtimalle 900+ karakter) |
| `ltuid_v2`    | HoYoLAB hesap numarası (rakamsal)    |

> ⚠️ `ltoken_v2` yerine sadece `ltoken` varsa onu kullan, `.env` dosyasındaki değişken adını değiştirmeye gerek yok — sadece değeri yapıştır.

4. Her birinin **Value** sütunundaki değeri kopyala.

### 1.3 Genshin UID'ini bul

Oyun içinde **Paimon Menüsü → Profil → UID** değeri (genellikle 9 haneli).

---

## Adım 2 — Kurulum

```powershell
# Proje klasörüne gir
cd w:\genshinPromote

# Bağımlılıkları yükle
npm install

# Şablonu kopyala
Copy-Item .env.example .env
```

---

## Adım 3 — .env Dosyasını Düzenleme

`.env` dosyasını herhangi bir metin editörüyle aç ve şu satırları doldur:

```env
LTOKEN_V2=buraya_ltoken_v2_degerini_yapistir
LTUID_V2=buraya_ltuid_v2_degerini_yapistir

# Oyun içindeki UID'in
GENSHIN_UID=712345678

# Sunucu seçenekleri:
#   os_euro  → Avrupa
#   os_usa   → Amerika
#   os_asia  → Asya
#   os_cht   → TW/HK/MO
GENSHIN_SERVER=os_euro
```

---

## Adım 4 — Çalıştırma

```powershell
node index.js
```

veya

```powershell
npm start
```

---

## Örnek Çıktı

```
  Genshin Promote — HoYoLAB Veri Çekici
  ─────────────────────────────────────────
  UID    : 712345678
  Sunucu : os_euro

  [1/3] Hesap özeti alınıyor...

╔════════════════════════════════════════════════════════════════════╗
║ 🎮  Hesap Özeti  —  UID: 712345678  |  Sunucu: os_euro            ║
╚════════════════════════════════════════════════════════════════════╝
  Aktif Gün:              712         Anemoculus:     66
  Başarım:                987         Geoculus:       131
  Karakter Sayısı:        63          Electroculus:   181
  Spiral Abyss:           12-3        Dendroculus:    271
  ...

╔════════════════════════════════════════════════════════════════════╗
║ 📊  Karakter Hızlı Bakış                                          ║
╚════════════════════════════════════════════════════════════════════╝
  01  Hu Tao           Pyro       90   C1   ❤10  Staff of Homa         90    R1
  02  Raiden Shogun    Electro    90   C2   ❤10  Engulfing Lightning   90    R1
  ...

╔════════════════════════════════════════════════════════════════════╗
║ 🧙  Karakter Detayları  (63 karakter)                             ║
╚════════════════════════════════════════════════════════════════════╝

  [01/63]  Pyro · Hu Tao  (ID: 10000046)
            ★★★★★   Lv.90   Dostluk: ❤ 10/10   Takımyıldızı: C1
  ⚔  Staff of Homa  (Mızrak)
     ★★★★★  Lv.90/90   Refinement: R1
     Alt Stat: CRIT DMG% → 66.2%

  Eserler:
  ◆ Çiçek — Shimenawa's Reminiscence  [Shimenawa's Reminiscence]  Lv.20  ★★★★★
    Ana: HP                             4780
    Alt Statlar:
      • ATK%                            9.3%
      • CRIT Rate%                      7.8%
      ...
```

---

## Sık Karşılaşılan Hatalar

| Hata Kodu | Anlam | Çözüm |
|-----------|-------|-------|
| `-100` | Cookie geçersiz / süresi dolmuş | Tarayıcıdan yeni `ltoken_v2` + `ltuid_v2` kopyala |
| `10102` | Profil gizli | HoYoLAB → Profil → Ayarlar → **Oyun Kaydını Herkese Açık** yap |
| `403 Forbidden` | DS (Dynamic Secret) hatası | `lib/ds.js` içindeki `OVERSEAS_SALT` değeri güncel olmayabilir |
| `-1` | Genel API hatası | `.env`'deki UID ve sunucu eşleşiyor mu kontrol et |

### DS (Dynamic Secret) Salt Değeri Eskidiyse

HoYoLAB her büyük güncellemede salt değerini nadiren değiştirir. Güncel salt değerini bulmak için:

1. GitHub'da `hoyoapi ds salt` veya `genshin ds generator` ara.
2. Açık kaynak projelerdeki (ör. `thesadru/genshin.py`) sabit listesine bak.
3. `lib/ds.js` içindeki `OVERSEAS_SALT` satırını güncelle.

---

## Güvenlik Uyarıları

- `.env` dosyasını **kesinlikle** GitHub'a push etme — `.gitignore` bunu önler.
- Cookie değerlerin hesabına tam erişim sağlar; kimseyle paylaşma.
- Scripti yalnızca kendi hesabın için kullan.

---

## Bağımlılıklar

| Paket    | Sürüm  | Amaç                          |
|----------|--------|-------------------------------|
| `axios`  | ^1.6.8 | HTTP istekleri                |
| `chalk`  | ^4.1.2 | Renkli terminal çıktısı       |
| `dotenv` | ^16.4.5| `.env` dosyasından değişken yükleme |
