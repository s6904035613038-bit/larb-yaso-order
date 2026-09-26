'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      setLoading(false);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setOrders(data ?? []);
    }

    fetchOrders();

    // Realtime subscription: อัปเดตออเดอร์ใหม่ทันทีที่มีการ insert
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(orderId, status) {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}>
      <h1>หน้าครัว (Kitchen)</h1>

      {loading && <p>กำลังโหลดออเดอร์...</p>}
      {error && <p style={{ color: 'red' }}>เกิดข้อผิดพลาด: {error}</p>}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {orders.map((order) => (
          <div
            key={order.id}
            style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}
          >
            <p>โต๊ะ: {order.table_number}</p>
            <p>สถานะ: {order.status}</p>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(order.items, null, 2)}
            </pre>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => updateStatus(order.id, 'cooking')}>
                กำลังทำ
              </button>
              <button onClick={() => updateStatus(order.id, 'served')}>
                เสิร์ฟแล้ว
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
