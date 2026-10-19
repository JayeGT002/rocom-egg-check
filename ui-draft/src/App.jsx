import { useEffect, useRef, useState } from 'react'
import { Button, Input, RocoTheme, Select } from 'rocokingdom-ui'
import { attributeColors, getEggGroupColor, getTierColor } from './colors'
import petPortraits from './petPortraits.json'
import { EggData } from './mygo'
import OffspringCalculator, { SAVED_CALCULATIONS_KEY } from './OffspringCalculator'
import { version as appVersion } from '../package.json'

const FAVORITES_KEY = 'rocom-egg-check.favorites'
const RECENT_QUERIES_KEY = 'rocom-egg-check.recent-queries'
const RESULT_SORT_KEY = 'rocom-egg-check.result-sort'
const RECENT_QUERY_LIMIT = 5
const SORT_OPTIONS = [
  { value: 'default', label: '默认顺序' },
  { value: 'number', label: '图鉴编号' },
  { value: 'name', label: '名称' },
  { value: 'tier-asc', label: '档位从低到高' },
  { value: 'tier-desc', label: '档位从高到低' },
  { value: 'range-asc', label: '蛋重区间从窄到宽' },
  { value: 'range-desc', label: '蛋重区间从宽到窄' },
]

function readStoredList(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveStoredList(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Keep the current session usable when browser storage is unavailable.
  }
}

function readFavorites() {
  return readStoredList(FAVORITES_KEY).filter((id) => typeof id === 'string' && id)
}

function normalizeQuery(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return null
  const minTier = Number.isInteger(query.minTier) ? Math.min(10, Math.max(1, query.minTier)) : 1
  const maxTier = Number.isInteger(query.maxTier) ? Math.min(10, Math.max(1, query.maxTier)) : 10
  const weight = Number.isFinite(query.weight) ? Math.max(0, Math.round(query.weight)) : 0
  const sortValues = (values) => Array.isArray(values) ? [...new Set(values.filter((value) => typeof value === 'string' && value))].sort() : []
  return {
    keyword: typeof query.keyword === 'string' ? query.keyword.trim() : '',
    minTier: Math.min(minTier, maxTier),
    maxTier: Math.max(minTier, maxTier),
    weight,
    eggGroups: sortValues(query.eggGroups),
    attributes: sortValues(query.attributes),
  }
}

function queryHasConditions(query) {
  return Boolean(query.keyword || query.weight || query.minTier > 1 || query.maxTier < 10 || query.eggGroups.length || query.attributes.length)
}

function readRecentQueries() {
  const seen = new Set()
  return readStoredList(RECENT_QUERIES_KEY)
    .map(normalizeQuery)
    .filter((query) => {
      if (!query || !queryHasConditions(query)) return false
      const key = JSON.stringify(query)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, RECENT_QUERY_LIMIT)
}

function parseWeightGrams(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 1000) : 0
}

function formatWeightInput(grams) {
  return grams > 0 ? (grams / 1000).toFixed(3) : ''
}

function describeQuery(query) {
  const parts = []
  if (query.keyword) parts.push(query.keyword)
  if (query.weight > 0) parts.push(`${formatKg(query.weight)}`)
  if (query.minTier > 1 || query.maxTier < 10) {
    parts.push(query.minTier === query.maxTier ? `${query.minTier} 档` : `${query.minTier}–${query.maxTier} 档`)
  }
  if (query.eggGroups.length) parts.push(query.eggGroups.length === 1 ? query.eggGroups[0] : `${query.eggGroups.length} 个蛋组`)
  if (query.attributes.length) parts.push(query.attributes.length === 1 ? query.attributes[0] : `${query.attributes.length} 个属性`)
  return parts.join(' · ')
}

function sortResults(results, sortBy) {
  if (sortBy === 'default') return results
  const byNumber = (first, second) => first.number.localeCompare(second.number)
  return [...results].sort((first, second) => {
    if (sortBy === 'number') return byNumber(first, second)
    if (sortBy === 'name') return first.name.localeCompare(second.name, 'zh-CN')
    if (sortBy === 'tier-asc') return first.egg_weight.tier - second.egg_weight.tier || byNumber(first, second)
    if (sortBy === 'tier-desc') return second.egg_weight.tier - first.egg_weight.tier || byNumber(first, second)
    if (sortBy === 'range-asc') return first.egg_weight.total_range - second.egg_weight.total_range || byNumber(first, second)
    if (sortBy === 'range-desc') return second.egg_weight.total_range - first.egg_weight.total_range || byNumber(first, second)
    return 0
  })
}

async function getEggDataClient() {
  if (typeof window !== 'undefined' && typeof window.mygo?.call === 'function') return EggData
  if (import.meta.env.DEV) return (await import('./devEggData')).DevEggData
  throw new Error('Go 查询服务尚未连接')
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4 4" /></svg>
}

function RemixSearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z" /></svg>
}

function RemixSettingsIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M3.33946 17.0002C2.90721 16.2515 2.58277 15.4702 2.36133 14.6741C3.3338 14.1779 3.99972 13.1668 3.99972 12.0002C3.99972 10.8345 3.3348 9.824 2.36353 9.32741C2.81025 7.71651 3.65857 6.21627 4.86474 4.99001C5.7807 5.58416 6.98935 5.65534 7.99972 5.072C9.01009 4.48866 9.55277 3.40635 9.4962 2.31604C11.1613 1.8846 12.8847 1.90004 14.5031 2.31862C14.4475 3.40806 14.9901 4.48912 15.9997 5.072C17.0101 5.65532 18.2187 5.58416 19.1346 4.99007C19.7133 5.57986 20.2277 6.25151 20.66 7.00021C21.0922 7.7489 21.4167 8.53025 21.6381 9.32628C20.6656 9.82247 19.9997 10.8336 19.9997 12.0002C19.9997 13.166 20.6646 14.1764 21.6359 14.673C21.1892 16.2839 20.3409 17.7841 19.1347 19.0104C18.2187 18.4163 17.0101 18.3451 15.9997 18.9284C14.9893 19.5117 14.4467 20.5941 14.5032 21.6844C12.8382 22.1158 11.1148 22.1004 9.49633 21.6818C9.55191 20.5923 9.00925 19.5113 7.99972 18.9284C6.98938 18.3451 5.78073 18.4163 4.86484 19.0103C4.28617 18.4205 3.77172 17.7489 3.33946 17.0002ZM8.99972 17.1964C10.0911 17.8265 10.8749 18.8227 11.2503 19.9659C11.7486 20.0133 12.2502 20.0133 12.7486 19.9675C13.1239 18.8237 13.9076 17.8268 14.9997 17.1964C16.0911 16.5663 17.3468 16.3857 18.5252 16.6324C18.8145 16.224 19.0647 15.7891 19.2728 15.3339C18.4705 14.4372 17.9997 13.2604 17.9997 12.0002C17.9997 10.74 18.4706 9.5632 19.2729 8.6665C19.1688 8.4405 19.0528 8.21443 18.9269 7.99641C18.801 7.77839 18.666 7.56768 18.5223 7.36462C17.3447 7.61096 16.09 7.4314 14.9997 6.80405C13.9083 6.17395 13.1246 5.17768 12.7491 4.03455C12.2509 3.98714 11.7492 3.98646 11.2509 4.03292C10.8756 5.17671 10.0919 6.17364 8.99972 6.80405C7.90838 7.43447 6.65377 7.61494 5.47559 7.36803C5.1863 7.77641 4.93609 8.21127 4.72802 8.66647C5.53028 9.56318 5.99972 10.74 5.99972 12.0002C5.99972 13.2604 5.52883 14.4372 4.72656 15.3339C4.83067 15.5599 4.94661 15.7859 5.07249 16.0039C5.19836 16.2219 5.33337 16.4326 5.47709 16.6357C6.65474 16.3894 7.90838 16.5663 8.99972 17.1964ZM11.9997 15.0002C10.3429 15.0002 8.99972 13.6571 8.99972 12.0002C8.99972 10.3434 10.3429 9.00021 11.9997 9.00021C13.6566 9.00021 14.9997 10.3434 14.9997 12.0002C14.9997 13.6571 13.6566 15.0002 11.9997 15.0002ZM11.9997 13.0002C12.552 13.0002 12.9997 12.5525 12.9997 12.0002C12.9997 11.4479 12.552 11.0002 11.9997 11.0002C11.4474 11.0002 10.9997 11.4479 10.9997 12.0002C10.9997 12.5525 11.4474 13.0002 11.9997 13.0002Z" /></svg>
}

function RemixCalculatorIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2ZM5 4V20H19V4H5ZM7 6H17V10H7V6ZM7 12H9V14H7V12ZM7 16H9V18H7V16ZM11 12H13V14H11V12ZM11 16H13V18H11V16ZM15 12H17V18H15V12Z" /></svg>
}

function HeartIcon({ filled = false }) {
  const path = filled
    ? 'M16.5 3C19.5376 3 22 5.5 22 9C22 16 14.5 20 12 21.5C9.5 20 2 16 2 9C2 5.5 4.5 3 7.5 3C9.35997 3 11 4 12 5C13 4 14.64 3 16.5 3Z'
    : 'M16.5 3C19.5376 3 22 5.5 22 9C22 16 14.5 20 12 21.5C9.5 20 2 16 2 9C2 5.5 4.5 3 7.5 3C9.35997 3 11 4 12 5C13 4 14.64 3 16.5 3ZM12.9339 18.603C13.8169 18.0498 21 13.8302 21 9C21 6.3528 19.4196 4.5 16.5 4.5C15.024 4.5 13.6214 5.3976 12.8853 6.1836L12 7.1538L11.1147 6.1836C10.3786 5.3976 8.97596 4.5 7.5 4.5C4.58044 4.5 3 6.3528 3 9C3 13.8302 10.1831 18.0498 11.0661 18.603C11.6345 18.9536 12.3655 18.9536 12.9339 18.603Z'
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d={path} /></svg>
}

function readPreference(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function savePreference(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Keep the current session usable when browser storage is unavailable.
  }
}

function GlobalToast({ toast }) {
  return (
    <div className="app-toast-region" aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="app-toast" key={toast.id} role="status">
          <span className="app-toast-icon" aria-hidden="true"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 10 4 4 8-8" /></svg></span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

function SettingsPanel({ section, onSectionChange, uiScale, savedUiScale, onUiScaleChange, onUiScaleSave, forceSystemFont, onForceSystemFontChange, onImportUserData, onExportUserData }) {
  const importFileInput = useRef(null)

  return (
    <div className="settings-shell">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-heading">
          <div className="settings-sidebar-title-row">
            <span>设置</span>
          </div>
        </div>
        <nav className="settings-navigation" aria-label="设置分类">
          <button className={section === 'general' ? 'settings-nav-item active' : 'settings-nav-item'} onClick={() => onSectionChange('general')} aria-current={section === 'general' ? 'page' : undefined}>通用</button>
          <button className={section === 'import-export' ? 'settings-nav-item active' : 'settings-nav-item'} onClick={() => onSectionChange('import-export')} aria-current={section === 'import-export' ? 'page' : undefined}>导入导出</button>
          <button className="settings-nav-item disabled" disabled><span>AI设置</span><small>建设中</small></button>
          <button className={section === 'about' ? 'settings-nav-item active' : 'settings-nav-item'} onClick={() => onSectionChange('about')} aria-current={section === 'about' ? 'page' : undefined}>关于</button>
        </nav>
      </aside>

      <main className={section === 'about' ? 'settings-main settings-main-about' : 'settings-main'}>
        {section === 'general' ? (
          <>
            <header className="settings-page-heading">
              <span>偏好设置</span>
              <h1>通用</h1>
              <p>调整应用的显示方式。</p>
            </header>
            <div className="settings-options">
              <section className="settings-option">
                <div className="settings-option-copy">
                  <h2>全局 UI 缩放调整</h2>
                  <p>统一调整页面、卡片和控件的显示大小。</p>
                </div>
                <div className="scale-setting">
                  <div className="scale-value-row">
                    <output htmlFor="ui-scale" aria-live="polite">{uiScale}%</output>
                    <Button className="scale-save-button" material="paper" variant="solid" size="small" disabled={uiScale === savedUiScale} style={{ '--rk-material-background': 'var(--rk-primary)', '--rk-material-color': 'var(--rk-on-primary)' }} onClick={onUiScaleSave}>保存</Button>
                  </div>
                  <input id="ui-scale" type="range" min="80" max="120" step="5" value={uiScale} onChange={onUiScaleChange} aria-label="全局 UI 缩放" aria-valuetext={`${uiScale}%`} />
                  <div className="scale-markers" aria-hidden="true"><span>80%</span><span>100%</span><span>120%</span></div>
                  <span className="scale-save-hint">{uiScale === savedUiScale ? '调整后保存，再应用缩放' : '缩放值尚未保存'}</span>
                </div>
              </section>
              <label className="settings-option system-font-option" htmlFor="force-system-font">
                <span className="settings-option-copy">
                  <span className="settings-option-title">强制字体为系统默认字体</span>
                  <span className="settings-option-description">忽略主题字体，使用当前设备的系统字体。</span>
                </span>
                <span className="settings-switch">
                  <input id="force-system-font" type="checkbox" checked={forceSystemFont} onChange={onForceSystemFontChange} />
                  <i aria-hidden="true" />
                </span>
              </label>
            </div>
          </>
        ) : section === 'import-export' ? (
          <>
            <header className="settings-page-heading">
              <span>用户数据</span>
              <h1>导入导出</h1>
              <p>管理应用中保存的用户数据。</p>
            </header>
            <div className="settings-options">
              <section className="settings-option settings-transfer-option">
                <div className="settings-option-copy">
                  <h2>子代计算器数据</h2>
                  <p>导入本应用导出的 JSON 备份并合并记录；相同 ID 的记录将使用备份内容更新。也可导出所有计算记录。</p>
                </div>
                <input
                  ref={importFileInput}
                  className="settings-import-input"
                  type="file"
                  accept=".json,application/json"
                  aria-label="选择要导入的用户数据文件"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onImportUserData(file)
                    event.target.value = ''
                  }}
                />
                <div className="settings-transfer-actions">
                  <Button className="settings-transfer-button" material="default" shadow onClick={() => importFileInput.current?.click()}>导入数据</Button>
                  <Button className="settings-transfer-button" material="default" shadow onClick={onExportUserData}>导出数据</Button>
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="settings-about-page">
            <header className="settings-about-hero">
              <div className="settings-about-brand">
                <div className="settings-about-icon-wrap">
                  <img src="/app-icon.png" alt="蛋查查图标" draggable={false} />
                </div>
                <div className="settings-about-brand-copy">
                  <h1>蛋查查</h1>
                  <p className="settings-about-english">Rocom Egg Check</p>
                </div>
              </div>
              <div className="settings-about-hero-bottom">
                <span className="settings-about-version">版本 {appVersion}</span>
              </div>
              <span className="settings-about-orbit settings-about-orbit-one" aria-hidden="true" />
              <span className="settings-about-orbit settings-about-orbit-two" aria-hidden="true" />
            </header>
            <a className="settings-about-github" href="https://github.com/JayeGT002/rocom-egg-check" target="_blank" rel="noreferrer">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.68.08-.68 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.66 1.23 3.31.94.1-.73.4-1.23.72-1.51-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.23 1.17-3.02-.12-.29-.51-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.62 1.55.23 2.69.11 2.98.73.79 1.17 1.79 1.17 3.02 0 4.33-2.64 5.28-5.15 5.56.41.35.77 1.03.77 2.08v3.09c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" /></svg>
              <span>GitHub 项目</span>
            </a>
          </section>
        )}
      </main>
    </div>
  )
}

function formatKg(value) {
  return `${(value / 1000).toFixed(3)} kg`
}

function getPetAttributes(pet) {
  const attributes = pet.attributes ?? pet.attrs ?? pet.types
  if (Array.isArray(attributes)) return attributes.filter(Boolean)
  return [pet.attr1, pet.attr2].filter(Boolean)
}

function EggWeightScale({ weight, queryWeight }) {
  const span = Math.max(weight.max - weight.min, 1)
  const toPercent = (value) => Math.min(100, Math.max(0, ((value - weight.min) / span) * 100))
  const markerVisible = queryWeight > 0 && queryWeight >= weight.min && queryWeight <= weight.max
  const markerPercent = markerVisible ? toPercent(queryWeight) : 0
  const segmentStyle = (start, end) => {
    const minimumWidth = 0.8
    const left = Math.min(toPercent(start), 100 - minimumWidth)
    const width = Math.min(Math.max(toPercent(end) - toPercent(start), minimumWidth), 100 - left)
    return { left: `${left}%`, width: `${width}%` }
  }
  const miniEnd = toPercent(weight.mini_max)
  const hugeStart = toPercent(weight.huge_min)
  const miniRange = `${formatKg(weight.min)} – ${formatKg(weight.mini_max)}`
  const hugeRange = `${formatKg(weight.huge_min)} – ${formatKg(weight.max)}`
  const queryLabel = markerVisible ? `；查询蛋重 ${formatKg(queryWeight)}` : ''

  return (
    <div className="pet-weight">
      <div className="weight-range-heading">
        <span className="weight-label">精灵蛋重量范围</span>
      </div>
      <div
        className="egg-weight-scale"
        role="img"
        aria-label={`精灵蛋重量范围 ${formatKg(weight.min)} 到 ${formatKg(weight.max)}；迷你蛋 ${miniRange}；巨大蛋 ${hugeRange}${queryLabel}`}
        title={`迷你蛋：${miniRange}；巨大蛋：${hugeRange}`}
      >
        <span className="egg-weight-total" />
        <span className="egg-weight-segment egg-weight-mini" style={segmentStyle(weight.min, weight.mini_max)} />
        <span className="egg-weight-segment egg-weight-huge" style={segmentStyle(weight.huge_min, weight.max)} />
        <span className="egg-weight-boundary egg-weight-mini-boundary" style={{ left: `${miniEnd}%` }} />
        <span className="egg-weight-boundary egg-weight-huge-boundary" style={{ left: `${hugeStart}%` }} />
        {markerVisible && <span className="egg-weight-marker" style={{ left: `${markerPercent}%` }} title={`查询蛋重：${formatKg(queryWeight)}`} />}
      </div>
      <div className="weight-scale-labels"><span>{formatKg(weight.min)}</span><span>{formatKg(weight.max)}</span></div>
      <div className="weight-intervals">
        <div className="weight-interval">
          <span className="weight-interval-label"><i className="weight-legend weight-legend-mini" />迷你蛋</span>
          <strong>{miniRange}</strong>
        </div>
        <div className="weight-interval">
          <span className="weight-interval-label"><i className="weight-legend weight-legend-huge" />巨大蛋</span>
          <strong>{hugeRange}</strong>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [toast, setToast] = useState(null)
  const toastSequence = useRef(0)
  const [activePage, setActivePage] = useState('query')
  const [settingsSection, setSettingsSection] = useState('general')
  const [uiScale, setUiScale] = useState(() => {
    const stored = Number(readPreference('rocom-egg-check.ui-scale', '100'))
    return Number.isFinite(stored) && stored >= 80 && stored <= 120 ? stored : 100
  })
  const [uiScaleDraft, setUiScaleDraft] = useState(uiScale)
  const [forceSystemFont, setForceSystemFont] = useState(() => readPreference('rocom-egg-check.system-font', 'false') === 'true')
  const [keyword, setKeyword] = useState('')
  const [minTier, setMinTier] = useState(1)
  const [maxTier, setMaxTier] = useState(10)
  const [groups, setGroups] = useState([])
  const [selectedAttributes, setSelectedAttributes] = useState([])
  const [weightValue, setWeightValue] = useState('')
  const [favorites, setFavorites] = useState(readFavorites)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [recentQueries, setRecentQueries] = useState(readRecentQueries)
  const [sortBy, setSortBy] = useState(() => {
    const stored = readPreference(RESULT_SORT_KEY, 'default')
    return SORT_OPTIONS.some((option) => option.value === stored) ? stored : 'default'
  })
  const weightGrams = parseWeightGrams(weightValue)
  const weightInvalid = weightValue.trim() !== '' && weightGrams === 0
  const hasImmersiveTitleBar = typeof window === 'undefined'
    || !window.mygo
    || window.mygo.platform === 'darwin'
    || window.mygo.platform === 'win32'
  const [eggGroups, setEggGroups] = useState([])
  const [eggDataClient, setEggDataClient] = useState(null)
  const [results, setResults] = useState([])
  const [isEditingTierRange, setIsEditingTierRange] = useState(false)
  const [tierRangeDraft, setTierRangeDraft] = useState('')
  const [tierRangeError, setTierRangeError] = useState(false)
  const cancelTierRangeBlur = useRef(false)
  const pendingTextEdit = useRef(false)
  const favoritesChecked = useRef(false)
  const hasTierFilter = minTier > 1 || maxTier < 10
  const hasQueryConditions = Boolean(keyword.trim() || hasTierFilter || weightGrams || groups.length || selectedAttributes.length)
  const hasFilters = hasQueryConditions || favoritesOnly
  const notify = (message) => setToast({ id: ++toastSequence.current, message })

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => {
      setToast((current) => current?.id === toast.id ? null : current)
    }, 2700)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    saveStoredList(FAVORITES_KEY, favorites)
  }, [favorites])

  useEffect(() => {
    if (favoritesOnly && favorites.length === 0) setFavoritesOnly(false)
  }, [favoritesOnly, favorites])

  useEffect(() => {
    if (!eggDataClient || favoritesChecked.current || favorites.length === 0) return undefined
    let cancelled = false
    eggDataClient.query({ keyword: '', minTier: 1, maxTier: 10, weight: 0, eggGroups: [], attributes: [] })
      .then((pets) => {
        if (cancelled) return
        favoritesChecked.current = true
        const knownIds = new Set(pets.map((pet) => pet.id))
        setFavorites((current) => {
          const next = current.filter((id) => knownIds.has(id))
          return next.length === current.length ? current : next
        })
      })
      .catch((error) => console.error('无法校验收藏数据', error))
    return () => { cancelled = true }
  }, [eggDataClient, favorites.length])

  useEffect(() => {
    savePreference(RESULT_SORT_KEY, sortBy)
  }, [sortBy])

  useEffect(() => {
    if (!hasQueryConditions) return undefined
    const timeout = window.setTimeout(() => {
      if (pendingTextEdit.current) return
      recordCurrentQuery()
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [hasQueryConditions, keyword, minTier, maxTier, weightGrams, groups, selectedAttributes])

  useEffect(() => {
    saveStoredList(RECENT_QUERIES_KEY, recentQueries)
  }, [recentQueries])

  useEffect(() => {
    let cancelled = false
    getEggDataClient().then(async (client) => {
      const nextGroups = await client.getEggGroups()
      if (!cancelled) {
        setEggDataClient(client)
        setEggGroups(nextGroups)
      }
    }).catch((error) => {
      console.error('无法读取蛋组列表', error)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!hasFilters) {
      setResults([])
      return () => { cancelled = true }
    }
    if (!eggDataClient) return () => { cancelled = true }

    eggDataClient.query({ keyword, minTier, maxTier, weight: weightGrams, eggGroups: groups, attributes: selectedAttributes })
      .then((nextResults) => {
        if (!cancelled) setResults(nextResults)
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('精灵查询失败', error)
          setResults([])
        }
      })
    return () => { cancelled = true }
  }, [eggDataClient, hasFilters, keyword, minTier, maxTier, weightGrams, groups, selectedAttributes])

  const favoriteIds = new Set(favorites)
  const visibleResults = favoritesOnly ? results.filter((pet) => favoriteIds.has(pet.id)) : results
  const displayResults = sortResults(visibleResults, sortBy)
  const resultPetCount = displayResults.length
  const rangeLeft = ((minTier - 1) / 9) * 100
  const rangeWidth = ((maxTier - minTier) / 9) * 100
  const rangeLabel = minTier === 1 && maxTier === 10
    ? '全部档位'
    : minTier === maxTier ? `${minTier} 档` : `${minTier}–${maxTier} 档`

  function openTierRangeEditor() {
    cancelTierRangeBlur.current = false
    setTierRangeDraft(minTier === maxTier ? `${minTier}` : `${minTier}-${maxTier}`)
    setTierRangeError(false)
    setIsEditingTierRange(true)
  }

  function cancelTierRangeEdit() {
    cancelTierRangeBlur.current = true
    setTierRangeError(false)
    setIsEditingTierRange(false)
  }

  function commitTierRangeEdit() {
    if (cancelTierRangeBlur.current) {
      cancelTierRangeBlur.current = false
      return
    }

    const match = tierRangeDraft.trim().match(/^(10|[1-9])(?:\s*[-–—]\s*(10|[1-9]))?$/)
    if (!match) {
      setTierRangeError(true)
      return
    }

    const firstTier = Number(match[1])
    const secondTier = match[2] ? Number(match[2]) : firstTier
    setMinTier(Math.min(firstTier, secondTier))
    setMaxTier(Math.max(firstTier, secondTier))
    setTierRangeError(false)
    setIsEditingTierRange(false)
  }

  function resetTierRange() {
    cancelTierRangeBlur.current = true
    setMinTier(1)
    setMaxTier(10)
    setTierRangeError(false)
    setIsEditingTierRange(false)
  }

  function updateMinTier(event) {
    const value = Number(event.target.value)
    if (value > maxTier) setMaxTier(value)
    setMinTier(value)
  }

  function updateMaxTier(event) {
    const value = Number(event.target.value)
    if (value < minTier) setMinTier(value)
    setMaxTier(value)
  }

  function toggleGroup(group) {
    setGroups((current) => {
      if (current.includes(group)) return current.filter((item) => item !== group)
      return [...current, group]
    })
  }

  function toggleAttribute(attribute) {
    setSelectedAttributes((current) => {
      if (current.includes(attribute)) return current.filter((item) => item !== attribute)
      return [...current, attribute]
    })
  }

  function commitTextQuery() {
    pendingTextEdit.current = false
    recordCurrentQuery()
  }

  function recordCurrentQuery() {
    const snapshot = normalizeQuery({ keyword, minTier, maxTier, weight: weightGrams, eggGroups: groups, attributes: selectedAttributes })
    if (!snapshot || !queryHasConditions(snapshot)) return
    setRecentQueries((current) => {
      const key = JSON.stringify(snapshot)
      if (current.length > 0 && JSON.stringify(current[0]) === key) return current
      return [snapshot, ...current.filter((item) => JSON.stringify(item) !== key)].slice(0, RECENT_QUERY_LIMIT)
    })
  }

  function toggleFavorite(petId) {
    setFavorites((current) => current.includes(petId) ? current.filter((item) => item !== petId) : [...current, petId])
  }

  function applyRecentQuery(query) {
    const normalized = normalizeQuery(query)
    if (!normalized) return
    cancelTierRangeBlur.current = true
    setKeyword(normalized.keyword)
    setMinTier(normalized.minTier)
    setMaxTier(normalized.maxTier)
    setWeightValue(formatWeightInput(normalized.weight))
    setGroups(normalized.eggGroups)
    setSelectedAttributes(normalized.attributes)
    setFavoritesOnly(false)
    setTierRangeError(false)
    setIsEditingTierRange(false)
  }

  function changeUiScale(event) {
    setUiScaleDraft(Number(event.target.value))
  }

  function saveUiScale() {
    setUiScale(uiScaleDraft)
    savePreference('rocom-egg-check.ui-scale', String(uiScaleDraft))
  }

  function exportUserData() {
    try {
      const saved = window.localStorage.getItem(SAVED_CALCULATIONS_KEY)
      const offspringCalculations = saved ? JSON.parse(saved) : []
      if (!Array.isArray(offspringCalculations)) throw new Error('计算记录格式无效')

      const exportedAt = new Date()
      const exportFile = {
        format: 'rocom-egg-check-user-data',
        version: 1,
        exportedAt: exportedAt.toISOString(),
        data: { offspringCalculations },
      }
      const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: 'application/json;charset=utf-8' })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const date = [exportedAt.getFullYear(), String(exportedAt.getMonth() + 1).padStart(2, '0'), String(exportedAt.getDate()).padStart(2, '0')].join('-')
      link.href = downloadUrl
      link.download = `rocom-egg-check-data-${date}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      notify(`已导出 ${offspringCalculations.length} 条子代计算记录`)
    } catch (error) {
      console.error('用户数据导出失败', error)
      notify('导出失败，无法读取子代计算记录')
    }
  }

  async function importUserData(file) {
    try {
      const importFile = JSON.parse(await file.text())
      const incomingRecords = importFile?.data?.offspringCalculations
      if (importFile?.format !== 'rocom-egg-check-user-data' || importFile.version !== 1 || !Array.isArray(incomingRecords)) {
        throw new Error('导入文件格式无效或版本不受支持')
      }

      const incomingIds = new Set()
      for (const record of incomingRecords) {
        if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id.trim() || typeof record.name !== 'string') {
          throw new Error('计算记录内容无效')
        }
        if (incomingIds.has(record.id)) throw new Error('导入文件包含重复的记录 ID')
        incomingIds.add(record.id)
      }

      const stored = window.localStorage.getItem(SAVED_CALCULATIONS_KEY)
      const currentRecords = stored ? JSON.parse(stored) : []
      if (!Array.isArray(currentRecords)) throw new Error('当前计算记录格式无效')
      const currentIds = new Set(currentRecords.map((record) => record?.id).filter((id) => typeof id === 'string'))
      const newCount = incomingRecords.filter((record) => !currentIds.has(record.id)).length
      const importedIds = new Set(incomingRecords.map((record) => record.id))
      const mergedRecords = [
        ...incomingRecords,
        ...currentRecords.filter((record) => !importedIds.has(record?.id)),
      ]

      window.localStorage.setItem(SAVED_CALCULATIONS_KEY, JSON.stringify(mergedRecords))
      window.dispatchEvent(new CustomEvent('rocom-egg-check:offspring-calculations-imported', { detail: mergedRecords }))
      notify(`导入完成：新增 ${newCount} 条，更新 ${incomingRecords.length - newCount} 条`)
    } catch (error) {
      console.error('用户数据导入失败', error)
      notify(error instanceof SyntaxError ? '导入失败：JSON 文件无法解析' : `导入失败：${error.message || '文件无效'}`)
    }
  }

  function changeSystemFont(event) {
    const enabled = event.target.checked
    setForceSystemFont(enabled)
    savePreference('rocom-egg-check.system-font', String(enabled))
  }

  return (
    <RocoTheme className="app-theme">
      <div className={`scaled-app${forceSystemFont ? ' force-system-font' : ''}${hasImmersiveTitleBar ? ' has-immersive-titlebar' : ''}`} style={{ zoom: uiScale / 100, width: '100%', '--app-scale': uiScale / 100, '--app-viewport-height': `${10000 / uiScale}vh` }}>
        {hasImmersiveTitleBar && (
          <header className="app-titlebar">
            <nav className="app-titlebar-nav" aria-label="功能切换">
              <button type="button" className={activePage === 'query' ? 'app-titlebar-tab active' : 'app-titlebar-tab'} onClick={() => setActivePage('query')} aria-current={activePage === 'query' ? 'page' : undefined}><RemixSearchIcon />精灵蛋尺寸</button>
              <button type="button" className={activePage === 'calculator' ? 'app-titlebar-tab active' : 'app-titlebar-tab'} onClick={() => setActivePage('calculator')} aria-current={activePage === 'calculator' ? 'page' : undefined}><RemixCalculatorIcon />子代计算器</button>
              <button type="button" className={activePage === 'settings' ? 'app-titlebar-tab active' : 'app-titlebar-tab'} onClick={() => setActivePage('settings')} aria-current={activePage === 'settings' ? 'page' : undefined}><RemixSettingsIcon />设置</button>
            </nav>
          </header>
        )}
        {activePage === 'settings' ? (
          <SettingsPanel
            section={settingsSection}
            onSectionChange={setSettingsSection}
            uiScale={uiScaleDraft}
            savedUiScale={uiScale}
            onUiScaleChange={changeUiScale}
            onUiScaleSave={saveUiScale}
            forceSystemFont={forceSystemFont}
            onForceSystemFontChange={changeSystemFont}
            onImportUserData={importUserData}
            onExportUserData={exportUserData}
          />
        ) : activePage === 'calculator' ? (
          <OffspringCalculator notify={notify} />
        ) : <div className="app-shell">
        <aside className="filters-sidebar">
          <section className="filter-section search-section">
            <Input
              rootClassName="search-input"
              inputClassName="search-native"
              material="paper"
              size="large"
              value={keyword}
              onChange={(event) => { pendingTextEdit.current = true; setKeyword(event.target.value) }}
              onBlur={commitTextQuery}
              placeholder="名称或图鉴编号"
              aria-label="搜索名称或图鉴编号"
              prefix={<SearchIcon />}
            />
            {favorites.length > 0 && (
              <div className="search-favorites">
                <Button
                  className="favorites-toggle"
                  material="paper"
                  size="small"
                  variant="solid"
                  aria-pressed={favoritesOnly}
                  style={{
                    '--rk-material-background': favoritesOnly ? 'var(--rk-primary)' : 'var(--rk-paper)',
                    '--rk-material-color': favoritesOnly ? 'var(--rk-on-primary)' : 'var(--rk-on-paper)',
                  }}
                  onClick={() => setFavoritesOnly((current) => !current)}
                >
                  <HeartIcon filled={favoritesOnly} />
                  只看收藏
                  <span className="favorites-count">{favorites.length}</span>
                </Button>
              </div>
            )}
          </section>

          <section className="filter-section weight-section">
            <div className="section-heading">
              <h2>蛋重反查</h2>
              <Button className="filter-reset" material="paper" variant="text" size="small" disabled={!weightGrams} onClick={() => setWeightValue('')}>重置</Button>
            </div>
            <div className="weight-lookup">
              <Input
                rootClassName="weight-lookup-input"
                inputClassName="weight-lookup-control"
                material="paper"
                size="middle"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={weightValue}
                onChange={(event) => { pendingTextEdit.current = true; setWeightValue(event.target.value) }}
                onBlur={commitTextQuery}
                placeholder="输入蛋重，如 1.437"
                aria-label="按精灵蛋重量查询，单位千克"
              />
              <span className="weight-lookup-unit" aria-hidden="true">kg</span>
            </div>
            {weightInvalid && <p className="weight-input-error" role="alert">请输入大于 0 的蛋重</p>}
          </section>

          <section className="filter-section tier-section">
            <div className="section-heading">
              <h2>档位筛选</h2>
              <div className="tier-heading-actions">
                {isEditingTierRange ? (
                  <input
                    className="current-range current-range-input"
                    type="text"
                    inputMode="text"
                    value={tierRangeDraft}
                    aria-label="输入档位或档位范围，例如 2 或 2-3"
                    aria-invalid={tierRangeError}
                    aria-describedby={tierRangeError ? 'tier-range-error' : undefined}
                    autoFocus
                    onChange={(event) => { setTierRangeDraft(event.target.value); setTierRangeError(false) }}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={commitTierRangeEdit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitTierRangeEdit()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        cancelTierRangeEdit()
                      }
                    }}
                  />
                ) : (
                  <strong
                    className="current-range current-range-editable"
                    role="button"
                    tabIndex={0}
                    title="双击编辑档位范围"
                    aria-label={`当前档位范围：${rangeLabel}。双击或按回车编辑`}
                    onDoubleClick={openTierRangeEditor}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openTierRangeEditor()
                      }
                    }}
                  >{rangeLabel}</strong>
                )}
                <Button className="filter-reset" material="paper" variant="text" size="small" disabled={!hasTierFilter} onClick={resetTierRange}>重置</Button>
              </div>
            </div>
            {tierRangeError && <p className="range-input-error" id="tier-range-error" role="alert">请输入 1–10，或范围如 2-3</p>}
            <div className="range-control">
              <div className="range-track" />
              <div className="range-selected" style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%` }} />
              <input type="range" min="1" max="10" step="1" value={minTier} onChange={updateMinTier} aria-label="最低档位" />
              <input type="range" min="1" max="10" step="1" value={maxTier} onChange={updateMaxTier} aria-label="最高档位" />
            </div>
            <div className="range-ticks" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
          </section>

          <section className="filter-section group-section">
            <div className="section-heading">
              <h2>蛋组筛选</h2>
              <Button className="filter-reset" material="paper" variant="text" size="small" disabled={!groups.length} onClick={() => setGroups([])}>重置</Button>
            </div>
            <div className="group-options">
              {eggGroups.map((group) => {
                const selected = groups.includes(group)
                const color = getEggGroupColor(group)
                return <Button
                  key={group}
                  className="group-button"
                  size="small"
                  material="paper"
                  variant="solid"
                  style={{
                    '--rk-material-background': selected ? color : 'var(--rk-paper)',
                    '--rk-material-color': selected ? '#ffffff' : 'var(--rk-on-paper)',
                  }}
                  aria-pressed={selected}
                  onClick={() => toggleGroup(group)}
                >{group}</Button>
              })}
            </div>
          </section>

          <section className="filter-section attribute-section">
            <div className="section-heading">
              <h2>属性筛选</h2>
              <Button className="filter-reset" material="paper" variant="text" size="small" disabled={!selectedAttributes.length} onClick={() => setSelectedAttributes([])}>重置</Button>
            </div>
            <div className="attribute-options">
              {Object.entries(attributeColors).map(([attribute, color]) => {
                const selected = selectedAttributes.includes(attribute)
                return <Button
                  key={attribute}
                  className="attribute-button"
                  size="small"
                  material="paper"
                  variant="solid"
                  style={{
                    '--rk-material-background': selected ? color : 'var(--rk-paper)',
                    '--rk-material-color': selected ? '#ffffff' : 'var(--rk-on-paper)',
                    '--attribute-color': color,
                  }}
                  aria-pressed={selected}
                  onClick={() => toggleAttribute(attribute)}
                ><img src={`/attributes/${encodeURIComponent(attribute)}.webp`} alt="" draggable={false} />{attribute}</Button>
              })}
            </div>
          </section>

          {recentQueries.length > 0 && (
            <section className="filter-section recent-section">
              <div className="section-heading">
                <h2>最近查询</h2>
                <Button className="filter-reset" material="paper" variant="text" size="small" onClick={() => setRecentQueries([])}>清空</Button>
              </div>
              <div className="recent-query-list">
                {recentQueries.map((query) => (
                  <button
                    type="button"
                    className="recent-query"
                    key={JSON.stringify(query)}
                    title={describeQuery(query)}
                    onClick={() => applyRecentQuery(query)}
                  >{describeQuery(query)}</button>
                ))}
              </div>
            </section>
          )}
        </aside>

        <main className="results-main">
          {!hasFilters ? (
            <div className="initial-empty">
              <img src="/empty-placeholder.png" alt="等待筛选条件的占位图" draggable={false} />
              <h2>选择筛选条件开始查询</h2>
              <p>从左侧输入名称或蛋重，或调整档位、蛋组和属性。</p>
            </div>
          ) : (
            <>
              <header className="results-header">
                <div><span className="results-kicker">查询结果</span><h2>匹配精灵</h2></div>
                <div className="results-toolbar">
                  <Select
                    rootClassName="results-sort"
                    triggerClassName="results-sort-trigger"
                    material="paper"
                    value={sortBy}
                    onValueChange={setSortBy}
                    ariaLabel="结果排序"
                    options={SORT_OPTIONS}
                  />
                  <div className="results-count"><strong>{resultPetCount}</strong><span>只精灵</span></div>
                </div>
              </header>
              {displayResults.length ? (
                <div className="result-grid" role="list">
                  {displayResults.map((pet) => {
                    const tierColor = getTierColor(pet.egg_weight.tier)
                    const petAttributes = getPetAttributes(pet)
                    const isFavorite = favoriteIds.has(pet.id)
                    return <article className="pet-card" role="listitem" key={pet.id}>
                      <header className="pet-card-header">
                        <div className="pet-card-identity">
                          {petPortraits[pet.id] && <img className="pet-avatar" src={petPortraits[pet.id]} alt="" loading="lazy" decoding="async" draggable={false} />}
                          <div className="pet-name">
                            <span className="pet-number">NO. {pet.number}</span>
                            <strong>{pet.name}</strong>
                            <div className="pet-attributes">
                              {petAttributes.map((attribute) => <span className="pet-attribute" key={`attribute-${attribute}`} style={{ '--attribute-color': attributeColors[attribute] ?? '#666666' }}><span className="pet-attribute-content"><img src={`/attributes/${encodeURIComponent(attribute)}.webp`} alt="" draggable={false} />{attribute}</span></span>)}
                            </div>
                          </div>
                        </div>
                        <div className="pet-card-aside">
                          <button
                            type="button"
                            className={isFavorite ? 'pet-favorite active' : 'pet-favorite'}
                            aria-label={isFavorite ? `取消收藏 ${pet.name}` : `收藏 ${pet.name}`}
                            aria-pressed={isFavorite}
                            onClick={() => toggleFavorite(pet.id)}
                          >
                            <HeartIcon filled={isFavorite} />
                          </button>
                          <div className="pet-tier" style={{ background: tierColor.background, color: tierColor.foreground }}><strong>{pet.egg_weight.tier} 档</strong><span>{pet.egg_weight.tier_label}</span></div>
                        </div>
                      </header>
                      <div className="pet-groups">
                        {pet.egg_groups.map((group) => <span key={`group-${group}`} style={{ background: getEggGroupColor(group), color: '#ffffff' }}>{group}</span>)}
                      </div>
                      <EggWeightScale weight={pet.egg_weight} queryWeight={weightGrams} />
                    </article>
                  })}
                </div>
              ) : (
                <div className="no-results"><img src="/empty-placeholder.png" alt="没有匹配结果" draggable={false} /><strong>没有找到匹配精灵</strong><span>{favoritesOnly ? '收藏中没有符合当前筛选条件的精灵。' : '试试放宽档位范围或减少筛选条件。'}</span></div>
              )}
            </>
          )}
        </main>
        </div>}
      </div>
      <GlobalToast toast={toast} />
    </RocoTheme>
  )
}

export default App
