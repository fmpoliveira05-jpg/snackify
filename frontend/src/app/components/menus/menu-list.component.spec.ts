import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuListComponent } from './menu-list.component';
import { testProviders } from '../../../testing/test-providers';

describe('MenuListComponent', () => {
  let component: MenuListComponent;
  let fixture: ComponentFixture<MenuListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: testProviders,
      imports: [MenuListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('é criado sem erros', () => {
    expect(component).toBeTruthy();
  });
});
