# Central de câmeras – Arraial do Cabo

Painel e mapa das câmeras. O status online/offline é salvo no Firebase e aparece em tempo real em todos os aparelhos.

## 1. Firebase (uma vez)
1. Em console.firebase.google.com, crie um projeto.
2. **Build > Firestore Database > Criar banco** (modo produção, região `southamerica-east1`).
3. Aba **Regras**: cole o conteúdo de `firestore.rules` e publique.
4. **Build > Authentication > Método de login**: ative **E-mail/senha**. Na aba **Usuários**, adicione o e-mail e a senha de cada pessoa que pode usar (não há cadastro aberto).
5. **Configurações do projeto > Seus apps > Web (</>)**: registre um app e copie o objeto de configuração para `firebase-config.js`.
6. **Authentication > Configurações > Domínios autorizados**: adicione `SEU-USUARIO.github.io`.

### Lista de câmeras (importante)
A lista das câmeras NÃO fica no código do site (que é público). Ela fica no Firestore, atrás do login. Depois de entrar no site pela primeira vez, vá no Painel, em "Lista de câmeras", e escolha o arquivo `cameras.json` (guarde esse arquivo só no seu computador, não suba no GitHub). Use o mesmo caminho para atualizar a lista no futuro.

## 2. GitHub Pages
1. Crie um repositório e envie estes arquivos (`index.html`, `firebase-config.js`).
2. **Settings > Pages**: Source = branch `main`, pasta `/ (root)`.
3. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Observações
- A `apiKey` do Firebase pode ficar pública; quem protege os dados são o login e as regras do Firestore.
- Cada câmera é um documento `cameras/<número>`. Não reordene a lista de câmeras sem migrar os números.

## Mapa
O mapa usa Leaflet com mapas de verdade (estilo claro tipo Google, satélite e OpenStreetMap; o botão "Mapa" no canto troca a camada). Ele precisa de internet e funciona quando a página está hospedada (GitHub Pages). Se um dia o uso crescer muito, troque os mapas por um provedor com chave (MapTiler, Stadia ou Google Maps) editando as linhas `L.tileLayer` em `index.html`.
