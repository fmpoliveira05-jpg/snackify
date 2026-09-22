import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateProfileComponent } from './update-profile.component';
import { testProviders } from '../../../../testing/test-providers';

describe('UpdateProfileComponent', () => {
  let component: UpdateProfileComponent;
  let fixture: ComponentFixture<UpdateProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [UpdateProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
