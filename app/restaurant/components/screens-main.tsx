import * as React from 'react';
import { Booking, Table, Zone, Session, TaskItem } from './data';
import { Icon, Modal } from './ui';

interface BookingsScreenProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  zones: Zone[];
  prefilledTableId: string | null;
  setPrefilledTableId: (id: string | null) => void;
  setToast: (toast: any) => void;
}

export function BookingsScreen({
  bookings,
  setBookings,
  tables,
  setTables,
  zones,
  prefilledTableId,
  setPrefilledTableId,
  setToast
}: BookingsScreenProps) {
  const [filterDate, setFilterDate] = React.useState<'all' | 'today' | 'tomorrow'>('today');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Add Booking Form States
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [guestName, setGuestName] = React.useState('');
  const [guestPhone, setGuestPhone] = React.useState('');
  const [guestsCount, setGuestsCount] = React.useState(2);
  const [bookingTime, setBookingTime] = React.useState('');
  const [targetTableId, setTargetTableId] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Open modal if prefilled table is passed
  React.useEffect(() => {
    if (prefilledTableId) {
      setTargetTableId(prefilledTableId);
      
      // Default time: today + 2 hours rounded
      const d = new Date();
      d.setHours(d.getHours() + 2, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const defaultDateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setBookingTime(defaultDateTime);
      
      const table = tables.find(t => t.id === prefilledTableId);
      if (table) {
        setGuestsCount(table.capacity);
      }

      setIsAddModalOpen(true);
    }
  }, [prefilledTableId, tables]);

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setPrefilledTableId(null);
    setGuestName('');
    setGuestPhone('');
    setNotes('');
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setToast({ message: "Введите имя гостя", type: "error" });
      return;
    }
    if (!bookingTime) {
      setToast({ message: "Укажите дату и время", type: "error" });
      return;
    }
    if (!targetTableId) {
      setToast({ message: "Выберите столик", type: "error" });
      return;
    }

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      tableId: targetTableId,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim() || "—",
      guestsCount,
      dateTime: bookingTime,
      status: 'pending',
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    setBookings(prev => [newBooking, ...prev]);

    // If reservation is for right now, optionally change table status
    const bookingDate = new Date(bookingTime);
    const now = new Date();
    const diffMs = Math.abs(bookingDate.getTime() - now.getTime());
    const isToday = bookingDate.toDateString() === now.toDateString();

    if (isToday && diffMs < 30 * 60 * 1000) { // within 30 mins
      setTables(prev => prev.map(t => t.id === targetTableId ? { ...t, status: 'reserved' } : t));
    }

    setToast({ message: "Бронирование создано", type: "success" });
    handleCloseModal();
  };

  const handleStatusChange = (bookingId: string, status: Booking['status'], tableId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    
    // Auto-update table state
    if (status === 'seated') {
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t));
      setToast({ message: "Гость посажен за столик", type: "success" });
    } else if (status === 'completed') {
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'cleaning' } : t));
      setToast({ message: "Стол освобожден, требуется уборка", type: "info" });
    } else if (status === 'cancelled') {
      setTables(prev => prev.map(t => t.id === tableId && t.status === 'reserved' ? { ...t, status: 'free' } : t));
      setToast({ message: "Бронь отменена", type: "info" });
    }
  };

  const getTableName = (id: string) => {
    const table = tables.find(t => t.id === id);
    if (!table) return '—';
    const zone = zones.find(z => z.id === table.zoneId);
    return `${table.name} (${zone ? zone.name : ''})`;
  };

  // Filtered Bookings calculation
  const filteredBookings = bookings.filter(b => {
    // 1. Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      b.guestName.toLowerCase().includes(query) ||
      b.guestPhone.toLowerCase().includes(query) ||
      getTableName(b.tableId).toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 2. Status Filter
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;

    // 3. Date Filter
    if (filterDate === 'all') return true;
    
    const bDate = new Date(b.dateTime).toDateString();
    const today = new Date().toDateString();
    
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = tomorrowObj.toDateString();

    if (filterDate === 'today' && bDate !== today) return false;
    if (filterDate === 'tomorrow' && bDate !== tomorrow) return false;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4px' }}>
      
      {/* Top Filter & Add Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '380px' }}>
          <input
            type="text"
            placeholder="Поиск по имени, телефону или столу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elev)',
              color: 'var(--fg)',
              padding: '0 12px 0 34px',
              fontSize: '13px'
            }}
          />
          <div style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }}>
            <Icon name="search" size={16} />
          </div>
        </div>

        {/* Add booking button */}
        <button
          onClick={() => {
            // Default time to today + 2 hours
            const d = new Date();
            d.setHours(d.getHours() + 2, 0, 0, 0);
            const pad = (n: number) => n.toString().padStart(2, '0');
            setBookingTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
            setIsAddModalOpen(true);
          }}
          className="btn primary"
          style={{ background: 'var(--accent)', color: 'white', border: 'none', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="plus" size={14} />
          <span>Новая бронь</span>
        </button>
      </div>

      {/* Tabs for Date and Status filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
        {/* Date Filter */}
        <div style={{ display: 'flex', background: 'var(--bg-muted)', padding: '2px', borderRadius: '8px' }}>
          <button
            className={`tab-pill-sm ${filterDate === 'today' ? 'active' : ''}`}
            onClick={() => setFilterDate('today')}
          >
            Сегодня
          </button>
          <button
            className={`tab-pill-sm ${filterDate === 'tomorrow' ? 'active' : ''}`}
            onClick={() => setFilterDate('tomorrow')}
          >
            Завтра
          </button>
          <button
            className={`tab-pill-sm ${filterDate === 'all' ? 'active' : ''}`}
            onClick={() => setFilterDate('all')}
          >
            Все даты
          </button>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', background: 'var(--bg-muted)', padding: '2px', borderRadius: '8px' }}>
          <button className={`tab-pill-sm ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
            Все статусы
          </button>
          <button className={`tab-pill-sm ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>
            Ожидают
          </button>
          <button className={`tab-pill-sm ${filterStatus === 'seated' ? 'active' : ''}`} onClick={() => setFilterStatus('seated')}>
            За столом
          </button>
          <button className={`tab-pill-sm ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => setFilterStatus('completed')}>
            Завершены
          </button>
          <button className={`tab-pill-sm ${filterStatus === 'cancelled' ? 'active' : ''}`} onClick={() => setFilterStatus('cancelled')}>
            Отменены
          </button>
        </div>
      </div>

      {/* Bookings List Layout */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
            Бронирований не найдено
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredBookings.map(b => (
              <div
                key={b.id}
                style={{
                  background: 'var(--bg-elev)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--fg)' }}>{b.guestName}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{b.guestPhone}</span>
                    
                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        background: 
                          b.status === 'pending' ? 'rgba(244, 162, 97, 0.1)' :
                          b.status === 'seated' ? 'rgba(231, 111, 81, 0.1)' :
                          b.status === 'completed' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(0,0,0,0.06)',
                        color: 
                          b.status === 'pending' ? '#f4a261' :
                          b.status === 'seated' ? '#e76f51' :
                          b.status === 'completed' ? '#2a9d8f' : 'var(--muted)'
                      }}
                    >
                      {b.status === 'pending' && 'В ожидании'}
                      {b.status === 'seated' && 'Посажен'}
                      {b.status === 'completed' && 'Завершен'}
                      {b.status === 'cancelled' && 'Отменен'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--fg-2)', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="table" size={12} style={{ color: 'var(--accent)' }} />
                      <strong>{getTableName(b.tableId)}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="clock" size={12} />
                      <span>{new Date(b.dateTime).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}, {new Date(b.dateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="user" size={12} />
                      <span>{b.guestsCount} чел</span>
                    </div>
                  </div>

                  {b.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '4px' }}>
                      Заметка: {b.notes}
                    </div>
                  )}
                </div>

                {/* Booking actions */}
                {b.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleStatusChange(b.id, 'seated', b.tableId)}
                      className="btn primary"
                      style={{ padding: '6px 12px', background: 'var(--accent)', color: 'white', border: 'none', height: '32px' }}
                    >
                      Посадить
                    </button>
                    <button
                      onClick={() => handleStatusChange(b.id, 'cancelled', b.tableId)}
                      className="btn danger"
                      style={{ padding: '6px 10px', height: '32px' }}
                    >
                      Отменить
                    </button>
                  </div>
                )}

                {b.status === 'seated' && (
                  <button
                    onClick={() => handleStatusChange(b.id, 'completed', b.tableId)}
                    className="btn"
                    style={{ padding: '6px 12px', height: '32px', borderColor: '#2a9d8f', color: '#2a9d8f' }}
                  >
                    Завершить визит
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - Add reservation */}
      <Modal isOpen={isAddModalOpen} onClose={handleCloseModal} title="Создать новое бронирование">
        <form onSubmit={handleCreateBooking} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--fg-2)' }}>
              Имя гостя *
            </label>
            <input
              type="text"
              required
              placeholder="Введите имя..."
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--fg-2)' }}>
                Телефон
              </label>
              <input
                type="text"
                placeholder="+7 (707) 123-45-67"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--fg-2)' }}>
                Количество гостей
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={guestsCount}
                onChange={(e) => setGuestsCount(parseInt(e.target.value) || 2)}
                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--fg-2)' }}>
                Дата и время *
              </label>
              <input
                type="datetime-local"
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--fg-2)' }}>
                Столик *
              </label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
              >
                <option value="">-- Выберите --</option>
                {tables.map(t => {
                  const z = zones.find(zone => zone.id === t.zoneId);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({z ? z.name : ''}) - {t.capacity} мест ({t.status === 'free' ? 'Свободен' : 'Занят'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--fg-2)' }}>
              Заметки / Пожелания
            </label>
            <textarea
              placeholder="Например: День рождения, нужен детский стульчик..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', height: '60px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '8px 10px', resize: 'none', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn" style={{ padding: '8px 16px' }} onClick={handleCloseModal}>
              Отмена
            </button>
            <button type="submit" className="btn primary" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none' }}>
              Забронировать
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        .tab-pill-sm {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--muted);
          font-weight: 600;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-pill-sm.active {
          background: var(--bg-elev);
          color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </div>
  );
}

// -------------------------------------------------------------
// Dashboard Screen with simple key metrics and occupancy bars
// -------------------------------------------------------------
export function DashboardScreen({
  bookings,
  tables
}: {
  bookings: Booking[];
  tables: Table[];
}) {
  const today = new Date().toDateString();
  
  // Calculate stats
  const activeBookingsToday = bookings.filter(b => 
    new Date(b.dateTime).toDateString() === today && 
    (b.status === 'pending' || b.status === 'seated')
  );
  
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const cleaningTables = tables.filter(t => t.status === 'cleaning').length;
  const freeTables = tables.filter(t => t.status === 'free').length;
  const totalTables = tables.length;
  
  const occupancyPercentage = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  
  // Total guests seated right now
  const seatedGuests = bookings
    .filter(b => b.status === 'seated' && new Date(b.dateTime).toDateString() === today)
    .reduce((sum, b) => sum + b.guestsCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      
      {/* Welcome header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
          Аналитика Смены
        </h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
          Оперативная загрузка и показатели посадочных зон на сегодня
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {/* Occupancy card */}
        <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Загрузка Зала</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)', margin: '4px 0' }}>{occupancyPercentage}%</div>
          <div style={{ fontSize: '11px', color: 'var(--fg-2)', fontWeight: 600 }}>{occupiedTables} из {totalTables} столов занято</div>
        </div>

        {/* Bookings card */}
        <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Резервы на сегодня</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--fg)', margin: '4px 0' }}>{activeBookingsToday.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
            {activeBookingsToday.filter(b => b.status === 'pending').length} ожидают посадки
          </div>
        </div>

        {/* Seated Guests card */}
        <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Гостей в зале</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-2)', margin: '4px 0' }}>{seatedGuests}</div>
          <div style={{ fontSize: '11px', color: 'var(--fg-2)', fontWeight: 600 }}>занято {seatedGuests} стульев</div>
        </div>
      </div>

      {/* Details breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Table statuses breakdown */}
        <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Состояние столов</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Free */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span style={{ color: '#2a9d8f' }}>Свободные столы</span>
                <span>{freeTables} ({totalTables > 0 ? Math.round((freeTables / totalTables) * 100) : 0}%)</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#2a9d8f', width: `${totalTables > 0 ? (freeTables / totalTables) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Occupied */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span style={{ color: '#e76f51' }}>Занятые столы</span>
                <span>{occupiedTables} ({totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0}%)</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#e76f51', width: `${totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Cleaning */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span style={{ color: '#b5838d' }}>Требуют уборки</span>
                <span>{cleaningTables} ({totalTables > 0 ? Math.round((cleaningTables / totalTables) * 100) : 0}%)</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#b5838d', width: `${totalTables > 0 ? (cleaningTables / totalTables) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Shift Checklist & Tips */}
        <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Сводка смены</h3>
          
          <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--fg-2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cleaningTables > 0 && (
              <li style={{ color: '#b5838d', fontWeight: 600 }}>
                Внимание: {cleaningTables} стола требуют уборки и дезинфекции.
              </li>
            )}
            {activeBookingsToday.filter(b => b.status === 'pending').length > 0 ? (
              <li>
                Ожидается приход {activeBookingsToday.filter(b => b.status === 'pending').length} броней на ближайшие часы.
              </li>
            ) : (
              <li>Все брони на сегодня успешно приняты или завершены.</li>
            )}
            <li>Смена открыта. Все терминалы работают в штатном режиме.</li>
            <li>Режим синхронизации активен. Данные сохраняются на локальном сервере.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HistoryScreen with filters, CSV generator and table summary
// -------------------------------------------------------------
interface HistoryScreenProps {
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  setToast: (toast: any) => void;
}

export function HistoryScreen({ sessions, setSessions, setToast }: HistoryScreenProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [filterPayment, setFilterPayment] = React.useState<string>('all');

  // Filter sessions according to date range, payment method and search query
  const filteredSessions = sessions.filter(s => {
    // 1. Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      s.waiterName.toLowerCase().includes(query) ||
      s.tableName.toLowerCase().includes(query) ||
      s.guestName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 2. Payment Method
    if (filterPayment !== 'all' && s.paymentMethod !== filterPayment) return false;

    // 3. Date Range
    const sDate = new Date(s.checkOutTime);
    sDate.setHours(0, 0, 0, 0); // normalize

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (sDate < from) return false;
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(0, 0, 0, 0);
      if (sDate > to) return false;
    }

    return true;
  });

  // Calculate totals
  const totalRevenue = filteredSessions.reduce((sum, s) => sum + s.billAmount, 0);
  const averageBill = filteredSessions.length > 0 ? Math.round(totalRevenue / filteredSessions.length) : 0;

  // Preset Filters
  const setPreset = (preset: 'today' | 'month' | 'all') => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (preset === 'today') {
      const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      setDateFrom(dateStr);
      setDateTo(dateStr);
    } else if (preset === 'month') {
      const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      const endStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      setDateFrom(startStr);
      setDateTo(endStr);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Excel XML spreadsheet exporter (UTF-8, gridlines, proper types)
  const handleDownloadExcel = () => {
    if (filteredSessions.length === 0) {
      setToast({ message: "Нет данных для скачивания", type: "error" });
      return;
    }

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const paymentLabel = (method: string) =>
      method === 'card' ? 'Карта' :
      method === 'cash' ? 'Наличные' :
      method === 'qr' ? 'Kaspi / QR' : 'Списание';

    const xmlHeader = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Отчет по визитам">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">ID сессии</Data></Cell>
    <Cell><Data ss:Type="String">Стол</Data></Cell>
    <Cell><Data ss:Type="String">Гость</Data></Cell>
    <Cell><Data ss:Type="String">Гостей</Data></Cell>
    <Cell><Data ss:Type="String">Время посадки</Data></Cell>
    <Cell><Data ss:Type="String">Время расчета</Data></Cell>
    <Cell><Data ss:Type="String">Официант</Data></Cell>
    <Cell><Data ss:Type="String">Способ оплаты</Data></Cell>
    <Cell><Data ss:Type="String">Сумма счета (₸)</Data></Cell>
    <Cell><Data ss:Type="String">Заметки</Data></Cell>
   </Row>`;

    const xmlRows = filteredSessions.map(s => `
   <Row>
    <Cell><Data ss:Type="String">${s.id}</Data></Cell>
    <Cell><Data ss:Type="String">${s.tableName}</Data></Cell>
    <Cell><Data ss:Type="String">${s.guestName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.guestsCount}</Data></Cell>
    <Cell><Data ss:Type="String">${formatDate(s.checkInTime)}</Data></Cell>
    <Cell><Data ss:Type="String">${formatDate(s.checkOutTime)}</Data></Cell>
    <Cell><Data ss:Type="String">${s.waiterName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>
    <Cell><Data ss:Type="String">${paymentLabel(s.paymentMethod)}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.billAmount}</Data></Cell>
    <Cell><Data ss:Type="String">${(s.notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ')}</Data></Cell>
   </Row>`).join('');

    const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

    const xmlContent = xmlHeader + xmlRows + xmlFooter;
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `RestoCanvas-Report-${stamp}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ message: "Отчет скачан в формате Excel", type: "success" });
  };

  // PDF report builder with direct print window popup
  const handleDownloadPDF = () => {
    if (filteredSessions.length === 0) {
      setToast({ message: "Нет данных для экспорта", type: "error" });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setToast({ message: "Блокировщик окон помешал открыть PDF-отчет", type: "error" });
      return;
    }

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const paymentLabel = (method: string) =>
      method === 'card' ? 'Карта' :
      method === 'cash' ? 'Наличные' :
      method === 'qr' ? 'Kaspi / QR' : 'Списание';

    const rowsHtml = filteredSessions.map(s => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6;">${s.tableName}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6;">${s.guestName}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6; text-align: center;">${s.guestsCount}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6;">${formatDate(s.checkInTime)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6;">${formatDate(s.checkOutTime)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6;">${s.waiterName}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6;">${paymentLabel(s.paymentMethod)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #dee2e6; text-align: right; font-weight: bold;">${s.billAmount.toLocaleString('ru-RU')} ₸</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>RestoCanvas - Отчет по смене</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #111; }
            .meta { font-size: 13px; color: #666; margin-bottom: 25px; line-height: 1.5; }
            .stats { display: flex; gap: 40px; margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
            .stat-box { display: flex; flex-direction: column; }
            .stat-label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; }
            .stat-value { font-size: 20px; font-weight: 700; color: #111; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f3f5; text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; border-bottom: 2px solid #dee2e6; text-transform: uppercase; color: #495057; }
            td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #dee2e6; color: #333; }
            tr:nth-child(even) td { background: #fcfcfc; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Отчет по истории визитов</h1>
              <div class="meta">
                Период: <strong>${dateFrom ? new Date(dateFrom).toLocaleDateString('ru-RU') : 'Начало'}</strong> — <strong>${dateTo ? new Date(dateTo).toLocaleDateString('ru-RU') : 'Сегодня'}</strong><br/>
                Сформировано: ${new Date().toLocaleString('ru-RU')}
              </div>
            </div>
            <button onclick="window.print();" style="padding: 8px 16px; background: #e76f51; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Печать / Сохранить в PDF</button>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <span class="stat-label">Выручка</span>
              <span class="stat-value">${totalRevenue.toLocaleString('ru-RU')} ₸</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Обслужено гостей</span>
              <span class="stat-value">${filteredSessions.reduce((sum, s) => sum + s.guestsCount, 0)}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Средний чек</span>
              <span class="stat-value">${averageBill.toLocaleString('ru-RU')} ₸</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Всего заказов</span>
              <span class="stat-value">${filteredSessions.length}</span>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th>Стол</th>
                <th>Гость</th>
                <th style="text-align: center;">Гостей</th>
                <th>Открытие</th>
                <th>Закрытие</th>
                <th>Официант</th>
                <th>Оплата</th>
                <th style="text-align: right;">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleClearHistory = () => {
    if (confirm("ВНИМАНИЕ! Вы действительно хотите удалить всю историю визитов? Это действие необратимо.")) {
      setSessions([]);
      setToast({ message: "История визитов очищена", type: "info" });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
          История визитов и Отчеты (Новая версия)
        </h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
          Архив обслуженных столов и скачивание финансовых отчетов за любой период
        </p>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>ПОИСК</label>
            <input
              type="text"
              placeholder="Официант, гость или стол..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px', fontSize: '13px' }}
            />
          </div>

          {/* Date from */}
          <div style={{ width: '130px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>ДАТА С</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 8px', fontSize: '12px' }}
            />
          </div>

          {/* Date to */}
          <div style={{ width: '130px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>ДАТА ПО</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 8px', fontSize: '12px' }}
            />
          </div>

          {/* Payment Method */}
          <div style={{ width: '140px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>ОПЛАТА</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 8px', fontSize: '13px' }}
            >
              <option value="all">Все способы</option>
              <option value="card">Карта</option>
              <option value="cash">Наличные</option>
              <option value="qr">Kaspi / QR</option>
              <option value="none">Списание</option>
            </select>
          </div>
        </div>

        {/* Date presets and buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button className="btn" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => setPreset('today')}>За сегодня</button>
            <button className="btn" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => setPreset('month')}>За этот месяц</button>
            <button className="btn" style={{ height: '30px', padding: '0 10px', fontSize: '11px' }} onClick={() => setPreset('all')}>За всё время</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleClearHistory}
              className="btn danger"
              style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
            >
              Очистить историю
            </button>
            <button
              onClick={handleDownloadExcel}
              className="btn"
              style={{ height: '34px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Icon name="refresh" size={12} style={{ transform: 'rotate(180deg)', color: 'var(--fg)' }} />
              <span>Экспорт Excel</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn primary"
              style={{ height: '34px', padding: '0 14px', background: 'var(--accent)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Icon name="calendar" size={12} style={{ color: 'white' }} />
              <span>Скачать PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>ОБСЛУЖЕНО СТОЛОВ</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--fg)', marginTop: '2px' }}>{filteredSessions.length}</div>
        </div>
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>ОБЩАЯ ВЫРУЧКА</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2a9d8f', marginTop: '2px' }}>{totalRevenue.toLocaleString('ru-RU')} ₸</div>
        </div>
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>СРЕДНИЙ ЧЕК</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', marginTop: '2px' }}>{averageBill.toLocaleString('ru-RU')} ₸</div>
        </div>
      </div>

      {/* Table view */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-elev)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            В выбранном периоде нет обслуженных столов
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 700 }}>
                  <th style={{ padding: '10px 16px', width: '25%', minWidth: '180px' }}>Стол</th>
                  <th style={{ padding: '10px 16px', width: '20%', minWidth: '130px' }}>Посадка</th>
                  <th style={{ padding: '10px 16px', width: '10%', minWidth: '80px' }}>Расчет</th>
                  <th style={{ padding: '10px 16px', width: '15%', minWidth: '110px' }}>Официант</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', width: '10%', minWidth: '80px' }}>Гостей</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', width: '10%', minWidth: '100px' }}>Счет</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', width: '10%', minWidth: '100px' }}>Оплата</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(s => {
                  const formatTime = (iso: string) => {
                    const d = new Date(iso);
                    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                  };
                  const formatDate = (iso: string) => {
                    const d = new Date(iso);
                    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
                  };

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-2)' }} className="history-row">
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.tableName}</td>
                      <td style={{ padding: '12px 16px' }}>{formatDate(s.checkInTime)}, {formatTime(s.checkInTime)}</td>
                      <td style={{ padding: '12px 16px' }}>{formatTime(s.checkOutTime)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.waiterName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{s.guestsCount}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--fg)' }}>{s.billAmount.toLocaleString('ru-RU')} ₸</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 
                            s.paymentMethod === 'card' ? 'rgba(42, 157, 143, 0.08)' :
                            s.paymentMethod === 'cash' ? 'rgba(244, 162, 97, 0.08)' :
                            s.paymentMethod === 'qr' ? 'rgba(231, 111, 81, 0.08)' : 'rgba(0,0,0,0.06)',
                          color: 
                            s.paymentMethod === 'card' ? '#2a9d8f' :
                            s.paymentMethod === 'cash' ? '#f4a261' :
                            s.paymentMethod === 'qr' ? '#e76f51' : 'var(--muted)'
                        }}>
                          {s.paymentMethod === 'card' && 'Карта'}
                          {s.paymentMethod === 'cash' && 'Наличные'}
                          {s.paymentMethod === 'qr' && 'Kaspi / QR'}
                          {s.paymentMethod === 'none' && 'Списание'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .history-row:hover {
          background: rgba(139, 90, 43, 0.02);
        }
      `}</style>
    </div>
  );
}

interface TasksScreenProps {
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  currentUser: { name: string; role: 'admin' | 'guest'; adminId?: string } | null;
  setToast: (toast: any) => void;
}

export function TasksScreen({ tasks, setTasks, currentUser, setToast }: TasksScreenProps) {
  const [newText, setNewText] = React.useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      text: newText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      assignedBy: currentUser?.name.split(' (')[0] || 'Администратор'
    };

    setTasks(prev => [newTask, ...prev]);
    setNewText('');
    setToast({ message: "Задача добавлена", type: "success" });
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Вы действительно хотите удалить эту задачу?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
      setToast({ message: "Задача удалена", type: "info" });
    }
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4px', fontFamily: 'var(--font)' }}>
      {/* Title */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
          Задачи администрации
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
          Внутренние поручения и список дел для управляющих и администраторов. Гостевой доступ закрыт.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Что нужно сделать? (например: Подготовить топчан 2, Проверить VIP звук...)"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          style={{
            flex: 1,
            height: '42px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elev)',
            color: 'var(--fg)',
            padding: '0 14px',
            fontSize: '13px',
            fontWeight: 500,
            minWidth: '0'
          }}
        />
        <button
          type="submit"
          style={{
            height: '42px',
            padding: '0 20px',
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          Добавить
        </button>
      </form>

      {/* Lists Container */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', overflowY: 'auto' }} className="tasks-layout-grid">
        {/* Active Tasks Column */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Активные дела</span>
            <span style={{ fontSize: '11px', background: 'rgba(231, 111, 81, 0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '10px' }}>
              {activeTasks.length}
            </span>
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeTasks.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Все задачи выполнены! Отличная работа 👍
              </div>
            ) : (
              activeTasks.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.id)}
                      style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--fg-2)', fontWeight: 500, wordBreak: 'break-word', lineHeight: '1.4' }}>
                        {t.text}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        Создал: <strong>{t.assignedBy}</strong> • {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px' }}
                    className="task-delete-btn"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks Column */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Выполненные</span>
            <span style={{ fontSize: '11px', background: 'rgba(42, 157, 143, 0.1)', color: '#2a9d8f', padding: '2px 8px', borderRadius: '10px' }}>
              {completedTasks.length}
            </span>
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedTasks.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                Здесь будут отображаться завершенные дела
              </div>
            ) : (
              completedTasks.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    gap: '10px',
                    opacity: 0.7
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.id)}
                      style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'line-through', wordBreak: 'break-word', lineHeight: '1.4' }}>
                        {t.text}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        Создал: <strong>{t.assignedBy}</strong> • {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px' }}
                    className="task-delete-btn"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .task-delete-btn:hover {
          color: var(--bad) !important;
        }
        @media (max-width: 768px) {
          .tasks-layout-grid {
            grid-template-columns: 1fr !important;
            overflow-y: auto !important;
          }
          .tasks-layout-grid > div {
            max-height: 350px;
          }
        }
      `}</style>
    </div>
  );
}

