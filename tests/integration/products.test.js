const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const supabase = require('../../src/db/supabaseClient');

describe('Products API', () => {
  let adminToken;
  let customerToken;

  beforeEach(() => {
    // Create test tokens
    adminToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET);
    customerToken = jwt.sign({ id: 2, email: 'user@test.com', role: 'customer' }, process.env.JWT_SECRET);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('should list products without auth', async () => {
      const mockProducts = [
        { id: 1, name: 'Test Product', price: 99.99, stock: 10 },
        { id: 2, name: 'Another Product', price: 149.99, stock: 5 }
      ];

      supabase.from().select.mockResolvedValueOnce({ data: mockProducts, error: null });

      const res = await request(app)
        .get('/api/products')
        .expect(200);

      expect(res.body.products).toEqual(mockProducts);
    });
  });

  describe('POST /api/products', () => {
    it('should create product when admin', async () => {
      const mockProduct = {
        id: 1,
        name: 'New Product',
        description: 'Test description',
        price: 99.99,
        stock: 10
      };

      supabase.from().insert.mockResolvedValueOnce({ 
        data: mockProduct,
        error: null 
      });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', mockProduct.name)
        .field('description', mockProduct.description)
        .field('price', mockProduct.price)
        .field('stock', mockProduct.stock)
        .expect(200);

      expect(res.body.product).toEqual(mockProduct);
    });

    it('should reject product creation without admin token', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('name', 'Test')
        .expect(403);
    });

    it('should validate required product fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product when admin', async () => {
      const mockProduct = {
        id: 1,
        name: 'Updated Product',
        price: 149.99
      };

      supabase.from().update.mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      const res = await request(app)
        .put('/api/products/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mockProduct)
        .expect(200);

      expect(res.body.product).toEqual(mockProduct);
    });

    it('should reject product update without admin token', async () => {
      await request(app)
        .put('/api/products/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product when admin', async () => {
      supabase.from().delete.mockResolvedValueOnce({
        error: null
      });

      await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject product deletion without admin token', async () => {
      await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});