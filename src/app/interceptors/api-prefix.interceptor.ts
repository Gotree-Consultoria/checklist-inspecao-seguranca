import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log('[ApiPrefixInterceptor] INICIADO - URL:', req.url);
    let url = req.url ?? '';
    
    console.log('[ApiPrefixInterceptor] URL original:', url);

    try {
      // If absolute https?:// AND it's the same origin, convert to relative path
      if (/^https?:\/\//i.test(url)) {
        if (typeof window !== 'undefined' && window.location) {
          const origin = window.location.origin;
          if (url.startsWith(origin)) {
            url = url.substring(origin.length) || '/';
            console.log('[ApiPrefixInterceptor] URL convertida de absoluta para relativa:', url);
          } else {
            console.log('[ApiPrefixInterceptor] URL é de origem diferente');
            return next.handle(req);
          }
        } else {
          return next.handle(req);
        }
      }

      // Ignore already prefixed /api and static/data schemes
      if (url.startsWith('/api') || url.startsWith('/assets') || url.startsWith('data:') || url.startsWith('file:') || url.startsWith('blob:')) {
        console.log('[ApiPrefixInterceptor] URL já tem prefixo ou é estático:', url);
        return next.handle(req);
      }

      // Prefix relative URLs
      const prefixed = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
      console.log('[ApiPrefixInterceptor] URL final com prefixo:', prefixed);
      const cloned = req.clone({ url: prefixed });
      return next.handle(cloned);
    } catch (e) {
      console.error('[ApiPrefixInterceptor] Erro:', e);
      return next.handle(req);
    }
  }
}