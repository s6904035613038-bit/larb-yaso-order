import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2rem' }}>ลาบยโส - อาหารอีสานพรีเมี่ยม</h1>
      <p>ระบบสั่งอาหารสำหรับร้านลาบยโส</p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link
          href="/generate-qr"
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid #333',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          สร้าง QR Code สำหรับโต๊ะ
        </Link>
        <Link
          href="/kitchen"
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid #333',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          หน้าครัว (Kitchen)
        </Link>
      </div>
    </main>
  );
}
