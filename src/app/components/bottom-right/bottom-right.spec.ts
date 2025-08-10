import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomRightComponent } from './bottom-right';

describe('BottomRightComponent', () => {
  let component: BottomRightComponent;
  let fixture: ComponentFixture<BottomRightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomRightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BottomRightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
