# Central Thais — integração do novo layout

O layout foi aplicado sobre o aplicativo existente, baseado no commit `be0eed644c0b15a6907233c9cd100e653f66cbd9`.

## Visual

- Fundo creme `#FAF8F5`, superfícies claras e cinco cores por área.
- Lora nos títulos e DM Sans no corpo, com arquivos locais e licenças em `src/assets/fonts`.
- Menu lateral no notebook e menu recolhido no celular, banner em WebP, dashboard com tarefas, hábitos, agenda, notas e resumo financeiro.
- Componentes e formulários existentes receberam estilos e nomes acessíveis. Menus e inclusão rápida suportam Escape e navegação por teclado.
- O dashboard mostra todas as tarefas de cada recorte, incluindo tarefas sem área. Datas do dashboard e do financeiro seguem o fuso de São Paulo.

## Integração

As rotas existentes continuam em `/`, `/area/:slug` e `/financeiro`. Os módulos de autenticação, consultas e persistência (`AuthContext.jsx`, `supabase.js`, `useStore.js`) e o schema SQL permanecem iguais à versão de origem. Não há modo de demonstração ou dados fictícios na aplicação enviada.

## Execução

```sh
npm ci
npm run dev
npm run build
```

Use as variáveis existentes `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente local e nas prévias da Vercel. Não inclua chaves administrativas no frontend.

Na Vercel: Root Directory vazio ou `.`; framework Vite; build `npm run build`; saída `dist`. O `vercel.json` da origem foi preservado com o rewrite para `/index.html`.

## Validação e pendências

- Compilação de produção concluída com Vite.
- Renderização de início, área e financeiro verificada com dados locais isolados do aplicativo de produção.
- Fontes, ícones e banner incluídos no resultado da compilação.
- Revisão visual interativa no celular/notebook e operações autenticadas no Supabase ainda precisam ser conferidas na prévia. O navegador desta sessão não acessou a prévia local.
- A conexão Vercel negou acesso ao escopo `azevedothayss` (403), portanto configurações, variáveis hospedadas e publicação não foram confirmadas.

## Publicação

Revise a branch de redesign e a prévia que a integração GitHub/Vercel gerar. Confira login, criação de tarefa/checklist/hábito/nota/evento, lançamento financeiro e recarga. Depois, integre a branch em `main` para publicar conforme a configuração existente. O redesign não altera recorrência de hábitos ou cálculos de parcelas do aplicativo de origem.
