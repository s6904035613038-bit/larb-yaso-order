# ลาบยโส - ระบบสั่งอาหาร

โครงโปรเจกต์ Next.js (App Router, JavaScript) สำหรับร้านอาหารอีสานพรีเมี่ยม "ลาบยโส" เชื่อมต่อ Supabase และพร้อม deploy บน Vercel

## ติดตั้ง

```bash
npm install
```

## ตั้งค่า Supabase

1. สร้างโปรเจกต์ใหม่ใน Supabase
2. รัน `supabase/schema.sql` ใน SQL Editor เพื่อสร้างตาราง
3. คัดลอก Project URL และ anon key มาใส่ใน `.env.local`

## รันโปรเจกต์

```bash
npm run dev
```

## Deploy บน Vercel

1. Push โค้ดขึ้น Git repository
2. Import โปรเจกต์เข้า Vercel
3. ตั้งค่า Environment Variables ใน Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## โครงสร้างไฟล์

- `app/page.js` — หน้าแรก
- `app/generate-qr/page.js` — หน้าสร้าง session/QR ต่อโต๊ะ
- `app/kitchen/page.js` — หน้าครัว แสดงออเดอร์แบบ realtime
- `lib/supabaseClient.js` — Supabase client
- `supabase/schema.sql` — DB schema (sessions, menu_categories, menu_items, orders)
