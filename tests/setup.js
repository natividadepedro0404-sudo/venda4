require('dotenv').config({ path: '.env.test' });

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn(() => ({ publicURL: 'https://example.com/test.jpg' }))
    }))
  }
};

jest.mock('../src/db/supabaseClient', () => mockSupabase);