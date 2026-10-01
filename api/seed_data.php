<?php

function gostinho_default_data(): array {
  $unsplash = fn(string $id) => "https://images.unsplash.com/photo-{$id}?auto=format&fit=crop&w=900&q=80";
  $foto = fn(int $n) => '/marmitas/foto-' . str_pad((string) $n, 2, '0', STR_PAD_LEFT) . '.jpg';

  $extras = [
    ['id' => 'ex-ovo', 'name' => 'Ovo extra', 'price' => 2, 'active' => true],
    ['id' => 'ex-arroz', 'name' => 'Arroz extra', 'price' => 4, 'active' => true],
    ['id' => 'ex-batata', 'name' => 'Batata frita', 'price' => 5, 'active' => true],
    ['id' => 'ex-carne', 'name' => 'Carne extra', 'price' => 7, 'active' => true],
    ['id' => 'ex-queijo', 'name' => 'Queijo', 'price' => 4.5, 'active' => true],
    ['id' => 'ex-molho', 'name' => 'Molho extra', 'price' => 2.5, 'active' => true],
    ['id' => 'ex-salada', 'name' => 'Salada extra', 'price' => 4, 'active' => true],
  ];
  $extraIds = array_column(array_slice($extras, 0, 4), 'id');

  $categories = [
    ['id' => 'cat-fitness', 'name' => 'Marmitas Fitness', 'slug' => 'fitness', 'description' => 'Porções equilibradas para o seu treino', 'image' => $foto(26), 'sortOrder' => 1, 'active' => true],
    ['id' => 'cat-caseiras', 'name' => 'Marmitas Caseiras', 'slug' => 'caseiras', 'description' => 'O sabor de casa, pronto para o almoço', 'image' => $foto(12), 'sortOrder' => 2, 'active' => true],
    ['id' => 'cat-semana', 'name' => 'Prato da Semana', 'slug' => 'prato-da-semana', 'description' => 'O destaque da semana, feito sob encomenda', 'image' => $foto(24), 'sortOrder' => 3, 'active' => true],
    ['id' => 'cat-combos', 'name' => 'Combos', 'slug' => 'combos', 'description' => 'Combos de 5, 10 e 20 marmitas', 'image' => $foto(22), 'sortOrder' => 4, 'active' => true],
    ['id' => 'cat-bebidas', 'name' => 'Bebidas', 'slug' => 'bebidas', 'description' => 'Sucos e opções leves', 'image' => $unsplash('1505253758473-96b7015fcd40'), 'sortOrder' => 5, 'active' => true],
    ['id' => 'cat-adicionais', 'name' => 'Adicionais', 'slug' => 'adicionais', 'description' => 'Complete sua marmita', 'image' => $foto(10), 'sortOrder' => 6, 'active' => true],
  ];

  $products = [
    ['id' => 'p-frango-grelhado', 'name' => 'Frango grelhado acebolado', 'slug' => 'frango-grelhado-acebolado', 'description' => 'Peito de frango grelhado com cebola, feijão, arroz e legumes. Na marmitinha, pronto para a semana.', 'price' => 24.9, 'image' => $foto(22), 'categoryId' => 'cat-fitness', 'ingredients' => 'Frango, cebola, feijão, arroz, vagem, cenoura, cebolinha', 'protein' => 42, 'calories' => 430, 'carbs' => 32, 'fats' => 12, 'weight' => 400, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [['id' => 's-p', 'name' => 'P 300g', 'price' => 22.9], ['id' => 's-g', 'name' => 'G 450g', 'price' => 27.9]], 'extraIds' => $extraIds],
    ['id' => 'p-frango-pure', 'name' => 'Frango com pimentão, arroz e purê', 'slug' => 'frango-com-pimentao-arroz-e-pure', 'description' => 'Cubos de frango com pimentão, arroz integral e purê cremoso.', 'price' => 25.9, 'image' => $foto(26), 'categoryId' => 'cat-fitness', 'ingredients' => 'Frango, pimentão, cebola, arroz integral, batata, azeite', 'protein' => 38, 'calories' => 480, 'carbs' => 40, 'fats' => 14, 'weight' => 420, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => $extraIds],
    ['id' => 'p-frango-molho', 'name' => 'Frango ao molho com pimentão', 'slug' => 'frango-ao-molho-com-pimentao', 'description' => 'Frango dourado no molho, pimentões e arroz com legumes.', 'price' => 24.9, 'image' => $foto(36), 'categoryId' => 'cat-fitness', 'ingredients' => 'Frango, pimentão, cebola, arroz, cenoura, vagem, abobrinha', 'protein' => 40, 'calories' => 450, 'carbs' => 35, 'fats' => 12, 'weight' => 400, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => $extraIds],
    ['id' => 'p-strogonoff', 'name' => 'Strogonoff fitness de frango', 'slug' => 'strogonoff-fitness-de-frango', 'description' => 'Strogonoff leve, arroz integral e salada de cenoura com abobrinha.', 'price' => 23.9, 'image' => $foto(31), 'categoryId' => 'cat-fitness', 'ingredients' => 'Frango, creme light, arroz integral, cenoura, abobrinha', 'protein' => 34, 'calories' => 470, 'carbs' => 40, 'fats' => 16, 'weight' => 400, 'featured' => false, 'promotional' => true, 'promoPrice' => 19.9, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-salpicao', 'name' => 'Salpicão de frango', 'slug' => 'salpicao-de-frango', 'description' => 'Frango desfiado com cenoura e legumes, leve e saboroso.', 'price' => 22.9, 'image' => $foto(39), 'categoryId' => 'cat-fitness', 'ingredients' => 'Frango desfiado, cenoura, alho-poró, temperos', 'protein' => 32, 'calories' => 360, 'carbs' => 18, 'fats' => 14, 'weight' => 350, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-carne-acebolada', 'name' => 'Carne acebolada com farofa', 'slug' => 'carne-acebolada-com-farofa', 'description' => 'Carne acebolada, arroz com legumes e farofa caseira.', 'price' => 27.9, 'image' => $foto(12), 'categoryId' => 'cat-caseiras', 'ingredients' => 'Carne, cebola, arroz, cenoura, farofa, ervas', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => $extraIds],
    ['id' => 'p-carne-ensopada', 'name' => 'Carne ensopada com batata', 'slug' => 'carne-ensopada-com-batata', 'description' => 'Cubos de carne no molho, batata, cenoura, arroz e farofa.', 'price' => 28.9, 'image' => $foto(10), 'categoryId' => 'cat-caseiras', 'ingredients' => 'Carne, batata, cenoura, arroz, farofa', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => $extraIds],
    ['id' => 'p-espaguete', 'name' => 'Espaguete com almôndegas', 'slug' => 'espaguete-com-almondegas', 'description' => 'Massa ao alho e óleo com ervas e almôndegas caseiras.', 'price' => 24.9, 'image' => $foto(20), 'categoryId' => 'cat-caseiras', 'ingredients' => 'Espaguete, carne moída, alho, azeite, ervas', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-caldo-frango', 'name' => 'Caldo de frango', 'slug' => 'caldo-de-frango', 'description' => 'Caldo cremoso de frango desfiado, finalizado com cebolinha.', 'price' => 16.9, 'image' => $foto(3), 'categoryId' => 'cat-caseiras', 'ingredients' => 'Frango, caldo, cebolinha, temperos', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-caldo-verde', 'name' => 'Caldo verde', 'slug' => 'caldo-verde', 'description' => 'Caldo verde com linguiça e um fio de azeite.', 'price' => 16.9, 'image' => $foto(7), 'categoryId' => 'cat-caseiras', 'ingredients' => 'Batata, couve, linguiça, azeite', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-sopa-abobora', 'name' => 'Sopa de abóbora', 'slug' => 'sopa-de-abobora', 'description' => 'Sopa cremosa de abóbora com azeite e cebolinha.', 'price' => 15.9, 'image' => $foto(23), 'categoryId' => 'cat-caseiras', 'ingredients' => 'Abóbora, azeite, cebolinha, temperos', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-semana-frango', 'name' => 'Prato da semana — frango assado', 'slug' => 'prato-da-semana-frango-assado', 'description' => 'O destaque da semana: frango assado, arroz e legumes na marmita.', 'price' => 21.9, 'image' => $foto(24), 'categoryId' => 'cat-semana', 'ingredients' => 'Frango, arroz, vagem, cenoura', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => true, 'promoPrice' => 18.9, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-semana-carne', 'name' => 'Prato da semana — carne ensopada', 'slug' => 'prato-da-semana-carne-ensopada', 'description' => 'Carne ensopada com batata, arroz e farofa. Disponível nesta semana.', 'price' => 24.9, 'image' => $foto(11), 'categoryId' => 'cat-semana', 'ingredients' => 'Carne, batata, cenoura, arroz, farofa', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-combo-5', 'name' => 'Combo 5 marmitas', 'slug' => 'combo-5-marmitas', 'description' => '5 marmitas à sua escolha. Informe os sabores nas observações. Ideal para a semana.', 'price' => 109.9, 'image' => $foto(22), 'categoryId' => 'cat-combos', 'ingredients' => '5 marmitas do cardápio', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => true, 'promoPrice' => 99.9, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-combo-10', 'name' => 'Combo 10 marmitas', 'slug' => 'combo-10-marmitas', 'description' => '10 marmitas à sua escolha. Informe os sabores nas observações. Melhor custo-benefício.', 'price' => 209.9, 'image' => $foto(22), 'categoryId' => 'cat-combos', 'ingredients' => '10 marmitas do cardápio', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-combo-20', 'name' => 'Combo 20 marmitas', 'slug' => 'combo-20-marmitas', 'description' => '20 marmitas à sua escolha. Informe os sabores nas observações. Pedido para o mês.', 'price' => 389.9, 'image' => $foto(22), 'categoryId' => 'cat-combos', 'ingredients' => '20 marmitas do cardápio', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-suco-laranja', 'name' => 'Suco natural de laranja', 'slug' => 'suco-natural-de-laranja', 'description' => '300ml, feito na hora.', 'price' => 8, 'image' => $unsplash('1505253758473-96b7015fcd40'), 'categoryId' => 'cat-bebidas', 'ingredients' => 'Laranja', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-suco-verde', 'name' => 'Suco verde', 'slug' => 'suco-verde', 'description' => 'Couve, limão, gengibre e maçã.', 'price' => 10, 'image' => $unsplash('1513558161293-cdaf765ed2fd'), 'categoryId' => 'cat-bebidas', 'ingredients' => 'Couve, limão, gengibre, maçã', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => true, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-agua-coco', 'name' => 'Água de coco', 'slug' => 'agua-de-coco', 'description' => '300ml natural.', 'price' => 7, 'image' => $unsplash('1437412061466-0b64378af2d1'), 'categoryId' => 'cat-bebidas', 'ingredients' => 'Água de coco', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-arroz-extra', 'name' => 'Arroz extra', 'slug' => 'arroz-extra', 'description' => 'Porção extra de arroz branco ou integral.', 'price' => 4, 'image' => $foto(21), 'categoryId' => 'cat-adicionais', 'ingredients' => 'Arroz', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
    ['id' => 'p-ovo-extra', 'name' => 'Ovo extra', 'slug' => 'ovo-extra', 'description' => 'Ovo cozido ou mexido.', 'price' => 3, 'image' => $unsplash('1482049016688-2d3e1b311543'), 'categoryId' => 'cat-adicionais', 'ingredients' => 'Ovo', 'protein' => null, 'calories' => null, 'carbs' => null, 'fats' => null, 'weight' => null, 'featured' => false, 'promotional' => false, 'promoPrice' => null, 'active' => true, 'stock' => 40, 'sizes' => [], 'extraIds' => []],
  ];

  return [
    'settings' => [
      'companyName' => 'Gostinho de Casa',
      'slogan' => 'Comida saudável, saborosa e feita para facilitar sua rotina.',
      'logo' => '/logo.png',
      'whatsapp' => '11988887777',
      'instagram' => 'https://instagram.com/gostinhodecasa',
      'facebook' => '',
      'address' => 'Rua das Hortênsias, 120 — Centro',
      'hours' => 'Seg a Sáb, 10h às 20h',
      'primaryColor' => '#2D6A4F',
      'secondaryColor' => '#F5F0E8',
      'accentColor' => '#C4A574',
      'backgroundColor' => '#FAF7F2',
      'deliveryEnabled' => true,
      'pickupEnabled' => true,
      'minOrderValue' => 0,
      'minAdvanceDays' => 1,
      'freeDeliveryMin' => 80,
      'deliveryMode' => 'neighborhood',
      'fixedDeliveryFee' => 8,
      'loyaltyEnabled' => true,
      'loyaltyPerReal' => 1,
      'loyaltyRedeemPoints' => 500,
      'loyaltyRedeemValue' => 10,
      'pixKey' => '11988887777',
      'adminEmail' => 'admin@gostinhodecasa.com',
      'adminPassword' => 'admin123',
    ],
    'categories' => $categories,
    'products' => $products,
    'extras' => $extras,
    'zones' => [
      ['id' => 'z-centro', 'name' => 'Centro', 'price' => 5, 'active' => true],
      ['id' => 'z-saojose', 'name' => 'São José', 'price' => 7, 'active' => true],
      ['id' => 'z-santaclara', 'name' => 'Santa Clara', 'price' => 8, 'active' => true],
      ['id' => 'z-jardim', 'name' => 'Jardim América', 'price' => 9, 'active' => true],
      ['id' => 'z-vilanova', 'name' => 'Vila Nova', 'price' => 6, 'active' => true],
    ],
    'coupons' => [
      ['id' => 'c-bemvindo', 'code' => 'BEMVINDO10', 'type' => 'percent', 'value' => 10, 'minOrder' => 40, 'maxUses' => 100, 'usedCount' => 0, 'expiresAt' => '2026-12-31', 'active' => true],
      ['id' => 'c-frete', 'code' => 'FRETE5', 'type' => 'fixed', 'value' => 5, 'minOrder' => 50, 'maxUses' => 200, 'usedCount' => 0, 'expiresAt' => null, 'active' => true],
      ['id' => 'c-gostinho10', 'code' => 'GOSTINHO10', 'type' => 'percent', 'value' => 10, 'minOrder' => 40, 'maxUses' => 200, 'usedCount' => 0, 'expiresAt' => '2026-12-31', 'active' => true],
      ['id' => 'c-primeira', 'code' => 'PRIMEIRACOMPRA', 'type' => 'fixed', 'value' => 10, 'minOrder' => 30, 'maxUses' => 500, 'usedCount' => 0, 'expiresAt' => '2026-12-31', 'active' => true],
    ],
    'promotions' => [
      ['id' => 'promo-combo', 'name' => 'Combo 5 marmitas por R$ 99,90', 'description' => 'Monte 5 marmitas da semana e economize.', 'type' => 'combo', 'value' => 99.9, 'image' => $foto(22), 'active' => true],
      ['id' => 'promo-semana', 'name' => 'Prato da semana', 'description' => 'Frango assado com acompanhamento por R$ 18,90.', 'type' => 'product', 'value' => 18.9, 'image' => $foto(24), 'active' => true],
    ],
    'reviews' => [
      ['id' => 'r1', 'name' => 'Camila R.', 'rating' => 5, 'comment' => 'Sabor de comida de verdade. Peço toda semana.', 'active' => true],
      ['id' => 'r2', 'name' => 'Pedro Henrique', 'rating' => 5, 'comment' => 'A fitness de frango é perfeita pós-treino.', 'active' => true],
      ['id' => 'r3', 'name' => 'Ana Luiza', 'rating' => 4, 'comment' => 'Entrega rápida e marmita bem montada.', 'active' => true],
      ['id' => 'r4', 'name' => 'Rafael M.', 'rating' => 5, 'comment' => 'O combo da semana salvou meus almoços.', 'active' => true],
    ],
  ];
}
