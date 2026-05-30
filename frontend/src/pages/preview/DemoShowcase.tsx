import React, { useState, useEffect } from 'react'
import { 
  Terminal, Crown, Timer, RefreshCw, Play, Check, 
  Sparkles, Clock, Code, ChevronRight, History, Send,
  Layers, X, Sparkle, FileText, ChevronLeft, ArrowUpRight,
  Maximize2, PlayCircle, HelpCircle, Flame, MessageSquare,
  ShieldAlert, GitCommit, Eye, Settings, User, Plus, Search,
  TrendingUp, Activity, Award, BookOpen, Command, Copy, FileCode, ChevronDown
} from 'lucide-react'

// ─── Fused 5-Theme Specifications ──────────────────────────────────────
const THEMES = {
  cursor: {
    name: 'Cursor Style (Warm Minimalist)',
    bg: '#f2f1ed', panel: '#ebeae5', surface: '#e6e5e0', cardBg: '#ffffff',
    text: '#26251e', textSecondary: 'rgba(38,37,30,0.6)', textTertiary: '#737268',
    brand: '#f54e00', accent: '#cf2d56', border: 'rgba(38,37,30,0.12)', borderSubtle: 'rgba(38,37,30,0.06)',
    shadow: 'rgba(0,0,0,0.03) 0px 8px 16px, rgba(38,37,30,0.08) 0px 0px 0px 1px',
    shadowElevated: 'rgba(0,0,0,0.1) 0px 20px 40px, rgba(38,37,30,0.12) 0px 0px 0px 1px',
    radius: '8px', radiusCard: '8px', btnRadius: '6px',
    fontHeading: '"Outfit", "Inter", -apple-system, sans-serif',
    fontHeadingWeight: '400', fontHeadingSpacing: '-1.4px',
    hoverEffect: 'translateY(-2px)', btnPadding: '8px 14px',
    editorBg: '#1e1e1e', editorText: '#ebeae5', editorBorder: 'rgba(38,37,30,0.2)'
  },
  claude: {
    name: 'Claude Style (Editorial Sand)',
    bg: '#faf9f5', panel: '#f0ede6', surface: '#ebe7df', cardBg: '#ffffff',
    text: '#191919', textSecondary: '#5e5d59', textTertiary: '#878680',
    brand: '#cc785c', accent: '#7c6ec6', border: '#e6e2db', borderSubtle: '#f0ede6',
    shadow: 'rgba(25, 25, 25, 0.02) 0px 6px 18px',
    shadowElevated: 'rgba(25, 25, 25, 0.05) 0px 20px 40px, rgba(0, 0, 0, 0.02) 0px 1px 3px',
    radius: '12px', radiusCard: '16px', btnRadius: '8px',
    fontHeading: "'Lora', 'Georgia', serif",
    fontHeadingWeight: 'normal', fontHeadingSpacing: '-0.2px',
    hoverEffect: 'translateY(-3px)', btnPadding: '8px 18px',
    editorBg: '#fcfbfa', editorText: '#26251e', editorBorder: '#e6e2db'
  },
  vercel: {
    name: 'Vercel Style (Ultra-Minimalist)',
    bg: '#ffffff', panel: '#fafafa', surface: '#eaeaea', cardBg: '#ffffff',
    text: '#000000', textSecondary: '#666666', textTertiary: '#888888',
    brand: '#000000', accent: '#0072f5', border: '#eaeaea', borderSubtle: '#fafafa',
    shadow: 'none', shadowElevated: 'rgba(0,0,0,0.12) 0px 30px 60px, rgba(0,0,0,0.04) 0px 0px 0px 1px',
    radius: '0px', radiusCard: '0px', btnRadius: '0px',
    fontHeading: '"Inter", -apple-system, sans-serif',
    fontHeadingWeight: '700', fontHeadingSpacing: '-1.8px',
    hoverEffect: 'none', btnPadding: '8px 14px',
    editorBg: '#000000', editorText: '#ffffff', editorBorder: '#333333'
  },
  notion: {
    name: 'Notion Style (Milk-Cream Cozy)',
    bg: '#fdfcfb', panel: '#f5f4f0', surface: '#e9e8e3', cardBg: '#ffffff',
    text: '#201f1d', textSecondary: '#63625e', textTertiary: '#9e9c96',
    brand: '#0075de', accent: '#10b981', border: 'rgba(32,31,29,0.12)', borderSubtle: 'rgba(32,31,29,0.05)',
    shadow: 'rgba(25,25,20,0.02) 0px 4px 16px',
    shadowElevated: 'rgba(25,25,20,0.05) 0px 20px 48px, rgba(32,31,29,0.03) 0px 1px 3px',
    radius: '10px', radiusCard: '10px', btnRadius: '6px',
    fontHeading: "'Lora', 'Georgia', serif",
    fontHeadingWeight: 'bold', fontHeadingSpacing: '-0.3px',
    hoverEffect: 'translateY(-2.5px)', btnPadding: '8px 18px',
    editorBg: '#f7f6f3', editorText: '#201f1d', editorBorder: 'rgba(32,31,29,0.08)'
  },
  stripe: {
    name: 'Stripe Style (High-Tech Indigo)',
    bg: '#f6f9fc', panel: '#eef2f6', surface: '#e3e8ee', cardBg: '#ffffff',
    text: '#061b31', textSecondary: '#475569', textTertiary: '#94a3b8',
    brand: '#6366f1', accent: '#6366f1', border: '#e2e8f0', borderSubtle: '#f1f5f9',
    shadow: 'rgba(50,50,93,0.04) 0px 4px 12px, rgba(0,0,0,0.02) 0px 1px 3px',
    shadowElevated: 'rgba(50,50,93,0.08) 0px 25px 50px -12px, rgba(0,0,0,0.04) 0px 16px 36px',
    radius: '14px', radiusCard: '16px', btnRadius: '8px',
    fontHeading: '"Outfit", "Inter", -apple-system, sans-serif',
    fontHeadingWeight: '800', fontHeadingSpacing: '-0.8px',
    hoverEffect: 'translateY(-4px)', btnPadding: '10px 20px',
    editorBg: '#0f172a', editorText: '#f8fafc', editorBorder: '#1e293b'
  }
}

// Activity data generator
const generateMockHeatmapData = () => {
  const data = []
  const today = new Date()
  for (let w = 0; w < 53; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const rand = Math.random()
      let level = 0
      if (rand > 0.88) level = 4
      else if (rand > 0.75) level = 3
      else if (rand > 0.55) level = 2
      else if (rand > 0.35) level = 1
      const subCount = level * (Math.floor(Math.random() * 3) + 1)
      const date = new Date(today.getTime() - ((52 - w) * 7 + (6 - d)) * 24 * 60 * 60 * 1000)
      week.push({ date: date.toISOString().split('T')[0], level, count: subCount })
    }
    data.push(week)
  }
  return data
}

export default function DemoShowcase() {
  const [themeName, setThemeName] = useState<'cursor' | 'claude' | 'vercel' | 'notion' | 'stripe'>('cursor')
  const theme = THEMES[themeName]

  const [heatmapData] = useState(generateMockHeatmapData)
  const [timeLeft, setTimeLeft] = useState(7200 + 45)
  const [isTimerActive, setIsTimerActive] = useState(true)
  const [isJudging, setIsJudging] = useState(false)
  const [isAiExplaining, setIsAiExplaining] = useState(false)
  const [aiExplanationApplied, setAiExplanationApplied] = useState(false)
  
  // Navigation Tabs Switcher (5 CORE SECTIONS)
  const [activeTab, setActiveTab] = useState<'ide' | 'community' | 'plagiarism' | 'roadmap' | 'stats'>('ide')
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{ date: string; count: number; level: number } | null>(null)
  
  // File and Editor tab state
  const [activeFile, setActiveFile] = useState<'Solution.cpp' | 'TestCases.h' | 'Benchmark.py'>('Solution.cpp')
  const [inlineAiOpen, setInlineAiOpen] = useState(false)
  const [inlineAiPrompt, setInlineAiPrompt] = useState('')
  const [showAiToast, setShowAiToast] = useState(false)
  
  // Plagiarism Scan state
  const [isScanningPlagiarism, setIsScanningPlagiarism] = useState(false)
  const [plagiarismSimilarity, setPlagiarismSimilarity] = useState(82)
  const [plagiarismIgnored, setPlagiarismIgnored] = useState(false)

  // Compiler Diagnostics Test Cases
  const [testCases, setTestCases] = useState([
    { id: 1, name: 'Sample Case 1', status: 'accepted', time: '8ms', memory: '4.1MB', input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]', expected: '[0, 1]' },
    { id: 2, name: 'Sample Case 2', status: 'accepted', time: '11ms', memory: '4.2MB', input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]', expected: '[1, 2]' },
    { id: 3, name: 'Duplicate Elements', status: 'accepted', time: '14ms', memory: '4.2MB', input: 'nums = [3, 3], target = 6', output: '[0, 1]', expected: '[0, 1]' },
    { id: 4, name: 'Negative Numbers', status: 'accepted', time: '15ms', memory: '4.3MB', input: 'nums = [-1, -3, 2, 4], target = -4', output: '[0, 1]', expected: '[0, 1]' },
    { id: 5, name: 'Boundary Check (Not Found)', status: 'wrong_answer', time: '10ms', memory: '4.1MB', input: 'nums = [1, 2, 3], target = 7', output: '[]', expected: '[-1, -1]' },
    { id: 6, name: 'Performance Stress Check', status: 'accepted', time: '188ms', memory: '8.5MB', input: 'nums = [10000+ items], target = 9999', output: '[9998, 9999]', expected: '[9998, 9999]' }
  ])
  const [selectedTestCase, setSelectedTestCase] = useState<typeof testCases[0] | null>(testCases[4])

  // Mock code inside editor
  const solutionCodeLines = [
    `#include <vector>`,
    `#include <unordered_map>`,
    `using namespace std;`,
    ``,
    `class Solution {`,
    `public:`,
    `    vector<int> twoSum(vector<int>& nums, int target) {`,
    `        unordered_map<int, int> hash;`,
    `        for (int i = 0; i < nums.size(); i++) {`,
    `            int complement = target - nums[i];`,
    `            if (hash.count(complement)) {`,
    `                return {hash[complement], i};`,
    `            }`,
    `            hash[nums[i]] = i;`,
    `        }`,
    `        // 🔴 Error: Return empty fallback under diagnostics Case 5`,
    `        return {}; `,
    `    }`,
    `};`
  ]

  // Claude Discussion Chat Dialogue
  const [chatMessages, setChatMessages] = useState([
    { 
      sender: 'LiHua_Algorithm', 
      time: '10:45 AM',
      avatar: 'L',
      text: "Hey XieXingyu! I'm running into a boundary issue on Case 5 with standard target sum limits. Have you corrected the sentinel fallback returning `{-1, -1}` instead of empty array `{}`?",
      code: `return {}; // returns vector of size 0`
    },
    {
      sender: 'XieXingyu',
      time: '10:48 AM',
      avatar: 'X',
      text: "Yes! I'm patching it right now. The compiler diagnostics complain about a vector size mismatch. I will trigger the AI Refactor to apply `return {-1, -1};` sentinel values.",
      code: `return {-1, -1}; // correct sentinel values`
    }
  ])
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.setProperty('color-scheme', 'light')
  }, [])

  // Timer loop
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
    return { 
      hours: h.toString().padStart(2, '0'), 
      minutes: m.toString().padStart(2, '0'), 
      seconds: s.toString().padStart(2, '0') 
    }
  }
  const { hours, minutes, seconds } = formatTime(timeLeft)

  // Animated Compiler diagnostics
  const triggerMockCompilation = () => {
    setIsJudging(true)
    
    setTestCases(prev => prev.map((tc, index) => ({
      ...tc,
      status: index === 0 ? 'accepted' : 'pending',
      time: '...'
    })))

    let currentCase = 1
    const interval = setInterval(() => {
      setTestCases(prev => prev.map(tc => {
        if (tc.id === currentCase) {
          const finalStatus = tc.id === 5 && !aiExplanationApplied ? 'wrong_answer' : 'accepted'
          return {
            ...tc,
            status: finalStatus,
            time: `${Math.floor(Math.random() * 12) + 6}ms`
          }
        }
        if (tc.id === currentCase + 1) {
          return { ...tc, status: 'running' }
        }
        return tc
      }))
      
      currentCase++
      if (currentCase > 6) {
        clearInterval(interval)
        setIsJudging(false)
      }
    }, 200)
  }

  // AI Refactor Patch
  const applyAIPatch = () => {
    setIsAiExplaining(true)
    
    setTimeout(() => {
      setTestCases(prev => prev.map(tc => {
        if (tc.id === 5) {
          return {
            ...tc,
            status: 'accepted',
            output: '[-1, -1]',
            time: '9ms'
          }
        }
        return tc
      }))
      setSelectedTestCase(prev => prev?.id === 5 ? {
        ...prev,
        status: 'accepted',
        output: '[-1, -1]',
        time: '9ms'
      } : prev)
      setAiExplanationApplied(true)
      setIsAiExplaining(false)
      setInlineAiOpen(false)
      setShowAiToast(true)
      setTimeout(() => setShowAiToast(false), 3000)
    }, 1200)
  }

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [
      ...prev,
      {
        sender: 'XieXingyu',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: 'X',
        text: chatInput,
        code: ''
      }
    ])
    setChatInput('')
  }

  return (
    <div style={{ 
      background: theme.bg, 
      color: theme.text, 
      minHeight: '100vh', 
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)', 
      fontFamily: themeName === 'claude' || themeName === 'notion' ? "'Lora', 'Georgia', serif" : '"Outfit", "Inter", -apple-system, sans-serif',
      paddingBottom: '80px'
    }}>
      
      {/* Global CSS injections */}
      <style>{`
        .transition-all-custom {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-interact {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-interact:hover {
          transform: ${theme.hoverEffect};
        }
        .btn-interact:active {
          transform: translateY(0);
        }
        @keyframes compilePulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .glow-active {
          animation: compilePulse 2s infinite ease-in-out;
        }
        @keyframes slideInUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .slide-in-up {
          animation: slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ─── STICKY HEADER ──────────────────────────────────────────────── */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        background: themeName === 'vercel' ? 'rgba(255, 255, 255, 0.92)' : (themeName === 'notion' ? 'rgba(253, 252, 251, 0.92)' : (themeName === 'cursor' ? 'rgba(242, 241, 237, 0.92)' : 'rgba(246, 249, 252, 0.92)')),
        backdropFilter: 'blur(16px)', 
        borderBottom: `1px solid ${theme.border}`,
        transition: 'all 0.5s'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Logo brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: theme.radius, 
              background: theme.brand, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: themeName === 'vercel' ? 'none' : `0 4px 14px ${theme.brand}25`,
              transition: 'all 0.4s'
            }}>
              <Code size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ 
                fontFamily: theme.fontHeading, 
                fontSize: '20px', 
                fontWeight: themeName === 'vercel' ? '700' : 'bold',
                color: theme.text,
                letterSpacing: theme.fontHeadingSpacing
              }}>
                CodeNexus
              </div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, letterSpacing: '0.5px', fontFamily: '"Inter", sans-serif' }}>Premium Online Judge Workspace</div>
            </div>
          </div>

          {/* Section navigation tabs (5 ACTIVE TABS IN PLAY) */}
          <div style={{ 
            display: 'flex', 
            background: theme.panel, 
            borderRadius: themeName === 'vercel' ? '0px' : '9999px', 
            padding: '3px',
            border: `1px solid ${theme.borderSubtle}`
          }}>
            {[
              { id: 'ide', label: 'IDE Workspace', icon: Terminal },
              { id: 'community', label: 'DMs & Chat', icon: MessageSquare },
              { id: 'plagiarism', label: 'Similarity Diff', icon: ShieldAlert },
              { id: 'roadmap', label: 'Unlock Stepper', icon: GitCommit },
              { id: 'stats', label: 'Rank & Timer', icon: Crown }
            ].map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: themeName === 'vercel' ? '0px' : '9999px',
                    border: 'none',
                    background: isActive ? theme.cardBg : 'transparent',
                    color: isActive ? theme.text : theme.textSecondary,
                    cursor: 'pointer',
                    boxShadow: isActive ? theme.shadow : 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  <Icon size={13} />
                  <span style={{ display: 'none', sm: 'inline', md: 'inline' }}>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Themes switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              display: 'flex', 
              background: theme.panel, 
              borderRadius: themeName === 'vercel' ? '0px' : '9999px', 
              padding: '2px',
              border: `1px solid ${theme.border}`
            }}>
              {Object.keys(THEMES).map(optKey => (
                <button 
                  key={optKey}
                  onClick={() => {
                    setThemeName(optKey as any)
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: themeName === 'vercel' ? '0px' : '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: themeName === optKey ? theme.brand : 'transparent',
                    color: themeName === optKey ? '#ffffff' : theme.textSecondary,
                    transition: 'all 0.25s',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  {THEMES[optKey as keyof typeof THEMES].name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

        </div>
      </header>

      {/* Main Sandbox Content */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px' }}>
        
        {/* Toast Notification */}
        {showAiToast && (
          <div className="slide-in-up" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: themeName === 'vercel' ? '#000000' : '#1f8a65',
            color: '#ffffff',
            padding: '14px 20px',
            borderRadius: theme.radius,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            <Sparkles size={16} />
            <span>AI Code Refactor applied successfully to Solution.cpp!</span>
          </div>
        )}

        {/* ─── TAB 1: IDE WORKSPACE ───────────────────────────────────────── */}
        {activeTab === 'ide' && (
          <div className="slide-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
            
            {/* Top diagnostic metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div style={{ 
                background: theme.cardBg, 
                border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, 
                borderRadius: theme.radiusCard, 
                padding: '18px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                boxShadow: theme.shadow 
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '4px', fontFamily: '"Inter", sans-serif' }}>Diagnostic Workspace</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.text, fontFamily: theme.fontHeading }}>src/Solution.cpp</div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.panel, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  <FileCode size={15} color={theme.brand} />
                </div>
              </div>

              <div onClick={() => setIsTimerActive(!isTimerActive)} style={{ 
                background: theme.cardBg, 
                border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, 
                borderRadius: theme.radiusCard, 
                padding: '18px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                boxShadow: theme.shadow, 
                cursor: 'pointer'
              }} className="btn-interact">
                <div>
                  <div style={{ fontSize: '10px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '4px', fontFamily: '"Inter", sans-serif' }}>Time Limit Countdown</div>
                  <div style={{ fontSize: '17px', fontWeight: 'bold', color: theme.text, fontFamily: 'monospace' }}>
                    {hours}<span style={{ opacity: 0.6, animation: 'pulse 1s infinite' }}>:</span>{minutes}<span style={{ opacity: 0.6, animation: 'pulse 1s infinite' }}>:</span>{seconds}
                  </div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isTimerActive ? theme.brand + '15' : theme.panel, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  <Timer size={15} color={isTimerActive ? theme.brand : theme.textTertiary} />
                </div>
              </div>

              <div style={{ 
                background: theme.cardBg, 
                border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, 
                borderRadius: theme.radiusCard, 
                padding: '18px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                boxShadow: theme.shadow 
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '4px', fontFamily: '"Inter", sans-serif' }}>TestSuite Diagnostics</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.text, fontFamily: theme.fontHeading }}>{testCases.filter(t => t.status === 'accepted').length}/6 Compiled</div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1f8a6515', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  <Check size={15} color="#1f8a65" />
                </div>
              </div>
            </div>

            {/* ─── DYNAMIC THEME-MORPHED CODE EDITOR AREA ────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
              
              {/* File header tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                {(['Solution.cpp', 'TestCases.h', 'Benchmark.py'] as const).map(file => (
                  <button
                    key={file}
                    onClick={() => setActiveFile(file)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: themeName === 'vercel' ? '0px' : '6px',
                      border: activeFile === file ? `1px solid ${theme.brand}` : '1px solid transparent',
                      background: activeFile === file ? theme.cardBg : 'transparent',
                      color: activeFile === file ? theme.text : theme.textSecondary,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    <FileCode size={12} />
                    <span>{file}</span>
                  </button>
                ))}
              </div>

              {/* Theme specific physical structure rendering */}
              
              {/* 1. CURSOR STYLE IDE CONSOLE & INLINE ASK-AI */}
              {themeName === 'cursor' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                  {/* Left Mock Berkeley Mono Editor Container */}
                  <div style={{ 
                    background: theme.editorBg, 
                    border: `1px solid ${theme.editorBorder}`, 
                    borderRadius: theme.radius, 
                    boxShadow: theme.shadow, 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ background: '#161616', padding: '12px 18px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'space-between', borderBottom: '1px solid #282828' }}>
                      <span style={{ fontSize: '11px', color: '#8e8e88', fontFamily: 'monospace' }}>Solution.cpp - Main Sandbox Editor</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
                      </div>
                    </div>
                    
                    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.7', overflowY: 'auto', maxHeight: '420px', color: '#c5c5c5', position: 'relative' }}>
                      {solutionCodeLines.map((line, idx) => {
                        const isErrorLine = idx === 16;
                        return (
                          <div key={idx} style={{ 
                            background: isErrorLine ? 'rgba(245, 78, 0, 0.08)' : 'transparent',
                            display: 'flex',
                            position: 'relative'
                          }}>
                            {/* Gutter */}
                            <span style={{ width: '32px', color: '#5a5a58', userSelect: 'none', display: 'inline-block' }}>{idx + 1}</span>
                            {/* Code segment */}
                            <span style={{ 
                              color: isErrorLine ? '#ff6e3b' : (line.trim().startsWith('//') ? '#7c7c7a' : undefined),
                              fontWeight: isErrorLine ? 'bold' : 'normal'
                            }}>{line}</span>
                            
                            {/* Diagnostic breakpoint flag */}
                            {isErrorLine && (
                              <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#f54e00' }} />
                            )}
                          </div>
                        )
                      })}

                      {/* Inline Floating Cursor Ask AI prompt box */}
                      <div style={{ 
                        marginTop: '16px', 
                        background: '#252524', 
                        borderRadius: '6px', 
                        padding: '12px', 
                        border: '1px solid #3e3e3b',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Sparkles size={13} color="#f54e00" />
                          <span style={{ fontSize: '11px', color: '#f2f1ed', fontWeight: 'bold' }}>Cursor Inline AI Refactor</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#8e8e88', margin: '0 0 10px 0' }}>Case 5 failed! Replace return block to correct sentinel value fallback.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={applyAIPatch} style={{ 
                            background: '#f54e00', 
                            color: '#ffffff', 
                            border: 'none', 
                            borderRadius: '4px', 
                            padding: '6px 12px', 
                            fontSize: '11px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer' 
                          }}>Apply Correct Fallback Patch</button>
                          <button onClick={() => setInlineAiOpen(false)} style={{ 
                            background: 'transparent', 
                            color: '#8e8e88', 
                            border: '1px solid #3e3e3b', 
                            borderRadius: '4px', 
                            padding: '6px 10px', 
                            fontSize: '11px', 
                            cursor: 'pointer' 
                          }}>Dismiss</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Diagnostics Testcase Selection list & details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: theme.cardBg, borderRadius: theme.radiusCard, border: theme.borderStyle, padding: '20px', boxShadow: theme.shadow }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '14px' }}>Diagnostics Test Suite</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {testCases.map(tc => (
                          <div 
                            key={tc.id} 
                            onClick={() => setSelectedTestCase(tc)}
                            style={{ 
                              padding: '10px 14px', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              border: selectedTestCase?.id === tc.id ? `1px solid ${theme.brand}` : `1px solid ${theme.borderSubtle}`,
                              background: selectedTestCase?.id === tc.id ? 'rgba(245, 78, 0, 0.03)' : 'transparent',
                              display: 'flex',
                              justifySelf: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              alignItems: 'center'
                            }}
                            className="btn-interact"
                          >
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Case {tc.id}: {tc.name}</span>
                            <span style={{ 
                              fontSize: '10px', 
                              color: tc.status === 'accepted' ? '#1f8a65' : '#cf2d56', 
                              fontWeight: 'bold' 
                            }}>{tc.status.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={triggerMockCompilation}
                        style={{
                          width: '100%',
                          marginTop: '16px',
                          background: isJudging ? theme.panel : theme.brand,
                          color: isJudging ? theme.textSecondary : '#ffffff',
                          border: 'none',
                          borderRadius: theme.btnRadius,
                          padding: theme.btnPadding,
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={12} className={isJudging ? 'animate-spin' : ''} />
                        {isJudging ? 'Compiling Run...' : 'Execute TestSuite'}
                      </button>
                    </div>

                    {selectedTestCase && (
                      <div style={{ background: theme.cardBg, borderRadius: theme.radiusCard, border: theme.borderStyle, padding: '20px', boxShadow: theme.shadow }}>
                        <span style={{ fontSize: '12px', color: theme.textSecondary, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Test Case Detail View</span>
                        <div style={{ background: theme.panel, padding: '12px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: theme.text }}>
                          <div><strong>Input:</strong> {selectedTestCase.input}</div>
                          <div style={{ marginTop: '6px' }}><strong>Output:</strong> {selectedTestCase.output}</div>
                          <div style={{ marginTop: '6px' }}><strong>Expected:</strong> {selectedTestCase.expected}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. CLAUDE STYLE INTERACTIVE BOOK-SHEET EDITORIAL LAYOUT */}
              {themeName === 'claude' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
                  
                  {/* Big layout box: left elegant code page, right side margin commentary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '32px' }}>
                    <div style={{ 
                      background: theme.editorBg,
                      border: `1px solid ${theme.editorBorder}`,
                      borderRadius: theme.radiusCard,
                      boxShadow: theme.shadow,
                      padding: '32px',
                      position: 'relative'
                    }}>
                      <div style={{ fontFamily: theme.fontHeading, fontSize: '15px', color: theme.textSecondary, borderBottom: `1px solid ${theme.borderSubtle}`, paddingBottom: '16px', marginBottom: '20px' }}>
                        Solution.cpp — Editorial Algorithmic Script
                      </div>

                      <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8', color: '#333' }}>
                        {solutionCodeLines.slice(0, 15).map((l, i) => (
                          <div key={i}><span style={{ color: '#8a8a87', marginRight: '20px' }}>0{i+1}</span>{l}</div>
                        ))}
                        
                        {/* Highlights in Editorial layout */}
                        <div style={{ background: '#fdf3ed', borderLeft: `3px solid ${theme.brand}`, padding: '16px', margin: '14px 0', borderRadius: '6px' }}>
                          <span style={{ color: '#8a8a87', marginRight: '20px' }}>16</span> return &#123;&#125;; <span style={{ color: '#c25e43', fontStyle: 'italic', fontFamily: theme.fontHeading, marginLeft: '12px' }}>— Mismatch sentinel limits: returning zero size vector</span>
                        </div>

                        {solutionCodeLines.slice(17).map((l, i) => (
                          <div key={i}><span style={{ color: '#8a8a87', marginRight: '20px' }}>0{i+18}</span>{l}</div>
                        ))}
                      </div>
                    </div>

                    {/* Right-aligned swash literary critique comments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ background: '#fcfbfa', border: `1px solid ${theme.border}`, borderRadius: theme.radiusCard, padding: '24px', boxShadow: theme.shadow }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                          <Sparkles size={16} color={theme.brand} />
                          <h4 style={{ fontFamily: theme.fontHeading, fontStyle: 'italic', margin: 0 }}>Claude Commentary</h4>
                        </div>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: theme.textSecondary, margin: '0 0 16px 0' }}>
                          Greetings XieXingyu. Algorithmic loops terminate securely, yet when indices exceed search criteria, standard sentinel models require explicit coordinates. Returning `{}` violates the contract of Case 5.
                        </p>
                        
                        <button 
                          onClick={applyAIPatch}
                          style={{
                            background: theme.brand,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: theme.btnRadius,
                            padding: '10px 18px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            boxShadow: '0 4px 12px rgba(204,120,92,0.15)'
                          }}
                          className="btn-interact"
                        >
                          Synthesize Code Refactor
                        </button>
                      </div>

                      {/* Test case critique bubbles */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {testCases.map(tc => (
                          <div 
                            key={tc.id}
                            onClick={() => setSelectedTestCase(tc)}
                            style={{
                              background: selectedTestCase?.id === tc.id ? '#f5ede6' : '#ffffff',
                              border: selectedTestCase?.id === tc.id ? `1px solid ${theme.brand}` : '1px solid #ecebe7',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                              <span style={{ fontFamily: theme.fontHeading, fontSize: '13px' }}>Case {tc.id}: {tc.name}</span>
                              <span style={{ fontSize: '10px', color: tc.status === 'accepted' ? '#1f8a65' : theme.brand, fontWeight: 'bold' }}>{tc.status.toUpperCase()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* 3. VERCEL STYLE START ABSOLUTE MINIMALIST COMMAND TERMINAL */}
              {themeName === 'vercel' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                    
                    {/* Stark Monospaced Black Editor */}
                    <div style={{ background: '#000000', border: '1px solid #333333', padding: '24px', minHeight: '380px' }}>
                      <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid #333333', paddingBottom: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', color: '#888888', fontFamily: 'monospace' }}>EDITOR // SOLUTION.CPP</span>
                        <span style={{ fontSize: '11px', color: '#ff3366', fontFamily: 'monospace' }}>FAILING LIMITS</span>
                      </div>
                      
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', lineHeight: '1.6' }}>
                        <div>01 #include &lt;vector&gt;</div>
                        <div>02 using namespace std;</div>
                        <div style={{ color: '#888888' }}>...</div>
                        <div style={{ background: '#111111', border: '1px solid #ff3366', padding: '8px 12px', margin: '8px 0' }}>
                          <div>16 return &#123;&#125;; <span style={{ color: '#ff3366' }}>// ERR: Case 5 returning size 0 vector</span></div>
                        </div>
                      </div>
                      
                      {/* Terminal Command Button block */}
                      <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                        <button onClick={applyAIPatch} style={{ background: '#ffffff', color: '#000000', border: 'none', fontSize: '11px', fontWeight: 'bold', padding: '8px 14px', cursor: 'pointer' }}>
                          npx vercel quickfix --force
                        </button>
                      </div>
                    </div>

                    {/* Monochromatic Test List */}
                    <div style={{ border: '1px solid #eaeaea', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Vercel Diagnostic Logs</span>
                      {testCases.map(tc => (
                        <div 
                          key={tc.id}
                          onClick={() => setSelectedTestCase(tc)}
                          style={{
                            padding: '10px',
                            cursor: 'pointer',
                            border: selectedTestCase?.id === tc.id ? '1px solid #000000' : '1px solid #eaeaea',
                            background: selectedTestCase?.id === tc.id ? '#fafafa' : '#ffffff',
                            display: 'flex',
                            justifySelf: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>CASE_{tc.id}</span>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: tc.status === 'accepted' ? '#000' : '#888' }}>[{tc.status.toUpperCase()}]</span>
                        </div>
                      ))}

                      <button onClick={triggerMockCompilation} style={{ background: '#000000', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '12px', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase', marginTop: '12px' }}>
                        Run Diagnostics
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* 4. NOTION STYLE INLINE TOGGLE BLOCK DOCUMENT */}
              {themeName === 'notion' && (
                <div style={{ background: theme.cardBg, border: theme.borderStyle, borderRadius: theme.radiusCard, padding: '32px', boxShadow: theme.shadow }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${theme.borderSubtle}`, paddingBottom: '16px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '24px' }}>📁</div>
                    <div>
                      <h3 style={{ fontFamily: theme.fontHeading, fontSize: '20px', margin: 0 }}>Solution.cpp — Logic Blocks</h3>
                      <span style={{ fontSize: '12px', color: theme.textSecondary }}>Nest your functions inside collapsible list pages.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Block 1 */}
                    <div style={{ borderLeft: '3px solid #e9e8e3', paddingLeft: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '12px', color: theme.textTertiary }}>::</span>
                        <ChevronDown size={14} />
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Module 1: Header & Map Initializations</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '12.5px', marginTop: '6px', color: '#555', paddingLeft: '20px' }}>
                        #include &lt;vector&gt;<br />
                        using namespace std;
                      </div>
                    </div>

                    {/* Block 2 (failing block) */}
                    <div style={{ borderLeft: `3px solid ${theme.brand}`, paddingLeft: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '12px', color: theme.textTertiary }}>::</span>
                        <ChevronDown size={14} color={theme.brand} />
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: theme.brand }}>Module 2: TwoSum Fallback sentinel [FAILING Case 5]</span>
                      </div>
                      
                      <div style={{ paddingLeft: '20px', marginTop: '10px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12.5px', color: theme.text }}>
                          // Incorrect fallback size returns empty<br />
                          <span style={{ background: '#ffebeb', color: '#d44', padding: '2px 4px', borderRadius: '4px' }}>return {};</span>
                        </div>
                        
                        <div style={{ background: '#f5f4f0', borderRadius: '6px', padding: '16px', marginTop: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>💡 Notion Collaborative AI suggestion</span>
                          <p style={{ fontSize: '12px', color: theme.textSecondary, margin: '0 0 10px 0' }}>It looks like returning a sentinel boundary vector `{-1, -1}` makes Case 5 pass.</p>
                          <button onClick={applyAIPatch} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Refactor block inline
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* 5. STRIPE STYLE HIGH-TECH DEV CONSOLE */}
              {themeName === 'stripe' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                  
                  {/* Stripe dark slate IDE console */}
                  <div style={{ 
                    background: theme.editorBg, 
                    border: `1px solid ${theme.editorBorder}`, 
                    borderRadius: theme.radiusCard, 
                    boxShadow: theme.shadowElevated, 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ background: '#1e293b', padding: '14px 20px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#6366f1', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>POST</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>/v1/solve/Solution.cpp</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff3b30' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffcc00' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759' }} />
                      </div>
                    </div>

                    <div style={{ padding: '24px', fontFamily: 'monospace', fontSize: '12.5px', color: '#e2e8f0', lineHeight: '1.7' }}>
                      <span style={{ color: '#6366f1' }}>#include</span> &lt;vector&gt;<br />
                      <span style={{ color: '#6366f1' }}>using namespace</span> std;<br /><br />
                      
                      <span style={{ color: '#a78bfa' }}>vector&lt;int&gt;</span> twoSum(<span style={{ color: '#a78bfa' }}>vector&lt;int&gt;&amp;</span> nums, <span style={{ color: '#f472b6' }}>int</span> target) &#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;<span style={{ color: '#f472b6' }}>int</span>, <span style={{ color: '#f472b6' }}>int</span>&gt; hash;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;...<br />
                      <div style={{ background: 'rgba(99,102,241,0.1)', borderLeft: '3px solid #6366f1', padding: '8px 12px', margin: '8px 0' }}>
                        &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#f43f5e' }}>return {}; // ⚠ DIAGNOSTIC FAILURE CASE 5</span>
                      </div>
                      &#125;
                    </div>

                    <div style={{ padding: '16px 24px', borderTop: '1px solid #1e293b', display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>API Version: 2026-05-30</span>
                      <button onClick={applyAIPatch} style={{ background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-interact">
                        Merge API Refactor
                      </button>
                    </div>
                  </div>

                  {/* Stripe interactive query tabs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#ffffff', border: `1px solid ${theme.border}`, borderRadius: theme.radiusCard, padding: '24px', boxShadow: theme.shadow }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#061b31', display: 'block', marginBottom: '14px' }}>Stripe Query Params Matrix</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                        {testCases.map(tc => (
                          <div 
                            key={tc.id} 
                            onClick={() => setSelectedTestCase(tc)}
                            style={{ 
                              padding: '12px', 
                              border: selectedTestCase?.id === tc.id ? '1px solid #6366f1' : '1px solid #e2e8f0', 
                              background: selectedTestCase?.id === tc.id ? 'rgba(99,102,241,0.03)' : 'transparent',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifySelf: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 800 }}>CASE_{tc.id}</span>
                            <span style={{ fontSize: '10px', background: tc.status === 'accepted' ? '#10b981' : '#f43f5e', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{tc.status.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* ─── TAB 2: TEAM DIRECT MESSAGES & WORKSPACE CHATS ────────────────── */}
        {activeTab === 'community' && (
          <div className="slide-in-up">
            
            {/* Morphing Direct Messages components */}
            {themeName === 'cursor' || themeName === 'stripe' ? (
              
              /* Two Sum Double Column Team Workspace (Cursor & Stripe) */
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '280px 1fr', 
                gap: '24px',
                background: theme.cardBg, 
                border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, 
                borderRadius: theme.radiusCard, 
                boxShadow: theme.shadow,
                overflow: 'hidden',
                minHeight: '520px'
              }}>
                {/* Left sidebar roster channels */}
                <div style={{ background: theme.panel, borderRight: `1px solid ${theme.borderSubtle}`, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <Search size={14} color={theme.textTertiary} />
                    <input 
                      type="text" 
                      placeholder="Search active roster..." 
                      style={{ background: 'transparent', border: 'none', fontSize: '12px', outline: 'none', color: theme.text, width: '100%' }} 
                    />
                  </div>
                  
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textTertiary, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Channels</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {['# general-contest', '# solution-cpp-debug', '# plagiarism-scans'].map((ch, idx) => (
                      <div key={idx} style={{ 
                        padding: '8px 12px', 
                        borderRadius: themeName === 'cursor' ? '6px' : '8px', 
                        fontSize: '13px', 
                        fontWeight: idx === 1 ? 'bold' : 'normal',
                        background: idx === 1 ? 'rgba(0,0,0,0.05)' : 'transparent',
                        color: idx === 1 ? theme.text : theme.textSecondary,
                        cursor: 'pointer' 
                      }}>
                        {ch}
                      </div>
                    ))}
                  </div>

                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textTertiary, textTransform: 'uppercase', display: 'block', marginTop: '24px', marginBottom: '10px' }}>Team Roster</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'LiHua_Algorithm', active: true, avatar: 'L' },
                      { name: 'XieXingyu', active: true, avatar: 'X' },
                      { name: 'JiangYang_OJ', active: false, avatar: 'J' }
                    ].map((ros, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: theme.brand, color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{ros.avatar}</div>
                          {ros.active && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: `2px solid ${theme.panel}` }} />}
                        </div>
                        <span style={{ fontSize: '13px', color: theme.text }}>{ros.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Direct Messages chat board */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch', justifyContent: 'space-between', height: '520px' }}>
                  
                  {/* Top bar header */}
                  <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', borderBottom: `1px solid ${theme.borderSubtle}`, paddingBottom: '14px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}># solution-cpp-debug</span>
                      <p style={{ fontSize: '11px', color: theme.textSecondary, margin: '2px 0 0 0' }}>Resolving off-by-one errors and loop fallback sentinel returns.</p>
                    </div>
                  </div>

                  {/* Messages container list */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.sender === 'XieXingyu' ? 'row-reverse' : 'row' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: theme.brand, 
                          color: '#fff', 
                          fontWeight: 'bold', 
                          fontSize: '12px',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>{msg.avatar}</div>
                        
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px', flexDirection: msg.sender === 'XieXingyu' ? 'row-reverse' : 'row' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{msg.sender}</span>
                            <span style={{ fontSize: '10px', color: theme.textTertiary }}>{msg.time}</span>
                          </div>
                          
                          <div style={{ 
                            background: theme.panel, 
                            border: `1px solid ${theme.borderSubtle}`, 
                            borderRadius: theme.radius, 
                            padding: '12px 16px',
                            fontSize: '13px'
                          }}>
                            <p style={{ margin: 0, lineHeight: 1.4 }}>{msg.text}</p>
                            
                            {msg.code && (
                              <div style={{ background: '#1c1b18', color: '#f0ede6', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11.5px', marginTop: '8px' }}>
                                {msg.code}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Send Chat input block */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message in solution-cpp-debug channel..." 
                      style={{
                        background: theme.panel,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radius,
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: theme.text,
                        flex: 1,
                        outline: 'none'
                      }}
                    />
                    <button 
                      onClick={handleSendMessage}
                      style={{
                        background: theme.brand,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: theme.radius,
                        padding: '12px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      className="btn-interact"
                    >
                      <Send size={14} />
                    </button>
                  </div>

                </div>
              </div>
            ) : themeName === 'claude' ? (
              
              /* Literary Sand Center-aligned Editorial Chat (Claude Style) */
              <div style={{ 
                background: theme.cardBg, 
                border: `1px solid ${theme.border}`, 
                borderRadius: theme.radiusCard, 
                padding: '40px 24px', 
                boxShadow: theme.shadow,
                maxWidth: '820px',
                margin: '0 auto'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontFamily: theme.fontHeading, fontSize: '22px', fontStyle: 'italic', margin: '0 0 8px 0' }}>Algorithmic Discourse Chamber</h3>
                  <span style={{ fontSize: '12px', color: theme.textSecondary }}>A quiet workspace for deep analytical chat dialogue</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '40px' }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ borderBottom: `1px solid ${theme.borderSubtle}`, paddingBottom: '20px' }}>
                      <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: theme.fontHeading, fontWeight: 'bold', fontSize: '15px' }}>{msg.sender}</span>
                        <span style={{ fontSize: '11px', color: theme.textTertiary }}>{msg.time}</span>
                      </div>
                      
                      <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: theme.text, margin: '0 0 12px 0' }}>{msg.text}</p>
                      
                      {msg.code && (
                        <div style={{ 
                          background: '#fcfbfa', 
                          border: `1px solid ${theme.border}`, 
                          padding: '16px', 
                          borderRadius: '8px', 
                          fontFamily: 'monospace', 
                          fontSize: '12px', 
                          color: '#475569' 
                        }}>
                          {msg.code}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Literary Chat Input */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Contribute your observation to the chamber..." 
                    style={{
                      background: theme.panel,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius,
                      padding: '12px 18px',
                      fontSize: '13.5px',
                      color: theme.text,
                      flex: 1,
                      outline: 'none',
                      fontFamily: theme.fontHeading
                    }}
                  />
                  <button 
                    onClick={handleSendMessage}
                    style={{
                      background: theme.brand,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: theme.radius,
                      padding: '12px 24px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Post Message
                  </button>
                </div>
              </div>
            ) : themeName === 'notion' ? (
              
              /* Notion Milk-Cream inline Toggle Comments Chat */
              <div style={{ 
                background: theme.cardBg, 
                border: theme.borderStyle, 
                borderRadius: theme.radiusCard, 
                padding: '32px', 
                boxShadow: theme.shadow,
                maxWidth: '900px',
                margin: '0 auto'
              }}>
                <h3 style={{ fontFamily: theme.fontHeading, fontSize: '20px', margin: '0 0 16px 0' }}>💬 Discussion Thread</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ borderLeft: '3px solid #e9e8e3', paddingLeft: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{msg.sender}</span>
                        <span style={{ fontSize: '11px', color: theme.textTertiary }}>{msg.time}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: theme.textSecondary, margin: '0 0 8px 0' }}>{msg.text}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Reply or add a block bullet..." 
                    style={{
                      background: theme.panel,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius,
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: theme.text,
                      flex: 1,
                      outline: 'none'
                    }}
                  />
                  <button onClick={handleSendMessage} style={{ background: theme.brand, color: '#fff', border: 'none', borderRadius: theme.radius, padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Comment
                  </button>
                </div>
              </div>
            ) : (
              
              /* Vercel Stark Monochromatic Search List Chat */
              <div style={{ border: '1px solid #000000', padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '20px' }}>// WORKSPACE_CHAT_LOGS</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                      <span style={{ fontWeight: 'bold' }}>[{msg.sender.toUpperCase()}]</span> {msg.text}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Enter command console reply..." 
                    style={{
                      background: '#ffffff',
                      border: '1px solid #eaeaea',
                      padding: '10px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      flex: 1,
                      outline: 'none'
                    }}
                  />
                  <button onClick={handleSendMessage} style={{ background: '#000000', color: '#ffffff', border: 'none', padding: '10px 20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}>
                    SUBMIT
                  </button>
                </div>
              </div>

            )}

          </div>
        )}

        {/* ─── TAB 3: PLAGIARISM SIMILARITY RADAR & DIFF VIEW ─────────────── */}
        {activeTab === 'plagiarism' && (
          <div className="slide-in-up">
            <div style={{ background: theme.cardBg, border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, borderRadius: theme.radiusCard, padding: '32px', boxShadow: theme.shadow }}>
              
              <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '32px', borderBottom: `1px solid ${theme.borderSubtle}`, paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: theme.fontHeading, margin: 0 }}>Advanced Plagiarism & Similarity Radar</h3>
                  <p style={{ fontSize: '12px', color: theme.textSecondary, margin: '4px 0 0 0' }}>Multi-tenant algorithmic diff match. Compares student solutions for code duplicates.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    color: plagiarismIgnored ? theme.textTertiary : '#cf2d56',
                    background: plagiarismIgnored ? 'rgba(0,0,0,0.05)' : 'rgba(207,45,86,0.1)',
                    padding: '6px 12px',
                    borderRadius: '9999px'
                  }}>
                    {plagiarismIgnored ? 'Match Flag Dismissed' : `Similarity Mismatch: ${plagiarismSimilarity}%`}
                  </span>
                  
                  <button 
                    onClick={() => setPlagiarismIgnored(!plagiarismIgnored)}
                    style={{
                      background: theme.brand,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: theme.btnRadius,
                      padding: theme.btnPadding,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    className="btn-interact"
                  >
                    {plagiarismIgnored ? 'Flag Duplicate Match' : 'Dismiss Flag Match'}
                  </button>
                </div>
              </div>

              {/* Theme structural morphing for diff view */}
              
              {/* 1. CURSOR VSCODE SIDE-BY-SIDE SYNC SCROLL TERMINAL */}
              {themeName === 'cursor' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Left Column File */}
                  <div style={{ background: '#1e1e1e', borderRadius: '6px', border: '1px solid #282828', overflow: 'hidden' }}>
                    <div style={{ background: '#161616', padding: '10px 14px', borderBottom: '1px solid #282828', display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '11px', color: '#8e8e88', fontFamily: 'monospace' }}>XieXingyu_Solution.cpp (Active Workspace)</span>
                      <span style={{ fontSize: '10px', color: '#1f8a65', fontWeight: 'bold' }}>Original</span>
                    </div>
                    <div style={{ padding: '16px', fontFamily: 'monospace', fontSize: '11.5px', color: '#d4d4d4', lineHeight: '1.6' }}>
                      <div>36 int twoSum(vector&lt;int&gt;&amp; nums, int target) &#123;</div>
                      <div style={{ background: 'rgba(31,138,101,0.12)' }}>37 &nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;int, int&gt; hash;</div>
                      <div>38 &nbsp;&nbsp;&nbsp;&nbsp;for (int i = 0; i &lt; nums.size(); i++) &#123;</div>
                      <div>39 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;hash[nums[i]] = i;</div>
                      <div>40 &nbsp;&nbsp;&nbsp;&nbsp;&#125;</div>
                    </div>
                  </div>

                  {/* Right Column Duplicate File */}
                  <div style={{ background: '#1e1e1e', borderRadius: '6px', border: '1px solid #282828', overflow: 'hidden' }}>
                    <div style={{ background: '#161616', padding: '10px 14px', borderBottom: '1px solid #282828', display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '11px', color: '#8e8e88', fontFamily: 'monospace' }}>LiHua_Solution.cpp (Duplicate Suspect)</span>
                      <span style={{ fontSize: '10px', color: '#cf2d56', fontWeight: 'bold' }}>82% Matches</span>
                    </div>
                    <div style={{ padding: '16px', fontFamily: 'monospace', fontSize: '11.5px', color: '#d4d4d4', lineHeight: '1.6' }}>
                      <div>22 int hashSearch(vector&lt;int&gt;&amp; arr, int val) &#123;</div>
                      <div style={{ background: 'rgba(207,45,86,0.15)' }}>23 &nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;int, int&gt; map;</div>
                      <div>24 &nbsp;&nbsp;&nbsp;&nbsp;for (int i = 0; i &lt; arr.size(); i++) &#123;</div>
                      <div>25 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;map[arr[i]] = i;</div>
                      <div>26 &nbsp;&nbsp;&nbsp;&nbsp;&#125;</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CLAUDE LITERARY DUAL-COLUMN SAND PAPER DOCUMENTS */}
              {themeName === 'claude' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  <div style={{ background: '#fdfbf7', border: '1px solid #e6e2db', borderRadius: '12px', padding: '24px', position: 'relative' }}>
                    <h4 style={{ fontFamily: theme.fontHeading, margin: '0 0 12px 0', borderBottom: '1px solid #e6e2db', paddingBottom: '8px' }}>XieXingyu Script Revision</h4>
                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#333' }}>
                      <strong>Active Function</strong><br />
                      Instantiates an index dictionary mappings using:
                      <code style={{ display: 'block', background: '#f0ede6', padding: '10px', borderRadius: '6px', margin: '8px 0', fontFamily: 'monospace', fontSize: '12px' }}>
                        unordered_map&lt;int, int&gt; hash;<br />
                        hash[nums[i]] = i;
                      </code>
                    </p>
                  </div>

                  <div style={{ background: '#fdfbf7', border: '1px solid #cc785c', borderRadius: '12px', padding: '24px', position: 'relative' }}>
                    <h4 style={{ fontFamily: theme.fontHeading, color: '#cc785c', margin: '0 0 12px 0', borderBottom: '1px solid #cc785c', paddingBottom: '8px' }}>LiHua Duplication Transcript</h4>
                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#333' }}>
                      <strong>Identical Loop Pattern Match</strong><br />
                      Possesses congruent sequence maps using variables `map` instead of `hash`:
                      <code style={{ display: 'block', background: '#ffebeb', padding: '10px', borderRadius: '6px', margin: '8px 0', fontFamily: 'monospace', fontSize: '12px' }}>
                        unordered_map&lt;int, int&gt; map;<br />
                        map[arr[i]] = i;
                      </code>
                    </p>
                  </div>
                </div>
              )}

              {/* 3. VERCEL FLAT MONOCHROME BORDERLESS COMPACT VIEWER */}
              {themeName === 'vercel' && (
                <div style={{ border: '1px solid #eaeaea', fontFamily: 'monospace', fontSize: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fafafa', borderBottom: '1px solid #eaeaea', padding: '10px 16px', fontWeight: 'bold' }}>
                    <div>XieXingyu_Solution.cpp // ORIGINAL</div>
                    <div>LiHua_Solution.cpp // DUPLICATE_82%</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '16px' }}>
                    <div>
                      int twoSum(vector&lt;int&gt;&amp; nums, int target) &#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;int, int&gt; hash;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;for (int i = 0; i &lt; nums.size(); i++) &#123;
                    </div>
                    <div style={{ background: '#fafafa', borderLeft: '1px solid #eaeaea', paddingLeft: '16px' }}>
                      int hashSearch(vector&lt;int&gt;&amp; arr, int val) &#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;int, int&gt; map;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;for (int i = 0; i &lt; arr.size(); i++) &#123;
                    </div>
                  </div>
                </div>
              )}

              {/* 4. NOTION COLLAPSIBLE INLINE COMPARISON BLOCKS */}
              {themeName === 'notion' && (
                <div style={{ background: '#fdfcfb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '20px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>📂 File Similarity Diffs</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ padding: '8px 12px', background: '#f5f4f0', borderRadius: '6px' }}>
                      <span>▶ Toggle block to view comparison detail for twoSum()</span>
                    </div>
                    <div style={{ padding: '8px 12px', background: '#f5f4f0', borderRadius: '6px' }}>
                      <span>▶ Toggle block to view comparison detail for Map Indexing</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. STRIPE HIGH-TECH JSON ROUTE SCHEMA COMPARE CONSOLE */}
              {themeName === 'stripe' && (
                <div style={{ background: '#0f172a', borderRadius: '12px', padding: '24px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '12.5px', boxShadow: theme.shadowElevated }}>
                  <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#6366f1', fontWeight: 'bold' }}>JSON_SCHEMA_DIFF_COMPARE_RADAR</span>
                    <span style={{ color: '#f43f5e' }}>MATCH_FOUND_82%</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>// XieXingyu request payload</span><br />
                    &#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"method": <span style={{ color: '#38bdf8' }}>"twoSum"</span>,<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"mapping_field": <span style={{ color: '#38bdf8' }}>"hash"</span><br />
                    &#125;<br /><br />
                    <span style={{ color: '#64748b' }}>// LiHua request payload [CONGRUENT_MATCH]</span><br />
                    <span style={{ background: 'rgba(244,63,94,0.15)', display: 'block', width: '100%', padding: '2px 4px' }}>
                      &#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"method": <span style={{ color: '#f43f5e' }}>"hashSearch"</span>,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"mapping_field": <span style={{ color: '#f43f5e' }}>"map"</span><br />
                      &#125;
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ─── TAB 4: ALGORITHM STEPPER ROADMAP & SKILL TREE ───────────────── */}
        {activeTab === 'roadmap' && (
          <div className="slide-in-up">
            <div style={{ background: theme.cardBg, border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, borderRadius: theme.radiusCard, padding: '32px', boxShadow: theme.shadow }}>
              
              <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '32px', borderBottom: `1px solid ${theme.borderSubtle}`, paddingBottom: '14px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: theme.fontHeading }}>Interactive Skill Stepper Roadmap</span>
                <span style={{ fontSize: '12px', color: theme.brand, fontWeight: 700 }}>Curriculum Map Unlock</span>
              </div>

              {/* Dynamic theme-specific physical composition */}
              
              {/* 1. STRIPE HIGH-TECH ACTIVE FLOWING SVG PIPING */}
              {themeName === 'stripe' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'space-between', position: 'relative', padding: '40px 0', maxWidth: '900px', margin: '0 auto' }}>
                    
                    {/* SVG Connector pipeline */}
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '4px', background: '#e2e8f0', zIndex: 1 }} />
                    <div style={{ position: 'absolute', left: 0, width: '66%', top: '50%', transform: 'translateY(-50%)', height: '4px', background: '#6366f1', zIndex: 1, boxShadow: '0 0 12px rgba(99,102,241,0.5)' }} />
                    
                    {[
                      { id: 1, name: 'Arrays & Lists', active: true },
                      { id: 2, name: 'HashMap Indexing', active: true },
                      { id: 3, name: 'Sentinel Fallback', active: true },
                      { id: 4, name: 'Stress Bounds', active: false }
                    ].map((step, idx) => (
                      <div key={idx} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="btn-interact">
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: step.active ? '#6366f1' : '#ffffff', 
                          border: '2px solid #6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: step.active ? '#ffffff' : '#6366f1',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: step.active ? '0 0 14px rgba(99,102,241,0.4)' : 'none'
                        }}>{step.id}</div>
                        <span style={{ fontSize: '12px', fontWeight: 800, marginTop: '8px', color: '#061b31' }}>{step.name}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#f6f9fc', padding: '16px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '24px', textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>HashMap Indexing Module unlocked. Active challenges: 14 solved.</span>
                  </div>
                </div>
              ) : themeName === 'cursor' ? (
                
                /* CURSOR VERTICAL BREAKPOINT DEBUG STEPPER */
                <div style={{ position: 'relative', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(38,37,30,0.12)' }} />
                  
                  {[
                    { id: 1, name: 'Array limits diagnostics', active: true, desc: 'Identify loops indices ranges.' },
                    { id: 2, name: 'Correct boundary sentinel return', active: true, desc: 'Avoid vector size mismatches.' },
                    { id: 3, name: 'Run multi-tenant compilation stress test', active: false, desc: 'Perform diagnostics benchmark execution.' }
                  ].map((step, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '-32px',
                        top: '4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: step.active ? theme.brand : theme.panel,
                        border: `2px solid ${theme.brand}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: step.active ? '#ffffff' : theme.brand,
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>{step.id}</div>
                      
                      <h4 style={{ fontSize: '14.5px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: theme.fontHeading }}>{step.name}</h4>
                      <p style={{ fontSize: '12px', color: theme.textSecondary, margin: 0 }}>{step.desc}</p>
                    </div>
                  ))}
                </div>
              ) : themeName === 'claude' ? (
                
                /* CLAUDE LITERARY SERIF TABLE OF CONTENTS */
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '13px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>curriculum syllabus</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[
                      { chapter: 'Chapter I', name: 'Sequential Search Arrays & Boundary Loops', desc: 'An essay on index limits, looping criteria, and basic vector allocations.' },
                      { chapter: 'Chapter II', name: 'HashMap Cache Optimization', desc: 'Understanding memory footprint maps and linear time search complement lookup.' },
                      { chapter: 'Chapter III', name: 'Sentinel fallbacks and Stress diagnostics', desc: 'Returning sentinel coordinates and benchmarking under strict compiler limits.' }
                    ].map((ch, idx) => (
                      <div key={idx} style={{ borderBottom: '1px solid #e6e2db', paddingBottom: '16px' }}>
                        <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', alignItems: 'baseline' }}>
                          <h4 style={{ fontFamily: theme.fontHeading, fontSize: '16px', margin: 0, fontWeight: 'bold' }}>{ch.chapter}: {ch.name}</h4>
                          <span style={{ fontSize: '11px', color: theme.brand, fontWeight: 'bold' }}>{idx <= 1 ? 'UNLOCKED' : 'LOCKED'}</span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: theme.textSecondary, margin: '6px 0 0 0', lineHeight: '1.5' }}>{ch.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : themeName === 'notion' ? (
                
                /* NOTION SIMPLE CHECKBOX DATABASE ROADMAP */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { name: '✅ Module 1: TwoSum Basic Arrays Indexing', solved: true },
                    { name: '✅ Module 2: HashMap complement cache loop', solved: true },
                    { name: '⬜ Module 3: Boundary return sentinel size check', solved: false }
                  ].map((task, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', background: '#f5f4f0', borderRadius: '6px', fontSize: '13.5px' }}>
                      <span style={{ fontWeight: task.solved ? 'bold' : 'normal' }}>{task.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                
                /* VERCEL FLAT HIGH-CONTRAST CHECKLIST */
                <div style={{ border: '1px solid #eaeaea', padding: '24px' }}>
                  {[
                    { id: 'ROADMAP_01', name: 'ARRAY_LIMITS_SOLVED', done: true },
                    { id: 'ROADMAP_02', name: 'HASHMAP_COMPLEMENT_SOLVED', done: true },
                    { id: 'ROADMAP_03', name: 'SENTINEL_FALLBACK_PENDING', done: false }
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid #eaeaea', padding: '12px 0', fontSize: '12px', fontFamily: 'monospace' }}>
                      <span>{step.id} // {step.name}</span>
                      <span>{step.done ? '[SUCCESS]' : '[TODO]'}</span>
                    </div>
                  ))}
                </div>

              )}

            </div>
          </div>
        )}

        {/* ─── TAB 5: LEADERBOARDS & DYNAMIC HEATMAP OVERLAYS ─────────────── */}
        {activeTab === 'stats' && (
          <div className="slide-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
            
            {/* Top Leaderboard Podium standings */}
            {themeName === 'vercel' ? (
              
              /* Vercel clean stark tables */
              <div style={{ background: '#ffffff', border: '1px solid #eaeaea', padding: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eaeaea', textAlign: 'left', color: '#666666' }}>
                      <th style={{ padding: '12px 8px' }}>RANK</th>
                      <th style={{ padding: '12px 8px' }}>CONTESTANT</th>
                      <th style={{ padding: '12px 8px' }}>AFFILIATION</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>SOLVED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { rank: 1, name: 'XieXingyu', aff: '北京大学', solved: 492 },
                      { rank: 2, name: 'JiangYang_OJ', aff: '华东师范大学', solved: 382 },
                      { rank: 3, name: 'LiHua_Algorithm', aff: '南京大学', solved: 341 }
                    ].map(row => (
                      <tr key={row.rank} style={{ borderBottom: '1px solid #eaeaea', color: '#000000' }}>
                        <td style={{ padding: '14px 8px', fontWeight: 'bold' }}>#{row.rank}</td>
                        <td>{row.name.toUpperCase()}</td>
                        <td style={{ color: '#666666' }}>{row.aff}</td>
                        <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 'bold' }}>{row.solved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : themeName === 'notion' || themeName === 'claude' ? (
              
              /* Notion & Claude 3D podium stands */
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: theme.radiusCard, padding: '32px', boxShadow: theme.shadow }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'end', maxWidth: '800px', margin: '0 auto' }}>
                  
                  {/* Rank 2 */}
                  <div style={{ background: '#ffffff', border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: '24px', textAlign: 'center', height: '220px', display: 'flex', flexDirection: 'column', justifySelf: 'center', justifyContent: 'space-between', boxShadow: theme.shadow, width: '100%' }}>
                    <div>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: theme.panel, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: theme.fontHeading, color: theme.text }}>JiangYang_OJ</h3>
                    </div>
                    <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: '12px', fontSize: '13px', fontWeight: 'bold' }}>382 Solved</div>
                  </div>

                  {/* Rank 1 (Elevated Crown Stand) */}
                  <div style={{ background: '#ffffff', border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: '32px 24px', textAlign: 'center', height: '280px', display: 'flex', flexDirection: 'column', justifySelf: 'center', justifyContent: 'space-between', boxShadow: theme.shadowElevated, position: 'relative', width: '100%' }}>
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}><Crown size={12} /></div>
                    <div>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: theme.panel, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2.5px solid #f59e0b' }}>1</div>
                      <h3 style={{ fontSize: '17px', fontWeight: 'bold', fontFamily: theme.fontHeading, color: theme.text }}>XieXingyu</h3>
                    </div>
                    <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: '12px', fontSize: '14px', fontWeight: 'bold', color: theme.brand }}>492 Solved</div>
                  </div>

                  {/* Rank 3 */}
                  <div style={{ background: '#ffffff', border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: '24px', textAlign: 'center', height: '200px', display: 'flex', flexDirection: 'column', justifySelf: 'center', justifyContent: 'space-between', boxShadow: theme.shadow, width: '100%' }}>
                    <div>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: theme.panel, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
                      <h3 style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: theme.fontHeading, color: theme.text }}>LiHua_Algorithm</h3>
                    </div>
                    <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: '12px', fontSize: '13px', fontWeight: 'bold' }}>341 Solved</div>
                  </div>

                </div>
              </div>
            ) : (
              
              /* Stripe and Cursor High tech Leaderboard stats cards */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                {[
                  { rank: 1, name: 'XieXingyu', solved: 492, color: theme.brand, rate: '96%' },
                  { rank: 2, name: 'JiangYang_OJ', solved: 382, color: theme.textSecondary, rate: '85%' },
                  { rank: 3, name: 'LiHua_Algorithm', solved: 341, color: theme.textTertiary, rate: '79%' }
                ].map(card => (
                  <div key={card.rank} style={{ 
                    background: '#ffffff', 
                    border: `1px solid ${theme.border}`, 
                    borderRadius: theme.radiusCard, 
                    padding: '24px', 
                    boxShadow: theme.shadow, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifySelf: 'stretch', 
                    justifyContent: 'space-between', 
                    height: '190px' 
                  }} className="btn-interact">
                    <div>
                      <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: card.color, textTransform: 'uppercase', letterSpacing: '1px' }}>Rank #{card.rank} contestant</span>
                        <Award size={14} color={card.color} />
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: theme.text, marginTop: '8px', marginBottom: '4px' }}>{card.name}</h3>
                    </div>
                    
                    {/* Stripe-style active progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: theme.textSecondary, marginBottom: '6px' }}>
                        <span>Solve Rate</span>
                        <span>{card.rate}</span>
                      </div>
                      <div style={{ height: '6px', background: theme.panel, borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: card.rate, height: '100%', background: card.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            )}

            {/* Heatmap Grid & Modal Overlay details */}
            <div style={{ background: theme.cardBg, border: theme.borderStyle === 'none' ? 'none' : theme.borderStyle, borderRadius: theme.radiusCard, padding: '32px', boxShadow: theme.shadow }}>
              <div style={{ display: 'flex', justifySelf: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '16px', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: theme.fontHeading }}>Submission History Activity Radar</span>
                  <p style={{ fontSize: '11px', color: theme.textSecondary, margin: '2px 0 0 0' }}>Click a grid cell to load compiler diagnostic logs from that day.</p>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px', color: theme.textSecondary }}>
                  <span>Less</span>
                  <div style={{ width: '10px', height: '10px', background: theme.panel, borderRadius: '2px' }} />
                  <div style={{ width: '10px', height: '10px', background: theme.brand + '20', borderRadius: '2px' }} />
                  <div style={{ width: '10px', height: '10px', background: theme.brand + '50', borderRadius: '2px' }} />
                  <div style={{ width: '10px', height: '10px', background: theme.brand, borderRadius: '2px' }} />
                  <span>More</span>
                </div>
              </div>

              {/* Heatmap scroll grid wrapper */}
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: themeName === 'vercel' ? '2px' : (themeName === 'notion' ? '3px' : '4px') }}>
                  {heatmapData.map((week, w) => (
                    <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: themeName === 'vercel' ? '2px' : (themeName === 'notion' ? '3px' : '4px') }}>
                      {week.map((day, d) => {
                        let bg = theme.panel
                        if (day.level === 1) bg = theme.brand + '20'
                        else if (day.level === 2) bg = theme.brand + '45'
                        else if (day.level === 3) bg = theme.brand + '70'
                        else if (day.level === 4) bg = theme.brand
                        
                        return (
                          <div 
                            key={d} 
                            onClick={() => setSelectedHeatmapDay(day)}
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: themeName === 'vercel' ? '0px' : (themeName === 'notion' ? '2px' : '3px'), 
                              background: bg,
                              cursor: 'pointer'
                            }} 
                            title={`${day.date}: ${day.count} submissions`}
                            className="btn-interact"
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Click-to-view cell logs modal overlay */}
              {selectedHeatmapDay && (
                <div className="slide-in-up" style={{ 
                  marginTop: '24px', 
                  background: themeName === 'vercel' ? '#fafafa' : theme.panel, 
                  border: `1px solid ${theme.border}`, 
                  borderRadius: theme.radius, 
                  padding: '20px',
                  display: 'flex',
                  justifySelf: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: theme.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' }}>Compiler diagnostic trace Log // {selectedHeatmapDay.date}</span>
                    <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{selectedHeatmapDay.count} active submissions benchmark runs</h4>
                    <p style={{ fontSize: '12.5px', color: theme.textSecondary, margin: '2px 0 0 0' }}>
                      Diagnostic results: CPU time {selectedHeatmapDay.level * 18 + 12}ms // Memory foot {selectedHeatmapDay.level * 1.2 + 3.8}MB // 100% correct bounds.
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedHeatmapDay(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: theme.brand,
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                  >
                    Close Log
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

    </div>
  )
}
