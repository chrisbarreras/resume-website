import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAnalytics, provideAnalytics, ScreenTrackingService } from '@angular/fire/analytics';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getVertexAI, provideVertexAI } from '@angular/fire/vertexai';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp({ 
      apiKey: "AIzaSyD3lSZeD6-vL5rpFKFFLMJPY3SzoH22-CE",
      authDomain: "resume-7f23a.firebaseapp.com",
      projectId: "resume-7f23a",
      storageBucket: "resume-7f23a.firebasestorage.app",
      messagingSenderId: "146372067822",
      appId: "1:146372067822:web:0701a1efa291e7b2374eff",
      measurementId: "G-PZDR7M1VFX"
    })),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    provideVertexAI(() => getVertexAI())
  ]
};
