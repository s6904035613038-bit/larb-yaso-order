'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { QRCodeSVG } from 'qrcode.react'

export default function GenerateQR() {
  const [tableNumber, setTableNumber] = useState('')
  const [adults, setAdults] = useState('1')
  const [orderUrl, setOrderUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateSession = async (e) => {
    e.preventDefault()
    setLoading(true)

    // บันทึก Session ลง Database (ใช้ชื่อคอลัมน์ adult_count)
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ table_number: parseInt(tableNumber), adult_count: parseInt(adults) }])
      .select()

    setLoading(false)

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      // สร้าง URL สำหรับสั่งอาหาร
      const fullUrl = `${window.location.origin}/order/${tableNumber}`
      setOrderUrl(fullUrl)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>สร้าง QR Code สำหรับโต๊ะ (ลาบยโส)</h2>
      
      <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
        <div>
          <label>หมายเลขโต๊ะ:</label>
          <input
            type="number"
            required
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>จำนวนผู้ใหญ่:</label>
          <input
            type="number"
            required
            value={adults}
            onChange={(e) => setAdults(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', marginTop: '10px', cursor: 'pointer' }}>
          {loading ? 'กำลังสร้าง...' : 'สร้าง QR Code'}
        </button>
      </form>

      {orderUrl && (
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>โต๊ะที่ {tableNumber}</h3>
          
          {/* รูปภาพ QR Code */}
          <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
            <QRCodeSVG value={orderUrl} size={200} />
          </div>

          <p style={{ wordBreak: 'break-all', fontSize: '12px', color: '#666' }}>
            {orderUrl}
          </p>
          <button onClick={() => window.print()} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            พิมพ์ QR Code
          </button>
        </div>
      )}
    </div>
  )
}
