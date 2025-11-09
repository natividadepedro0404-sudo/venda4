const express = require('express');
const multer = require('multer');
const supabase = require('../db/supabaseClient');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5 } });

// Helper: gera signed URL (fallback para publicURL)
async function makeAccessibleUrl(key) {
  try {
    if (!key) return null;
    // se já for uma URL, retorna ela
    if (typeof key === 'string' && /^(http|https):\/\//.test(key)) return key;

    // Primeiro tenta public URL (sempre funciona, mesmo com anon key)
    const pub = supabase.storage.from('product_images').getPublicUrl(key);
    console.log('Public URL response para', key, ':', JSON.stringify(pub));
    if (pub?.data?.publicUrl) {
      console.log('Usando public URL para', key);
      return pub.data.publicUrl;
    } else if (pub?.publicURL) {
      // Fallback para formato antigo
      console.log('Usando public URL (formato antigo) para', key);
      return pub.publicURL;
    }

    // Se public URL não funcionar, tenta signed URL (requer service role key)
    const expiresIn = 60 * 60; // 1 hora
    const { data: signed, error: signErr } = await supabase.storage.from('product_images').createSignedUrl(key, expiresIn);
    
    if (signErr) {
      console.error('Erro ao criar signed URL para', key, ':', signErr);
      // Se não conseguir criar signed URL, retorna a public URL mesmo assim
      // (pode não funcionar se o bucket for privado, mas é melhor que nada)
      return pub?.data?.publicUrl || pub?.publicURL || null;
    } else if (signed?.signedURL) {
      console.log('Signed URL gerada com sucesso para', key);
      return signed.signedURL;
    } else {
      console.warn('Signed URL não retornada para', key, 'resposta:', signed);
      return pub?.data?.publicUrl || pub?.publicURL || null;
    }
  } catch (e) {
    console.error('Erro ao gerar URL para', key, ':', e.message || e, e);
    // Última tentativa: retorna public URL mesmo com erro
    try {
      const pub = supabase.storage.from('product_images').getPublicUrl(key);
      return pub?.data?.publicUrl || pub?.publicURL || null;
    } catch (e2) {
      console.error('Erro ao obter public URL como fallback:', e2);
      return null;
    }
  }
}

// Helper: converte product (com keys) para product com URLs em images e image (primeira)
async function productWithAccessibleImages(product) {
  const clone = { ...product };
  if (Array.isArray(clone.images) && clone.images.length) {
    const urls = await Promise.all(clone.images.map(async imgKey => {
      const url = await makeAccessibleUrl(imgKey);
      if (!url) {
        console.warn('Não foi possível gerar URL para a imagem:', imgKey);
      }
      return url;
    }));
    clone.images = urls.filter(Boolean);
  } else {
    clone.images = [];
  }
  clone.image = clone.images.length ? clone.images[0] : null;
  if (!clone.image && clone.images && clone.images.length > 0) {
    console.warn('Produto sem imagem principal, mas tem imagens no array:', clone.id, clone.images);
  }
  return clone;
}

// Admin: create product with up to 5 images
router.post('/', adminRequired, upload.array('images', 5), async (req, res) => {
  try {
    // Debug logs to help identify if files are being received
    console.log('POST /api/products - received files length:', req.files?.length || 0);
    if (req.files && req.files.length) {
      console.log('Uploaded filenames:', req.files.map(f => f.originalname));
    }

    const { name, description, price, stock, type, color, sizes, brand } = req.body;
    
    // Processar tamanhos - pode vir como array ou string
    let sizesArray = [];
    if (sizes) {
      if (Array.isArray(sizes)) {
        sizesArray = sizes;
      } else if (typeof sizes === 'string') {
        sizesArray = [sizes];
      }
    }
    
    const productInsert = { 
      name, 
      description, 
      price: Number(price || 0), 
      stock: Number(stock || 0),
      type: type || null,
      color: color || null,
      brand: brand || null,
      sizes: sizesArray.length > 0 ? sizesArray : []
    };
    
    const { data: prod, error: prodErr } = await supabase.from('products').insert([productInsert]).select().single();
    if (prodErr) return res.status(400).json({ error: prodErr.message });

    const files = req.files || [];
    const imageKeys = [];

    // If there are files, try to upload each and fail-fast on error so the client gets clear feedback
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.originalname && f.originalname.split('.').pop()) || 'jpg';
      const key = `products/${prod.id}/${Date.now()}_${i}.${ext}`;

      // Attempt upload
      const result = await supabase.storage.from('product_images').upload(key, f.buffer, { contentType: f.mimetype });

      if (result.error) {
        // Log full error and return to client so it's visible (avoid silently continuing)
        console.error('Erro upload imagem', result.error);
        // Consider removing the created product or letting client retry; for now, return an error
        return res.status(500).json({ error: 'Erro ao fazer upload das imagens', detail: result.error });
      }

      // armazenamos a key (para gerar signed URL depois)
      imageKeys.push(key);
    }

    if (imageKeys.length) {
      const { error: updErr } = await supabase.from('products').update({ images: imageKeys }).eq('id', prod.id);
      if (updErr) {
        console.error('Erro ao atualizar product.images:', updErr);
        return res.status(500).json({ error: 'Produto criado mas falha ao salvar imagens', detail: updErr });
      }
    }

    // Buscar o produto atualizado e converter keys => URLs antes de retornar ao cliente
    const { data: updated, error: fetchErr } = await supabase.from('products').select('*').eq('id', prod.id).single();
    if (fetchErr) {
      console.error('Erro ao buscar produto atualizado:', fetchErr);
      return res.status(500).json({ error: fetchErr.message });
    }

    console.log('Produto atualizado antes de converter imagens:', { id: updated.id, images: updated.images });
    const productWithUrls = await productWithAccessibleImages(updated);
    console.log('Produto após converter imagens:', { id: productWithUrls.id, images: productWithUrls.images, image: productWithUrls.image });
    res.json({ product: productWithUrls });
  } catch (err) {
    console.error('POST /api/products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Public: list products (retorna imagens como URLs acessíveis)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('products').select('*');
    
    // Filtrar por marca se fornecido
    const brand = req.query.brand;
    if (brand) {
      query = query.eq('brand', brand);
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const products = await Promise.all((data || []).map(async p => {
      return await productWithAccessibleImages(p);
    }));

    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get single product by id (retorna product com images/url)
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'ID do produto inválido' });

    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) {
      // Supabase returns error when no rows; handle not found
      if (error.code === 'PGRST116' || error.code === 'PGRST117' || /No rows/.test(error.message)) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: 'Produto não encontrado' });

    const product = await productWithAccessibleImages(data);
    res.json({ product });
  } catch (err) {
    console.error('GET /api/products/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, price, stock, type, color, sizes, brand } = req.body;
    
    // Construir objeto de mudanças apenas com campos válidos
    const changes = {};
    
    if (name !== undefined) changes.name = name;
    if (description !== undefined) changes.description = description;
    if (price !== undefined) changes.price = Number(price || 0);
    if (stock !== undefined) changes.stock = Number(stock || 0);
    if (type !== undefined) changes.type = type || null;
    if (color !== undefined) changes.color = color || null;
    if (brand !== undefined) changes.brand = brand || null;
    
    // Processar tamanhos - sempre garantir que seja um array
    if (sizes !== undefined) {
      if (Array.isArray(sizes)) {
        changes.sizes = sizes;
      } else if (typeof sizes === 'string') {
        changes.sizes = sizes ? [sizes] : [];
      } else {
        changes.sizes = [];
      }
    }
    
    const { data, error } = await supabase.from('products').update(changes).eq('id', id).select().single();
    if (error) {
      console.error('Erro ao atualizar produto:', error);
      return res.status(400).json({ error: error.message });
    }

    try {
      const product = await productWithAccessibleImages(data);
      res.json({ product });
    } catch (e) {
      console.error('Erro ao processar imagens do produto atualizado:', e);
      res.json({ product: data });
    }
  } catch (err) {
    console.error('PUT /api/products/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete product
router.delete('/:id', adminRequired, async (req, res) => {
  const id = req.params.id;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;