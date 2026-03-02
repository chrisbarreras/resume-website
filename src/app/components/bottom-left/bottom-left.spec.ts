import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { BottomLeftComponent } from './bottom-left';

describe('BottomLeftComponent', () => {
  let component: BottomLeftComponent;
  let fixture: ComponentFixture<BottomLeftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomLeftComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomLeftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  it('should create', () => expect(component).toBeTruthy());

  it('should start with isExpanded set to false', () => {
    expect(component.isExpanded()).toBe(false);
  });

  it('should start with isAnimating set to false', () => {
    expect(component.isAnimating()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // toggleExpanded
  // ---------------------------------------------------------------------------
  describe('toggleExpanded', () => {
    it('should set isExpanded to true when called from the collapsed state', fakeAsync(() => {
      component.toggleExpanded();
      expect(component.isExpanded()).toBe(true);
      tick(400);
    }));

    it('should set isAnimating to true immediately', fakeAsync(() => {
      component.toggleExpanded();
      expect(component.isAnimating()).toBe(true);
      tick(400);
    }));

    it('should set isAnimating to false after the 400ms animation timeout', fakeAsync(() => {
      component.toggleExpanded();
      tick(400);
      expect(component.isAnimating()).toBe(false);
    }));

    it('should collapse the view when called a second time (after animation completes)', fakeAsync(() => {
      component.toggleExpanded(); // expand
      tick(400);
      component.toggleExpanded(); // collapse
      expect(component.isExpanded()).toBe(false);
      tick(400);
    }));

    it('should be blocked while isAnimating is true (animation lock)', fakeAsync(() => {
      component.toggleExpanded();         // First call: isAnimating becomes true
      component.toggleExpanded();         // Second call: should be ignored
      expect(component.isExpanded()).toBe(true); // Still expanded
      tick(400);
    }));
  });

  // ---------------------------------------------------------------------------
  // closeExpanded
  // ---------------------------------------------------------------------------
  describe('closeExpanded', () => {
    it('should do nothing when not expanded', fakeAsync(() => {
      component.closeExpanded();
      expect(component.isExpanded()).toBe(false);
      expect(component.isAnimating()).toBe(false);
    }));

    it('should set isExpanded to false when called while expanded', fakeAsync(() => {
      component.toggleExpanded();
      tick(400);
      component.closeExpanded();
      expect(component.isExpanded()).toBe(false);
      tick(400);
    }));

    it('should be blocked when isAnimating is true', fakeAsync(() => {
      component.toggleExpanded(); // animation starts → isAnimating = true
      component.closeExpanded();  // should be blocked
      expect(component.isExpanded()).toBe(true); // still expanded
      tick(400);
    }));
  });

  // ---------------------------------------------------------------------------
  // handleKeyDown (Escape key via @HostListener)
  // ---------------------------------------------------------------------------
  describe('handleKeyDown', () => {
    it('should close the expanded view on Escape key', fakeAsync(() => {
      component.toggleExpanded();
      tick(400);
      component.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(component.isExpanded()).toBe(false);
      tick(400);
    }));

    it('should do nothing on Escape when not expanded', () => {
      component.handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(component.isExpanded()).toBe(false);
      expect(component.isAnimating()).toBe(false);
    });

    it('should ignore non-Escape keys when expanded', fakeAsync(() => {
      component.toggleExpanded();
      tick(400);
      component.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.isExpanded()).toBe(true); // still expanded
      tick(400);
    }));
  });
});
