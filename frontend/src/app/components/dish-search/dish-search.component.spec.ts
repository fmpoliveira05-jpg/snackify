import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishSearchComponent } from './dish-search.component';
import { testProviders } from '../../../testing/test-providers';

describe('DishSearchComponent', () => {
  let component: DishSearchComponent;
  let fixture: ComponentFixture<DishSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [DishSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DishSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
