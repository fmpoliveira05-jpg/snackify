import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckEmailComponent } from './check-email.component';
import { testProviders } from '../../../testing/test-providers';

describe('CheckEmailComponent', () => {
  let component: CheckEmailComponent;
  let fixture: ComponentFixture<CheckEmailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [CheckEmailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
