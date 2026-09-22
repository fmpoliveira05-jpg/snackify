import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCheckedRestaurantsComponent } from './list-checked-restaurants.component';
import { testProviders } from '../../../../testing/test-providers';

describe('ListCheckedRestaurantsComponent', () => {
  let component: ListCheckedRestaurantsComponent;
  let fixture: ComponentFixture<ListCheckedRestaurantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [ListCheckedRestaurantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListCheckedRestaurantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
