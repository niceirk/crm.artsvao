export type CallStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'NO_ANSWER' | 'BUSY';

export interface CallLog {
  id: string;
  userId: string;
  clientId?: string | null;
  fromNumber: string;
  toNumber: string;
  status: CallStatus;
  novofonCallId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

export interface TelephonySettings {
  id: string;
  provider: string;
  accessToken: string;
  virtualPhoneNumber: string;
  defaultEmployeeId: number | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateCallDto {
  toNumber: string;
  clientId?: string;
  employeeId?: number;
}

export interface UpdateSettingsDto {
  accessToken?: string;
  virtualPhoneNumber?: string;
  defaultEmployeeId?: number | null;
  isEnabled?: boolean;
}

export interface CallHistoryResponse {
  calls: CallLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface InitiateCallResponse {
  success: boolean;
  callId: string;
  callSessionId?: number;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  account?: {
    name: string;
    app_id: number;
    timezone: string;
  };
}

export interface NovofonEmployee {
  id: number;
  full_name: string;
  login: string;
  extension: {
    extension_phone_number: string;
  };
  phone_numbers: Array<{
    phone_number: string;
    status: string;
  }>;
}

export interface NovofonVirtualNumber {
  id: number;
  virtual_phone_number: string;
  status: string;
  name?: string;
}
