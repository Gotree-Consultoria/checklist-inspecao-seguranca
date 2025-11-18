import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let url = req.url ?? '';

    // If absolute https?:// AND it's the same origin, convert to relative path so we can prefix it.
    // This allows calls that used window.location.origin + '/users/...' to be prefixed to '/api/users/...'
    try {
      if (/^https?:\/\//i.test(url)) {
        // If running in a browser (window defined), check same-origin
        if (typeof window !== 'undefined' && window.location) {
          const origin = window.location.origin;
          if (url.startsWith(origin)) {
            url = url.substring(origin.length) || '/';
          } else {
            // Different origin — leave as-is (calls external hosts should not be prefixed)
            return next.handle(req);
          }
        } else {
          // Not running in browser (SSR) — keep absolute URLs intact
          return next.handle(req);
        }
      }

      // Ignore already prefixed /api and static/data schemes
      if (url.startsWith('/api') || url.startsWith('/assets') || url.startsWith('data:') || url.startsWith('file:') || url.startsWith('blob:')) {
        return next.handle(req);
      }

      // Prefix relative URLs
      const prefixed = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
      const cloned = req.clone({ url: prefixed });
      return next.handle(cloned);
    } catch (e) {
      // On any unexpected error just pass the original request through
      return next.handle(req);
    }
  }
}