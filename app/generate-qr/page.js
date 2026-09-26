'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GenerateQrPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [adultCount, setAdultCount] = useState(1);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreateSession(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('sessions')
      .insert({
        table_number: tableNumber,
        adult_count: Number(adultCount),
        status: 'open',
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSession(data);
  }

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', padding: '1rem' }}>
      <h1>สร้าง QR Code สำหรับโต๊ะ</h1>

      <form onSubmit={handleCreateSession} style={{ display: 'grid', gap: '0.75rem' }}>
        <label>
          หมายเลขโต๊ะ
          <input
            type="text"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>

        <label>
          จำนวนผู้ใหญ่
          <input
            type="number"
            min="1"
            value={adultCount}
            onChange={(e) => setAdultCount(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem' }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '0.6rem' }}>
          {loading ? 'กำลังสร้าง...' : 'สร้าง Session'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>เกิดข้อผิดพลาด: {error}</p>}

      {session && (
        <div style={{ marginTop: '1.5rem' }}>
          <p>สร้าง session สำเร็จ (id: {session.id})</p>
          {/* TODO: แปลง session.id เป็น QR code จริง เช่นด้วยไลบรารี qrcode.react */}
          <p>ลิงก์สั่งอาหาร: /order/{session.id}</p>
        </div>
      )}
    </main>
  );
}
