import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar/Topbar'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const [walletBalance, setWalletBalance] = useState(10000)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email] = useState(user?.email || '')
  const [timezone, setTimezone] = useState('UTC')
  const [notifications, setNotifications] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  
  // Integration statuses
  const [emailConnected, setEmailConnected] = useState(false)
  const [telegramConnected, setTelegramConnected] = useState(false)

  useEffect(() => {
    // Check if this is first time setup
    const hasSeenProfile = localStorage.getItem('hasSeenProfile')
    if (!hasSeenProfile) {
      setIsFirstTime(true)
      setIsEditing(true)
    }
    
    // TODO: Fetch user data from backend
    // For now, using mock data
    setWalletBalance(10000)
    setDisplayName(user?.displayName || '')
  }, [user])

  const handleSave = () => {
    // TODO: Save to backend via API
    console.log('Saving profile...', { displayName, timezone, notifications })
    
    if (isFirstTime) {
      localStorage.setItem('hasSeenProfile', 'true')
      setIsFirstTime(false)
    }
    
    setIsEditing(false)
    
    // If it was first time, redirect to dashboard
    if (isFirstTime) {
      navigate('/')
    }
  }

  const handleSkip = () => {
    localStorage.setItem('hasSeenProfile', 'true')
    navigate('/')
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Topbar />

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 32px',
        background: 'var(--bg-base)',
      }}>
        {/* Header */}
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
        

          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 800,
              marginBottom: 4,
            }}>
              Profile Settings
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Manage your account and preferences
            </p>
          </div>

          {/* Wallet Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b11, #ef444411)',
            border: '1px solid ',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                💰
              </div>
              <div>
                <div style={{ color: 'var(--text-faint)', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>
                  WALLET BALANCE
                </div>
                <div style={{ color: 'var(--accent-yellow)', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            
          </div>

          {/* Profile Information */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            marginBottom: 24,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <h2 style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700 }}>
                Account Information
              </h2>
              {!isFirstTime && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--accent-blue)',
                    color: 'var(--accent-blue)',
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Display Name */}
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                  Display Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    style={{
                      width: '100%',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                    {displayName || 'Not set'}
                  </div>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                  Email Address
                </label>
                <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                  {email}
                </div>
              </div>

              {/* Provider */}
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                  Sign In Provider
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{user?.photoURL ? '🔵' : '📧'}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                    {user?.photoURL ? 'Google' : 'Email'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            marginBottom: 24,
          }}>
            <h2 style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, marginBottom: 24 }}>
              Preferences
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Timezone */}
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                  Timezone
                </label>
                {isEditing ? (
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                    }}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                ) : (
                  <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>
                    {timezone}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: isEditing ? 'pointer' : 'default',
                }}>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => isEditing && setNotifications(e.target.checked)}
                    disabled={!isEditing}
                    style={{ cursor: isEditing ? 'pointer' : 'default' }}
                  />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                      Email Notifications
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      Receive alerts for workflow executions and important updates
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            marginBottom: 24,
          }}>
            <h2 style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, marginBottom: 24 }}>
              Connected Services
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Email Notifications */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: emailConnected ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-surface)',
                    border: emailConnected ? 'none' : '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    📧
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                      Email Notifications
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: emailConnected ? 'var(--accent-green)' : 'var(--text-faint)',
                      }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {emailConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEmailConnected(!emailConnected)}
                  style={{
                    background: emailConnected ? 'transparent' : 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
                    border: emailConnected ? '1px solid var(--border)' : 'none',
                    color: emailConnected ? 'var(--text-muted)' : '#fff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {emailConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              {/* Telegram Bot */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: telegramConnected ? 'linear-gradient(135deg, #0088cc, #0077b5)' : 'var(--bg-surface)',
                    border: telegramConnected ? 'none' : '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    ✈️
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                      Telegram Bot
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: telegramConnected ? 'var(--accent-green)' : 'var(--text-faint)',
                      }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {telegramConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setTelegramConnected(!telegramConnected)}
                  style={{
                    background: telegramConnected ? 'transparent' : 'linear-gradient(135deg, #0088cc, #0077b5)',
                    border: telegramConnected ? '1px solid var(--border)' : 'none',
                    color: telegramConnected ? 'var(--text-muted)' : '#fff',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {telegramConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>

            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #3b82f611, #06b6d411)',
              border: '1px solid #3b82f633',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: 11,
              lineHeight: 1.6,
            }}>
              💡 <strong>Tip:</strong> Connect Telegram to receive instant alerts for workflow executions, price movements, and trade notifications directly on your phone.
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              {isFirstTime && (
                <button
                  onClick={handleSkip}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Skip for now
                </button>
              )}
              {!isFirstTime && (
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isFirstTime ? 'Complete Setup' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Danger Zone */}
          {!isFirstTime && !isEditing && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid #dc2626',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              marginTop: 24,
            }}>
              <h2 style={{ color: '#dc2626', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                Danger Zone
              </h2>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
                Once you log out, you'll need to sign in again to access your account.
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1px solid #dc2626',
                  color: '#dc2626',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
