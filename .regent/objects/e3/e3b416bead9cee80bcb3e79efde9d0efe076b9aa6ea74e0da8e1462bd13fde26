/**
 * TypeScript type definitions matching the Rust MonitorSnapshot / ControlSignal / AuditLogEntry models.
 *
 * These types mirror the wire format produced by the monitor-server REST/WebSocket endpoints.
 * Keep in sync with:
 *   backend/monitor-server/src/models.rs
 *   backend/monitor-server/src/control.rs
 *   backend/monitor-server/src/audit.rs
 */

// ---------------------------------------------------------------------------
// Health status
// ---------------------------------------------------------------------------

export type HealthStatus = 'ok' | 'degraded' | 'unavailable';

// ---------------------------------------------------------------------------
// Per-worker status
// ---------------------------------------------------------------------------

export interface ServiceStatus {
  worker_id: string;
  active_judgements: number;
  total_processed: number;
  avg_wait_ms: number;
  redis_breaker_state: string;
  api_breaker_state: string;
  last_seen: string;
}

// ---------------------------------------------------------------------------
// Stream backlog
// ---------------------------------------------------------------------------

export interface StreamBacklog {
  stream: string;
  consumer_group: string;
  pending: number;
  lag: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Analysis metrics
// ---------------------------------------------------------------------------

export interface AnalysisMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_latency_ms: number;
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export interface FeatureFlagStatus {
  slug: string;
  name: string;
  default_enabled: boolean;
  override_count: number;
}

// ---------------------------------------------------------------------------
// Control plane
// ---------------------------------------------------------------------------

export type ControlAction = 'pause' | 'resume' | 'restart';

export const ALLOWED_TARGETS = [
  'api',
  'judge-worker',
  'llm-worker',
  'domain-analysis',
  'monitor',
] as const;

export type ControlTarget = (typeof ALLOWED_TARGETS)[number];

export interface ControlSignal {
  action: ControlAction;
  target: string;
  operator: string;
  created_at: string;
  expires_at: string | null;
  confirmed: boolean;
  confirmation_token?: string;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: number;
  target: string;
  action: string;
  operator: string;
  result: 'success' | 'failure';
  error_message?: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Control API request/response types
// ---------------------------------------------------------------------------

export interface ControlRequest {
  operator: string;
}

export interface ControlPendingResponse {
  target: string;
  action: string;
  status: string;
  confirmation_token: string;
  expires_in_secs: number;
  message: string;
}

export interface ConfirmRequest {
  confirmation_token: string;
}

export interface ControlConfirmResponse {
  target: string;
  action: string;
  status: string;
  message: string;
}

export interface SignalStatusResponse {
  target: string;
  signal: ControlSignal | null;
}

export interface AuditLogQuery {
  limit?: number;
  target?: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  count: number;
}

// ---------------------------------------------------------------------------
// Top-level snapshot
// ---------------------------------------------------------------------------

export interface MonitorSnapshot {
  timestamp: string;
  services: ServiceStatus[];
  streams: StreamBacklog[];
  analysis_metrics: AnalysisMetrics;
  feature_flags: FeatureFlagStatus[];
  control_signals?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// WebSocket message types
// ---------------------------------------------------------------------------

export interface WsSnapshotMessage {
  type: 'snapshot';
  data: MonitorSnapshot;
}

export interface WsControlUpdate {
  type: 'control_update';
  data: SignalStatusResponse;
}

export type WsMessage = WsSnapshotMessage | WsControlUpdate;

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
