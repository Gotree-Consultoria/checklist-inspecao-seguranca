import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = req.url ?? '';

    // Ignore absolute URLs (http(s)://), already prefixed `/api`, and typical static/data schemes
    if (/^https?:\/\//i.test(url) || url.startsWith('/api') || url.startsWith('/assets') || url.startsWith('data:') || url.startsWith('file:') || url.startsWith('blob:')) {
      return next.handle(req);
    }

    const prefixed = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
    const cloned = req.clone({ url: prefixed });
    return next.handle(cloned);
  }
}
