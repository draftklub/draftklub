import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryAllocatorService } from './category-allocator.service';

describe('CategoryAllocatorService', () => {
  let service: CategoryAllocatorService;

  const categories = [
    { id: 'cat-a', order: 0, minRatingExpected: 1500, maxRatingExpected: 9999 },
    { id: 'cat-b', order: 1, minRatingExpected: 1200, maxRatingExpected: 1499 },
    { id: 'cat-c', order: 2, minRatingExpected: 900, maxRatingExpected: 1199 },
    { id: 'cat-d', order: 3, minRatingExpected: 0, maxRatingExpected: 899 },
  ];

  beforeEach(() => {
    service = new CategoryAllocatorService();
  });

  it('jogador sem rating vai para categoria mais baixa', () => {
    expect(service.allocate(null, categories)).toBe('cat-d');
  });

  it('aloca rating 1000 na categoria C', () => {
    expect(service.allocate(1000, categories)).toBe('cat-c');
  });

  it('aloca rating 1500 na categoria A (inclusivo)', () => {
    expect(service.allocate(1500, categories)).toBe('cat-a');
  });

  it('aloca rating 2000 (acima de todas) na categoria A', () => {
    expect(service.allocate(2000, categories)).toBe('cat-a');
  });

  it('aloca rating 500 (abaixo) na categoria D', () => {
    expect(service.allocate(500, categories)).toBe('cat-d');
  });

  it('lança erro se não há categorias', () => {
    expect(() => service.allocate(1000, [])).toThrow('No categories available');
  });
});
