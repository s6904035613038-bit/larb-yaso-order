'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

const ACTIVE_STATUSES = ['received', 'cooking'];

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onStartCooking, onServe }) {
  const isCooking = order.status === 'cooking';

  return (
    <div
      style={{
        background: isCooking ? '#fff3cd' : '#ffffff',
        border: `4px solid ${isCooking ? '#f5a623' : '#333'}`,
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: '#111' }}>
          โต๊ะ {order.table_number}
        </span>
        <span style={{ fontSize: '1.5rem', color: '#555' }}>
          {formatTime(order.created_at)}
        </span>
      </div>

      <ul
        style={{
          fontSize: '2rem',
          fontWeight: 600,
          margin: 0,
          paddingLeft: '1.5rem',
          lineHeight: 1.4,
          color: '#111',
        }}
      >
        {(order.items ?? []).map((item, idx) => (
          <li key={idx}>
            {item.name} x{item.qty}
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {order.status === 'received' && (
          <button
            onClick={() => onStartCooking(order.id)}
            style={{
              flex: 1,
              fontSize: '2rem',
              fontWeight: 700,
              padding: '1.25rem',
              borderRadius: '12px',
              border: 'none',
              background: '#f5a623',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            เริ่มทำ
          </button>
        )}

        <button
          onClick={() => onServe(order.id)}
          style={{
            flex: 1,
            fontSize: '2rem',
            fontWeight: 700,
            padding: '1.25rem',
            borderRadius: '12px',
            border: 'none',
            background: '#2e7d32',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          จัดเสิร์ฟแล้ว
        </button>
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActiveOrders = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setOrders(data ?? []);
  }, []);

  useEffect(() => {
    fetchActiveOrders();

    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new;
          if (ACTIVE_STATUSES.includes(newOrder.status)) {
            setOrders((current) => [...current, newOrder]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new;

          setOrders((current) => {
            // ออเดอร์เปลี่ยนสถานะออกจากกลุ่ม active (เช่นเป็น served/cancelled) -> เอาออกจากจอ
            if (!ACTIVE_STATUSES.includes(updatedOrder.status)) {
              return current.filter((o) => o.id !== updatedOrder.id);
            }
            // ยังอยู่ในกลุ่ม active -> อัปเดตข้อมูลการ์ดเดิม
            return current.map((o) =>
              o.id === updatedOrder.id ? updatedOrder : o
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveOrders]);

  async function handleStartCooking(orderId) {
    // อัปเดตสีการ์ดทันทีในเครื่อง แล้วค่อยยืนยันกับฐานข้อมูล (realtime UPDATE จะยืนยันซ้ำอีกที)
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: 'cooking' } : o))
    );

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cooking' })
      .eq('id', orderId);

    if (updateError) {
      setError(updateError.message);
    }
  }

  async function handleServe(orderId) {
    // เอาการ์ดออกจากจอทันที
    setOrders((current) => current.filter((o) => o.id !== orderId));

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'served' })
      .eq('id', orderId);

    if (updateError) {
      setError(updateError.message);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#111',
        color: '#fff',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
        หน้าครัว — ออเดอร์ที่ต้องทำ
      </h1>

      {loading && <p style={{ fontSize: '1.5rem' }}>กำลังโหลดออเดอร์...</p>}
      {error && (
        <p style={{ fontSize: '1.5rem', color: '#ff6b6b' }}>
          เกิดข้อผิดพลาด: {error}
        </p>
      )}

      {!loading && orders.length === 0 && (
        <p style={{ fontSize: '2rem', color: '#aaa' }}>
          ยังไม่มีออเดอร์ที่ต้องทำตอนนี้
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStartCooking={handleStartCooking}
            onServe={handleServe}
          />
        ))}
      </div>
    </main>
  );
}
