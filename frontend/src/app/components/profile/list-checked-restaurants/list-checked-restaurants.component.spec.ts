import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCheckedRestaurantsComponent } from './list-checked-restaurants.component';

describe('ListCheckedRestaurantsComponent', () => {
  let component: ListCheckedRestaurantsComponent;
  let fixture: ComponentFixture<ListCheckedRestaurantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListCheckedRestaurantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListCheckedRestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
