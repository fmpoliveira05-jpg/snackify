import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCategoriesComponent } from './list-categories.component';
import { testProviders } from '../../../../testing/test-providers';

describe('ListCategoriesComponent', () => {
  let component: ListCategoriesComponent;
  let fixture: ComponentFixture<ListCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [ListCategoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
