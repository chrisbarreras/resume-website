import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomLeftComponent } from './bottom-left';

describe('BottomLeftComponent', () => {
  let component: BottomLeftComponent;
  let fixture: ComponentFixture<BottomLeftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomLeftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BottomLeftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
