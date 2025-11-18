export interface PyrusAuthRequest {
  login: string;
  security_key: string;
}

export interface PyrusAuthResponse {
  access_token: string;
  api_url: string;
  files_url: string;
}

export interface PyrusField {
  id: number;
  name?: string;
  type: string;
  value?: any;
  parent_id?: number;
}

export interface PyrusTask {
  id: number;
  text: string;
  create_date: string;
  last_modified_date: string;
  close_date?: string;
  form_id: number;
  author_id: number;
  responsible_person_id?: number;
  fields: PyrusField[];
}

export interface PyrusTasksResponse {
  tasks: PyrusTask[];
}

export interface PyrusFormRegisterParams {
  fld?: string;
  steps?: string;
  include_archived?: 'y' | 'n';
  modified_after?: string;
  modified_before?: string;
  created_after?: string;
  created_before?: string;
  item_count?: number;
  format?: 'json' | 'csv';
}

export interface PyrusCatalogItem {
  item_id: number;
  values: string[];
  headers?: string[];
  parent_id?: number;
  deleted?: boolean;
}

export interface PyrusCatalog {
  catalog_id: number;
  catalog_headers: string[];
  items: PyrusCatalogItem[];
}

export interface PyrusCatalogDiffResponse {
  items: PyrusCatalogItem[];
}

export interface SyncConflict {
  itemName: string;
  pyrusValue: string | null;
  crmValue: string | null;
  pyrusItemId?: number;
  crmItemId?: string;
}

export interface SyncPreviewResult {
  toCreate: {
    inPyrus: string[];
    inCRM: string[];
  };
  conflicts: SyncConflict[];
}

export interface ConflictResolution {
  itemName: string;
  resolveWith: 'pyrus' | 'crm';
}
