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
