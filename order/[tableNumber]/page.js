'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export default function OrderPage({ params }) {
  const tableNumber = params.tableNumber
  const [session, setSession] = useState(null)
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('table_number', tableNumber)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessionData && sessionData.length > 0) {
      setSession(sessionData[0])
    }

    const { data: catData } = await supabase.from('menu_categories').select('*').order('sort_order')
    const { data: itemData } = await supabase.from('menu_items').select('*').eq('is_available', true)

    if (catData) setCategories(catData)
    if (itemData) setMenuItems(itemData)
    setLoading(false)
  }

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const submitOrder = async () => {
    if (cart.length === 0) return alert('กรุณาเลือกอาหารก่อนครับ')
    if (!session) return alert('ไม่พบ Session โต๊ะที่เปิดอยู่')

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{ session_id: session.id, status: 'pending' }])
      .select()

    if (orderError) return alert('เกิดข้อผิดพลาด: ' + orderError.message)

    const orderId = orderData[0].id
    const orderItems = cart.map(item => ({
      order_id: orderId,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price
    }))

    await supabase.from('order_items').insert(orderItems)
    alert('ส่งออเดอร์เรียบร้อยแล้ว!')
    setCart([])
  }

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>กำลังโหลดเมนู...</div>

  return (
    <div style={{ padding: '15px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>เมนูอาหาร โต๊ะ {tableNumber} (ลาบยโส)</h2>
      
      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: '20px' }}>
          <h3>{cat.name}</h3>
          {menuItems.filter(item => item.category_id === cat.id).map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{item.name}</strong>
                <div>{item.price} บาท</div>
              </div>
              <button onClick={() => addToCart(item)} style={{ padding: '5px 12px' }}>+ เพิ่ม</button>
            </div>
          ))}
        </div>
      ))}

      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '15px', borderTop: '2px solid #ccc', textAlign: 'center' }}>
          <strong>ตะกร้าของคุณ ({cart.reduce((a, b) => a + b.quantity, 0)} รายการ)</strong>
          <button onClick={submitOrder} style={{ display: 'block', width: '100%', padding: '10px', marginTop: '10px', background: 'green', color: 'white', border: 'none', borderRadius: '5px' }}>
            ยืนยันสั่งอาหาร
          </button>
        </div>
      )}
    </div>
  )
}
