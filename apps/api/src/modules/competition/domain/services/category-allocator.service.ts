import { Injectable } from '@nestjs/common';

export interface CategoryForAllocation {
  id: string;
  order: number;
  minRatingExpected?: number | null;
  maxRatingExpected?: number | null;
}

@Injectable()
export class CategoryAllocatorService {
  allocate(
    rating: number | null,
    categories: CategoryForAllocation[],
  ): string {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    if (!highest || !lowest) {
      throw new Error('No categories available for allocation');
    }

    if (rating == null) {
      return lowest.id;
    }

    for (const cat of sorted) {
      const min = cat.minRatingExpected ?? -Infinity;
      const max = cat.maxRatingExpected ?? Infinity;
      if (rating >= min && rating <= max) {
        return cat.id;
      }
    }

    if (rating > (highest.maxRatingExpected ?? Infinity)) {
      return highest.id;
    }

    return lowest.id;
  }
}
