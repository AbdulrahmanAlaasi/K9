import { prisma } from '../db/client.js';
import type { CreateProjectInput, UpdateProjectInput, Project } from '@k9/shared';

/**
 * Retrieves all projects ordered by most recently updated.
 */
export async function getAllProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  return projects.map(mapProject);
}

/**
 * Retrieves a single project by ID with its test count.
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id } });
  return project ? mapProject(project) : null;
}

/**
 * Creates a new project.
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description ?? null,
    },
  });
  return mapProject(project);
}

/**
 * Updates an existing project.
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return null;

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
  });
  return mapProject(project);
}

/**
 * Deletes a project and cascades to all its tests and runs.
 */
export async function deleteProject(id: string): Promise<boolean> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.project.delete({ where: { id } });
  return true;
}

// ── Mapper ──

function mapProject(row: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
