import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishListComponent } from './dish-list.component';
import { testProviders } from '../../../testing/test-providers';

describe('DishListComponent', () => {
  let component: DishListComponent;
  let fixture: ComponentFixture<DishListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [DishListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DishListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
