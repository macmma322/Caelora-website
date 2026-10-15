import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { bootstrapPortal, RUNTIME_CONFIG } from '../../../packages/api-client/src/portal-bootstrap';
import { AdminShell } from './shell';
import { routes } from './routes';

void bootstrapPortal((config) =>
  bootstrapApplication(AdminShell, {
    providers: [provideRouter(routes), { provide: RUNTIME_CONFIG, useValue: config }],
  }),
);
