# Gostinho de Casa

Site + painel para Hostinger (HTML/CSS/JS + PHP + SQLite ou MySQL). **Não usa Node.**

## Estrutura

- `index.html`, `cardapio.html`, `produto.html`, `carrinho.html`, `checkout.html` — loja
- `marmitas/` — fotos dos pratos
- `js/` — carrinho e páginas
- `admin/` — painel
- `api/` — API PHP
- `catalog.json` — cardápio público (gerado automaticamente)

## Subir na Hostinger

1. Envie **toda a pasta** para `public_html` (File Manager ou Git).
2. O banco SQLite é criado sozinho em `api/gostinho.sqlite` na primeira visita.
3. Teste: `https://seudominio.com.br/api/ping.php`
4. Painel: `https://seudominio.com.br/admin/`
5. Login: `admin@gostinhodecasa.com` / `admin123` — troque em Configurações.

No painel dá para gerenciar pedidos (kanban), cardápio, estoque, categorias, promoções, cupons, bairros, financeiro e dados da loja.

### MySQL (opcional)

Se quiser o mesmo modelo da Aurora:

1. Copie `api/config.local.example.php` para `api/config.local.php`
2. Coloque `driver => mysql` e os dados do hPanel
3. O PHP cria as tabelas na primeira chamada

## Rodar no PC

Precisa só do PHP (sem npm):

```
php -S localhost:8080
```

Abra http://localhost:8080

## Pedidos

Encomenda com 1 dia de antecedência (almoço/jantar). Ao finalizar, abre o WhatsApp.
