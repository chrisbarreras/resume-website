import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomLeft } from './bottom-left';

describe('BottomLeft', () => {
  let component: BottomLeft;
  let fixture: ComponentFixture<BottomLeft>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomLeft]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BottomLeft);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
