import assert from 'node:assert/strict'
import { resolvePaginationQuery } from '../src/http/pagination'

assert.deepEqual(resolvePaginationQuery({}), {
  page: 1,
  limit: 100,
  hasExplicitPagination: false,
})

assert.deepEqual(resolvePaginationQuery({ page: '3', limit: '25' }), {
  page: 3,
  limit: 25,
  hasExplicitPagination: true,
})

assert.deepEqual(resolvePaginationQuery({ page: '-4', limit: '9999' }), {
  page: 1,
  limit: 100,
  hasExplicitPagination: true,
})

assert.deepEqual(resolvePaginationQuery({ page: ['2'], limit: ['10'] }), {
  page: 2,
  limit: 10,
  hasExplicitPagination: true,
})

console.log('pagination tests passed')
