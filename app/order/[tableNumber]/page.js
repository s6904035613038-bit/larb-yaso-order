'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

function formatBaht(amount) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function OrderPage({ params }) {
  // ข้อกำหนดของ Next.js เวอร์ชันใหม่: params เป็น Promise ต้อง unwrap ด้วย use()
  const { tableNumber } = use(params);

  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [cart, setCart] = useState([]); // [{ menu_item_id, name, price, qty }]
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [totalBill, setTotalBill] = useState(0);
  const [showBillModal, setShowBillModal] = useState(false);
  const [closingBill, setClosingBill] = useState(false);

  // 1) เช็ค session ของโต๊ะนี้ ต้อง status = 'open'
  useEffect(() => {
    async function loadSession() {
      setSessionLoading(true);

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', tableNumber)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSessionLoading(false);

      if (error || !data) {
        setSession(null);
        return;
      }

      setSession(data);
    }

    loadSession();
  }, [tableNumber]);

  // 2) โหลดเมนู (หมวดหมู่ + รายการอาหาร) เมื่อโต๊ะเปิดใช้งานอยู่
  useEffect(() => {
    if (!session) return;

    async function loadMenu() {
      const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
        supabase.from('menu_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('menu_items').select('*'),
      ]);

      setCategories(categoriesData ?? []);
      setMenuItems(itemsData ?? []);
      if (categoriesData && categoriesData.length > 0) {
        setActiveCategoryId(categoriesData[0].id);
      }
    }

    loadMenu();
  }, [session]);

  // 3) คำนวณยอดรวมทั้งหมดของโต๊ะ (จากออเดอร์ทุกครั้งใน session นี้)
  async function refreshBillTotal(sessionId) {
    const { data, error } = await supabase
      .from('orders')
      .select('items')
      .eq('session_id', sessionId);

    if (error || !data) return;

    const total = data.reduce((sum, order) => {
      const itemsTotal = (order.items ?? []).reduce(
        (s, item) => s + item.price * item.qty,
        0
      );
      return sum + itemsTotal;
    }, 0);

    setTotalBill(total);
  }

  useEffect(() => {
    if (session) {
      refreshBillTotal(session.id);
    }
  }, [session]);

  const itemsByCategory = useMemo(() => {
    return menuItems.filter((item) => item.category_id === activeCategoryId);
  }, [menuItems, activeCategoryId]);

  function addToCart(menuItem) {
    setCart((current) => {
      const existing = current.find((c) => c.menu_item_id === menuItem.id);
      if (existing) {
        return current.map((c) =>
          c.menu_item_id === menuItem.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...current,
        {
          menu_item_id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty: 1,
        },
      ];
    });
  }

  function changeQty(menuItemId, delta) {
    setCart((current) =>
      current
        .map((c) =>
          c.menu_item_id === menuItemId ? { ...c, qty: c.qty + delta } : c
        )
        .filter((c) => c.qty > 0)
    );
  }

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.price * c.qty, 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + c.qty, 0), [cart]);

  async function handleSubmitOrder() {
    if (!session || cart.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const { error } = await supabase.from('orders').insert({
      session_id: session.id,
      table_number: tableNumber,
      items: cart,
      status: 'received',
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setCart([]);
    setSubmitSuccess(true);
    refreshBillTotal(session.id);
    setTimeout(() => setSubmitSuccess(false), 2500);
  }

  async function handleCloseBill() {
    if (!session) return;
    setClosingBill(true);

    const { error } = await supabase
      .from('sessions')
      .update({ status: 'closed' })
      .eq('id', session.id);

    setClosingBill(false);

    if (!error) {
      setShowBillModal(false);
      setSession(null); // กลับไปแสดงหน้า "โต๊ะยังไม่เปิดใช้งาน" เพราะปิดโต๊ะแล้ว
    }
  }

  // ------- Render states -------

  if (sessionLoading) {
    return (
      <main style={styles.centeredScreen}>
        <p style={{ fontSize: '1.1rem', color: '#666' }}>กำลังตรวจสอบโต๊ะ...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={styles.centeredScreen}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
          <h1 style={{ fontSize: '1.4rem', color: '#7a1f1f', margin: 0 }}>
            โต๊ะนี้ยังไม่เปิดใช้งาน
          </h1>
          <p style={{ color: '#888', marginTop: '0.5rem' }}>กรุณาแจ้งพนักงาน</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>ลาบยโส</div>
          <div style={styles.tableLabel}>โต๊ะ {tableNumber}</div>
        </div>
        <button style={styles.billButton} onClick={() => setShowBillModal(true)}>
          เรียกเก็บเงิน
        </button>
      </header>

      {/* Category tabs */}
      <nav style={styles.tabBar}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            style={{
              ...styles.tabButton,
              ...(activeCategoryId === cat.id ? styles.tabButtonActive : {}),
            }}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Menu items */}
      <section style={styles.menuGrid}>
        {itemsByCategory.map((item) => (
          <div key={item.id} style={styles.menuCard}>
            <div>
              <div style={styles.menuName}>{item.name}</div>
              <div style={styles.menuPrice}>฿{formatBaht(item.price)}</div>
            </div>
            <button style={styles.addButton} onClick={() => addToCart(item)}>
              + ใส่ตะกร้า
            </button>
          </div>
        ))}
        {itemsByCategory.length === 0 && (
          <p style={{ color: '#999', gridColumn: '1 / -1', textAlign: 'center' }}>
            ไม่มีเมนูในหมวดนี้
          </p>
        )}
      </section>

      {/* Floating cart bar */}
      {cart.length > 0 && (
        <div style={styles.cartBar}>
          <div style={styles.cartList}>
            {cart.map((c) => (
              <div key={c.menu_item_id} style={styles.cartRow}>
                <span style={{ flex: 1 }}>{c.name}</span>
                <button
                  style={styles.qtyBtn}
                  onClick={() => changeQty(c.menu_item_id, -1)}
                >
                  −
                </button>
                <span style={{ width: 24, textAlign: 'center' }}>{c.qty}</span>
                <button
                  style={styles.qtyBtn}
                  onClick={() => changeQty(c.menu_item_id, 1)}
                >
                  +
                </button>
                <span style={{ width: 70, textAlign: 'right' }}>
                  ฿{formatBaht(c.price * c.qty)}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.cartFooter}>
            <span style={{ fontWeight: 700 }}>
              รวม {cartCount} รายการ · ฿{formatBaht(cartTotal)}
            </span>
            <button
              style={styles.submitButton}
              onClick={handleSubmitOrder}
              disabled={submitting}
            >
              {submitting ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
            </button>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div style={styles.toast}>ส่งออเดอร์เรียบร้อย 🎉</div>
      )}
      {submitError && (
        <div style={{ ...styles.toast, background: '#7a1f1f' }}>
          เกิดข้อผิดพลาด: {submitError}
        </div>
      )}

      {/* Bill modal */}
      {showBillModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#3a2a1a' }}>
              สรุปยอดโต๊ะ {tableNumber}
            </h2>
            <div style={styles.billTotal}>฿{formatBaht(totalBill)}</div>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              ยืนยันเพื่อปิดโต๊ะและเรียกพนักงานมาเก็บเงิน
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                style={styles.modalCancelButton}
                onClick={() => setShowBillModal(false)}
              >
                ยกเลิก
              </button>
              <button
                style={styles.modalConfirmButton}
                onClick={handleCloseBill}
                disabled={closingBill}
              >
                {closingBill ? 'กำลังปิดโต๊ะ...' : 'ยืนยันเรียกเก็บเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  centeredScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#faf6f0',
    fontFamily: "'Segoe UI', sans-serif",
  },
  page: {
    minHeight: '100vh',
    background: '#faf6f0',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#2b1d10',
    paddingBottom: '7rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.25rem 1rem',
    background: 'linear-gradient(135deg, #7a1f1f, #a8351f)',
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: { fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.5px' },
  tableLabel: { fontSize: '0.95rem', opacity: 0.9, marginTop: '0.15rem' },
  billButton: {
    background: '#f5a623',
    color: '#3a2a1a',
    border: 'none',
    borderRadius: '999px',
    padding: '0.6rem 1.1rem',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  tabBar: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    padding: '1rem 1rem 0.5rem',
  },
  tabButton: {
    flexShrink: 0,
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    border: '1px solid #d8c4ad',
    background: '#fff',
    color: '#5c4630',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  tabButtonActive: {
    background: '#7a1f1f',
    borderColor: '#7a1f1f',
    color: '#fff',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.75rem',
    padding: '0.75rem 1rem 1rem',
  },
  menuCard: {
    background: '#fff',
    borderRadius: '14px',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(80,50,20,0.08)',
  },
  menuName: { fontSize: '1.05rem', fontWeight: 700, color: '#2b1d10' },
  menuPrice: { fontSize: '0.95rem', color: '#a8351f', marginTop: '0.2rem', fontWeight: 700 },
  addButton: {
    background: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.6rem 0.9rem',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  cartBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #eadcc9',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
    padding: '0.75rem 1rem 1rem',
    maxHeight: '45vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  cartList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  cartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '1px solid #d8c4ad',
    background: '#faf6f0',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  cartFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.5rem',
    borderTop: '1px solid #f0e6d6',
  },
  submitButton: {
    background: '#7a1f1f',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    padding: '0.7rem 1.4rem',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  toast: {
    position: 'fixed',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#2e7d32',
    color: '#fff',
    padding: '0.6rem 1.2rem',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.9rem',
    zIndex: 20,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    zIndex: 30,
  },
  modalCard: {
    background: '#fff',
    borderRadius: '18px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'center',
  },
  billTotal: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: '#7a1f1f',
    margin: '0.75rem 0',
  },
  modalCancelButton: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '12px',
    border: '1px solid #d8c4ad',
    background: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalConfirmButton: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '12px',
    border: 'none',
    background: '#7a1f1f',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
