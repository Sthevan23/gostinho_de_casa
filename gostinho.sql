-- Gostinho de Casa — banco MySQL para Hostinger (phpMyAdmin)
-- 1. hPanel → Bancos de Dados MySQL → criar banco + usuário
-- 2. phpMyAdmin → selecionar o banco → Importar → este arquivo
-- 3. Copiar api/config.local.example.php para api/config.local.php
--    e preencher name, user, pass (driver = mysql)
-- Painel: admin@gostinhodecasa.com / admin123

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
USE `u586160337_decasa`;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS finance;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS extras;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS delivery_zones;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS settings;

CREATE TABLE settings (
  id VARCHAR(64) PRIMARY KEY,
  data TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT,
  image VARCHAR(512) DEFAULT '',
  sort_order INT DEFAULT 0,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE extras (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  price DOUBLE NOT NULL DEFAULT 0,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT,
  price DOUBLE NOT NULL DEFAULT 0,
  image VARCHAR(512) DEFAULT '',
  category_id VARCHAR(64) NOT NULL,
  ingredients TEXT,
  protein DOUBLE,
  calories DOUBLE,
  carbs DOUBLE,
  fats DOUBLE,
  weight INT,
  featured TINYINT(1) DEFAULT 0,
  promotional TINYINT(1) DEFAULT 0,
  promo_price DOUBLE,
  active TINYINT(1) DEFAULT 1,
  stock INT DEFAULT 40,
  sizes TEXT,
  extra_ids TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_zones (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  price DOUBLE NOT NULL DEFAULT 0,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coupons (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  value DOUBLE NOT NULL DEFAULT 0,
  min_order DOUBLE DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  expires_at VARCHAR(32),
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promotions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  description TEXT,
  type VARCHAR(32) DEFAULT '',
  value DOUBLE DEFAULT 0,
  image VARCHAR(512) DEFAULT '',
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id VARCHAR(64) PRIMARY KEY,
  number INT NOT NULL,
  customer_name VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  address TEXT,
  address_number VARCHAR(32) DEFAULT '',
  complement VARCHAR(191) DEFAULT '',
  neighborhood VARCHAR(191) DEFAULT '',
  delivery_type VARCHAR(32) NOT NULL,
  delivery_fee DOUBLE DEFAULT 0,
  payment_method VARCHAR(32) NOT NULL,
  change_for DOUBLE,
  notes TEXT,
  coupon_code VARCHAR(64) DEFAULT '',
  discount DOUBLE DEFAULT 0,
  subtotal DOUBLE NOT NULL,
  total DOUBLE NOT NULL,
  status VARCHAR(32) DEFAULT 'NEW',
  printed TINYINT(1) DEFAULT 0,
  scheduled_date VARCHAR(32) NOT NULL,
  scheduled_slot VARCHAR(32) DEFAULT 'ALMOCO',
  created_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64),
  product_name VARCHAR(191) NOT NULL,
  quantity INT NOT NULL,
  unit_price DOUBLE NOT NULL,
  size_name VARCHAR(64) DEFAULT '',
  extras TEXT,
  notes TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE finance (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(32) NOT NULL,
  amount DOUBLE NOT NULL DEFAULT 0,
  description TEXT,
  date VARCHAR(32) NOT NULL,
  order_id VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (id, data) VALUES ('main', '{"companyName":"Gostinho de Casa","slogan":"Comida saudável, saborosa e feita para facilitar sua rotina.","logo":"/logo.png","whatsapp":"11988887777","instagram":"https://instagram.com/gostinhodecasa","facebook":"","address":"Rua das Hortênsias, 120 — Centro","hours":"Seg a Sáb, 10h às 20h","primaryColor":"#2D6A4F","secondaryColor":"#F5F0E8","accentColor":"#C4A574","backgroundColor":"#FAF7F2","deliveryEnabled":true,"pickupEnabled":true,"minOrderValue":0,"minAdvanceDays":1,"adminEmail":"admin@gostinhodecasa.com","adminPassword":"admin123"}');

INSERT INTO categories (id,name,slug,description,image,sort_order,active) VALUES
('cat-fitness','Marmitas Fitness','fitness','Porções equilibradas para o seu treino','/marmitas/foto-26.jpg',1, 1),
('cat-caseiras','Marmitas Caseiras','caseiras','O sabor de casa, pronto para o almoço','/marmitas/foto-12.jpg',2, 1),
('cat-semana','Prato da Semana','prato-da-semana','O destaque da semana, feito sob encomenda','/marmitas/foto-24.jpg',3, 1),
('cat-combos','Combos','combos','Combos de 5, 10 e 20 marmitas','/marmitas/foto-22.jpg',4, 1),
('cat-bebidas','Bebidas','bebidas','Sucos e opções leves','https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=900&q=80',5, 1),
('cat-adicionais','Adicionais','adicionais','Complete sua marmita','/marmitas/foto-10.jpg',6, 1);

INSERT INTO extras (id,name,price,active) VALUES
('ex-ovo', 'Ovo extra', 3, 1),
('ex-arroz', 'Arroz extra', 4, 1),
('ex-batata', 'Batata doce extra', 5, 1),
('ex-queijo', 'Queijo', 4.5, 1),
('ex-molho', 'Molho extra', 2.5, 1),
('ex-salada', 'Salada extra', 4, 1);

INSERT INTO products (id,name,slug,description,price,image,category_id,ingredients,protein,calories,carbs,fats,weight,featured,promotional,promo_price,active,stock,sizes,extra_ids) VALUES
('p-frango-grelhado', 'Frango grelhado acebolado', 'frango-grelhado-acebolado', 'Peito de frango grelhado com cebola, feijão, arroz e legumes. Na marmitinha, pronto para a semana.', 24.9, '/marmitas/foto-22.jpg', 'cat-fitness', 'Frango, cebola, feijão, arroz, vagem, cenoura, cebolinha', 42, 430, 32, 12, 400, 1, 0, NULL, 1, 40, '[{"id":"s-p","name":"P 300g","price":22.9},{"id":"s-g","name":"G 450g","price":27.9}]', '["ex-ovo","ex-arroz","ex-batata","ex-queijo"]'),
('p-frango-pure', 'Frango com pimentão, arroz e purê', 'frango-com-pimentao-arroz-e-pure', 'Cubos de frango com pimentão, arroz integral e purê cremoso.', 25.9, '/marmitas/foto-26.jpg', 'cat-fitness', 'Frango, pimentão, cebola, arroz integral, batata, azeite', 38, 480, 40, 14, 420, 1, 0, NULL, 1, 40, '[]', '["ex-ovo","ex-arroz","ex-batata","ex-queijo"]'),
('p-frango-molho', 'Frango ao molho com pimentão', 'frango-ao-molho-com-pimentao', 'Frango dourado no molho, pimentões e arroz com legumes.', 24.9, '/marmitas/foto-36.jpg', 'cat-fitness', 'Frango, pimentão, cebola, arroz, cenoura, vagem, abobrinha', 40, 450, 35, 12, 400, 1, 0, NULL, 1, 40, '[]', '["ex-ovo","ex-arroz","ex-batata","ex-queijo"]'),
('p-strogonoff', 'Strogonoff fitness de frango', 'strogonoff-fitness-de-frango', 'Strogonoff leve, arroz integral e salada de cenoura com abobrinha.', 23.9, '/marmitas/foto-31.jpg', 'cat-fitness', 'Frango, creme light, arroz integral, cenoura, abobrinha', 34, 470, 40, 16, 400, 0, 1, 19.9, 1, 40, '[]', '[]'),
('p-salpicao', 'Salpicão de frango', 'salpicao-de-frango', 'Frango desfiado com cenoura e legumes, leve e saboroso.', 22.9, '/marmitas/foto-39.jpg', 'cat-fitness', 'Frango desfiado, cenoura, alho-poró, temperos', 32, 360, 18, 14, 350, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-carne-acebolada', 'Carne acebolada com farofa', 'carne-acebolada-com-farofa', 'Carne acebolada, arroz com legumes e farofa caseira.', 27.9, '/marmitas/foto-12.jpg', 'cat-caseiras', 'Carne, cebola, arroz, cenoura, farofa, ervas', NULL, NULL, NULL, NULL, NULL, 1, 0, NULL, 1, 40, '[]', '["ex-ovo","ex-arroz","ex-batata","ex-queijo"]'),
('p-carne-ensopada', 'Carne ensopada com batata', 'carne-ensopada-com-batata', 'Cubos de carne no molho, batata, cenoura, arroz e farofa.', 28.9, '/marmitas/foto-10.jpg', 'cat-caseiras', 'Carne, batata, cenoura, arroz, farofa', NULL, NULL, NULL, NULL, NULL, 1, 0, NULL, 1, 40, '[]', '["ex-ovo","ex-arroz","ex-batata","ex-queijo"]'),
('p-espaguete', 'Espaguete com almôndegas', 'espaguete-com-almondegas', 'Massa ao alho e óleo com ervas e almôndegas caseiras.', 24.9, '/marmitas/foto-20.jpg', 'cat-caseiras', 'Espaguete, carne moída, alho, azeite, ervas', NULL, NULL, NULL, NULL, NULL, 1, 0, NULL, 1, 40, '[]', '[]'),
('p-caldo-frango', 'Caldo de frango', 'caldo-de-frango', 'Caldo cremoso de frango desfiado, finalizado com cebolinha.', 16.9, '/marmitas/foto-03.jpg', 'cat-caseiras', 'Frango, caldo, cebolinha, temperos', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-caldo-verde', 'Caldo verde', 'caldo-verde', 'Caldo verde com linguiça e um fio de azeite.', 16.9, '/marmitas/foto-07.jpg', 'cat-caseiras', 'Batata, couve, linguiça, azeite', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-sopa-abobora', 'Sopa de abóbora', 'sopa-de-abobora', 'Sopa cremosa de abóbora com azeite e cebolinha.', 15.9, '/marmitas/foto-23.jpg', 'cat-caseiras', 'Abóbora, azeite, cebolinha, temperos', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-semana-frango', 'Prato da semana — frango assado', 'prato-da-semana-frango-assado', 'O destaque da semana: frango assado, arroz e legumes na marmita.', 21.9, '/marmitas/foto-24.jpg', 'cat-semana', 'Frango, arroz, vagem, cenoura', NULL, NULL, NULL, NULL, NULL, 1, 1, 18.9, 1, 40, '[]', '[]'),
('p-semana-carne', 'Prato da semana — carne ensopada', 'prato-da-semana-carne-ensopada', 'Carne ensopada com batata, arroz e farofa. Disponível nesta semana.', 24.9, '/marmitas/foto-11.jpg', 'cat-semana', 'Carne, batata, cenoura, arroz, farofa', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-combo-5', 'Combo 5 marmitas', 'combo-5-marmitas', '5 marmitas à sua escolha. Informe os sabores nas observações. Ideal para a semana.', 109.9, '/marmitas/foto-22.jpg', 'cat-combos', '5 marmitas do cardápio', NULL, NULL, NULL, NULL, NULL, 1, 1, 99.9, 1, 40, '[]', '[]'),
('p-combo-10', 'Combo 10 marmitas', 'combo-10-marmitas', '10 marmitas à sua escolha. Informe os sabores nas observações. Melhor custo-benefício.', 209.9, '/marmitas/foto-22.jpg', 'cat-combos', '10 marmitas do cardápio', NULL, NULL, NULL, NULL, NULL, 1, 0, NULL, 1, 40, '[]', '[]'),
('p-combo-20', 'Combo 20 marmitas', 'combo-20-marmitas', '20 marmitas à sua escolha. Informe os sabores nas observações. Pedido para o mês.', 389.9, '/marmitas/foto-22.jpg', 'cat-combos', '20 marmitas do cardápio', NULL, NULL, NULL, NULL, NULL, 1, 0, NULL, 1, 40, '[]', '[]'),
('p-suco-laranja', 'Suco natural de laranja', 'suco-natural-de-laranja', '300ml, feito na hora.', 8, 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=900&q=80', 'cat-bebidas', 'Laranja', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-suco-verde', 'Suco verde', 'suco-verde', 'Couve, limão, gengibre e maçã.', 10, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80', 'cat-bebidas', 'Couve, limão, gengibre, maçã', NULL, NULL, NULL, NULL, NULL, 1, 0, NULL, 1, 40, '[]', '[]'),
('p-agua-coco', 'Água de coco', 'agua-de-coco', '300ml natural.', 7, 'https://images.unsplash.com/photo-1437412061466-0b64378af2d1?auto=format&fit=crop&w=900&q=80', 'cat-bebidas', 'Água de coco', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-arroz-extra', 'Arroz extra', 'arroz-extra', 'Porção extra de arroz branco ou integral.', 4, '/marmitas/foto-21.jpg', 'cat-adicionais', 'Arroz', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]'),
('p-ovo-extra', 'Ovo extra', 'ovo-extra', 'Ovo cozido ou mexido.', 3, 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80', 'cat-adicionais', 'Ovo', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, 1, 40, '[]', '[]');

INSERT INTO delivery_zones (id,name,price,active) VALUES
('z-centro', 'Centro', 5, 1),
('z-saojose', 'São José', 7, 1),
('z-santaclara', 'Santa Clara', 8, 1),
('z-jardim', 'Jardim América', 9, 1),
('z-vilanova', 'Vila Nova', 6, 1);

INSERT INTO coupons (id,code,type,value,min_order,max_uses,used_count,expires_at,active) VALUES
('c-bemvindo', 'BEMVINDO10', 'percent', 10, 40, 100, 0, '2026-12-31', 1),
('c-frete', 'FRETE5', 'fixed', 5, 50, 200, 0, NULL, 1);

INSERT INTO promotions (id,name,description,type,value,image,active) VALUES
('promo-combo', 'Combo 5 marmitas por R$ 99,90', 'Monte 5 marmitas da semana e economize.', 'combo', 99.9, '/marmitas/foto-22.jpg', 1),
('promo-semana', 'Prato da semana', 'Frango assado com acompanhamento por R$ 18,90.', 'product', 18.9, '/marmitas/foto-24.jpg', 1);

INSERT INTO reviews (id,name,rating,comment,active) VALUES
('r1', 'Camila R.', 5, 'Sabor de comida de verdade. Peço toda semana.', 1),
('r2', 'Pedro Henrique', 5, 'A fitness de frango é perfeita pós-treino.', 1),
('r3', 'Ana Luiza', 4, 'Entrega rápida e marmita bem montada.', 1),
('r4', 'Rafael M.', 5, 'O combo da semana salvou meus almoços.', 1);

SET FOREIGN_KEY_CHECKS = 1;
