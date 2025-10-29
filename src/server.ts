import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
// Prefer explicit environment override for the browser dist folder (allows flexibility)
let browserDistFolder = process.env['BROWSER_DIST'] || join(process.cwd(), 'dist', 'frontend', 'browser');
// Fallback: if that folder doesn't exist, try without the 'browser' subfolder
import { existsSync } from 'node:fs';
if (!existsSync(browserDistFolder)) {
  const alt = join(process.cwd(), 'dist', 'frontend');
  if (existsSync(alt)) browserDistFolder = alt;
}

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
// Decide whether to start the server: support PM2 (pm_id), explicit env START_SERVER,
// or a simple argv heuristic when launched directly (e.g., `node server.js`).
const shouldStart = !!(
  process.env['pm_id'] ||
  process.env['START_SERVER'] === 'true' ||
  (process.argv && process.argv[1] && /server(\.js|\.ts)?$/i.test(process.argv[1]))
);

if (shouldStart) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
