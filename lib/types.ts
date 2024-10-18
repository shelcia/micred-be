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
