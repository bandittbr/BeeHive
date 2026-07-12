/**
 * Projetos — serviços e tipos.
 */

export { ProjectService, getProjectService } from './projectService';
export { ProjectStoreProvider } from './ProjectStoreProvider';
export { useProjectStore, ProjectStoreContext } from './projectStore';
export type { ProjectStore, ProjectStoreState, ProjectStoreActions } from './projectStore';
export type { Project, ProjectFile, ProjectArea, ProjectSettings } from './types';
