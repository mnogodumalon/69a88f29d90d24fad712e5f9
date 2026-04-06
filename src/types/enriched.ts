import type { Strassenschadenmeldungen } from './app';

export type EnrichedStrassenschadenmeldungen = Strassenschadenmeldungen & {
  schadenskategorieName: string;
};
