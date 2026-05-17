import { useState, useEffect, useRef, useCallback } from 'react'
import type { SeraphChipType } from '../lib/seraph'
import {
  fetchProjects, fetchFindings, fetchTargets,
  fetchCredentials, fetchAttackPaths, fetchCveWatch,
} from '../lib/seraph'

// ── Category definitions ───────────────────────────────────────────────────

interface Category {
  type: SeraphChipType
  label: string
  icon: string
  requiresProject: boolean   // needs a project selected first to fetch items
}

const CATEGORIES: Category[] = [
  { type: 'finding',     label: 'Findings',      icon: '⚠', requiresProject: false },
  { type: 'target',      label: 'Hosts',         icon: '◎', requiresProject: true  },
  { type: 'credential',  label: 'Credentials',   icon: '⊕', requiresProject: true  },
  { type: 'attack_path', label: 'Attack Paths',  icon: '⇝', requiresProject: true  },
  { type: 'cve',         label: 'CVE Watch',     icon: '⊘', requiresProject: false },
  { type: 'project',     label: 'Projects',      icon: '⬡', requiresProject: false },
]

interface Item {
  id: string
  label: string
  sublabel?: string
  data: Record<string, unknown>
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  host: string
  token: string
  query: string
  onSelect: (type: SeraphChipType, label: string, data: Record<string, unknown>) => void
  onClose: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function MentionDropdown({ host, token, query, onSelect, onClose }: Props) {
  const [level, setLevel] = useState<'categories' | 'items' | 'project-items'>('categories')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [scopeProject, setScopeProject] = useState<{ id: string; name: string } | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Fetch items for a category ───────────────────────────────────────────

  const loadItems = useCallback(async (cat: Category, projectId?: string) => {
    setLoading(true)
    setItems([])
    try {
      let raw: Item[] = []
      switch (cat.type) {
        case 'project': {
          const ps = await fetchProjects(host, token)
          raw = ps.map((p) => ({ id: p.id, label: p.name, sublabel: p.description ?? undefined, data: p as unknown as Record<string, unknown> }))
          break
        }
        case 'finding': {
          const fs = await fetchFindings(host, token, projectId)
          raw = fs.map((f) => ({
            id: f.id,
            label: f.title,
            sublabel: [f.severity.toUpperCase(), f.cve_id, f.host].filter(Boolean).join(' · '),
            data: f as unknown as Record<string, unknown>,
          }))
          break
        }
        case 'target': {
          if (!projectId) break
          const ts = await fetchTargets(host, token, projectId)
          raw = ts.map((t) => ({ id: t.id, label: t.hostname_or_ip, sublabel: t.target_type, data: t as unknown as Record<string, unknown> }))
          break
        }
        case 'credential': {
          if (!projectId) break
          const cs = await fetchCredentials(host, token, projectId)
          raw = cs.map((c) => ({
            id: c.id,
            label: c.username || '(no username)',
            sublabel: [c.cred_type, c.target_host].filter(Boolean).join(' · '),
            data: c as unknown as Record<string, unknown>,
          }))
          break
        }
        case 'attack_path': {
          if (!projectId) break
          const aps = await fetchAttackPaths(host, token, projectId)
          raw = aps.map((a) => ({ id: a.id, label: a.title, sublabel: a.severity, data: a as unknown as Record<string, unknown> }))
          break
        }
        case 'cve': {
          const cvs = await fetchCveWatch(host, token, projectId)
          raw = cvs.map((c) => ({
            id: c.id,
            label: c.service_term,
            sublabel: c.hostname_or_ip,
            data: c as unknown as Record<string, unknown>,
          }))
          break
        }

      }
      setItems(raw)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [host, token])

  // ── Category selection ───────────────────────────────────────────────────

  async function selectCategory(cat: Category) {
    setActiveCategory(cat)
    setCursor(0)

    // Categories that require a project and no project is scoped → show projects first
    if (cat.requiresProject && !scopeProject) {
      setLevel('project-items')
      await loadItems({ ...cat, type: 'project' } as Category)
    } else {
      setLevel('items')
      await loadItems(cat, scopeProject?.id)
    }
  }

  async function selectScopeProject(item: Item) {
    setScopeProject({ id: item.id, name: item.label })
    if (!activeCategory) return
    setLevel('items')
    setCursor(0)
    await loadItems(activeCategory, item.id)
  }

  async function selectItem(item: Item) {
    let data = item.data
    if (activeCategory?.type === 'project') {
      try {
        const [targets, findings] = await Promise.all([
          fetchTargets(host, token, item.id),
          fetchFindings(host, token, item.id),
        ])
        data = { ...data, _targets: targets, _findings: findings }
      } catch { /* use bare record */ }
    }
    onSelect(activeCategory!.type, item.label, data)
    onClose()
  }

  function goBack() {
    if (level === 'items' && activeCategory?.requiresProject) {
      setLevel('project-items')
      setCursor(0)
    } else {
      setLevel('categories')
      setActiveCategory(null)
      setScopeProject(null)
      setCursor(0)
    }
  }

  // ── Filtering ────────────────────────────────────────────────────────────

  const lq = query.toLowerCase()
  const filteredCategories = CATEGORIES.filter((c) =>
    !query || c.label.toLowerCase().includes(lq)
  )
  const filteredItems = items.filter((i) =>
    !query || i.label.toLowerCase().includes(lq) || i.sublabel?.toLowerCase().includes(lq)
  )

  const visibleList = level === 'categories' ? filteredCategories : filteredItems
  const listLength = visibleList.length

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, listLength - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
      if (e.key === 'Backspace' && !query && level !== 'categories') { e.preventDefault(); goBack() }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (level === 'categories') {
          const cat = filteredCategories[cursor]
          if (cat) selectCategory(cat)
        } else if (level === 'project-items') {
          const item = filteredItems[cursor]
          if (item) selectScopeProject(item)
        } else {
          const item = filteredItems[cursor]
          if (item) selectItem(item)
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [cursor, level, filteredCategories, filteredItems, query])

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  // Reset cursor when filter changes
  useEffect(() => { setCursor(0) }, [query])

  // ── Render ───────────────────────────────────────────────────────────────

  const title =
    level === 'categories' ? 'Seraph'
    : level === 'project-items' ? `${activeCategory?.label} · Pick project`
    : scopeProject ? `${activeCategory?.label} · ${scopeProject.name}`
    : activeCategory?.label ?? ''

  return (
    <div className="chr-mention-dropdown">
      <div className="chr-mention-header">
        {level !== 'categories' && (
          <button className="chr-mention-back" onMouseDown={(e) => { e.preventDefault(); goBack() }}>←</button>
        )}
        <span className="chr-mention-title">{title}</span>
        {scopeProject && level === 'items' && (
          <span className="chr-mention-scope">{scopeProject.name}</span>
        )}
      </div>

      <div className="chr-mention-list" ref={listRef}>
        {loading && (
          <div className="chr-mention-loading">Loading…</div>
        )}

        {!loading && level === 'categories' && filteredCategories.map((cat, i) => (
          <button
            key={cat.type}
            className="chr-mention-item"
            data-active={i === cursor}
            onMouseDown={(e) => { e.preventDefault(); selectCategory(cat) }}
            onMouseEnter={() => setCursor(i)}
          >
            <span className="chr-mention-icon">{cat.icon}</span>
            <span className="chr-mention-label">{cat.label}</span>
            <span className="chr-mention-arrow">›</span>
          </button>
        ))}

        {!loading && (level === 'items' || level === 'project-items') && filteredItems.map((item, i) => (
          <button
            key={item.id}
            className="chr-mention-item"
            data-active={i === cursor}
            onMouseDown={(e) => { e.preventDefault(); level === 'project-items' ? selectScopeProject(item) : selectItem(item) }}
            onMouseEnter={() => setCursor(i)}
          >
            <span className="chr-mention-label">{item.label}</span>
            {item.sublabel && <span className="chr-mention-sub">{item.sublabel}</span>}
            {level === 'project-items' && <span className="chr-mention-arrow">›</span>}
          </button>
        ))}

        {!loading && visibleList.length === 0 && (
          <div className="chr-mention-empty">No results</div>
        )}
      </div>
    </div>
  )
}
