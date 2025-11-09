const express = require('express');
const supabase = require('../db/supabaseClient');
const { adminRequired } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configurar multer para upload de imagens
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas (JPEG, PNG, GIF, WEBP)'));
  }
});

// GET: Obter todas as configurações do site (público)
router.get('/', async (req, res) => {
  try {
    console.log('[Site Settings] Buscando configurações...');
    const { data: settings, error } = await supabase
      .from('site_settings')
      .select('key, value, type')
      .order('key');

    if (error) {
      console.error('[Site Settings] Erro do Supabase:', error);
      // Se a tabela não existe, retornar objeto vazio em vez de erro
      if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('não existe')) {
        console.warn('[Site Settings] Tabela site_settings não existe. Execute o SQL em sql/add_site_settings_table.sql');
        return res.json({ settings: {} });
      }
      return res.status(500).json({ error: error.message, code: error.code });
    }

    // Converter array em objeto para facilitar o uso
    const settingsObj = {};
    (settings || []).forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        type: setting.type
      };
    });

    console.log('[Site Settings] Configurações carregadas:', Object.keys(settingsObj).length);
    res.json({ settings: settingsObj });
  } catch (err) {
    console.error('[Site Settings] Erro inesperado:', err);
    // Se for erro de tabela não encontrada, retornar objeto vazio
    if (err.message?.includes('does not exist') || err.message?.includes('relation') || err.message?.includes('não existe') || err.code === '42P01') {
      console.warn('[Site Settings] Tabela site_settings não existe. Execute o SQL em sql/add_site_settings_table.sql');
      return res.json({ settings: {} });
    }
    res.status(500).json({ error: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
});

// GET: Obter uma configuração específica (público)
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data: setting, error } = await supabase
      .from('site_settings')
      .select('key, value, type')
      .eq('key', key)
      .single();

    if (error || !setting) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json({ setting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Atualizar configuração (admin)
router.put('/:key', adminRequired, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }

    const { data: setting, error: updateError } = await supabase
      .from('site_settings')
      .update({ 
        value: value,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('key', key)
      .select()
      .single();

    if (updateError) {
      // Se não existe, criar
      if (updateError.code === 'PGRST116') {
        const { data: newSetting, error: createError } = await supabase
          .from('site_settings')
          .insert([{
            key,
            value,
            type: 'text',
            updated_by: req.user.id
          }])
          .select()
          .single();

        if (createError) {
          return res.status(500).json({ error: createError.message });
        }

        return res.json({ setting: newSetting, message: 'Configuração criada com sucesso' });
      }

      return res.status(500).json({ error: updateError.message });
    }

    res.json({ setting, message: 'Configuração atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Upload de imagem para background (admin)
router.post('/:key/upload', adminRequired, upload.single('image'), async (req, res) => {
  try {
    const { key } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    // Verificar se a configuração existe e é do tipo image
    const { data: setting } = await supabase
      .from('site_settings')
      .select('key, type')
      .eq('key', key)
      .single();

    if (!setting) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    // Upload para Supabase Storage
    const fileName = `${key}_${Date.now()}${path.extname(req.file.originalname)}`;
    const filePath = `site_settings/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product_images') // Usar o mesmo bucket ou criar um novo
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      return res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }

    // Obter URL pública da imagem
    const { data: { publicUrl } } = supabase.storage
      .from('product_images')
      .getPublicUrl(filePath);

    // Atualizar configuração com a URL da imagem
    const { data: updatedSetting, error: updateError } = await supabase
      .from('site_settings')
      .update({ 
        value: publicUrl,
        type: 'image',
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('key', key)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ 
      setting: updatedSetting, 
      image_url: publicUrl,
      message: 'Imagem enviada com sucesso' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

