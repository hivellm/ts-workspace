/**
 * @fileoverview Common utility types for CMMV-Hive
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties of T required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys of T where the value is of type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Make specific properties K of T optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties K of T required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Create a type with readonly properties
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P] extends object ? Immutable<T[P]> : T[P];
};

/**
 * Environment configuration
 */
export interface Environment {
  /** Node environment */
  readonly NODE_ENV: 'development' | 'test' | 'production';
  /** Application port */
  readonly PORT?: number;
  /** Database URL */
  readonly DATABASE_URL?: string;
  /** JWT secret */
  readonly JWT_SECRET?: string;
  /** Log level */
  readonly LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Configuration object for services
 */
export interface ServiceConfig {
  /** Service name */
  readonly name: string;
  /** Service version */
  readonly version: string;
  /** Environment configuration */
  readonly env: Environment;
  /** Logger instance */
  readonly logger: Logger;
  /** Additional service-specific config */
  readonly custom?: Record<string, unknown>;
}

/**
 * Generic repository interface
 */
export interface Repository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T | null>;
  delete(id: K): Promise<boolean>;
  count(filter?: Record<string, unknown>): Promise<number>;
}

/**
 * Find options for repository queries
 */
export interface FindOptions {
  /** Pagination options */
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
  };
  /** Sort options */
  readonly sort?: {
    readonly field: string;
    readonly order: 'asc' | 'desc';
  };
  /** Filter conditions */
  readonly filter?: Record<string, unknown>;
  /** Fields to include */
  readonly include?: readonly string[];
  /** Fields to exclude */
  readonly exclude?: readonly string[];
}

/**
 * Event emitter interface
 */
export interface EventEmitter<T = Record<string, readonly unknown[]>> {
  on<K extends keyof T>(event: K, listener: T[K] extends readonly unknown[] ? (...args: T[K]) => void : never): void;
  off<K extends keyof T>(event: K, listener: T[K] extends readonly unknown[] ? (...args: T[K]) => void : never): void;
  emit<K extends keyof T>(event: K, ...args: T[K] extends readonly unknown[] ? T[K] : never): void;
  once<K extends keyof T>(event: K, listener: T[K] extends readonly unknown[] ? (...args: T[K]) => void : never): void;
}

/**
 * Cache interface
 */
export interface Cache<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly isValid: boolean;
  /** Validation errors if any */
  readonly errors: readonly ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  readonly field: string;
  /** Error message */
  readonly message: string;
  /** Error code */
  readonly code: string;
  /** Current value that failed */
  readonly value?: unknown;
}

/**
 * Async operation result
 */
export type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

/**
 * Branded type for type safety
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Timestamp type for consistent date handling
 */
export type Timestamp = Brand<Date, 'Timestamp'>;

/**
 * UUID type for type safety
 */
export type UUID = Brand<string, 'UUID'>;

/**
 * Email type for validation
 */
export type Email = Brand<string, 'Email'>;

/**
 * URL type for validation
 */
export type URL = Brand<string, 'URL'>;

/**
 * Non-empty string type
 */
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

/**
 * Positive integer type
 */
export type PositiveInteger = Brand<number, 'PositiveInteger'>;

/**
 * Configuration validator interface
 */
export interface ConfigValidator<T> {
  validate(config: unknown): ValidationResult;
  parse(config: unknown): T;
  schema: unknown;
}

/**
 * Metrics collector interface
 */
export interface MetricsCollector {
  incrementCounter(name: string, tags?: Record<string, string>): void;
  recordTimer(name: string, duration: number, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
}
