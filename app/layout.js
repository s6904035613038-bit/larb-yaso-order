export const metadata = {
  title: 'ลาบยโส - อาหารอีสานพรีเมี่ยม',
  description: 'ระบบสั่งอาหารร้านลาบยโส อาหารอีสานพรีเมี่ยม',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>{children}</body>
    </html>
  );
}
