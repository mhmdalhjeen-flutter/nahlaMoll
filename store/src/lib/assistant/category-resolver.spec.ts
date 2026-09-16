import { describe, expect, it } from 'vitest';
import { flattenCategories, resolveCategory } from './category-resolver';
import type { Category } from '@/lib/types';

const categories: Category[] = [
  {
    id: 'cat-veg',
    name: 'خضار',
    slug: 'vegetables',
    description: 'خضروات طازجة',
  },
  {
    id: 'cat-fruit',
    name: 'فواكه',
    slug: 'fruits',
    description: 'فواكه موسمية',
  },
  {
    id: 'cat-electronics',
    name: 'إلكترونيات',
    slug: 'electronics',
    children: [
      { id: 'cat-headphones', name: 'سماعات', slug: 'headphones', parentId: 'cat-electronics' },
    ],
  },
];

describe('category-resolver', () => {
  it('flattens nested categories', () => {
    expect(flattenCategories(categories)).toHaveLength(4);
  });

  it('matches Arabic category names', () => {
    const match = resolveCategory('خضار', categories);
    expect(match?.category.id).toBe('cat-veg');
  });

  it('matches alias terms for fruits', () => {
    const match = resolveCategory('فواكه', categories);
    expect(match?.category.id).toBe('cat-fruit');
  });

  it('matches child category by name', () => {
    const match = resolveCategory('سماعات', categories);
    expect(match?.category.id).toBe('cat-headphones');
  });
});
