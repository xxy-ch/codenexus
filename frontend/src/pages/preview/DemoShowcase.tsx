import React, { useState, useEffect } from 'react'
import { Terminal, Crown, Timer, RefreshCw } from 'lucide-react'

// Cursor Theme Constants extracted strictly from DesignShowcase
const c = {
  bg: '#f2f1ed', panel: '#ebeae5', surface: '#e6e5e0', surfaceLight: '#e1e0db',
  text: '#26251e', textSecondary: 'rgba(38,37,30,0.6)', textTertiary: '#737268',
  textQuaternary: 'rgba(38,37,30,0.3)', brand: '#f54e00', accent: '#f54e00', accentHover: '#cf2d56',
  border: 'rgba(38,37,30,0.1)', borderSubtle: 'rgba(38,37,30,0.06)'
}

const styles = {
  heroHeadline: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '72px', fontWeight: 400, lineHeight: 1.10, letterSpacing: '-2.16px', color: c.text },
  heroSubtitle: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '17px', fontWeight: 400, lineHeight: 1.35, color: 'rgba(38,37,30,0.55)' },
  btnPrimary: { background: c.panel, color: c.text, padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', cursor: 'pointer' },
  btnSecondary: { background: c.surface, color: c.textSecondary, padding: '3px 8px', borderRadius: '9999px', fontSize: '14px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', cursor: 'pointer' },
  btnGhost: { background: 'rgba(38,37,30,0.06)', color: 'rgba(38,37,30,0.55)', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', cursor: 'pointer' },
  cardStandard: { background: '#ffffff', border: `1px solid ${c.border}`, borderRadius: '8px', padding: '24px' },
  cardElevated: { background: c.surface, border: `1px solid rgba(38,37,30,0.2)`, borderRadius: '10px', padding: '24px', boxShadow: 'rgba(0,0,0,0.14) 0px 28px 70px, rgba(0,0,0,0.1) 0px 14px 32px, rgba(38,37,30,0.1) 0px 0px 0px 1px' },
  input: { background: c.panel, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '10px 14px', color: c.text, fontSize: '15px', fontFamily: 'system-ui, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  badgePrimary: { background: 'rgba(245,78,0,0.1)', color: c.brand, borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(245,78,0,0.2)', display: 'inline-flex', alignItems: 'center' },
  badgeSuccess: { background: 'rgba(31,138,101,0.1)', color: '#1f8a65', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
  badgeOutline: { background: 'rgba(38,37,30,0.03)', color: c.textSecondary, borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: `1px solid ${c.border}`, display: 'inline-flex', alignItems: 'center' }
}

const generateMockHeatmapData = () => {
  const data = []
  const today = new Date()
  for (let w = 0; w < 53; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const rand = Math.random()
      let level = 0
      if (rand > 0.85) level = 4
      else if (rand > 0.7) level = 3
      else if (rand > 0.5) level = 2
      else if (rand > 0.3) level = 1
      const subCount = level * (Math.floor(Math.random() * 3) + 1)
      const date = new Date(today.getTime() - ((52 - w) * 7 + (6 - d)) * 24 * 60 * 60 * 1000)
      week.push({ date: date.toISOString().split('T')[0], level, count: subCount })
    }
    data.push(week)
  }
  return data
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', opacity: 0.5, color: '#26251e' }}>{subtitle}</div>
      <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid rgba(128,128,128,0.2)', paddingBottom: '8px', color: '#26251e' }}>{title}</h2>
      {children}
    </section>
  )
}

function tcBadgeStyle(status: string) {
  if (status === 'accepted') return styles.badgeSuccess
  if (status === 'wrong_answer' || status === 'time_limit_exceeded') return { ...styles.badgePrimary, background: 'rgba(245,78,0,0.1)', color: '#f54e00', border: '1px solid rgba(245,78,0,0.2)' }
  return styles.badgeOutline
}

export default function DemoShowcase() {
  const [heatmapData] = useState(generateMockHeatmapData)
  const [timeLeft, setTimeLeft] = useState(7200 + 45)
  const [isTimerActive, setIsTimerActive] = useState(true)
  
  const [testCases, setTestCases] = useState([
    { id: 1, name: 'Sample 1', status: 'accepted', time: '12ms', memory: '4.2MB', input: '[2, 7, 11, 15], 9', output: '[0, 1]' },
    { id: 2, name: 'Sample 2', status: 'accepted', time: '15ms', memory: '4.3MB', input: '[3, 2, 4], 6', output: '[1, 2]' },
    { id: 3, name: 'Basic Cases', status: 'accepted', time: '18ms', memory: '4.5MB', input: '[3, 3], 6', output: '[0, 1]' },
    { id: 4, name: 'Negative Numbers', status: 'accepted', time: '22ms', memory: '4.6MB', input: '[-1, -3, 2, 4], -4', output: '[0, 1]' },
    { id: 5, name: 'Boundary Check', status: 'wrong_answer', time: '14ms', memory: '4.1MB', input: '[1, 2, 3], 7', output: '[] (Expected [-1, -1])' },
    { id: 6, name: 'Performance TLE', status: 'time_limit_exceeded', time: '1002ms', memory: '24.5MB', input: '[100000+ items], 99999', output: 'Timeout' },
  ])
  const [selectedTestCase, setSelectedTestCase] = useState<typeof testCases[0] | null>(testCases[0])
  const [isJudging, setIsJudging] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.setProperty('color-scheme', 'light')
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerActive, timeLeft])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return { hours: h.toString().padStart(2, '0'), minutes: m.toString().padStart(2, '0'), seconds: s.toString().padStart(2, '0') }
  }
  const { hours, minutes, seconds } = formatTime(timeLeft)

  const triggerMockJudge = () => {
    setIsJudging(true)
    setTimeout(() => {
      setTestCases(prev => prev.map(tc => {
        const statuses = ['accepted', 'accepted', 'wrong_answer', 'time_limit_exceeded']
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)] as any
        return { ...tc, status: tc.id <= 3 ? 'accepted' : newStatus, time: newStatus === 'time_limit_exceeded' ? '1000ms' : `${Math.floor(Math.random() * 50) + 10}ms` }
      }))
      setIsJudging(false)
    }, 1500)
  }

  return (
    <div style={{ background: c.bg, color: c.text, minHeight: '100vh', transition: 'background 0.3s, color 0.3s' }}>
      <style>{`
        .cursor-demo-wrapper, .cursor-demo-wrapper * {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          letter-spacing: -0.015em;
          box-sizing: border-box;
        }
      `}</style>

      <div className="cursor-demo-wrapper">
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(242, 241, 237, 0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Interactive Playground</h1>
                <p style={{ fontSize: '13px', color: c.textTertiary, margin: '2px 0 0 0' }}>OJ System Components mapped exactly to Cursor Template</p>
              </div>
              <span style={{ fontSize: '12px', color: c.textTertiary, background: c.surface, padding: '4px 12px', borderRadius: '4px' }}>
                Cursor Native
              </span>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
          
          <Section title="Hero / 首页大屏" subtitle="Typography & First Impression">
            <div style={{ padding: '64px 0', textAlign: 'center' }}>
              <h1 style={{ ...styles.heroHeadline, margin: 0 }}>The AI-first<br/>OJ platform</h1>
              <p style={{ ...styles.heroSubtitle, maxWidth: '560px', margin: '24px auto 32px' }}>
                CodeNexus is the AI-first judge system built for modern algorithms. Write, execute, and profile code faster with the exact Cursor design metrics.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={styles.btnPrimary}>Start Coding</button>
                <button style={styles.btnSecondary}>View Features</button>
                <button style={styles.btnGhost}>Documentation</button>
              </div>
            </div>
          </Section>

          <Section title="Leaderboard Podium / 发光冠亚季军奖台" subtitle="Card Construction (Standard vs Elevated)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'end' }}>
              
              {/* Rank 2 - Standard Card */}
              <div style={{ ...styles.cardStandard, padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '280px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '9999px', background: c.panel, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px' }}>JY</span>
                  <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: c.text, color: '#fff', width: '20px', height: '20px', borderRadius: '9999px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${c.bg}` }}>2</div>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 400, margin: '0 0 4px 0' }}>JiangYang_OJ</h3>
                <p style={{ fontSize: '12px', color: c.textSecondary, margin: '0 0 16px 0' }}>华东师范大学</p>
                <div style={{ display: 'flex', gap: '16px', borderTop: `1px solid ${c.borderSubtle}`, paddingTop: '16px', width: '100%', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: c.textSecondary, marginBottom: '4px' }}>Solved</div>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>382</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: c.textSecondary, marginBottom: '4px' }}>Rating</div>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>2840</div>
                  </div>
                </div>
              </div>

              {/* Rank 1 - Elevated Card */}
              <div style={{ ...styles.cardElevated, padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '320px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: c.brand }} />
                <div style={{ width: '64px', height: '64px', borderRadius: '9999px', background: 'rgba(245,78,0,0.05)', border: '1px solid rgba(245,78,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '16px' }}>
                  <span style={{ fontSize: '16px' }}>XXY</span>
                  <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: c.brand, color: '#fff', padding: '4px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown size={12} color="#fff" />
                  </div>
                </div>
                <span style={{ ...styles.badgePrimary, marginBottom: '8px', padding: '2px 8px', fontSize: '10px' }}>GRANDMASTER</span>
                <h3 style={{ fontSize: '18px', fontWeight: 400, margin: '0 0 4px 0' }}>XieXingyu</h3>
                <p style={{ fontSize: '12px', color: c.textSecondary, margin: '0 0 16px 0' }}>北京大学</p>
                <div style={{ display: 'flex', gap: '16px', borderTop: `1px solid ${c.borderSubtle}`, paddingTop: '16px', width: '100%', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: c.textSecondary, marginBottom: '4px' }}>Solved</div>
                    <div style={{ fontSize: '15px', fontFamily: 'monospace', color: c.brand }}>492</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: c.textSecondary, marginBottom: '4px' }}>Rating</div>
                    <div style={{ fontSize: '15px', fontFamily: 'monospace' }}>3120</div>
                  </div>
                </div>
              </div>

              {/* Rank 3 - Standard Card */}
              <div style={{ ...styles.cardStandard, padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '280px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '9999px', background: c.panel, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px' }}>LH</span>
                  <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: c.text, color: '#fff', width: '20px', height: '20px', borderRadius: '9999px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${c.bg}` }}>3</div>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 400, margin: '0 0 4px 0' }}>LiHua_Algorithm</h3>
                <p style={{ fontSize: '12px', color: c.textSecondary, margin: '0 0 16px 0' }}>清华大学</p>
                <div style={{ display: 'flex', gap: '16px', borderTop: `1px solid ${c.borderSubtle}`, paddingTop: '16px', width: '100%', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: c.textSecondary, marginBottom: '4px' }}>Solved</div>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>341</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: c.textSecondary, marginBottom: '4px' }}>Rating</div>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>2710</div>
                  </div>
                </div>
              </div>

            </div>
          </Section>

          <Section title="Matrix & Timer / 测试矩阵与计时" subtitle="Input Construction & Button Group">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              
              {/* Timer Card - Standard */}
              <div style={{ ...styles.cardStandard, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '420px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Timer size={16} color={c.brand} />
                    <h3 style={{ fontSize: '16px', fontWeight: 400, margin: 0 }}>Countdown</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <span style={{ ...styles.badgePrimary, padding: '2px 8px', fontSize: '10px', border: 'none', background: 'rgba(207,45,86,0.1)', color: '#cf2d56' }}>LIVE CONTEST</span>
                    <span style={{ fontSize: '12px', color: c.textSecondary }}>Weekly #98</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', background: c.panel, border: `1px solid ${c.border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontFamily: 'monospace' }}>{hours}</div>
                      <div style={{ fontSize: '10px', color: c.textSecondary, marginTop: '8px', textTransform: 'uppercase' }}>Hours</div>
                    </div>
                    <div style={{ fontSize: '24px', color: c.textQuaternary, paddingBottom: '24px' }}>:</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', background: c.panel, border: `1px solid ${c.border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontFamily: 'monospace' }}>{minutes}</div>
                      <div style={{ fontSize: '10px', color: c.textSecondary, marginTop: '8px', textTransform: 'uppercase' }}>Mins</div>
                    </div>
                    <div style={{ fontSize: '24px', color: c.textQuaternary, paddingBottom: '24px' }}>:</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', background: c.panel, border: '1px solid rgba(245,78,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontFamily: 'monospace', color: c.brand }}>{seconds}</div>
                      <div style={{ fontSize: '10px', color: c.brand, marginTop: '8px', textTransform: 'uppercase' }}>Secs</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setIsTimerActive(!isTimerActive)} style={{ ...styles.btnGhost, flex: 1 }}>{isTimerActive ? 'Pause' : 'Start'}</button>
                  <button onClick={() => setTimeLeft(7200 + 45)} style={{ ...styles.btnPrimary, flex: 1 }}>Reset</button>
                </div>
              </div>

              {/* Matrix Card - Elevated */}
              <div style={{ ...styles.cardElevated, display: 'flex', flexDirection: 'column', height: '420px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={16} />
                    <h3 style={{ fontSize: '16px', fontWeight: 400, margin: 0 }}>Interactive Console</h3>
                  </div>
                  <button onClick={triggerMockJudge} disabled={isJudging} style={{ ...styles.btnSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={12} className={isJudging ? "animate-spin" : ""} />
                    {isJudging ? 'Judging...' : 'Run Tests'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  {testCases.map((tc) => {
                    const isSelected = selectedTestCase?.id === tc.id
                    let borderStyle = `1px solid ${c.borderSubtle}`
                    let bgStyle = c.bg
                    let glowColor = c.textQuaternary
                    
                    if (tc.status === 'accepted') {
                      glowColor = '#1f8a65'
                      borderStyle = isSelected ? '1px solid rgba(31,138,101,0.4)' : '1px solid rgba(31,138,101,0.1)'
                      bgStyle = isSelected ? 'rgba(31,138,101,0.05)' : c.bg
                    } else if (tc.status === 'wrong_answer' || tc.status === 'time_limit_exceeded') {
                      glowColor = '#f54e00'
                      borderStyle = isSelected ? '1px solid rgba(245,78,0,0.4)' : '1px solid rgba(245,78,0,0.1)'
                      bgStyle = isSelected ? 'rgba(245,78,0,0.05)' : c.bg
                    }

                    return (
                      <div 
                        key={tc.id}
                        onClick={() => setSelectedTestCase(tc)}
                        style={{ background: bgStyle, border: borderStyle, borderRadius: '8px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: glowColor }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 400, marginBottom: '2px' }}>Case {tc.id}</div>
                          <div style={{ fontSize: '10px', color: c.textSecondary, fontFamily: 'monospace' }}>{tc.time}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {selectedTestCase && (
                  <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 400 }}>{selectedTestCase.name} Details</span>
                      <span style={tcBadgeStyle(selectedTestCase.status)}>{selectedTestCase.status.replace('_', ' ')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '11px', color: c.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Input</div>
                        <div style={{ ...styles.input, padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace' }}>{selectedTestCase.input}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: c.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Output</div>
                        <div style={{ ...styles.input, padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace' }}>{selectedTestCase.output}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </Section>

          <Section title="Contributions / 热力图与统计" subtitle="Data Presentation">
            <div style={styles.cardStandard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: c.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>Total Submissions</div>
                    <div style={{ fontSize: '32px', fontWeight: 400, letterSpacing: '-0.24px', display: 'flex', alignItems: 'baseline', gap: '8px', color: c.text }}>
                      1,482 <span style={{ fontSize: '14px', color: '#1f8a65' }}>+15.2%</span>
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: c.border }} />
                  <div>
                    <div style={{ fontSize: '11px', color: c.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>Max Streak</div>
                    <div style={{ fontSize: '24px', fontWeight: 400, color: c.text }}>42 Days</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <span style={styles.badgeOutline}>Personal</span>
                   <span style={styles.badgePrimary}>2026</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', minWidth: 'max-content' }}>
                  {heatmapData.map((week, w) => (
                    <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {week.map((day, d) => {
                        let bg = c.panel;
                        let border = `1px solid ${c.borderSubtle}`;
                        if (day.level === 1) { bg = 'rgba(245,78,0,0.15)'; border = '1px solid rgba(245,78,0,0.1)'; }
                        else if (day.level === 2) { bg = 'rgba(245,78,0,0.35)'; border = '1px solid rgba(245,78,0,0.15)'; }
                        else if (day.level === 3) { bg = 'rgba(245,78,0,0.65)'; border = '1px solid rgba(245,78,0,0.25)'; }
                        else if (day.level === 4) { bg = '#f54e00'; border = '1px solid rgba(255,125,69,0.3)'; }
                        
                        return (
                          <div key={d} style={{ width: '12px', height: '12px', borderRadius: '2px', background: bg, border: border }} title={`${day.date}: ${day.count} Submissions`} />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

        </main>
      </div>
    </div>
  )
}
