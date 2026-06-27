// ===================================================================
// ApiResponse DTO 单元测试
// ===================================================================

import { ApiResponse } from './response.dto';

describe('ApiResponse', () => {
  describe('success', () => {
    /** 默认成功响应 */
    it('should create success response with default values', () => {
      const result = ApiResponse.success(null);

      expect(result.code).toBe(0);
      expect(result.message).toBe('success');
      expect(result.data).toBeNull();
    });

    /** 带数据的成功响应 */
    it('should create success response with custom data', () => {
      const data = { id: 1, name: 'Test' };
      const result = ApiResponse.success(data);

      expect(result.code).toBe(0);
      expect(result.message).toBe('success');
      expect(result.data).toEqual(data);
    });

    /** 自定义消息的成功响应 */
    it('should create success response with custom message', () => {
      const result = ApiResponse.success({ done: true }, '\u64cd\u4f5c\u6210\u529f');

      expect(result.code).toBe(0);
      expect(result.message).toBe('\u64cd\u4f5c\u6210\u529f');
      expect(result.data).toEqual({ done: true });
    });
  });

  describe('error', () => {
    /** 基本错误响应 */
    it('should create error response', () => {
      const result = ApiResponse.error(1001, '\u7528\u6237\u4e0d\u5b58\u5728');

      expect(result.code).toBe(1001);
      expect(result.message).toBe('\u7528\u6237\u4e0d\u5b58\u5728');
      expect(result.data).toBeNull();
    });

    /** 带校验错误数组 */
    it('should include errors array when provided', () => {
      const validationErrors = [
        { field: 'email', message: '\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e' },
      ];
      const result = ApiResponse.error(422, '\u53c2\u6570\u6821\u9a8c\u5931\u8d25', validationErrors);

      expect(result.code).toBe(422);
      expect(result.message).toBe('\u53c2\u6570\u6821\u9a8c\u5931\u8d25');
      expect((result as unknown as Record<string, unknown>).errors).toEqual(
        validationErrors,
      );
    });

    /** 不带 errors 的错误响应 */
    it('should have undefined errors when not provided', () => {
      const result = ApiResponse.error(500, '\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef');

      expect((result as unknown as Record<string, unknown>).errors).toBeUndefined();
    });
  });

  describe('paginated', () => {
    /** 正常分页响应 */
    it('should create paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = ApiResponse.paginated(items, 50, 1, 20);

      expect(result.code).toBe(0);
      expect(result.message).toBe('success');
      expect(result.data?.items).toEqual(items);
      expect(result.data?.pagination).toEqual({
        total: 50,
        page: 1,
        per_page: 20,
        total_pages: 3, // ceil(50/20) = 3
      });
    });

    /** 空结果分页 */
    it('should handle empty paginated response', () => {
      const result = ApiResponse.paginated([], 0, 1, 20);

      expect(result.data?.items).toEqual([]);
      expect(result.data?.pagination).toEqual({
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0, // ceil(0/20) = 0
      });
    });

    /** total_pages 边界 — 刚好整除 */
    it('should calculate total_pages correctly when total divides evenly', () => {
      const result = ApiResponse.paginated([{ id: 1 }], 100, 1, 25);

      expect(result.data?.pagination.total_pages).toBe(4);
    });

    /** total_pages 边界 — 有余数 */
    it('should round up total_pages when total does not divide evenly', () => {
      const result = ApiResponse.paginated([{ id: 1 }], 101, 1, 25);

      // ceil(101/25) = ceil(4.04) = 5
      expect(result.data?.pagination.total_pages).toBe(5);
    });
  });

  describe('constructor', () => {
    /** 直接构造 */
    it('should create instance directly', () => {
      const result = new ApiResponse(200, 'OK', { foo: 'bar' });

      expect(result.code).toBe(200);
      expect(result.message).toBe('OK');
      expect(result.data).toEqual({ foo: 'bar' });
    });
  });
});
