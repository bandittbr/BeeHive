import { BaseModule } from '../BaseModule';

/** Módulo Dashboard (placeholder). Depende de Business. */
export class DashboardModule extends BaseModule {
  readonly id = 'dashboard';
  readonly name = 'Dashboard';
  readonly version = '0.1.0';
  readonly description = 'Visão geral de projetos, métricas e saúde do sistema.';
  readonly dependencies = ['business'];
}

export const dashboardModule = new DashboardModule();
