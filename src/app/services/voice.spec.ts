import { TestBed } from '@angular/core/testing';

import { Voice } from './voice';

describe('Voice', () => {
  let service: Voice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Voice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
