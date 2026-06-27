// ===================================================================
// PaginationDto 单元测试
// ===================================================================

import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  /** 默认值检查 */
  it('should use default values when not provided', () => {
    const dto = new PaginationDto();

    expect(dto.page).toBe(1);
    expect(dto.per_page).toBe(10);
  });

  /** 自定义分页值 */
  it('should accept custom page and per_page', () => {
    const dto = new PaginationDto();
    dto.page = 3;
    dto.per_page = 20;

    expect(dto.page).toBe(3);
    expect(dto.per_page).toBe(20);
  });

  /** skip 计算 */
  it('should calculate skip correctly', () => {
    const dto = new PaginationDto();
    dto.page = 3;
    dto.per_page = 20;

    // skip = (page - 1) * per_page = (3-1)*20 = 40
    expect(dto.skip).toBe(40);
  });

  /** skip 计算 — 第一页 */
  it('should return skip 0 for first page', () => {
    const dto = new PaginationDto();
    dto.page = 1;
    dto.per_page = 10;

    expect(dto.skip).toBe(0);
  });

  /** take getter */
  it('should return take equal to per_page', () => {
    const dto = new PaginationDto();
    dto.per_page = 25;

    expect(dto.take).toBe(25);
  });

  /** skip 计算 — page=0 边界（虽然校验层禁止，但数据层仍需处理） */
  it('should handle page 0 (edge case)', () => {
    const dto = new PaginationDto();
    dto.page = 0;
    dto.per_page = 10;

    expect(dto.skip).toBe(-10);
  });
});
