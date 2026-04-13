// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Schadenskategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategoriename?: string;
    beschreibung?: string;
    prioritaetsstufe?: LookupValue;
  };
}

export interface Strassenschadenmeldungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    stadt?: string;
    gps_koordinaten?: GeoLocation; // { lat, long, info }
    schadenskategorie?: string; // applookup -> URL zu 'Schadenskategorien' Record
    foto?: string;
    schweregrad?: LookupValue;
    detaillierte_beschreibung?: string;
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    meldedatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  SCHADENSKATEGORIEN: '69a88f1447fb7f5d2471145f',
  STRASSENSCHADENMELDUNGEN: '69a88f176e17923d1eb5585a',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'schadenskategorien': {
    prioritaetsstufe: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }, { key: "sehr_hoch", label: "Sehr hoch" }],
  },
  'straßenschadenmeldungen': {
    schweregrad: [{ key: "gering", label: "Gering" }, { key: "maessig", label: "Mäßig" }, { key: "erheblich", label: "Erheblich" }, { key: "kritisch", label: "Kritisch" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schadenskategorien': {
    'kategoriename': 'string/text',
    'beschreibung': 'string/textarea',
    'prioritaetsstufe': 'lookup/select',
  },
  'straßenschadenmeldungen': {
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'stadt': 'string/text',
    'gps_koordinaten': 'geo',
    'schadenskategorie': 'applookup/select',
    'foto': 'file',
    'schweregrad': 'lookup/select',
    'detaillierte_beschreibung': 'string/textarea',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'meldedatum': 'date/datetimeminute',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchadenskategorien = StripLookup<Schadenskategorien['fields']>;
export type CreateStrassenschadenmeldungen = StripLookup<Strassenschadenmeldungen['fields']>;