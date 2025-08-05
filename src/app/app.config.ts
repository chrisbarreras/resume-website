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
      projectId: "resume-632d7", 
      appId: "1:871118908397:web:1c2a69a2626749634215e4", 
      storageBucket: "resume-632d7.firebasestorage.app", 
      apiKey: "AIzaSyCHq9psIPXhqvtYmkQRJniTRV6Eo5tkngQ", 
      authDomain: "resume-632d7.firebaseapp.com", 
      messagingSenderId: "871118908397", 
      measurementId: "G-RMRGQDVESG" 
    })),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    provideVertexAI(() => getVertexAI())
  ]
};
