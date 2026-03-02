import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';

import { TopLeftComponent } from './top-left';
import { environment } from '../../../environments/environment';

const FUNCTIONS_URL = environment.functionsUrl;

describe('TopLeftComponent', () => {
  let component: TopLeftComponent;
  let fixture: ComponentFixture<TopLeftComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopLeftComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // Use 'server' to skip window.location parsing in ngOnInit
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopLeftComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Flush any requests that a test forgot to handle, then verify nothing unexpected
    httpMock.match(() => true).forEach((req) => req.flush({ answer: '' }));
    httpMock.verify();
  });

  // Helper: trigger ngOnInit and resolve the automatic initial request
  function init(initialResponse: object = { answer: '<p>Hello</p>' }): void {
    fixture.detectChanges(); // triggers ngOnInit → sendInitialMessage → POST
    httpMock.expectOne(FUNCTIONS_URL).flush(initialResponse);
    fixture.detectChanges(); // process response, update signals
  }

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------
  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------
  describe('initialization', () => {
    it('should send a POST request on init', fakeAsync(() => {
      fixture.detectChanges();
      const req = httpMock.expectOne(FUNCTIONS_URL);
      expect(req.request.method).toBe('POST');
      req.flush({ answer: '<p>Response</p>' });
    }));

    it('should set isInitialLoading to true before the response arrives', fakeAsync(() => {
      fixture.detectChanges();
      expect(component.isInitialLoading()).toBe(true);
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>Response</p>' });
    }));

    it('should set isInitialLoading to false after the response', fakeAsync(() => {
      init();
      expect(component.isInitialLoading()).toBe(false);
    }));

    it('should add an initial user message to the messages list', fakeAsync(() => {
      init();
      const userMsg = component.messages().find((m) => m.isUser);
      expect(userMsg).toBeTruthy();
    }));

    it('should add the AI reply as a non-user message', fakeAsync(() => {
      init({ answer: '<p>AI response</p>' });
      const aiMsg = component.messages().find((m) => !m.isUser);
      expect(aiMsg?.content).toBe('<p>AI response</p>');
    }));

    it('should set welcomeRecipient to "Everyone" when no companyName is returned', fakeAsync(() => {
      init({ answer: '<p>Hi</p>' });
      expect(component.welcomeRecipient()).toBe('Everyone');
    }));

    // companyName is only applied when jobPostId is also set; in server mode
    // jobPostId is null, so we expect the fallback 'Everyone'
    it('should keep welcomeRecipient as "Everyone" when jobPostId is null', fakeAsync(() => {
      init({ answer: '<p>Hi</p>', companyName: 'Acme Corp' });
      expect(component.welcomeRecipient()).toBe('Everyone');
    }));

    it('should update welcomeRecipient to companyName when jobPostId is set', fakeAsync(() => {
      fixture.detectChanges();
      component.jobPostId.set('someJob'); // simulate URL-parsed jobPostId
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>Hi</p>', companyName: 'Acme Corp' });
      fixture.detectChanges();
      expect(component.welcomeRecipient()).toBe('Acme Corp');
    }));
  });

  // ---------------------------------------------------------------------------
  // Error handling on initial load
  // ---------------------------------------------------------------------------
  describe('error handling on initial load', () => {
    function initWithError(status: number, body: object = {}): void {
      fixture.detectChanges();
      httpMock
        .expectOne(FUNCTIONS_URL)
        .flush(body, { status, statusText: 'Error' });
      fixture.detectChanges();
    }

    it('should show "Too many requests" message on 429', fakeAsync(() => {
      initWithError(429, { error: 'Rate limited' });
      const errMsg = component.messages().find((m) => !m.isUser);
      expect(errMsg?.content).toContain('Too many requests');
    }));

    it('should show "Invalid request" message on 400', fakeAsync(() => {
      initWithError(400, { error: 'Bad input' });
      const errMsg = component.messages().find((m) => !m.isUser);
      expect(errMsg?.content).toContain('Invalid request');
    }));

    it('should show a service unavailable message on 500', fakeAsync(() => {
      initWithError(500, { error: 'Server error' });
      const errMsg = component.messages().find((m) => !m.isUser);
      expect(errMsg?.content).toContain('unavailable');
    }));

    it('should set welcomeRecipient to "Everyone" on any error', fakeAsync(() => {
      initWithError(500);
      expect(component.welcomeRecipient()).toBe('Everyone');
    }));

    it('should set isInitialLoading to false on error', fakeAsync(() => {
      initWithError(500);
      expect(component.isInitialLoading()).toBe(false);
    }));
  });

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------
  describe('sendMessage', () => {
    beforeEach(fakeAsync(() => {
      init(); // initialise component before each sendMessage test
    }));

    it('should not send a request when message is empty', fakeAsync(() => {
      component.currentMessage.set('');
      component.sendMessage();
      httpMock.expectNone(FUNCTIONS_URL);
    }));

    it('should not send a request when message is only whitespace', fakeAsync(() => {
      component.currentMessage.set('   ');
      component.sendMessage();
      httpMock.expectNone(FUNCTIONS_URL);
    }));

    it('should not send a request while isLoading is true', fakeAsync(() => {
      component.isLoading.set(true);
      component.currentMessage.set('hello');
      component.sendMessage();
      httpMock.expectNone(FUNCTIONS_URL);
    }));

    it('should add the user message to the messages list', fakeAsync(() => {
      const before = component.messages().length;
      component.currentMessage.set('What are Chris skills?');
      component.sendMessage();
      expect(component.messages().length).toBe(before + 1);
      expect(component.messages()[before].content).toBe('What are Chris skills?');
      expect(component.messages()[before].isUser).toBe(true);
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>OK</p>' });
    }));

    it('should clear currentMessage after sending', fakeAsync(() => {
      component.currentMessage.set('Test message');
      component.sendMessage();
      expect(component.currentMessage()).toBe('');
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>OK</p>' });
    }));

    it('should set isLoading to true while waiting for the response', fakeAsync(() => {
      component.currentMessage.set('Test message');
      component.sendMessage();
      expect(component.isLoading()).toBe(true);
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>OK</p>' });
      fixture.detectChanges();
    }));

    it('should set isLoading to false after a successful response', fakeAsync(() => {
      component.currentMessage.set('Test message');
      component.sendMessage();
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>OK</p>' });
      fixture.detectChanges();
      expect(component.isLoading()).toBe(false);
    }));

    it('should add the AI reply as a non-user message', fakeAsync(() => {
      component.currentMessage.set('Question?');
      component.sendMessage();
      httpMock.expectOne(FUNCTIONS_URL).flush({ answer: '<p>AI Answer</p>' });
      fixture.detectChanges();
      const last = component.messages()[component.messages().length - 1];
      expect(last.content).toBe('<p>AI Answer</p>');
      expect(last.isUser).toBe(false);
    }));

    it('should show "Too many requests" on 429 error', fakeAsync(() => {
      component.currentMessage.set('Question?');
      component.sendMessage();
      httpMock.expectOne(FUNCTIONS_URL).flush(
        { error: 'Rate limited' },
        { status: 429, statusText: 'Too Many Requests' },
      );
      fixture.detectChanges();
      const last = component.messages()[component.messages().length - 1];
      expect(last.content).toContain('Too many requests');
    }));

    it('should set isLoading to false on error', fakeAsync(() => {
      component.currentMessage.set('Question?');
      component.sendMessage();
      httpMock.expectOne(FUNCTIONS_URL).flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(component.isLoading()).toBe(false);
    }));

    it('should include jobPostId in the request body when set', fakeAsync(() => {
      component.jobPostId.set('myJob');
      component.currentMessage.set('Question?');
      component.sendMessage();
      const req = httpMock.expectOne(FUNCTIONS_URL);
      expect(req.request.body).toEqual({ message: 'Question?', jobPostId: 'myJob' });
      req.flush({ answer: '<p>OK</p>' });
    }));

    it('should omit jobPostId from the request body when it is null', fakeAsync(() => {
      component.jobPostId.set(null);
      component.currentMessage.set('Question?');
      component.sendMessage();
      const req = httpMock.expectOne(FUNCTIONS_URL);
      expect(req.request.body).toEqual({ message: 'Question?' });
      req.flush({ answer: '<p>OK</p>' });
    }));
  });

  // ---------------------------------------------------------------------------
  // onKeyPress
  // ---------------------------------------------------------------------------
  describe('onKeyPress', () => {
    beforeEach(fakeAsync(() => {
      init();
    }));

    it('should call sendMessage on Enter key (without Shift)', () => {
      spyOn(component, 'sendMessage');
      component.onKeyPress(new KeyboardEvent('keypress', { key: 'Enter', shiftKey: false }));
      expect(component.sendMessage).toHaveBeenCalled();
    });

    it('should NOT call sendMessage on Shift+Enter', () => {
      spyOn(component, 'sendMessage');
      component.onKeyPress(new KeyboardEvent('keypress', { key: 'Enter', shiftKey: true }));
      expect(component.sendMessage).not.toHaveBeenCalled();
    });

    it('should NOT call sendMessage on other keys', () => {
      spyOn(component, 'sendMessage');
      component.onKeyPress(new KeyboardEvent('keypress', { key: 'a' }));
      expect(component.sendMessage).not.toHaveBeenCalled();
    });
  });
});
