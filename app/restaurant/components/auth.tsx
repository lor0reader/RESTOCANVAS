import * as React from 'react';
import { ADMINS, AdminUser } from './data';
import { Icon } from './ui';

interface AuthProps {
  currentUser: { name: string; role: 'admin' | 'guest'; adminId?: string } | null;
  setCurrentUser: (user: { name: string; role: 'admin' | 'guest'; adminId?: string } | null) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export function LoginScreen({ currentUser, setCurrentUser, setToast }: AuthProps) {
  const [pin, setPin] = React.useState('');
  const [showPinPad, setShowPinPad] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  const handleGuestLogin = () => {
    setCurrentUser({
      name: "Официант (Гость)",
      role: "guest"
    });
    setToast({ message: "Успешный вход в гостевом режиме", type: "success" });
  };

  const tryLogin = (pinToCheck: string) => {
    const match = ADMINS.find(admin => admin.pin === pinToCheck);
    if (match) {
      setTimeout(() => {
        setCurrentUser({
          name: `${match.name} (${match.role})`,
          role: "admin",
          adminId: match.id
        });
        setToast({ message: `Добро пожаловать, ${match.name}!`, type: "success" });
        setPin('');
        setShowPinPad(false);
      }, 150);
    } else {
      setTimeout(() => {
        setShake(true);
        setToast({ message: "Неверный PIN-код", type: "error" });
        setTimeout(() => {
          setShake(false);
          setPin('');
        }, 400);
      }, 150);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);

    // Auto-login: check after each digit if PIN already matches
    const match = ADMINS.find(admin => admin.pin === newPin);
    if (match) {
      tryLogin(newPin);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, var(--bg-muted) 0%, var(--bg) 100%)',
        padding: '20px',
        color: 'var(--fg)',
        fontFamily: 'var(--font)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-elev)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          padding: '32px 24px',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* Brand logo & title */}
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--accent) 0%, #ff9f80 100%)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(231, 111, 81, 0.25)',
              marginBottom: '16px'
            }}
          >
            <Icon name="table" size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            RestoCanvas
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px', fontWeight: 500 }}>
            Интерактивная Схема Зала & Бронирование
          </p>
        </div>

        {!showPinPad ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Quick Guest login button */}
            <button
              onClick={handleGuestLogin}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: 'var(--radius)',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
              className="login-primary-btn"
            >
              <Icon name="user" size={16} />
              <span>Войти как Официант (Гость)</span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: 'var(--border-strong)',
                margin: '12px 0'
              }}
            >
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              <span style={{ padding: '0 10px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>ИЛИ</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            </div>

            {/* Switch to PIN-pad */}
            <button
              onClick={() => setShowPinPad(true)}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-muted)',
                color: 'var(--fg)',
                border: '1px solid var(--border-strong)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon name="shield" size={16} />
              <span>Вход для Администраторов</span>
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginBottom: '16px'
              }}
            >
              <button
                onClick={() => { setShowPinPad(false); setPin(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Icon name="arrow-left" size={14} />
                <span>Назад</span>
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--fg-2)', fontWeight: 600 }}>
              Введите PIN-код администратора
            </p>

            {/* PIN dot displays */}
            <div className={`pin-dots ${shake ? 'shake' : ''}`} style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '16px 0' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`pin-dot ${idx < pin.length ? 'filled' : ''}`}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid var(--border-strong)',
                    background: idx < pin.length ? 'var(--accent)' : 'transparent',
                    borderColor: idx < pin.length ? 'var(--accent)' : 'var(--border-strong)',
                    transform: idx < pin.length ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>

            {/* Virtual PIN Pad */}
            <div className="pin-grid">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  className="pin-btn"
                  onClick={() => handleKeyPress(num)}
                >
                  {num}
                </button>
              ))}
              <button className="pin-btn" style={{ fontSize: '14px', color: 'var(--muted)' }} onClick={handleClear}>
                C
              </button>
              <button className="pin-btn" onClick={() => handleKeyPress("0")}>
                0
              </button>
              <button className="pin-btn" style={{ fontSize: '16px', color: 'var(--muted)' }} onClick={handleBackspace}>
                ←
              </button>
            </div>

            {/* Login button */}
            <button
              onClick={() => pin.length > 0 && tryLogin(pin)}
              disabled={pin.length === 0}
              style={{
                marginTop: '16px',
                width: '100%',
                height: '48px',
                borderRadius: 'var(--radius)',
                background: pin.length > 0 ? 'var(--accent)' : 'var(--bg-muted)',
                color: pin.length > 0 ? 'white' : 'var(--muted)',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: pin.length > 0 ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                boxShadow: pin.length > 0 ? '0 4px 14px rgba(231, 111, 81, 0.35)' : 'none',
                letterSpacing: '0.01em'
              }}
            >
              Войти
            </button>
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>
          Разработано для планшетов и мобильных телефонов
        </div>
      </div>

      <style>{`
        .pin-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          max-width: 250px;
          margin: 16px auto 0 auto;
        }
        .pin-btn {
          height: 52px;
          width: 52px;
          margin: auto;
          border-radius: 50%;
          border: 1px solid var(--border-strong);
          background: var(--bg-elev);
          color: var(--fg);
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.1s ease;
          box-shadow: var(--shadow-sm);
        }
        .pin-btn:active {
          background: var(--bg-muted);
          transform: scale(0.92);
        }
        .shake {
          animation: shake 0.35s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .login-primary-btn:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .login-primary-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
