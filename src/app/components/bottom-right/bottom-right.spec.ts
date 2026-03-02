import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomRightComponent } from './bottom-right';

describe('BottomRightComponent', () => {
  let component: BottomRightComponent;
  let fixture: ComponentFixture<BottomRightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomRightComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomRightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit → starts auto-slide
  });

  afterEach(() => {
    fixture.destroy(); // triggers ngOnDestroy → clears interval
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  it('should create', () => expect(component).toBeTruthy());

  it('should start with currentProjectIndex at 0', () => {
    expect(component.currentProjectIndex()).toBe(0);
  });

  it('should start with currentSlideIndex at 0', () => {
    expect(component.currentSlideIndex()).toBe(0);
  });

  it('should have 4 projects', () => {
    expect(component.projects().length).toBe(4);
  });

  it('should start with isHovering set to false', () => {
    expect(component.isHovering()).toBe(false);
  });

  it('should start with isFullscreen set to false', () => {
    expect(component.isFullscreen()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // navigateProject
  // ---------------------------------------------------------------------------
  describe('navigateProject', () => {
    it('should advance to the next project', () => {
      component.navigateProject(1);
      expect(component.currentProjectIndex()).toBe(1);
    });

    it('should go back to the previous project', () => {
      component.navigateProject(1);
      component.navigateProject(-1);
      expect(component.currentProjectIndex()).toBe(0);
    });

    it('should wrap from project 0 to the last project when navigating backward', () => {
      component.navigateProject(-1);
      expect(component.currentProjectIndex()).toBe(3); // 4 projects → last index
    });

    it('should wrap from the last project to project 0 when navigating forward', () => {
      for (let i = 0; i < 4; i++) { component.navigateProject(1); }
      expect(component.currentProjectIndex()).toBe(0);
    });

    it('should reset currentSlideIndex to 0 when changing project', () => {
      component.goToSlide(2);
      component.navigateProject(1);
      expect(component.currentSlideIndex()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // navigateSlide
  // ---------------------------------------------------------------------------
  describe('navigateSlide', () => {
    it('should advance to the next slide', () => {
      component.navigateSlide(1);
      expect(component.currentSlideIndex()).toBe(1);
    });

    it('should go back to the previous slide', () => {
      component.navigateSlide(1);
      component.navigateSlide(-1);
      expect(component.currentSlideIndex()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // goToSlide
  // ---------------------------------------------------------------------------
  describe('goToSlide', () => {
    it('should jump to the specified slide index', () => {
      component.goToSlide(3);
      expect(component.currentSlideIndex()).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Fullscreen
  // ---------------------------------------------------------------------------
  describe('fullscreen', () => {
    it('should set isFullscreen to true on openFullscreen', () => {
      component.openFullscreen();
      expect(component.isFullscreen()).toBe(true);
    });

    it('should set isFullscreen to false on closeFullscreen', () => {
      component.openFullscreen();
      component.closeFullscreen();
      expect(component.isFullscreen()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Hover state
  // ---------------------------------------------------------------------------
  describe('hover state', () => {
    it('should set isHovering to true', () => {
      component.onSlideHover(true);
      expect(component.isHovering()).toBe(true);
    });

    it('should set isHovering to false', () => {
      component.onSlideHover(true);
      component.onSlideHover(false);
      expect(component.isHovering()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-slide (jasmine.clock controls the 3-second interval)
  // ---------------------------------------------------------------------------
  describe('auto-slide', () => {
    let autoFixture: ComponentFixture<BottomRightComponent>;
    let autoComponent: BottomRightComponent;

    beforeEach(() => {
      jasmine.clock().install();
      // Create a fresh component AFTER installing the fake clock so setInterval
      // is intercepted from the start of ngOnInit.
      autoFixture = TestBed.createComponent(BottomRightComponent);
      autoComponent = autoFixture.componentInstance;
      autoFixture.detectChanges(); // starts auto-slide under fake clock
    });

    afterEach(() => {
      autoFixture.destroy();
      jasmine.clock().uninstall();
    });

    it('should auto-advance the slide index after 3 seconds', () => {
      expect(autoComponent.currentSlideIndex()).toBe(0);
      jasmine.clock().tick(3001);
      expect(autoComponent.currentSlideIndex()).toBe(1);
    });

    it('should not auto-advance while the user is hovering', () => {
      autoComponent.onSlideHover(true);
      jasmine.clock().tick(3001);
      expect(autoComponent.currentSlideIndex()).toBe(0);
    });

    it('should not auto-advance while fullscreen is active', () => {
      autoComponent.openFullscreen();
      jasmine.clock().tick(3001);
      expect(autoComponent.currentSlideIndex()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  describe('cleanup', () => {
    it('should call clearInterval on destroy', () => {
      spyOn(window, 'clearInterval');
      fixture.destroy();
      expect(clearInterval).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // shouldShowIndicator
  // ---------------------------------------------------------------------------
  describe('shouldShowIndicator', () => {
    it('should show all indicators on a wide screen (>768px)', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1024);
      expect(component.shouldShowIndicator(0)).toBe(true);
      expect(component.shouldShowIndicator(5)).toBe(true);
    });

    it('should only show nearby indicators on a narrow screen (≤768px)', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(375);
      component.goToSlide(3); // active = 3
      expect(component.shouldShowIndicator(2)).toBe(true);  // active - 1
      expect(component.shouldShowIndicator(3)).toBe(true);  // active
      expect(component.shouldShowIndicator(4)).toBe(true);  // active + 1
      expect(component.shouldShowIndicator(0)).toBe(false); // too far from active
    });
  });
});
