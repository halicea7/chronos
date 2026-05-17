// ---------------------------------------------------------------------------
// Seraph API client — read-only, for Chronos context injection
// ---------------------------------------------------------------------------

export interface SeraphProject {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface SeraphTarget {
  id: string
  project_id: string
  hostname_or_ip: string
  target_type: string
  ports: string | null
  notes: string | null
}

export interface SeraphFinding {
  id: string
  scan_id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string | null
  remediation: string | null
  cve_id: string | null
  cvss_score: string | null
  status: string
  tags: string
  created_at: string
  // Joined by some endpoints
  host?: string
  project_id?: string
  project_name?: string
}

export interface SeraphScan {
  id: string
  target_id: string
  scan_type: string
  module: string
  status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  // Optionally joined
  hostname_or_ip?: string
  project_id?: string
}

export interface SeraphCredential {
  id: string
  project_id: string
  username: string
  cred_type: string
  source: string
  target_host: string
  notes: string
  created_at: string
  // secret is intentionally omitted — Chronos only reads metadata
}

export interface SeraphReport {
  id: string
  project_id: string
  title: string | null
  type: string | null
  created_at: string
}

export interface SeraphAttackPath {
  id: string
  project_id: string
  title: string
  description: string | null
  severity: string
  status: string
  steps_json: string | null
  created_at: string
}

export interface SeraphCveItem {
  id: string
  target_id: string
  service_term: string
  known_cves: string   // JSON array string
  last_checked: string | null
  created_at: string
  // Optionally joined
  hostname_or_ip?: string
  project_id?: string
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const TTL = 30_000  // 30 seconds
const _cache = new Map<string, { data: unknown; ts: number }>()

function _cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data as T)
  return fetcher().then((data) => {
    _cache.set(key, { data, ts: Date.now() })
    return data
  })
}

export function clearSeraphCache() {
  _cache.clear()
}

// ---------------------------------------------------------------------------
// Fetch base
// ---------------------------------------------------------------------------

function _normalizeHost(host: string): string {
  const h = host.trim().replace(/\/$/, '')
  if (!/^https?:\/\//i.test(h)) return `http://${h}`
  return h
}

async function _get<T>(host: string, token: string, path: string): Promise<T> {
  const url = `${_normalizeHost(host)}/api/v1${path}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Seraph API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

export async function pingSeraph(host: string, token: string): Promise<boolean> {
  try {
    await _get(host, token, '/auth/me')
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

export function fetchProjects(host: string, token: string): Promise<SeraphProject[]> {
  return _cached(`projects:${host}`, () => _get<SeraphProject[]>(host, token, '/projects'))
}

export function fetchFindings(host: string, token: string, projectId?: string): Promise<SeraphFinding[]> {
  // Cross-project findings endpoint
  const path = projectId
    ? `/audit/findings?project_id=${projectId}`
    : '/audit/findings'
  return _cached(`findings:${host}:${projectId ?? ''}`, () => _get<SeraphFinding[]>(host, token, path))
}

export function fetchTargets(host: string, token: string, projectId: string): Promise<SeraphTarget[]> {
  return _cached(`targets:${host}:${projectId}`, () =>
    _get<SeraphTarget[]>(host, token, `/projects/${projectId}/targets`)
  )
}

export function fetchScans(host: string, token: string, projectId?: string): Promise<SeraphScan[]> {
  const path = projectId
    ? `/audit/scans?project_id=${projectId}`
    : '/audit/scans'
  return _cached(`scans:${host}:${projectId ?? ''}`, () => _get<SeraphScan[]>(host, token, path))
}

export function fetchCredentials(host: string, token: string, projectId: string): Promise<SeraphCredential[]> {
  return _cached(`creds:${host}:${projectId}`, () =>
    _get<SeraphCredential[]>(host, token, `/credentials?project_id=${projectId}`)
  )
}

export function fetchAttackPaths(host: string, token: string, projectId: string): Promise<SeraphAttackPath[]> {
  return _cached(`apaths:${host}:${projectId}`, () =>
    _get<SeraphAttackPath[]>(host, token, `/attack-paths/${projectId}`)
  )
}

export function fetchCveWatch(host: string, token: string, projectId?: string): Promise<SeraphCveItem[]> {
  const path = projectId ? `/cve-watch?project_id=${projectId}` : '/cve-watch'
  return _cached(`cve:${host}:${projectId ?? ''}`, () => _get<SeraphCveItem[]>(host, token, path))
}

export function fetchReports(host: string, token: string, projectId?: string): Promise<SeraphReport[]> {
  // Reports are per-project — need projectId for meaningful data
  const path = projectId
    ? `/audit/reports?project_id=${projectId}`
    : '/audit/reports'
  return _cached(`reports:${host}:${projectId ?? ''}`, () => _get<SeraphReport[]>(host, token, path))
}

// ---------------------------------------------------------------------------
// Chip types & context resolution
// ---------------------------------------------------------------------------

export type SeraphChipType =
  | 'project'
  | 'finding'
  | 'target'
  | 'scan'
  | 'credential'
  | 'attack_path'
  | 'cve'
  | 'report'

export interface SeraphChip {
  id: string             // unique chip id (not Seraph record id)
  type: SeraphChipType
  label: string          // short display label
  data: Record<string, unknown>  // raw Seraph record
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', info: 'INFO',
}

export function resolveChipContext(chip: SeraphChip): string {
  const d = chip.data
  switch (chip.type) {
    case 'project':
      return [
        `[SERAPH · Project]`,
        `Name: ${d.name}`,
        d.description ? `Description: ${d.description}` : null,
        `Created: ${new Date(d.created_at as string).toLocaleDateString()}`,
      ].filter(Boolean).join('\n')

    case 'finding':
      return [
        `[SERAPH · Finding]`,
        `Title: ${d.title}`,
        d.cve_id ? `CVE: ${d.cve_id}` : null,
        d.cvss_score ? `CVSS: ${d.cvss_score}` : null,
        `Severity: ${SEVERITY_LABEL[d.severity as string] ?? d.severity}`,
        `Status: ${d.status}`,
        d.host ? `Host: ${d.host}` : null,
        d.description ? `\nDescription:\n${d.description}` : null,
        d.remediation ? `\nRemediation:\n${d.remediation}` : null,
      ].filter(Boolean).join('\n')

    case 'target':
      return [
        `[SERAPH · Host / Target]`,
        `Host: ${d.hostname_or_ip}`,
        `Type: ${d.target_type}`,
        d.ports ? `Ports: ${d.ports}` : null,
        d.notes ? `Notes: ${d.notes}` : null,
      ].filter(Boolean).join('\n')

    case 'scan':
      return [
        `[SERAPH · Scan]`,
        `Type: ${d.scan_type}`,
        `Module: ${d.module}`,
        `Status: ${d.status}`,
        d.hostname_or_ip ? `Host: ${d.hostname_or_ip}` : null,
        d.completed_at
          ? `Completed: ${new Date(d.completed_at as string).toLocaleString()}`
          : `Started: ${d.started_at ? new Date(d.started_at as string).toLocaleString() : 'pending'}`,
      ].filter(Boolean).join('\n')

    case 'credential':
      return [
        `[SERAPH · Credential]`,
        `Username: ${d.username || '(none)'}`,
        `Type: ${d.cred_type}`,
        `Source: ${d.source}`,
        d.target_host ? `Target host: ${d.target_host}` : null,
        d.notes ? `Notes: ${d.notes}` : null,
        `(Secret value withheld)`,
      ].filter(Boolean).join('\n')

    case 'attack_path':
      return [
        `[SERAPH · Attack Path]`,
        `Title: ${d.title}`,
        `Severity: ${SEVERITY_LABEL[d.severity as string] ?? d.severity}`,
        `Status: ${d.status}`,
        d.description ? `\nDescription:\n${d.description}` : null,
      ].filter(Boolean).join('\n')

    case 'cve':
      return [
        `[SERAPH · CVE Watch]`,
        `Service: ${d.service_term}`,
        d.hostname_or_ip ? `Host: ${d.hostname_or_ip}` : null,
        d.last_checked
          ? `Last checked: ${new Date(d.last_checked as string).toLocaleDateString()}`
          : null,
        (() => {
          try {
            const cves = JSON.parse(d.known_cves as string) as string[]
            return cves.length ? `Known CVEs: ${cves.join(', ')}` : null
          } catch { return null }
        })(),
      ].filter(Boolean).join('\n')

    case 'report':
      return [
        `[SERAPH · Report]`,
        d.title ? `Title: ${d.title}` : null,
        d.type ? `Type: ${d.type}` : null,
        `Generated: ${new Date(d.created_at as string).toLocaleDateString()}`,
      ].filter(Boolean).join('\n')

    default:
      return `[SERAPH · ${chip.type}]\n${chip.label}`
  }
}
