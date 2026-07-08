"use client";

import * as React from 'react';
import { ZONES, TABLES, BOOKINGS, SESSIONS, DEFAULT_APP_CONFIG, DB_KEYS, Zone, Table, Booking, Session, TaskItem } from './data';
import { Icon, Toast } from './ui';
import { LoginScreen } from './auth';
import { TableCanvas } from './canvas';
import { BookingsScreen, DashboardScreen, HistoryScreen, TasksScreen } from './screens-main';

export default function RestoApp() {
  const [currentUser, setCurrentUser] = React.useState<{ name: string; role: 'admin' | 'guest'; adminId?: string } | null>(null);
  const [route, setRoute] = React.useState<'canvas' | 'bookings' | 'history' | 'dashboard' | 'tasks'>('canvas');
  
  // App state
  const [zones, setZones] = React.useState<Zone[]>(ZONES);
  const [tables, setTables] = React.useState<Table[]>(TABLES);
  const [bookings, setBookings] = React.useState<Booking[]>(BOOKINGS);
  const [sessions, setSessions] = React.useState<Session[]>(SESSIONS);
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [appConfig, setAppConfig] = React.useState(DEFAULT_APP_CONFIG);
  
  const [activeZoneId, setActiveZoneId] = React.useState('zone-1');
  const [isEditing, setIsEditing] = React.useState(false);
  const [prefilledTableId, setPrefilledTableId] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Sync state variables
  const [syncStatus, setSyncStatus] = React.useState<{ phase: 'synced' | 'loading' | 'saving' | 'error'; label: string; details?: string }>({
    phase: 'loading',
    label: 'Синхронизация...'
  });
  
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [isLoaded, setIsLoaded] = React.useState(false);
  const isPollingRef = React.useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Load active user from localStorage on mount
  React.useEffect(() => {
    try {
      const savedUser = localStorage.getItem('resto.currentUser');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      
      const savedTheme = localStorage.getItem('resto.theme');
      if (savedTheme) {
        setAppConfig(prev => ({ ...prev, theme: savedTheme }));
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        document.documentElement.setAttribute('data-theme', 'resto');
      }
    } catch (e) {
      console.error("Failed to load user/theme", e);
    }
  }, []);

  // Sync theme attribute to HTML document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', appConfig.theme);
    localStorage.setItem('resto.theme', appConfig.theme);
  }, [appConfig.theme]);

  // Waiters routing restriction redirect
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && (route === 'history' || route === 'dashboard' || route === 'tasks')) {
      setRoute('canvas');
    }
  }, [route, currentUser]);

  // Save current user to localStorage
  const handleSetCurrentUser = (user: typeof currentUser) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('resto.currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('resto.currentUser');
      setIsEditing(false); // automatically exit edit mode on logout
    }
  };

  // -------------------------------------------------------------
  // Backend Sync Layer
  // -------------------------------------------------------------

  // 1. Initial State Fetch
  React.useEffect(() => {
    const fetchState = async () => {
      setSyncStatus({ phase: 'loading', label: 'Загрузка...' });
      try {
        const res = await fetch(`/api/restaurant/state?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Ошибка связи с сервером');
        const payload = await res.json();
        
        if (payload && payload.data) {
          const data = payload.data;
          
          if (Array.isArray(data.zones)) setZones(data.zones);
          if (Array.isArray(data.tables)) setTables(data.tables);
          if (Array.isArray(data.bookings)) setBookings(data.bookings);
          if (Array.isArray(data.sessions)) setSessions(data.sessions);
          if (Array.isArray(data.tasks)) setTasks(data.tasks);
          if (data.appConfig) setAppConfig(prev => ({ ...prev, ...data.appConfig }));
          
          if (Array.isArray(data.zones) && data.zones.length > 0) {
            setActiveZoneId(data.zones[0].id);
          }
          
          setSyncStatus({ phase: 'synced', label: payload.mode === 'supabase' ? 'Supabase' : 'Локально' });
        } else {
          // Fresh init on server, let's write seeded data to server
          await saveStateToServer({ zones: ZONES, tables: TABLES, bookings: BOOKINGS, appConfig: DEFAULT_APP_CONFIG, sessions: SESSIONS, tasks: [] });
          setSyncStatus({ phase: 'synced', label: 'Локально' });
        }
        
        setIsLoaded(true);
      } catch (err: any) {
        console.error("Failed to load state", err);
        setSyncStatus({ phase: 'error', label: 'Оффлайн', details: err?.message || String(err) });
        setIsLoaded(true); // fall back to seeds
      }
    };
    
    fetchState();
  }, []);

  // Background polling for real-time synchronization across devices (runs every 3.5 seconds)
  React.useEffect(() => {
    const interval = setInterval(async () => {
      // Don't poll if document is hidden, or if we have unsaved local changes, or are actively editing canvas
      if (document.hidden || hasUnsavedChanges || isEditing || !isLoaded) {
        return;
      }

      try {
        const res = await fetch(`/api/restaurant/state?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        
        if (payload && payload.data) {
          const data = payload.data;
          isPollingRef.current = true; // lock auto-save during updates
          
          if (Array.isArray(data.zones)) setZones(data.zones);
          if (Array.isArray(data.tables)) setTables(data.tables);
          if (Array.isArray(data.bookings)) setBookings(data.bookings);
          if (Array.isArray(data.sessions)) setSessions(data.sessions);
          if (Array.isArray(data.tasks)) setTasks(data.tasks);
        }
      } catch (err) {
        console.error("Error polling state updates", err);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, isEditing, isLoaded]);

  // 2. Debounced Auto-Save triggering on state updates
  const saveStateToServer = async (snapshot: { zones: Zone[]; tables: Table[]; bookings: Booking[]; appConfig: typeof DEFAULT_APP_CONFIG; sessions: Session[]; tasks: TaskItem[] }) => {
    try {
      setSyncStatus({ phase: 'saving', label: 'Сохранение...' });
      const res = await fetch('/api/restaurant/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...snapshot,
            _meta: {
              app: 'RestoCanvas',
              savedAt: new Date().toISOString(),
              source: 'local-network'
            }
          }
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Ошибка при сохранении');
      setSyncStatus({ phase: 'synced', label: payload.mode === 'supabase' ? 'Supabase' : 'Сервер' });
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error("Failed to save state", err);
      setSyncStatus({ phase: 'error', label: 'Оффлайн', details: err?.message || String(err) });
    }
  };

  const isMounted = React.useRef(false);
  const saveTimer = React.useRef<any>(null);

  React.useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!isLoaded) return;
    
    if (isPollingRef.current) {
      isPollingRef.current = false;
      return;
    }
    
    setHasUnsavedChanges(true);
    
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveStateToServer({ zones, tables, bookings, appConfig, sessions, tasks });
    }, 2000); // debounce autosave to 2 seconds to let manual save take priority

    return () => clearTimeout(saveTimer.current);
  }, [zones, tables, bookings, appConfig, sessions, tasks, isLoaded]);

  const handleManualSave = async () => {
    clearTimeout(saveTimer.current);
    await saveStateToServer({ zones, tables, bookings, appConfig, sessions, tasks });
    setToast({ message: "Все изменения успешно сохранены на сервере!", type: "success" });
  };
  
  const handleExportDb = () => {
    const snapshot = {
      _meta: { app: 'RestoCanvas', version: 1, exportedAt: new Date().toISOString() },
      zones,
      tables,
      bookings,
      appConfig,
      sessions,
      tasks
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `RestoCanvas-DB-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setToast({ message: "База данных успешно экспортирована", type: "success" });
  };

  const handleImportDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const payload = JSON.parse(evt.target?.result as string);
        if (!payload || payload._meta?.app !== 'RestoCanvas') {
          setToast({ message: "Неверный формат файла базы данных", type: "error" });
          return;
        }

        if (confirm("Заменить все текущие данные залов, столов и броней данными из файла?")) {
          if (Array.isArray(payload.zones)) setZones(payload.zones);
          if (Array.isArray(payload.tables)) setTables(payload.tables);
          if (Array.isArray(payload.bookings)) setBookings(payload.bookings);
          if (Array.isArray(payload.sessions)) setSessions(payload.sessions);
          if (Array.isArray(payload.tasks)) setTasks(payload.tasks);
          if (payload.appConfig) setAppConfig(payload.appConfig);
          
          if (Array.isArray(payload.zones) && payload.zones.length > 0) {
            setActiveZoneId(payload.zones[0].id);
          }

          setToast({ message: "Данные успешно импортированы", type: "success" });
        }
      } catch (err) {
        setToast({ message: "Ошибка при чтении файла", type: "error" });
      }
    };
    reader.readAsText(file);
  };

  const handleResetDb = () => {
    if (confirm("ВНИМАНИЕ! Вы действительно хотите удалить все столы, залы и бронирования и вернуть исходные настройки?")) {
      setZones(ZONES);
      setTables(TABLES);
      setBookings(BOOKINGS);
      setSessions(SESSIONS);
      setTasks([]);
      setAppConfig(DEFAULT_APP_CONFIG);
      setActiveZoneId('zone-1');
      setToast({ message: "База сброшена к исходным настройкам", type: "info" });
    }
  };

  // Quick Action to open Reservation planner from table details
  const openBookingModalForTable = (tableId: string) => {
    setPrefilledTableId(tableId);
    setRoute('bookings');
  };

  // If not logged in, render the PIN lock screen
  if (!currentUser) {
    return (
      <LoginScreen
        currentUser={currentUser}
        setCurrentUser={handleSetCurrentUser}
        setToast={setToast}
      />
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const canEditCanvas = currentUser.role === 'admin' && (
    currentUser.adminId === 'adm-almas' ||
    currentUser.adminId === 'adm-ergali' ||
    currentUser.adminId === 'adm-elaman'
  );
  const canManageDb = currentUser.role === 'admin' && (
    currentUser.adminId === 'adm-almas' ||
    currentUser.adminId === 'adm-ergali' ||
    currentUser.adminId === 'adm-elaman'
  );

  return (
    <div className={`app ${isMobileMenuOpen ? 'mobile-nav-active' : ''}`} style={{ fontFamily: 'var(--font)' }}>
      
      {/* Top Header Navigation Panel */}
      <header className="app-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--gap)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fg)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'none'
            }}
            className="mobile-menu-toggle"
          >
            <Icon name={isMobileMenuOpen ? "x" : "menu"} size={22} />
          </button>
          
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent) 0%, #ff9f80 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon name="table" size={18} />
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em' }}>RestoCanvas</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Схема и резервы</div>
            </div>
          </div>
        </div>

        {/* Top Info & Actions bar */}
        <div className="top-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sync Pill status indicator */}
          <div
            className="sync-pill"
            style={{
              borderColor: 
                syncStatus.phase === 'synced' ? 'rgba(42, 157, 143, 0.2)' :
                syncStatus.phase === 'error' ? 'rgba(231, 111, 81, 0.2)' : 'var(--border)',
              color: 
                syncStatus.phase === 'synced' ? '#2a9d8f' :
                syncStatus.phase === 'error' ? '#e76f51' : 'var(--muted)',
            }}
            title={syncStatus.details}
          >
            <span
              className="sync-dot"
              style={{
                background: 
                  syncStatus.phase === 'synced' ? '#2a9d8f' :
                  syncStatus.phase === 'error' ? '#e76f51' : '#f4a261',
                animation: syncStatus.phase === 'saving' || syncStatus.phase === 'loading' ? 'pulse 1s infinite' : 'none'
              }}
            />
            <span>{syncStatus.label}</span>
          </div>

          {/* Manual Save button for admins */}
          {isAdmin && (
            <button
              onClick={handleManualSave}
              className="save-changes-btn"
              style={{
                height: '32px',
                padding: '0 14px',
                borderRadius: '16px',
                border: 'none',
                background: hasUnsavedChanges ? 'var(--accent)' : 'var(--bg-muted)',
                color: hasUnsavedChanges ? 'white' : 'var(--fg-2)',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: hasUnsavedChanges ? '0 0 12px rgba(231, 111, 81, 0.45)' : 'none',
                transition: 'all 0.2s ease',
                animation: hasUnsavedChanges ? 'pulse 2s infinite' : 'none'
              }}
            >
              <Icon name="check" size={12} style={{ color: hasUnsavedChanges ? 'white' : 'var(--muted)' }} />
              <span>{hasUnsavedChanges ? "Сохранить изменения" : "Сохранено"}</span>
            </button>
          )}

          {/* Active Employee User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-muted)', padding: '4px 10px', borderRadius: '20px' }}>
            <Icon name="user" size={13} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fg-2)' }}>{currentUser.name}</span>
            <button
              onClick={() => handleSetCurrentUser(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--bad)', display: 'flex', alignItems: 'center', padding: '2px' }}
              title="Выйти"
            >
              <Icon name="log-out" size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout: Sidebar + main workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gridColumn: '1 / -1', width: '100%', height: '100%', minWidth: '0', minHeight: '0' }} className="app-body">
        
        {/* Sidebar Left navigation */}
        <aside className="app-sidebar" style={{ width: '220px', background: 'var(--bg-elev)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px' }}>
            
            {/* Nav links */}
            <button
              onClick={() => { setRoute('canvas'); setIsMobileMenuOpen(false); }}
              className={`nav-item ${route === 'canvas' ? 'active' : ''}`}
            >
              <Icon name="table" size={16} />
              <span>Схема зала</span>
            </button>

            <button
              onClick={() => { setRoute('bookings'); setIsMobileMenuOpen(false); }}
              className={`nav-item ${route === 'bookings' ? 'active' : ''}`}
            >
              <Icon name="calendar" size={16} />
              <span>Бронирования</span>
              {bookings.filter(b => b.status === 'pending').length > 0 && (
                <span className="badge-alert">
                  {bookings.filter(b => b.status === 'pending').length}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => { setRoute('tasks'); setIsMobileMenuOpen(false); }}
                className={`nav-item ${route === 'tasks' ? 'active' : ''}`}
              >
                <Icon name="check" size={16} />
                <span>Задачи</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => { setRoute('history'); setIsMobileMenuOpen(false); }}
                className={`nav-item ${route === 'history' ? 'active' : ''}`}
              >
                <Icon name="clock" size={16} />
                <span>История и Отчеты</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => { setRoute('dashboard'); setIsMobileMenuOpen(false); }}
                className={`nav-item ${route === 'dashboard' ? 'active' : ''}`}
              >
                <Icon name="chart" size={16} />
                <span>Сводка смены</span>
              </button>
            )}
          </div>

          {/* Sidebar Bottom configuration */}
          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />
            
            {/* Theme switcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>ТЕМА ОФОРМЛЕНИЯ</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', background: 'var(--bg-muted)', padding: '2px', borderRadius: '6px' }}>
                <button
                  className={`theme-btn ${appConfig.theme === 'light' ? 'active' : ''}`}
                  onClick={() => setAppConfig(prev => ({ ...prev, theme: 'light' }))}
                  title="Светлая"
                >
                  Свет.
                </button>
                <button
                  className={`theme-btn ${appConfig.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setAppConfig(prev => ({ ...prev, theme: 'dark' }))}
                  title="Темная"
                >
                  Темн.
                </button>
                <button
                  className={`theme-btn ${appConfig.theme === 'resto' ? 'active' : ''}`}
                  onClick={() => setAppConfig(prev => ({ ...prev, theme: 'resto' }))}
                  title="Ресторанная теплая"
                >
                  Уютн.
                </button>
              </div>
            </div>

            {/* DB settings */}
            {canManageDb && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>БАЗА ДАННЫХ</span>
                
                <button
                  onClick={handleExportDb}
                  className="action-btn"
                >
                  <span>Экспорт базы</span>
                </button>

                <label className="action-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>Импорт базы</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportDb}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  onClick={handleResetDb}
                  className="action-btn danger"
                  style={{ color: '#e76f51' }}
                >
                  <span>Очистить базу</span>
                </button>
              </div>
            )}

            <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', fontWeight: 500 }}>
              RestoCanvas v1.0.0
            </div>
          </div>
        </aside>

        {/* Main Work Area Panel */}
        <main className="app-content" style={{ flex: 1, overflow: 'hidden', padding: 'var(--gap)', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
          {route === 'canvas' && (
            <TableCanvas
              zones={zones}
              setZones={setZones}
              tables={tables}
              setTables={setTables}
              bookings={bookings}
              setBookings={setBookings}
              sessions={sessions}
              setSessions={setSessions}
              activeZoneId={activeZoneId}
              setActiveZoneId={setActiveZoneId}
              isAdmin={isAdmin}
              canEdit={canEditCanvas}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              setToast={setToast}
              openBookingModalForTable={openBookingModalForTable}
            />
          )}

          {route === 'bookings' && (
            <BookingsScreen
              bookings={bookings}
              setBookings={setBookings}
              tables={tables}
              setTables={setTables}
              zones={zones}
              prefilledTableId={prefilledTableId}
              setPrefilledTableId={setPrefilledTableId}
              setToast={setToast}
            />
          )}

          {route === 'tasks' && (
            <TasksScreen
              tasks={tasks}
              setTasks={setTasks}
              currentUser={currentUser}
              setToast={setToast}
            />
          )}

          {route === 'history' && (
            <HistoryScreen
              sessions={sessions}
              setSessions={setSessions}
              setToast={setToast}
            />
          )}

          {route === 'dashboard' && (
            <DashboardScreen
              bookings={bookings}
              tables={tables}
            />
          )}
        </main>
      </div>

      {/* Mobile view bottom navigation bar */}
      <nav className="mobile-bottom-bar">
        <button
          className={`mobile-bar-item ${route === 'canvas' ? 'active' : ''}`}
          onClick={() => setRoute('canvas')}
        >
          <Icon name="table" size={20} />
          <span>Схема</span>
        </button>

        <button
          className={`mobile-bar-item ${route === 'bookings' ? 'active' : ''}`}
          onClick={() => setRoute('bookings')}
        >
          <Icon name="calendar" size={20} />
          <span>Резервы</span>
        </button>

        {isAdmin && (
          <button
            className={`mobile-bar-item ${route === 'tasks' ? 'active' : ''}`}
            onClick={() => setRoute('tasks')}
          >
            <Icon name="check" size={20} />
            <span>Задачи</span>
          </button>
        )}

        {isAdmin && (
          <button
            className={`mobile-bar-item ${route === 'history' ? 'active' : ''}`}
            onClick={() => setRoute('history')}
          >
            <Icon name="clock" size={20} />
            <span>История</span>
          </button>
        )}

        {isAdmin && (
          <button
            className={`mobile-bar-item ${route === 'dashboard' ? 'active' : ''}`}
            onClick={() => setRoute('dashboard')}
          >
            <Icon name="chart" size={20} />
            <span>Сводка</span>
          </button>
        )}
      </nav>

      {/* Alert toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        /* CSS resets & sidebar styles */
        .app-top {
          height: 56px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-elev);
          position: relative;
          z-index: 50;
          box-shadow: var(--shadow-sm);
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 40px;
          padding: 0 12px;
          border-radius: var(--radius-sm);
          color: var(--fg-2);
          background: transparent;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
          text-align: left;
        }

        .nav-item:hover {
          background: var(--bg-muted);
        }

        .nav-item.active {
          background: rgba(231, 111, 81, 0.08);
          color: var(--accent);
        }

        .badge-alert {
          background: var(--accent);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          margin-left: auto;
        }

        .theme-btn {
          height: 24px;
          border: none;
          background: transparent;
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0;
        }

        .theme-btn.active {
          background: var(--bg-elev);
          color: var(--accent);
          box-shadow: var(--shadow-sm);
        }

        .action-btn {
          height: 30px;
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--fg-2);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s ease;
          text-align: center;
        }

        .action-btn:hover {
          background: var(--bg-muted);
          transform: translateY(-1.0px);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Mobile specific layouts */
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
          
          .app-sidebar {
            display: none;
          }
          
          .mobile-nav-active .app-sidebar {
            display: flex !important;
            position: fixed;
            top: 56px;
            left: 0;
            right: 0;
            bottom: 60px;
            z-index: 100;
            background: var(--bg-elev);
            width: 100%;
            border-right: none;
            box-shadow: var(--shadow-lg);
          }
        }
      `}</style>
    </div>
  );
}
