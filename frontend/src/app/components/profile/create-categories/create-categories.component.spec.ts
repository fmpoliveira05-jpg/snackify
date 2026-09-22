import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateCategoriesComponent } from './create-categories.component';
import { testProviders } from '../../../../testing/test-providers';

describe('CreateCategoriesComponent', () => {
  let component: CreateCategoriesComponent;
  let fixture: ComponentFixture<CreateCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [CreateCategoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
