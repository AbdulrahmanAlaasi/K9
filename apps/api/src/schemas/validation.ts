import { z } from 'zod';
import {
  TestType,
  ExecutorType,
  HttpMethod,
  BodyType,
  CheckType,
  ThresholdMetric,
  ThresholdOperator,
} from '@k9/shared';

// ──────────────────────────────────────────────
// Project schemas
// ──────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less')
    .trim(),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
});

// ──────────────────────────────────────────────
// Endpoint schema
// ──────────────────────────────────────────────

export const endpointSchema = z.object({
  id: z.string().min(1),
  url: z.string().url('Invalid URL format'),
  method: z.enum([HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE]),
  headers: z.record(z.string()).default({}),
  queryParams: z.record(z.string()).default({}),
  body: z.string().nullable().default(null),
  bodyType: z.enum([BodyType.NONE, BodyType.JSON, BodyType.FORM, BodyType.TEXT]).default(BodyType.NONE),
  authToken: z.string().nullable().default(null),
});

// ──────────────────────────────────────────────
// Stage schema
// ──────────────────────────────────────────────

export const stageSchema = z.object({
  duration: z.number().int().positive('Stage duration must be positive'),
  target: z.number().int().min(0, 'Stage target must be non-negative'),
});

// ──────────────────────────────────────────────
// Threshold schema
// ──────────────────────────────────────────────

export const thresholdRuleSchema = z.object({
  id: z.string().min(1),
  metric: z.enum([
    ThresholdMetric.P50,
    ThresholdMetric.P90,
    ThresholdMetric.P95,
    ThresholdMetric.P99,
    ThresholdMetric.AVG_RESPONSE_TIME,
    ThresholdMetric.ERROR_RATE,
    ThresholdMetric.REQUESTS_PER_SECOND,
  ]),
  operator: z.enum([
    ThresholdOperator.LESS_THAN,
    ThresholdOperator.GREATER_THAN,
    ThresholdOperator.LESS_EQUAL,
    ThresholdOperator.GREATER_EQUAL,
  ]),
  value: z.number().min(0),
});

// ──────────────────────────────────────────────
// Check schema
// ──────────────────────────────────────────────

export const checkRuleSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    CheckType.STATUS_CODE,
    CheckType.BODY_CONTAINS,
    CheckType.JSON_FIELD,
    CheckType.RESPONSE_TIME,
  ]),
  name: z.string().min(1).max(200),
  expected: z.string().min(1),
  jsonPath: z.string().optional(),
});

// ──────────────────────────────────────────────
// Test config schemas
// ──────────────────────────────────────────────

export const createTestConfigSchema = z.object({
  projectId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Test name is required')
    .max(100, 'Test name must be 100 characters or less')
    .trim(),
  testType: z.enum([TestType.SMOKE, TestType.LOAD, TestType.STRESS, TestType.SPIKE, TestType.SOAK]),
  executor: z.enum([ExecutorType.CONSTANT_VUS, ExecutorType.RAMPING_VUS, ExecutorType.CONSTANT_RATE]),
  virtualUsers: z.number().int().positive().max(500),
  duration: z.number().int().positive().max(3600),
  stages: z.array(stageSchema).default([]),
  endpoints: z.array(endpointSchema).min(1, 'At least one endpoint is required'),
  thresholds: z.array(thresholdRuleSchema).default([]),
  checks: z.array(checkRuleSchema).default([]),
  defaultHeaders: z.record(z.string()).default({}),
});

export const updateTestConfigSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  testType: z
    .enum([TestType.SMOKE, TestType.LOAD, TestType.STRESS, TestType.SPIKE, TestType.SOAK])
    .optional(),
  executor: z
    .enum([ExecutorType.CONSTANT_VUS, ExecutorType.RAMPING_VUS, ExecutorType.CONSTANT_RATE])
    .optional(),
  virtualUsers: z.number().int().positive().max(500).optional(),
  duration: z.number().int().positive().max(3600).optional(),
  stages: z.array(stageSchema).optional(),
  endpoints: z.array(endpointSchema).min(1).optional(),
  thresholds: z.array(thresholdRuleSchema).optional(),
  checks: z.array(checkRuleSchema).optional(),
  defaultHeaders: z.record(z.string()).optional(),
});

// ──────────────────────────────────────────────
// Settings schema
// ──────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  allowLocalTargets: z.boolean().optional(),
  maxVirtualUsers: z.number().int().positive().max(500).optional(),
  maxDurationSeconds: z.number().int().positive().max(3600).optional(),
  maxRequestsPerSecond: z.number().int().positive().max(2000).optional(),
});

// ──────────────────────────────────────────────
// Param schemas
// ──────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});
