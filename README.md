# Ferma boshqaruvi (demo)

React + TypeScript + Vite'da yozilgan ferma boshqaruv paneli. Server talab qilmaydi:
barcha ma'lumotlar brauzerning localStorage'ida saqlanadi, shuning uchun Vercel'da statik sayt sifatida ishlaydi.

## Imkoniyatlar
- **Hayvonlar**: qo'shish, tahrirlash, o'chirish; turi, guruhi va holati bo'yicha qidiruv va filtr
- **Guruhlar**: guruhdagi faol bosh soni
- **Ombor**: yem kirimi va chiqimi. Qoldiq harakatlardan hisoblanadi, minimal qoldiq haqida ogohlantiradi
- **Yem hisoblagich**: ratsion × bosh × kun. Reja saqlanadi va alohida tasdiqlangandan keyin ombordan chiqariladi (bir reja faqat bir marta)
- **Xarajatlar**: yem kirimi xarajatga avtomatik va faqat bir marta yoziladi
- **Hisobot**: sana oralig'i, CSV yuklab olish, PDF (chop etish orqali)
- **Profil va rollar**: fermer va admin; admin panelda foydalanuvchilar boshqariladi
- **Zaxira nusxa**: JSON fayl ko'rinishida yuklab olish va tiklash

> Demo: haqiqiy login va serverga sinxronlash yo'q. Ma'lumotlar faqat shu brauzerda turadi.

## Kompyuterda ishga tushirish
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 27 ta test
npm run build    # dist/ papkasiga production build
```

## Vercel'ga joylash

**1-usul: Vercel CLI**
```bash
npx vercel           # birinchi marta login so'raydi, savollarga Enter bosing
npx vercel --prod    # production manzilga chiqarish
```

**2-usul: GitHub orqali**
1. Loyihani GitHub'ga yuklang.
2. vercel.com → *Add New → Project* → repozitoriyni tanlang.
3. Sozlamalar `vercel.json` faylidan avtomatik olinadi (Vite, `npm run build`, `dist`). *Deploy* tugmasini bosing.

`vercel.json` ichidagi `rewrites` qoidasi kerak: busiz `/ombor` kabi sahifani yangilaganda 404 chiqadi.
