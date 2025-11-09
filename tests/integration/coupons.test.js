const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const supabase = require('../../src/db/supabaseClient');

describe('Coupons API', () => {
  let adminToken;
  let customerToken;

  beforeEach(() => {
    // Create test tokens
    adminToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET);
    customerToken = jwt.sign({ id: 2, email: 'user@test.com', role: 'customer' }, process.env.JWT_SECRET);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/coupons/validate', () => {
    it('should validate valid coupon', async () => {
      const mockCoupon = {
        id: 1,
        code: 'TEST10',
        type: 'percentage',
        value: 10,
        expires_at: new Date(Date.now() + 86400000).toISOString()
      };

      supabase.from().select.mockResolvedValueOnce({
        data: mockCoupon,
        error: null
      });

      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'TEST10' })
        .expect(200);

      expect(res.body.coupon).toEqual(mockCoupon);
    });

    it('should reject expired coupon', async () => {
      supabase.from().select.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const res = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'EXPIRED' })
        .expect(404);

      expect(res.body.error).toBeDefined();
    });

    it('should require auth to validate coupon', async () => {
      await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'TEST10' })
        .expect(401);
    });
  });

  describe('GET /api/coupons', () => {
    it('should list coupons when admin', async () => {
      const mockCoupons = [
        { id: 1, code: 'TEST10', type: 'percentage', value: 10 },
        { id: 2, code: 'FIXED20', type: 'fixed', value: 20 }
      ];

      supabase.from().select.mockResolvedValueOnce({
        data: mockCoupons,
        error: null
      });

      const res = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.coupons).toEqual(mockCoupons);
    });

    it('should reject coupon list without admin token', async () => {
      await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('POST /api/coupons', () => {
    it('should create coupon when admin', async () => {
      const mockCoupon = {
        code: 'NEW10',
        type: 'percentage',
        value: 10,
        expires_at: '2025-12-31'
      };

      supabase.from().insert.mockResolvedValueOnce({
        data: { id: 1, ...mockCoupon },
        error: null
      });

      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockCoupon)
        .expect(200);

      expect(res.body.coupon.code).toBe(mockCoupon.code);
    });

    it('should validate required coupon fields', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/coupons/:id', () => {
    it('should update coupon when admin', async () => {
      const mockCoupon = {
        id: 1,
        code: 'UPDATE10',
        value: 15
      };

      supabase.from().update.mockResolvedValueOnce({
        data: mockCoupon,
        error: null
      });

      const res = await request(app)
        .put('/api/coupons/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockCoupon)
        .expect(200);

      expect(res.body.coupon).toEqual(mockCoupon);
    });
  });

  describe('DELETE /api/coupons/:id', () => {
    it('should delete coupon when admin', async () => {
      supabase.from().delete.mockResolvedValueOnce({
        error: null
      });

      await request(app)
        .delete('/api/coupons/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});