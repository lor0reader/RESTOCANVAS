import * as React from 'react';
import { Zone, Table, Booking, Session } from './data';
import { Icon, Modal } from './ui';

interface CanvasProps {
  zones: Zone[];
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>;
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  activeZoneId: string;
  setActiveZoneId: (id: string) => void;
  isAdmin: boolean;
  canEdit: boolean;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  setToast: (toast: any) => void;
  openBookingModalForTable: (tableId: string) => void;
}

export function TableCanvas({
  zones,
  setZones,
  tables,
  setTables,
  bookings,
  setBookings,
  sessions,
  setSessions,
  activeZoneId,
  setActiveZoneId,
  isAdmin,
  canEdit,
  isEditing,
  setIsEditing,
  setToast,
  openBookingModalForTable
}: CanvasProps) {
  // Canvas Viewport pan and zoom
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);
  const [activeDetailsTableId, setActiveDetailsTableId] = React.useState<string | null>(null);

  // Dragging states
  const [dragState, setDragState] = React.useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
    type: 'move' | 'resize' | 'pan';
    originalW?: number;
    originalH?: number;
  } | null>(null);

  // Grid Settings
  const snapToGrid = true;
  const gridSize = 10;

  // Modals
  const [isZoneModalOpen, setIsZoneModalOpen] = React.useState(false);
  const [newZoneName, setNewZoneName] = React.useState('');
  const [newZoneWidth, setNewZoneWidth] = React.useState(850);
  const [newZoneHeight, setNewZoneHeight] = React.useState(500);
  const [isRenameZoneModalOpen, setIsRenameZoneModalOpen] = React.useState(false);
  const [renameZoneName, setRenameZoneName] = React.useState('');
  const [renameZoneWidth, setRenameZoneWidth] = React.useState(850);
  const [renameZoneHeight, setRenameZoneHeight] = React.useState(500);

  // Seating & Checkout Modals State
  const [seatingTableId, setSeatingTableId] = React.useState<string | null>(null);
  const [seatingWaiter, setSeatingWaiter] = React.useState('');
  const [seatingGuestName, setSeatingGuestName] = React.useState('');
  const [seatingGuestsCount, setSeatingGuestsCount] = React.useState(2);

  const [checkoutTableId, setCheckoutTableId] = React.useState<string | null>(null);
  const [checkoutWaiter, setCheckoutWaiter] = React.useState('');
  const [checkoutBillAmount, setCheckoutBillAmount] = React.useState<number>(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = React.useState<'card' | 'cash' | 'qr' | 'none'>('card');
  const [checkoutNotes, setCheckoutNotes] = React.useState('');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  const activeZone = zones.find(z => z.id === activeZoneId) || zones[0];
  const activeTables = tables.filter(t => t.zoneId === activeZoneId);

  // Reset selected table when switching edit mode
  React.useEffect(() => {
    setSelectedTableId(null);
  }, [isEditing]);

  // Adjust zoom to fit container on mount / resize
  const handleAutoFit = () => {
    if (!containerRef.current || !activeZone) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    
    // Fit zone width or height with 20px padding
    const scaleW = (cw - 40) / activeZone.width;
    const scaleH = (ch - 40) / activeZone.height;
    
    const nextZoom = Math.min(scaleW, scaleH, 1.2);
    setZoom(parseFloat(nextZoom.toFixed(2)));
    setPan({
      x: Math.max(0, (cw - activeZone.width * nextZoom) / 2),
      y: Math.max(0, (ch - activeZone.height * nextZoom) / 2)
    });
  };

  React.useEffect(() => {
    handleAutoFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZoneId]);

  // Find active booking for a table
  const getActiveBooking = (tableId: string): Booking | undefined => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return undefined;
    
    // If table is occupied or reserved, find the booking
    return bookings.find(b => 
      b.tableId === tableId && 
      (b.status === 'pending' || b.status === 'seated')
    );
  };

  // Pointer/Touch Down: Start drag or pan
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    type: 'move' | 'resize' | 'pan',
    tableId?: string
  ) => {
    // Prevent scrolling default gestures
    if (type !== 'pan') {
      e.stopPropagation();
    }

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 1) return; // ignore multi-touch zoom for simple pan
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (type === 'pan') {
      setDragState({
        isDragging: true,
        startX: clientX,
        startY: clientY,
        originalX: pan.x,
        originalY: pan.y,
        type: 'pan'
      });
    } else if (tableId && isEditing) {
      const table = tables.find(t => t.id === tableId);
      if (!table) return;
      setSelectedTableId(tableId);

      setDragState({
        isDragging: true,
        startX: clientX,
        startY: clientY,
        originalX: table.x,
        originalY: table.y,
        originalW: table.w,
        originalH: table.h,
        type
      });
    }
  };

  // Pointer/Touch Move: Update position, size or pan
  const handlePointerMove = (e: PointerEvent | TouchEvent) => {
    if (!dragState || !dragState.isDragging) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;

    if (dragState.type === 'pan') {
      setPan({
        x: dragState.originalX + dx,
        y: dragState.originalY + dy
      });
    } else if (selectedTableId && isEditing) {
      setTables(prev => prev.map(t => {
        if (t.id !== selectedTableId) return t;

        if (dragState.type === 'move') {
          // Convert dx/dy in screen pixels to canvas coordinates relative to zoom scale
          let nx = dragState.originalX + dx / zoom;
          let ny = dragState.originalY + dy / zoom;

          // Boundaries
          nx = Math.max(0, Math.min(activeZone.width - t.w, nx));
          ny = Math.max(0, Math.min(activeZone.height - t.h, ny));

          if (snapToGrid) {
            nx = Math.round(nx / gridSize) * gridSize;
            ny = Math.round(ny / gridSize) * gridSize;
          }

          return { ...t, x: nx, y: ny };
        } else if (dragState.type === 'resize' && dragState.originalW && dragState.originalH) {
          let nw = dragState.originalW + dx / zoom;
          let nh = dragState.originalH + dy / zoom;

          // Min sizes
          nw = Math.max(40, Math.min(300, nw));
          nh = Math.max(40, Math.min(300, nh));

          if (snapToGrid) {
            nw = Math.round(nw / gridSize) * gridSize;
            nh = Math.round(nh / gridSize) * gridSize;
          }

          return { ...t, w: nw, h: nh };
        }
        return t;
      }));
    }
  };

  // Pointer/Touch End: Finalize drag
  const handlePointerUp = () => {
    if (dragState?.isDragging) {
      setDragState(null);
    }
  };

  // Setup document-level event listeners for smooth drag & touch end (even if finger moves outside container)
  React.useEffect(() => {
    const handleMove = (e: any) => handlePointerMove(e);
    const handleUp = () => handlePointerUp();

    if (dragState?.isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState, selectedTableId, zoom]);

  // Click on a table
  const handleTableClick = (tableId: string) => {
    if (isEditing) {
      setSelectedTableId(tableId);
    } else {
      setSelectedTableId(tableId);
      setActiveDetailsTableId(tableId);
    }
  };

  // Admin: Add new table
  const handleAddTable = (shape: 'circle' | 'rect' | 'yurt' | 'topchan') => {
    const newId = `tbl-${Date.now()}`;
    const count = activeTables.filter(t => t.shape === shape).length + 1;
    
    let defaultW = 80;
    let defaultH = 80;
    let defaultCapacity = 4;
    let prefix = "Стол";

    if (shape === 'yurt') {
      defaultW = 140;
      defaultH = 140;
      defaultCapacity = 10;
      prefix = "Юрта";
    } else if (shape === 'topchan') {
      defaultW = 120;
      defaultH = 100;
      defaultCapacity = 6;
      prefix = "Топчан";
    } else if (shape === 'circle') {
      prefix = "Стол (круг)";
    }

    const newTable: Table = {
      id: newId,
      name: `${prefix} ${count}`,
      zoneId: activeZoneId,
      x: Math.round((activeZone.width / 2 - defaultW / 2) / gridSize) * gridSize,
      y: Math.round((activeZone.height / 2 - defaultH / 2) / gridSize) * gridSize,
      w: defaultW,
      h: defaultH,
      shape,
      capacity: defaultCapacity,
      rotation: 0,
      status: 'free'
    };

    setTables(prev => [...prev, newTable]);
    setSelectedTableId(newId);
    setToast({ message: `Добавлен ${newTable.name}`, type: 'success' });
  };

  // Admin: Delete table
  const handleDeleteTable = (id: string) => {
    if (!confirm("Удалить этот столик со схемы?")) return;
    setTables(prev => prev.filter(t => t.id !== id));
    // Cancel linked bookings
    setBookings(prev => prev.map(b => b.tableId === id ? { ...b, status: 'cancelled' as const } : b));
    setSelectedTableId(null);
    setToast({ message: "Столик удален", type: 'info' });
  };

  // Admin: Rotate table
  const handleRotateTable = (id: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, rotation: ((t.rotation + 90) % 360) as 0 | 90 | 180 | 270 };
    }));
  };

  // Admin: Toggle table shape
  const handleToggleShape = (id: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, shape: t.shape === 'circle' ? 'rect' : 'circle' };
    }));
  };

  // Admin: Move table with Virtual D-pad nudge
  const handleNudge = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedTableId) return;
    setTables(prev => prev.map(t => {
      if (t.id !== selectedTableId) return t;
      let nx = t.x;
      let ny = t.y;
      const step = snapToGrid ? gridSize : 5;

      if (dir === 'up') ny = Math.max(0, ny - step);
      if (dir === 'down') ny = Math.min(activeZone.height - t.h, ny + step);
      if (dir === 'left') nx = Math.max(0, nx - step);
      if (dir === 'right') nx = Math.min(activeZone.width - t.w, nx + step);

      return { ...t, x: nx, y: ny };
    }));
  };

  // Switch table status (interactive mode)
  const handleStatusChange = (tableId: string, status: Table['status']) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, status };
    }));
    setToast({ message: `Статус стола изменен`, type: 'success' });
  };

  // Seating guest modal actions
  const handleOpenSeating = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const activeBooking = getActiveBooking(tableId);

    setSeatingTableId(tableId);
    
    // Determine default waiter name
    let defaultWaiter = '';
    const savedUser = localStorage.getItem('resto.currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.role === 'admin') {
          defaultWaiter = user.name.split(' (')[0];
        }
      } catch (e) {}
    }
    if (!defaultWaiter) {
      defaultWaiter = localStorage.getItem('resto.lastWaiter') || '';
    }
    setSeatingWaiter(defaultWaiter);

    setSeatingGuestName(activeBooking ? activeBooking.guestName : 'Гость (Walk-in)');
    setSeatingGuestsCount(activeBooking ? activeBooking.guestsCount : table.capacity);
    setActiveDetailsTableId(null);
  };

  const handleConfirmSeating = () => {
    if (!seatingTableId) return;
    const activeBooking = getActiveBooking(seatingTableId);

    // Save waiter name to localStorage to prevent retyping on next seating
    if (seatingWaiter.trim()) {
      localStorage.setItem('resto.lastWaiter', seatingWaiter.trim());
    }

    if (activeBooking && activeBooking.status === 'pending') {
      // Seat the reservation
      setBookings(prev => prev.map(b => 
        b.id === activeBooking.id ? { 
          ...b, 
          status: 'seated' as const, 
          waiterName: seatingWaiter || 'Официант',
          checkInTime: new Date().toISOString()
        } : b
      ));
    } else {
      // Walk-in booking session
      const newBookingId = `b-walkin-${Date.now()}`;
      const newWalkin: Booking = {
        id: newBookingId,
        tableId: seatingTableId,
        guestName: seatingGuestName || 'Гость',
        guestPhone: '—',
        guestsCount: seatingGuestsCount,
        dateTime: new Date().toISOString(),
        status: 'seated' as const,
        createdAt: new Date().toISOString(),
        waiterName: seatingWaiter || 'Официант',
        checkInTime: new Date().toISOString()
      };
      setBookings(prev => [...prev, newWalkin]);
    }

    setTables(prev => prev.map(t => t.id === seatingTableId ? { ...t, status: 'occupied' } : t));
    setToast({ message: "Гости посажены за столик", type: "success" });
    setSeatingTableId(null);
  };

  // Checkout payment modal actions
  const handleOpenCheckout = (tableId: string) => {
    const activeBooking = getActiveBooking(tableId);
    setCheckoutTableId(tableId);
    setCheckoutWaiter(activeBooking?.waiterName || '');
    setCheckoutBillAmount(0);
    setCheckoutPaymentMethod('card');
    setCheckoutNotes('');
    setActiveDetailsTableId(null);
  };

  const handleConfirmCheckout = () => {
    if (!checkoutTableId) return;
    const table = tables.find(t => t.id === checkoutTableId);
    const activeBooking = getActiveBooking(checkoutTableId);
    if (!table) return;

    // 1. Mark booking as completed
    if (activeBooking) {
      setBookings(prev => prev.map(b => 
        b.id === activeBooking.id ? { ...b, status: 'completed' as const } : b
      ));
    }

    // 2. Add completed session to sessions history
    const zone = zones.find(z => z.id === table.zoneId);
    const newSession: Session = {
      id: `s-${Date.now()}`,
      tableId: checkoutTableId,
      tableName: `${table.name} (${zone ? zone.name : ''})`,
      guestName: activeBooking ? activeBooking.guestName : 'Гость',
      guestsCount: activeBooking ? activeBooking.guestsCount : table.capacity,
      checkInTime: activeBooking?.checkInTime || activeBooking?.dateTime || new Date(Date.now() - 3600000).toISOString(),
      checkOutTime: new Date().toISOString(),
      waiterName: checkoutWaiter || activeBooking?.waiterName || 'Официант',
      paymentMethod: checkoutPaymentMethod,
      billAmount: checkoutBillAmount || 0,
      notes: checkoutNotes.trim()
    };

    setSessions(prev => [newSession, ...prev]);

    // 3. Mark table status as cleaning
    setTables(prev => prev.map(t => t.id === checkoutTableId ? { ...t, status: 'cleaning' as const } : t));

    setToast({ message: `Стол закрыт. Способ оплаты: ${checkoutPaymentMethod === 'card' ? 'Карта' : checkoutPaymentMethod === 'cash' ? 'Наличные' : checkoutPaymentMethod === 'qr' ? 'Kaspi / QR' : 'Списание'}`, type: 'success' });
    setCheckoutTableId(null);
  };

  // Admin: Add Zone
  const handleAddZone = () => {
    if (!newZoneName.trim()) return;
    const newId = `zone-${Date.now()}`;
    const newZone: Zone = {
      id: newId,
      name: newZoneName.trim(),
      width: Number(newZoneWidth) || 850,
      height: Number(newZoneHeight) || 500
    };

    setZones(prev => [...prev, newZone]);
    setActiveZoneId(newId);
    setNewZoneName('');
    setNewZoneWidth(850);
    setNewZoneHeight(500);
    setIsZoneModalOpen(false);
    setToast({ message: `Добавлен зал "${newZone.name}"`, type: 'success' });
  };

  // Admin: Rename Zone
  const handleRenameZone = () => {
    if (!renameZoneName.trim()) return;
    setZones(prev => prev.map(z => z.id === activeZoneId ? { 
      ...z, 
      name: renameZoneName.trim(),
      width: Number(renameZoneWidth) || 850,
      height: Number(renameZoneHeight) || 500
    } : z));
    setIsRenameZoneModalOpen(false);
    setToast({ message: "Настройки зала сохранены", type: 'success' });
  };

  // Admin: Delete Zone
  const handleDeleteZone = () => {
    if (zones.length <= 1) {
      setToast({ message: "Нельзя удалить единственный зал", type: 'error' });
      return;
    }
    if (!confirm(`Удалить зал "${activeZone.name}" и все столы в нем?`)) return;

    setZones(prev => prev.filter(z => z.id !== activeZoneId));
    setTables(prev => prev.filter(t => t.zoneId !== activeZoneId));
    setActiveZoneId(zones.find(z => z.id !== activeZoneId)!.id);
    setToast({ message: "Зал удален", type: 'info' });
  };

  const selectedTableObj = tables.find(t => t.id === selectedTableId);
  const detailsTableObj = tables.find(t => t.id === activeDetailsTableId);
  const activeBookingObj = activeDetailsTableId ? getActiveBooking(activeDetailsTableId) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Editor toolbar for admins */}
      {isEditing && isAdmin && (
        <div className="editor-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>РЕЖИМ РЕДАКТОРА:</span>
            <button className="btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAddTable('rect')}>
              <Icon name="plus" size={14} />
              <span>Добавить прямоугольный</span>
            </button>
            <button className="btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAddTable('circle')}>
              <Icon name="plus" size={14} />
              <span>Добавить круглый</span>
            </button>
            <button className="btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAddTable('topchan')}>
              <Icon name="plus" size={14} />
              <span>Добавить топчан</span>
            </button>
            <button className="btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAddTable('yurt')}>
              <Icon name="plus" size={14} />
              <span>Добавить юрту</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn" style={{ padding: '6px 12px' }} onClick={() => { 
              setRenameZoneName(activeZone.name); 
              setRenameZoneWidth(activeZone.width);
              setRenameZoneHeight(activeZone.height);
              setIsRenameZoneModalOpen(true); 
            }}>
              <Icon name="edit" size={14} />
              <span style={{ marginLeft: '4px' }}>Зал</span>
            </button>
            <button className="btn danger" style={{ padding: '6px 12px', marginRight: '6px' }} onClick={handleDeleteZone} title="Удалить зал">
              <Icon name="trash" size={14} />
            </button>
            <button className="btn danger" style={{ padding: '6px 12px', borderColor: 'var(--accent)' }} onClick={() => {
              if (confirm("Вы действительно хотите удалить все столы в этом зале и расставить заново вручную?")) {
                setTables(prev => prev.filter(t => t.zoneId !== activeZoneId));
                setSelectedTableId(null);
                setToast({ message: "Все столы в зале удалены", type: "info" });
              }
            }} title="Очистить зал (сбросить все столы)">
              <span>Очистить зал</span>
            </button>
          </div>
        </div>
      )}

      {/* Zone Switch Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elev)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '4px' }} className="no-scrollbar">
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => setActiveZoneId(zone.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeZoneId === zone.id ? 'var(--accent)' : 'var(--border-strong)',
                background: activeZoneId === zone.id ? 'var(--accent)' : 'transparent',
                color: activeZoneId === zone.id ? 'white' : 'var(--fg)',
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {zone.name}
            </button>
          ))}
          {isEditing && isAdmin && (
            <button
              onClick={() => setIsZoneModalOpen(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1.5px dashed var(--border-strong)',
                background: 'transparent',
                color: 'var(--muted)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Icon name="plus" size={14} />
              <span>Зал</span>
            </button>
          )}
        </div>

        {/* Edit Button */}
        {isAdmin && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: isEditing ? 'var(--bg-muted)' : 'var(--bg-elev)',
              color: isEditing ? 'var(--accent)' : 'var(--fg)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '12px'
            }}
          >
            <Icon name={isEditing ? "check" : "edit"} size={14} />
            <span style={{ display: 'inline' }}>
              {isEditing ? "Готово" : "Редактор"}
            </span>
          </button>
        )}
      </div>

      {/* Main Canvas Viewport container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg)',
          cursor: dragState?.type === 'pan' ? 'grabbing' : 'grab'
        }}
        onPointerDown={(e) => {
          // Only pan if clicking on empty container background
          if (e.target === containerRef.current || e.target === viewportRef.current) {
            handlePointerDown(e, 'pan');
          }
        }}
        onTouchStart={(e) => {
          if (e.target === containerRef.current || e.target === viewportRef.current) {
            handlePointerDown(e, 'pan');
          }
        }}
      >
        <div
          ref={viewportRef}
          className="canvas-viewport"
          style={{
            width: `${activeZone.width}px`,
            height: `${activeZone.height}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            position: 'absolute',
            top: 0,
            left: 0,
            border: isEditing ? '1px dashed var(--accent)' : 'none',
            background: 'var(--bg-elev)',
            backgroundImage: 'radial-gradient(var(--border) 1.5px, transparent 1.5px)',
            backgroundSize: '20px 20px',
            boxShadow: 'var(--shadow)',
            borderRadius: '4px'
          }}
        >
          {/* Tables layout */}
          {activeTables.map(table => {
            const isSelected = selectedTableId === table.id;
            const hasBooking = getActiveBooking(table.id);
            let displayStatus = table.status;
            
            // Auto align status if there's a reservation pending
            if (hasBooking && hasBooking.status === 'pending' && table.status === 'free') {
              displayStatus = 'reserved';
            }

            return (
              <div
                key={table.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableClick(table.id);
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move', table.id)}
                onTouchStart={(e) => handlePointerDown(e, 'move', table.id)}
                className={`canvas-table ${table.shape === 'yurt' ? 'circle yurt' : table.shape === 'topchan' ? 'rect topchan' : table.shape} status-${displayStatus} ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: `${table.w}px`,
                  height: `${table.h}px`,
                  transform: `rotate(${table.rotation}deg)`,
                  position: 'absolute'
                }}
              >
                {/* Visual seats representation */}
                <div style={{ transform: `rotate(${-table.rotation}deg)`, zIndex: 5, position: 'relative' }}>
                  <div className="table-name" style={{ fontSize: table.shape === 'yurt' ? '14px' : '12px' }}>{table.name}</div>
                  <div className="table-capacity">
                    <Icon name="user" size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                    {table.capacity}
                  </div>
                  {displayStatus === 'occupied' && hasBooking?.waiterName && (
                    <div style={{ fontSize: '9px', color: 'inherit', opacity: 0.85, fontWeight: 600, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: `${table.w - 8}px` }}>
                      {hasBooking.waiterName}
                    </div>
                  )}
                </div>

                {/* Yurt shanyrak roof details */}
                {table.shape === 'yurt' && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.25, pointerEvents: 'none', color: 'inherit' }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="50" y1="5" x2="50" y2="38" stroke="currentColor" strokeWidth="2" />
                    <line x1="50" y1="62" x2="50" y2="95" stroke="currentColor" strokeWidth="2" />
                    <line x1="5" y1="50" x2="38" y2="50" stroke="currentColor" strokeWidth="2" />
                    <line x1="62" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2" />
                    <line x1="18" y1="18" x2="41" y2="41" stroke="currentColor" strokeWidth="2" />
                    <line x1="59" y1="59" x2="82" y2="82" stroke="currentColor" strokeWidth="2" />
                    <line x1="18" y1="82" x2="41" y2="59" stroke="currentColor" strokeWidth="2" />
                    <line x1="59" y1="41" x2="82" y2="18" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}

                {/* Topchan platform cushion details */}
                {table.shape === 'topchan' && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.3, pointerEvents: 'none', color: 'inherit' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="25" y="25" width="50" height="50" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="5" y1="5" x2="95" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="5" y1="95" x2="95" y2="95" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="5" y1="5" x2="5" y2="95" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="95" y1="5" x2="95" y2="95" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  </svg>
                )}

                {/* Resize Handle (only in editor mode, bottom right corner) */}
                {isEditing && isSelected && (
                  <div
                    className="canvas-drag-handle"
                    onPointerDown={(e) => handlePointerDown(e, 'resize', table.id)}
                    onTouchStart={(e) => handlePointerDown(e, 'resize', table.id)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Viewport Scale Controls overlay */}
        <div className="canvas-controls">
          <button className="canvas-btn" onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}>
            <Icon name="plus" size={16} />
          </button>
          <button className="canvas-btn" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}>
            <span style={{ fontSize: '20px', lineHeight: 0 }}>-</span>
          </button>
          <button className="canvas-btn" onClick={handleAutoFit} style={{ fontSize: '11px' }}>
            FIT
          </button>
        </div>

        {/* Virtual D-pad nudge controls for phone users in Editor Mode */}
        {isEditing && selectedTableObj && (
          <div className="mobile-dpad">
            <button className="dpad-btn" style={{ gridArea: 'up' }} onClick={() => handleNudge('up')}>
              <Icon name="chevron-down" size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button className="dpad-btn" style={{ gridArea: 'left' }} onClick={() => handleNudge('left')}>
              <Icon name="arrow-left" size={16} />
            </button>
            <button className="dpad-btn" style={{ gridArea: 'center' }} onClick={() => handleRotateTable(selectedTableObj.id)}>
              <Icon name="rotate" size={14} />
            </button>
            <button className="dpad-btn" style={{ gridArea: 'right' }} onClick={() => handleNudge('right')}>
              <Icon name="arrow-right" size={16} />
            </button>
            <button className="dpad-btn" style={{ gridArea: 'down' }} onClick={() => handleNudge('down')}>
              <Icon name="chevron-down" size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Editor sidebar/control panel (when table is selected in editor mode) */}
      {isEditing && selectedTableObj && (
        <div
          className="table-properties-panel"
          style={{
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--border)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            zIndex: 40,
            flexShrink: 0
          }}
        >
          <div className="prop-group-main" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>НАЗВАНИЕ СТОЛА</span>
              <input
                type="text"
                value={selectedTableObj.name}
                onChange={(e) => setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, name: e.target.value } : t))}
                style={{
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  padding: '0 8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  width: '120px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>ВМЕСТИМОСТЬ (МЕСТ)</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[2, 4, 6, 8, 10].map(cap => (
                  <button
                    key={cap}
                    onClick={() => setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, capacity: cap } : t))}
                    style={{
                      height: '32px',
                      width: '32px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: selectedTableObj.capacity === cap ? 'var(--accent)' : 'var(--border-strong)',
                      background: selectedTableObj.capacity === cap ? 'var(--accent)' : 'transparent',
                      color: selectedTableObj.capacity === cap ? 'white' : 'var(--fg)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>ТИП / ФОРМА</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['rect', 'circle', 'topchan', 'yurt'] as const).map(sh => (
                  <button
                    key={sh}
                    onClick={() => {
                      let w = selectedTableObj.w;
                      let h = selectedTableObj.h;
                      let capacity = selectedTableObj.capacity;
                      if (sh === 'yurt' && selectedTableObj.shape !== 'yurt') {
                        w = 140; h = 140; capacity = 10;
                      } else if (sh === 'topchan' && selectedTableObj.shape !== 'topchan') {
                        w = 120; h = 100; capacity = 6;
                      } else if ((sh === 'rect' || sh === 'circle') && selectedTableObj.shape !== 'rect' && selectedTableObj.shape !== 'circle') {
                        w = 80; h = 80; capacity = 4;
                      }
                      setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, shape: sh, w, h, capacity } : t));
                    }}
                    style={{
                      height: '32px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: selectedTableObj.shape === sh ? 'var(--accent)' : 'var(--border-strong)',
                      background: selectedTableObj.shape === sh ? 'var(--accent)' : 'transparent',
                      color: selectedTableObj.shape === sh ? 'white' : 'var(--fg)',
                      fontWeight: 600,
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {sh === 'rect' && 'Квадрат'}
                    {sh === 'circle' && 'Круг'}
                    {sh === 'topchan' && 'Топчан'}
                    {sh === 'yurt' && 'Юрта'}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual table dimension and coordinate inputs */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-muted)', padding: '6px 12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 600 }}>ШИРИНА (PX)</span>
                <input
                  type="number"
                  min={40}
                  max={400}
                  value={selectedTableObj.w}
                  onChange={(e) => {
                    const val = Math.max(40, Math.min(400, Number(e.target.value) || 40));
                    setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, w: val } : t));
                  }}
                  style={{ height: '28px', borderRadius: '4px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 6px', fontWeight: 600, fontSize: '11px', width: '55px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 600 }}>ВЫСОТА (PX)</span>
                <input
                  type="number"
                  min={40}
                  max={400}
                  value={selectedTableObj.h}
                  onChange={(e) => {
                    const val = Math.max(40, Math.min(400, Number(e.target.value) || 40));
                    setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, h: val } : t));
                  }}
                  style={{ height: '28px', borderRadius: '4px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 6px', fontWeight: 600, fontSize: '11px', width: '55px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 600 }}>Х-КООРД</span>
                <input
                  type="number"
                  min={0}
                  value={selectedTableObj.x}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, x: val } : t));
                  }}
                  style={{ height: '28px', borderRadius: '4px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 6px', fontWeight: 600, fontSize: '11px', width: '55px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 600 }}>Y-КООРД</span>
                <input
                  type="number"
                  min={0}
                  value={selectedTableObj.y}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setTables(prev => prev.map(t => t.id === selectedTableObj.id ? { ...t, y: val } : t));
                  }}
                  style={{ height: '28px', borderRadius: '4px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 6px', fontWeight: 600, fontSize: '11px', width: '55px' }}
                />
              </div>
            </div>
          </div>

          <button
            className="btn danger"
            style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => handleDeleteTable(selectedTableObj.id)}
          >
            <Icon name="trash" size={14} />
            <span>Удалить стол</span>
          </button>
        </div>
      )}

      {/* Modal - Zone Settings (Add Zone) */}
      <Modal isOpen={isZoneModalOpen} onClose={() => setIsZoneModalOpen(false)} title="Добавить новый зал">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--fg-2)' }}>
              Название зала (например: Кальянная, Веранда)
            </label>
            <input
              type="text"
              placeholder="Введите название..."
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                padding: '0 12px',
                fontSize: '14px',
                fontWeight: 500
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--fg-2)' }}>Ширина зала (px)</label>
              <input
                type="number"
                min={400}
                max={3000}
                value={newZoneWidth}
                onChange={(e) => setNewZoneWidth(parseInt(e.target.value) || 850)}
                style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 12px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--fg-2)' }}>Высота зала (px)</label>
              <input
                type="number"
                min={300}
                max={3000}
                value={newZoneHeight}
                onChange={(e) => setNewZoneHeight(parseInt(e.target.value) || 500)}
                style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 12px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn" style={{ padding: '8px 16px' }} onClick={() => setIsZoneModalOpen(false)}>Отмена</button>
            <button className="btn primary" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none' }} onClick={handleAddZone}>Добавить</button>
          </div>
        </div>
      </Modal>

      {/* Modal - Zone Settings (Edit Zone) */}
      <Modal isOpen={isRenameZoneModalOpen} onClose={() => setIsRenameZoneModalOpen(false)} title="Настройки зала">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--fg-2)' }}>
              Название зала
            </label>
            <input
              type="text"
              value={renameZoneName}
              onChange={(e) => setRenameZoneName(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                padding: '0 12px',
                fontSize: '14px',
                fontWeight: 500
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--fg-2)' }}>Ширина зала (px)</label>
              <input
                type="number"
                min={400}
                max={3000}
                value={renameZoneWidth}
                onChange={(e) => setRenameZoneWidth(parseInt(e.target.value) || 850)}
                style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 12px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--fg-2)' }}>Высота зала (px)</label>
              <input
                type="number"
                min={300}
                max={3000}
                value={renameZoneHeight}
                onChange={(e) => setRenameZoneHeight(parseInt(e.target.value) || 500)}
                style={{ width: '100%', height: '40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 12px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn" style={{ padding: '8px 16px' }} onClick={() => setIsRenameZoneModalOpen(false)}>Отмена</button>
            <button className="btn primary" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none' }} onClick={handleRenameZone}>Сохранить</button>
          </div>
        </div>
      </Modal>

      {/* Modal - Table details (Interactive Mode) */}
      <Modal
        isOpen={activeDetailsTableId !== null}
        onClose={() => setActiveDetailsTableId(null)}
        title={detailsTableObj ? `${detailsTableObj.name} — Детали` : 'Детали стола'}
      >
        {detailsTableObj && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>ВМЕСТИМОСТЬ</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)' }}>{detailsTableObj.capacity} человек</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>ТЕКУЩИЙ СТАТУС</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 
                        detailsTableObj.status === 'free' ? '#2a9d8f' :
                        detailsTableObj.status === 'occupied' ? '#e76f51' :
                        detailsTableObj.status === 'reserved' ? '#f4a261' : '#b5838d'
                    }}
                  />
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>
                    {detailsTableObj.status === 'free' && 'Свободен'}
                    {detailsTableObj.status === 'occupied' && 'Занят'}
                    {detailsTableObj.status === 'reserved' && 'Забронирован'}
                    {detailsTableObj.status === 'cleaning' && 'Грязный / Уборка'}
                  </span>
                </div>
              </div>
            </div>

            {/* If there is active booking */}
            {activeBookingObj ? (
              <div style={{ padding: '12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Icon name="calendar" size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fg-2)' }}>АКТИВНАЯ БРОНЬ</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>ГОСТЬ</span>
                    <strong style={{ color: 'var(--fg)' }}>{activeBookingObj.guestName}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>ТЕЛЕФОН</span>
                    <span style={{ color: 'var(--fg)', fontFamily: 'var(--mono)' }}>{activeBookingObj.guestPhone}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>ВРЕМЯ</span>
                    <strong style={{ color: 'var(--fg)' }}>
                      {new Date(activeBookingObj.dateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>КОЛИЧЕСТВО</span>
                    <span style={{ color: 'var(--fg)' }}>{activeBookingObj.guestsCount} человек</span>
                  </div>
                </div>
                {activeBookingObj.notes && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>ЗАМЕТКИ</span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--fg-2)', fontStyle: 'italic' }}>{activeBookingObj.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                Нет активных бронирований на текущую смену
              </div>
            )}

            {/* Quick Status actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>БЫСТРЫЕ ДЕЙСТВИЯ</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  className="btn"
                  style={{
                    height: '42px',
                    borderColor: '#2a9d8f',
                    color: '#2a9d8f',
                    background: detailsTableObj.status === 'free' ? 'rgba(42,157,143,0.08)' : 'transparent',
                    fontWeight: 700
                  }}
                  onClick={() => handleStatusChange(detailsTableObj.id, 'free')}
                >
                  Освободить
                </button>
                <button
                  className="btn"
                  style={{
                    height: '42px',
                    borderColor: '#b5838d',
                    color: '#b5838d',
                    background: detailsTableObj.status === 'cleaning' ? 'rgba(181,131,141,0.08)' : 'transparent',
                    fontWeight: 700
                  }}
                  onClick={() => handleStatusChange(detailsTableObj.id, 'cleaning')}
                >
                  Грязный / Уборка
                </button>
              </div>

              {detailsTableObj.status !== 'occupied' ? (
                <button
                  className="btn"
                  style={{
                    height: '44px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => handleOpenSeating(detailsTableObj.id)}
                >
                  <Icon name="check" size={16} />
                  <span>Посадить гостей (Занять)</span>
                </button>
              ) : (
                <button
                  className="btn"
                  style={{
                    height: '44px',
                    borderColor: 'var(--border-strong)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => handleOpenCheckout(detailsTableObj.id)}
                >
                  <Icon name="x" size={16} style={{ color: 'var(--bad)' }} />
                  <span>Расчет / Освободить стол</span>
                </button>
              )}

              <button
                className="btn"
                style={{
                  height: '44px',
                  borderColor: 'var(--border-strong)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => {
                  setActiveDetailsTableId(null);
                  openBookingModalForTable(detailsTableObj.id);
                }}
              >
                <Icon name="calendar" size={16} />
                <span>Создать бронь на время</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal - Seating guests */}
      <Modal
        isOpen={seatingTableId !== null}
        onClose={() => setSeatingTableId(null)}
        title={tables.find(t => t.id === seatingTableId) ? `Посадка: ${tables.find(t => t.id === seatingTableId)?.name}` : "Посадка гостей"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Официант *</label>
            <input
              type="text"
              placeholder="Имя официанта (кто обслуживает)..."
              value={seatingWaiter}
              onChange={(e) => setSeatingWaiter(e.target.value)}
              style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Имя гостя</label>
            <input
              type="text"
              value={seatingGuestName}
              onChange={(e) => setSeatingGuestName(e.target.value)}
              style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Количество гостей</label>
            <input
              type="number"
              min={1}
              value={seatingGuestsCount}
              onChange={(e) => setSeatingGuestsCount(parseInt(e.target.value) || 1)}
              style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn" onClick={() => setSeatingTableId(null)}>Отмена</button>
            <button className="btn primary" style={{ background: 'var(--accent)', color: 'white', border: 'none' }} onClick={handleConfirmSeating}>
              Открыть стол
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal - Checkout payment */}
      <Modal
        isOpen={checkoutTableId !== null}
        onClose={() => setCheckoutTableId(null)}
        title={tables.find(t => t.id === checkoutTableId) ? `Расчет: ${tables.find(t => t.id === checkoutTableId)?.name}` : "Расчет стола"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-muted)', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
            <div>Официант: <strong>{checkoutWaiter || 'Не указан'}</strong></div>
            <div>Время открытия: <strong>{checkoutTableId && getActiveBooking(checkoutTableId) ? new Date(getActiveBooking(checkoutTableId)!.checkInTime || getActiveBooking(checkoutTableId)!.dateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Способ оплаты *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(['card', 'cash', 'qr', 'none'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  className={`btn ${checkoutPaymentMethod === method ? 'primary' : ''}`}
                  style={{
                    height: '36px',
                    borderColor: checkoutPaymentMethod === method ? 'var(--accent)' : 'var(--border-strong)',
                    background: checkoutPaymentMethod === method ? 'var(--accent)' : 'transparent',
                    color: checkoutPaymentMethod === method ? 'white' : 'var(--fg)',
                    padding: 0
                  }}
                  onClick={() => setCheckoutPaymentMethod(method)}
                >
                  {method === 'card' && 'Карта'}
                  {method === 'cash' && 'Наличные'}
                  {method === 'qr' && 'Kaspi / QR'}
                  {method === 'none' && 'Списание / Персонал'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Заметки к закрытию</label>
            <input
              type="text"
              placeholder="Например: скидка 10% или чаевые..."
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn" onClick={() => setCheckoutTableId(null)}>Отмена</button>
            <button className="btn primary" style={{ background: '#2a9d8f', color: 'white', border: 'none' }} onClick={handleConfirmCheckout}>
              Провести расчет
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .btn {
          height: 36px;
          padding: 0 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-strong);
          background: var(--bg-elev);
          color: var(--fg);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn:hover {
          background: var(--bg-muted);
          transform: translateY(-1px);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn.primary {
          background: var(--accent);
          color: white;
          border: none;
        }
        .btn.danger {
          border-color: rgba(231, 111, 81, 0.4);
          color: #e76f51;
        }
        .btn.danger:hover {
          background: rgba(231, 111, 81, 0.05);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
