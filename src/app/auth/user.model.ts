export class User {
  constructor(
    public email: string,
    public id: string,
    private _token: string,
    private _tokenExpirationDate: number
  ) {}

  get token() {
    if (!this._tokenExpirationDate || new Date().getTime() > this._tokenExpirationDate) {
      return null;
    }
    return this._token;
  }

  get tokenExpirationDate(): number {
    return this._tokenExpirationDate;
  }

}
