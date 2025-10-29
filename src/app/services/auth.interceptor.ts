import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('jwtToken');
    
    if (token) {
      // Clone a requisição e adiciona o header Authorization com Bearer token
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('[AuthInterceptor] Token adicionado ao header:', request.url);
    } else {
      console.warn('[AuthInterceptor] Token não encontrado em localStorage para:', request.url);
    }
    
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          console.log('[AuthInterceptor] Resposta recebida:', event.status, event.url);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[AuthInterceptor] Erro interceptado:', error.status, error.url);
        if (error.status === 401) {
          console.error('[AuthInterceptor] Erro 401 Unauthorized');
          console.log('[AuthInterceptor] Token atual:', token ? `${token.substring(0, 20)}...` : 'nenhum');
        }
        return throwError(() => error);
      })
    );
  }
}
