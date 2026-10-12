# Шохрух электрик — React versiya

Elektrik ustalar uchun smeta: tovar nomi, soni, narxi → summa o'zi hisoblanadi.
`Elektrik-Shoxrux.html` (bitta fayl) ning React + TypeScript + Tailwind CSS'dagi qayta yozilgani, 3 tilda: **Ўзбекча · Русский · English**.

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tayyor sayt dist/ papkasiga (istalgan hostingga qo'yiladi)
npm run typecheck  # faqat TypeScript tekshiruvi
```

## Tuzilishi

```
src/
  main.tsx, App.tsx      — kirish nuqtasi; App hamma qismlarni yig'adi
  types.ts               — ma'lumot turlari (Project, Item, Pay, Settings ...)
  i18n.ts                — 3 tildagi lug'at; ru/en uz'ga bog'langan (kalit tushib qolsa — TS xatosi)
  store.ts               — useStore(): ma'lumot, edit/update/withUndo, localStorage'ga saqlash
  index.css              — Tailwind, ranglar (yorug'/qorong'i, 5 asosiy rang), katak ranglari, jadval/kartochka joylashuvi
  lib/
    num.ts               — "155та" → 155, 1500000 → "1 500 000", birliklar
    calc.ts              — hisob-kitob: qator summasi, jami, qolgan, bo'lim jamlari
    model.ts             — yangi qator/obyekt, boshlang'ich ma'lumot, tavsiya nomlar
    rows.ts              — qator amallari (qo'shish, nusxa, surish, o'chirish) — ikkala jadval uchun bitta
    excel.ts             — Excel'ga saqlash / Excel'dan o'qish (SheetJS, faqat kerak bo'lganda yuklanadi)
    image.ts             — smetani PNG rasm qilib chizish (canvas, internetsiz)
    share.ts             — mijozga yuboriladigan matn
    settings.ts          — Дизайн sozlamalari (<html> atributlari)
    storage.ts, dom.ts   — localStorage, fokus, yuklab olish kabi yordamchilar
  components/
    ui.tsx               — Button, Popover (kompyuterda oyna, telefonda pastdan), Panel, Seg, menyu, xabar
    grid.tsx             — Field (har bir katak), Calc, klaviatura (useGridNav), qator menyusi (useRowMenu)
    ItemsTable.tsx       — "Ишлар ва товарлар"
    PaysTable.tsx        — "Олинган пуллар"
    Header, Project, Stats, Panels — sarlavha, obyektlar, kartalar, Дизайн/Юбориш/Расм oynalari
```

## KISS va DRY qanday qo'llangan

- **Holat bitta joyda** (`useStore`). O'zgartirish oddiy: `edit(p => { p.name = 'X' })` — nusxa olinadi, funksiya uni "joyida" o'zgartiradi. Redux / immer kerak emas.
- **Bitta `Field`** — ikkala jadvaldagi hamma kataklar (rangi, yorlig'i, raqamni formatlash) shu komponent.
- **Bitta `Popover`** — qator menyusi, "Сақлаш" menyusi va 3 ta oyna. Telefonda o'zi pastdan chiqadi.
- **Bitta `applyRowOp` va `useGridNav`** — ishlar ham, to'lovlar ham bir xil amal va klaviatura.
- **Bitta joylashuv**: telefonda kartochka, kompyuterda jadval — bitta markup, faqat CSS (`index.css` dagi `.grid-row`).
- **Ranglar CSS o'zgaruvchilarda**: qorong'i rejim va asosiy rang uchun komponentlarda `dark:` klasslar yo'q.

## Tarjima qo'shish

1. `src/i18n.ts` da `uz` ga yangi kalit qo'shing.
2. TypeScript `ru` va `en` da shu kalit yo'qligini ko'rsatadi — ularga ham yozing.
3. Komponentda: `const t = useT(); t('kalit')` yoki `t('rowsCount', { n: 5 })`.

Yangi til: `Lang` turiga qo'shing (`types.ts`), `i18n.ts` da lug'at, `LANGS` va `PAY_NAMES` ga qator.

## Eslatmalar

- Ma'lumot brauzerda saqlanadi (`localStorage`, kalit HTML versiyadagi bilan bir xil). Zaxira uchun vaqti-vaqti bilan **Сақлаш → Excel**.
- SheetJS (`xlsx`) rasmiy CDN tarbolidan `vendor/` papkada turibdi: npm'dagi eski versiyada xavfsizlik muammosi bor, npm 12 esa URL'dan paket o'rnatishni sukut bo'yicha taqiqlaydi.
