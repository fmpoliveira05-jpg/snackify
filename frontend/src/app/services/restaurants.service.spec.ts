import { TestBed } from '@angular/core/testing';

import { RestaurantsService } from './restaurants.service';

import { testProviders } from '../../testing/test-providers';

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
    service = TestBed.inject(RestaurantsService);
  });

  it('é criado sem erros', () => {
    expect(service).toBeTruthy();
  });
});
