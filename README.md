# Mapa Acessível

Aplicação web colaborativa para encontrar e compartilhar lugares e informações de acessibilidade. O mapa permite pesquisar locais, filtrar recursos, consultar detalhes e cadastrar novos lugares. O frontend usa React, TypeScript, Leaflet e OpenStreetMap; a API usa TypeScript, Express e SQLite em uma estrutura MVC simples. A autoria é atribuída a um usuário mockado; cadastro e login ainda não fazem parte do projeto.

## Requisitos

- Node.js 20 ou superior
- npm
- Frontend: React, TypeScript, Vite, Leaflet e React Leaflet

## Executar o backend

Abra um terminal na pasta raiz do projeto. Na primeira execução, instale as dependências e crie o arquivo local de configuração:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

A API inicia em `http://localhost:8080`, conforme `PORT` no `.env`. O banco SQLite é criado automaticamente em `data/accessibility.sqlite`.

Para gerar JavaScript compilado e executar:

```powershell
npm run build
npm start
```

Para executar os testes básicos da API:

```powershell
npm test
```

## Executar o frontend

Mantenha o backend rodando e abra um segundo terminal na pasta `frontend/`. Na primeira execução, instale as dependências. O endereço padrão da API é `http://localhost:8080`, definido em `frontend/.env.example`.

```powershell
cd frontend
npm install
npm run dev
```

Abra o endereço local informado pelo Vite, normalmente `http://localhost:5173`.

### Iniciar os dois serviços

Use dois terminais: primeiro rode `npm run dev` na raiz para iniciar a API; depois rode `cd frontend` e `npm run dev` no segundo terminal. O frontend consome a API e usa `GET /api/geocoding/search` para sugerir endereços. Depois que a pessoa escolher um resultado, o cadastro envia o local e os recursos ao `POST /api/places`.

## Endpoints

- `GET /health` — verificação de disponibilidade.
- `GET /api/geocoding/search?q=...` — busca sugestões de endereço e coordenadas. Essa chamada não cadastra o lugar.
- `GET /api/accessibility-features` — catálogo de tipos de acessibilidade.
- `GET /api/places` — lista de lugares.
- `GET /api/places/:id` — detalhes do lugar, incluindo seus recursos.
- `POST /api/places` — cria lugar e recursos.
- `PUT /api/places/:id` — substitui dados do lugar e sua lista de recursos.
- `DELETE /api/places/:id` — remove lugar e seus recursos.

Filtros para `GET /api/places`: `q`, `category`, `feature`, `status`. Exemplo: `/api/places?feature=ramp&status=available`.

## Exemplos com cURL

No Windows PowerShell, use `curl.exe` (em vez do alias `curl`). Inicie o servidor antes dos exemplos:

```powershell
npm run dev
```

Defina o endereço base:

```powershell
$base = "http://localhost:8080"
```

### Verificar servidor

```powershell
curl.exe "$base/health"
```

### Pesquisar um endereço (geocodificação)

Esta chamada é independente do cadastro. O frontend deve mostrar as sugestões para a pessoa escolher; depois, envia a sugestão escolhida ao `POST /api/places` com os demais dados do lugar.

```powershell
curl.exe --get "$base/api/geocoding/search" --data-urlencode "q=MASP, Avenida Paulista, São Paulo"
```

Resposta resumida:

```json
{
  "data": [
    {
      "displayName": "Museu de Arte de São Paulo Assis Chateaubriand, ...",
      "latitude": -23.5614,
      "longitude": -46.6559
    }
  ],
  "attribution": "Geocodificação por OpenStreetMap contributors (Nominatim)."
}
```

Se não encontrar correspondências, `data` será uma lista vazia. A busca aceita entre 3 e 200 caracteres.

**Importante:** a integração com a instância pública do Nominatim é voltada a consultas pontuais feitas pela pessoa, não a busca automática a cada tecla. O backend limita as consultas a uma por segundo por instância e mantém resultados em cache por 10 minutos. Para produção ou mais tráfego, use um provedor contratado ou hospede uma instância própria. Mantenha a atribuição ao OpenStreetMap visível no mapa/interface.

### Listar tipos de acessibilidade

```powershell
curl.exe "$base/api/accessibility-features"
```

### Listar todos os lugares

```powershell
curl.exe "$base/api/places"
```

### Buscar lugares por texto ou categoria

```powershell
curl.exe "$base/api/places?q=biblioteca"
curl.exe "$base/api/places?category=library"
```

### Filtrar por acessibilidade

```powershell
curl.exe "$base/api/places?feature=ramp"
curl.exe "$base/api/places?feature=ramp&status=available"
curl.exe "$base/api/places?status=unknown"
```

Valores aceitos para `status`: `available`, `unavailable` e `unknown`. Os `feature` válidos podem ser consultados no catálogo.

### Criar um lugar

```powershell
$body = @'
{
  "name": "Biblioteca Central",
  "category": "library",
  "description": "Biblioteca pública",
  "address": "Rua Exemplo, 100",
  "latitude": -23.55,
  "longitude": -46.63,
  "accessibilityFeatures": [
    { "type": "ramp", "status": "available", "notes": "Na entrada principal" },
    { "type": "accessible_bathroom", "status": "unknown" },
    { "type": "braille_menu", "status": "unavailable", "notes": "Ainda não oferece" }
  ]
}
'@
curl.exe -X POST "$base/api/places" `
  -H "Content-Type: application/json" `
  -d $body
```

O retorno inclui o `id` atribuído ao lugar. Use esse identificador nos próximos comandos; neste exemplo, substitua `1` se o retorno mostrar outro id.

### Consultar um lugar e seus recursos

```powershell
curl.exe "$base/api/places/1"
```

### Atualizar lugar e lista de recursos

`PUT` substitui os dados do lugar e a lista inteira de recursos. Envie `accessibilityFeatures: []` para remover todos os recursos associados.

```powershell
$body = @'
{
  "name": "Biblioteca Central - entrada norte",
  "category": "library",
  "description": "Biblioteca pública, entrada atualizada",
  "address": "Rua Exemplo, 120",
  "latitude": -23.5501,
  "longitude": -46.6301,
  "accessibilityFeatures": [
    { "type": "ramp", "status": "available", "notes": "Entrada norte" },
    { "type": "elevator", "status": "available" },
    { "type": "accessible_bathroom", "status": "unavailable", "notes": "Em manutenção" }
  ]
}
'@
curl.exe -X PUT "$base/api/places/1" `
  -H "Content-Type: application/json" `
  -d $body
```

### Excluir lugar

Esta operação remove também os recursos de acessibilidade associados.

```powershell
curl.exe -i -X DELETE "$base/api/places/1"
```

Uma exclusão bem-sucedida retorna HTTP `204` sem corpo.

### Fazer as chamadas em macOS ou Linux

Troque `curl.exe` por `curl` e, se usar várias linhas, troque a crase de continuação do PowerShell por `\`.

## Exemplo de criação

```json
{
  "name": "Biblioteca Central",
  "category": "library",
  "description": "Biblioteca pública",
  "address": "Rua Exemplo, 100",
  "latitude": -23.55,
  "longitude": -46.63,
  "accessibilityFeatures": [
    { "type": "ramp", "status": "available", "notes": "Na entrada principal" },
    { "type": "accessible_bathroom", "status": "unknown" },
    { "type": "braille_menu", "status": "unavailable", "notes": "Ainda não oferece" }
  ]
}
```

Estados aceitos: `available`, `unavailable`, `unknown`. Os recursos devem usar um `type` retornado por `/api/accessibility-features`. Ao consultar um lugar, a API retorna os dados do local e todos os recursos em `accessibilityFeatures`.

## Banco de dados

`places` armazena os dados do lugar e os campos de autoria (`contributor_name`, `contributor_email`). `accessibility_features` armazena recursos em linhas separadas ligados por `place_id`; a combinação lugar/tipo é única. Excluir um lugar exclui seus recursos automaticamente.
