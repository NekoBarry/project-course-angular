import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthResponseData } from './auth-response-data.interface';
import { catchError, tap } from 'rxjs/operators';
import { BehaviorSubject, throwError } from 'rxjs';
import { User } from './user.model';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenExpirationTimer: any;

  user = new BehaviorSubject<User>(null);

  constructor(private http: HttpClient, private route: Router) {}

  logout() {
    this.user.next(null);
    this.route.navigate(['/auth']);
    localStorage.removeItem('userData');
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = null;
  }

  autoLogin() {
    const userData: {
      email: string;
      id: string;
      _token: string;
      _tokenExpirationDate: number;
    } = JSON.parse(localStorage.getItem('userData'));

    if (!userData) {
      return; 
    }

    const loadedUser: User = new User(
      userData.email,
      userData.id,
      userData._token,
      userData._tokenExpirationDate
    );
    if (loadedUser.token) {
      this.user.next(loadedUser);
      const expirationDuration = new Date(userData._tokenExpirationDate).getTime() - new Date().getTime();
      this.autoLogout(expirationDuration);
    }
  }

  autoLogout(expirationDuration: number) {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  login(email: string, pw: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' +
          environment.firebaseAPIKey,
        {
          email: email,
          password: pw,
          returnSecureToken: true,
        }
      )
      .pipe(
        catchError((errorRes) => {
          return this.handleError(errorRes);
        }),
        tap((resData: AuthResponseData) => {
          const user = this.createUserFrom(resData);
          this.user.next(user);          
        })
      );
  }

  signup(email: string, pw: string) {
    return this.http
      .post<AuthResponseData>(
        'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' +
          environment.firebaseAPIKey,
        {
          email: email,
          password: pw,
          returnSecureToken: true,
        }
      )
      .pipe(
        catchError((errorRes) => {
          return this.handleError(errorRes);
        }),
        tap((resData: AuthResponseData) => {
          const user = this.createUserFrom(resData);
          this.user.next(user);
        })
      );
  }

  private createUserFrom(resData: AuthResponseData) {
    const expiresIn: number = new Date().getTime() + +resData.expiresIn * 1000;
    const user = new User(
      resData.email,
      resData.localId,
      resData.idToken,
      expiresIn
    );
    localStorage.setItem('userData', JSON.stringify(user));
    this.autoLogout(+resData.expiresIn * 1000)
    return user;
  }

  private handleError(errorRes: any) {
    let errorMessage = 'An unknown error occured';
    if (this.hasKnownErrorType(errorRes)) {
      errorMessage = this.getErrorMEssageFromErrorResponse(errorRes);
    }
    return throwError(errorMessage);
  }

  private hasKnownErrorType(errorRes: any) {
    return errorRes.error && errorRes.error.error;
  }

  private getErrorMEssageFromErrorResponse(errorRes: any): string {
    let errorMessage: string = null;

    switch (errorRes.error.error.message) {
      case 'EMAIL_EXISTS':
        errorMessage = 'This Email already exists';
        break;
      case 'EMAIL_NOT_FOUND':
        errorMessage = 'This Email does not exist';
        break;
      case 'INVALID_PASSWORD':
        errorMessage = 'This password is not correct';
      default:
        errorMessage = 'An unknown errorCode occured';
        break;
    }

    return errorMessage;
  }
}
