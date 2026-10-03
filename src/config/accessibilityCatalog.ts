export const accessibilityCatalog = [
  { type: 'step_free_access', label: 'Entrada sem degraus', description: 'Acesso sem escadas ou degraus na entrada.' },
  { type: 'ramp', label: 'Rampa de acesso', description: 'Rampa disponível para vencer desníveis.' },
  { type: 'preferential_parking', label: 'Vaga preferencial', description: 'Vaga reservada para pessoas com deficiência ou mobilidade reduzida.' },
  { type: 'accessible_bathroom', label: 'Banheiro acessível', description: 'Banheiro com espaço e instalações acessíveis.' },
  { type: 'elevator', label: 'Elevador', description: 'Elevador acessível para circular entre andares.' },
  { type: 'tactile_floor', label: 'Piso tátil', description: 'Piso tátil para orientação e alerta.' },
  { type: 'braille_signage', label: 'Sinalização em Braille', description: 'Placas ou sinalização com informação em Braille.' },
  { type: 'braille_menu', label: 'Menu em Braille', description: 'Cardápio disponível em Braille.' },
  { type: 'libras_service', label: 'Atendimento em Libras', description: 'Atendimento disponível em Língua Brasileira de Sinais.' },
  { type: 'wheelchair_space', label: 'Espaço para cadeira de rodas', description: 'Área acessível para circulação e permanência.' },
  { type: 'accessible_counter', label: 'Balcão acessível', description: 'Balcão com altura e aproximação acessíveis.' },
  { type: 'hearing_loop', label: 'Sistema de amplificação sonora', description: 'Recurso de apoio à audição, como aro magnético.' }
] as const;

export type AccessibilityType = typeof accessibilityCatalog[number]['type'];
export type FeatureStatus = 'available' | 'unavailable' | 'unknown';
export const accessibilityTypes = new Set<string>(accessibilityCatalog.map((item) => item.type));



