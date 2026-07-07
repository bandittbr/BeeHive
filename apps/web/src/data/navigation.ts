import type { IconName } from '@/components/common/Icon';
import { AREA_META } from '@/app/areas';

/**
 * Itens do menu lateral (as Áreas do BeeHive).
 * Derivados do registro central de Áreas (`@/app/areas`) — fonte única de
 * verdade, para que menu e roteamento nunca divirjam.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = AREA_META.map(({ id, label, icon }) => ({ id, label, icon }));
