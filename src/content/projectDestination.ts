import type { ProjectMeta } from './schema';

/** The public destination for a project card. Demos take precedence over source. */
export const projectDestination = (project: Pick<ProjectMeta, 'demo' | 'repo'>) =>
  project.demo ?? project.repo;
