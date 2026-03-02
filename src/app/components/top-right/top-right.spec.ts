import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { TopRightComponent } from './top-right';

describe('TopRightComponent', () => {
  // ---------------------------------------------------------------------------
  // Suite A: server platform — no timers or DOM side-effects
  // ---------------------------------------------------------------------------
  describe('without browser platform', () => {
    let component: TopRightComponent;
    let fixture: ComponentFixture<TopRightComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TopRightComponent],
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }).compileComponents();

      fixture = TestBed.createComponent(TopRightComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => expect(component).toBeTruthy());

    it('should start with currentIndex at 0', () => {
      expect(component.currentIndex()).toBe(0);
    });

    it('should have exactly 9 image configs', () => {
      expect(component.imageConfigs.length).toBe(9);
    });

    it('should have 10 display images (9 originals + 1 cloned first slide for seamless loop)', () => {
      expect(component.displayImages.length).toBe(10);
    });

    it('should start with enableTransition set to true', () => {
      expect(component.enableTransition()).toBe(true);
    });

    it('getSrcSet should return 3 srcset entries for a given base name', () => {
      const srcset = component.getSrcSet('With_Sister_Hat');
      expect(srcset.split(', ').length).toBe(3);
    });

    it('getSrcSet should reference small, medium, and large sizes', () => {
      const srcset = component.getSrcSet('Graduation_Alone');
      expect(srcset).toContain('-small.jpg 400w');
      expect(srcset).toContain('-medium.jpg 600w');
      expect(srcset).toContain('-large.jpg 800w');
    });

    it('getDefaultSrc should return the medium jpg path', () => {
      expect(component.getDefaultSrc('PDP_Hoodie')).toBe('assets/optimized/PDP_Hoodie-medium.jpg');
    });

    it('getOriginalSrc should return the original asset path', () => {
      expect(component.getOriginalSrc('With_Sister_Hat')).toContain('With_Sister_Hat.jpg');
    });

    it('getOriginalSrc should return empty string for an unknown baseName', () => {
      expect(component.getOriginalSrc('NonExistent')).toBe('');
    });

    it('getCurrentImage should return the config for index 0 initially', () => {
      expect(component.getCurrentImage()).toBe(component.imageConfigs[0]);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite B: browser platform — timer-driven behaviour
  // ---------------------------------------------------------------------------
  describe('with browser platform', () => {
    let component: TopRightComponent;
    let fixture: ComponentFixture<TopRightComponent>;

    beforeEach(async () => {
      jasmine.clock().install();

      await TestBed.configureTestingModule({
        imports: [TopRightComponent],
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      }).compileComponents();

      fixture = TestBed.createComponent(TopRightComponent);
      component = fixture.componentInstance;
      fixture.detectChanges(); // constructor starts slideshow under fake clock
    });

    afterEach(() => {
      fixture.destroy();
      jasmine.clock().uninstall();
    });

    it('should advance currentIndex by 1 after 5 seconds', () => {
      expect(component.currentIndex()).toBe(0);
      jasmine.clock().tick(5001);
      expect(component.currentIndex()).toBe(1);
    });

    it('should not advance when the page is not visible', () => {
      (component as any).isPageVisible = false;
      jasmine.clock().tick(5001);
      expect(component.currentIndex()).toBe(0);
    });

    it('should call clearInterval on destroy', () => {
      spyOn(window, 'clearInterval');
      fixture.destroy();
      expect(clearInterval).toHaveBeenCalled();
    });
  });
});
