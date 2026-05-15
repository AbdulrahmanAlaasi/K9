import { prisma } from '../db/client.js';
import { safeJsonParse } from '../utils/helpers.js';
import type {
  TestConfig,
  CreateTestConfigInput,
  UpdateTestConfigInput,
  Stage,
  Endpoint,
  ThresholdRule,
  CheckRule,
} from '@k9/shared';

/**
 * Retrieves all test configs for a given project.
 */
export async function getTestsByProject(projectId: string): Promise<TestConfig[]> {
  const tests = await prisma.testConfig.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  });
  return tests.map(mapTestConfig);
}

/**
 * Retrieves a single test config by ID.
 */
export async function getTestConfigById(id: string): Promise<TestConfig | null> {
  const test = await prisma.testConfig.findUnique({ where: { id } });
  return test ? mapTestConfig(test) : null;
}

/**
 * Creates a new test config.
 */
export async function createTestConfig(input: CreateTestConfigInput): Promise<TestConfig> {
  const test = await prisma.testConfig.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      testType: input.testType,
      executor: input.executor,
      virtualUsers: input.virtualUsers,
      duration: input.duration,
      stages: JSON.stringify(input.stages),
      endpoints: JSON.stringify(input.endpoints),
      thresholds: JSON.stringify(input.thresholds),
      checks: JSON.stringify(input.checks),
      defaultHeaders: JSON.stringify(input.defaultHeaders),
    },
  });
  return mapTestConfig(test);
}

/**
 * Updates an existing test config.
 */
export async function updateTestConfig(
  id: string,
  input: UpdateTestConfigInput,
): Promise<TestConfig | null> {
  const existing = await prisma.testConfig.findUnique({ where: { id } });
  if (!existing) return null;

  const test = await prisma.testConfig.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.testType !== undefined && { testType: input.testType }),
      ...(input.executor !== undefined && { executor: input.executor }),
      ...(input.virtualUsers !== undefined && { virtualUsers: input.virtualUsers }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.stages !== undefined && { stages: JSON.stringify(input.stages) }),
      ...(input.endpoints !== undefined && { endpoints: JSON.stringify(input.endpoints) }),
      ...(input.thresholds !== undefined && { thresholds: JSON.stringify(input.thresholds) }),
      ...(input.checks !== undefined && { checks: JSON.stringify(input.checks) }),
      ...(input.defaultHeaders !== undefined && {
        defaultHeaders: JSON.stringify(input.defaultHeaders),
      }),
    },
  });
  return mapTestConfig(test);
}

/**
 * Deletes a test config and cascades to all its runs.
 */
export async function deleteTestConfig(id: string): Promise<boolean> {
  const existing = await prisma.testConfig.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.testConfig.delete({ where: { id } });
  return true;
}

// ── Mapper ──

interface TestConfigRow {
  id: string;
  projectId: string;
  name: string;
  testType: string;
  executor: string;
  virtualUsers: number;
  duration: number;
  stages: string;
  endpoints: string;
  thresholds: string;
  checks: string;
  defaultHeaders: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapTestConfig(row: TestConfigRow): TestConfig {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    testType: row.testType as TestConfig['testType'],
    executor: row.executor as TestConfig['executor'],
    virtualUsers: row.virtualUsers,
    duration: row.duration,
    stages: safeJsonParse<Stage[]>(row.stages, []),
    endpoints: safeJsonParse<Endpoint[]>(row.endpoints, []),
    thresholds: safeJsonParse<ThresholdRule[]>(row.thresholds, []),
    checks: safeJsonParse<CheckRule[]>(row.checks, []),
    defaultHeaders: safeJsonParse<Record<string, string>>(row.defaultHeaders, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
