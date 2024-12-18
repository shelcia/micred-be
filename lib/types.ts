export interface IUser {
  name?: string;
  email: string;
  password: string;
  date?: Date;
}

export interface IError {
  message?: string;
  status?: string | number;
}

export interface ICert {
  licenseType?: string;
  primarySpeciality: string;
  licensedState: string;
  licenseNumber: string;
  expirationDate: string;
  deaNumber: string;
  licenseCertificateUrl: string;
}

export interface CmeGuidelines {
  cmeHoursRequired: number;
  renewalCycleYears: number;
}

// Define supported state keys
export type StateKeys = "CA" | "NY" | "TX"; // Add more state abbreviations as needed
