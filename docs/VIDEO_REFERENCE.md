# Referência visual em vídeo

Arquivo fornecido pelo usuário: `copy_39D5835C-8EC8-4A03-BAD4-74CB5A5FB426.mov`.

- Duração medida: 13,701667 s.
- Imagem: 394 × 854 px, 24 quadros/s.
- 329 quadros decodificados sem descarte (`ffmpeg -vsync 0`).
- Todos os pares adjacentes foram comparados por diferença absoluta média em RGB reduzido a 98 × 213; resultados locais em `/workspace/reference/video-frames/frame-analysis.json`.
- Inspeção visual da folha de contato em intervalos de 1 s e dos quadros 73, 90, 130, 150, 200, 220, 250 e 270 em resolução integral. A comparação automática quadro a quadro não equivale a uma inspeção humana individual de todos os 329 quadros.

## Sequência observada

| Intervalo aproximado | Estado observado | Correspondência implementada |
|---|---|---|
| 0–2,7 s | Visor, enquadramento 42 mm, indicadores e obturador | Tela principal preta e geometria medida |
| 2,7–4,4 s | Catálogo com duas fileiras e acessórios | Fileiras horizontais independentes com rolagem |
| 4,4–6,0 s | Rolagem pelos modelos de câmera | Modelos visíveis, miniaturas e seleção |
| 6,0–6,5 s | Indicador colorido de carregamento | Breve transição visual ao trocar de câmera |
| 6,5–8,8 s | Retorno ao visor | Seleção atual mantida na miniatura |
| ~9 s | Controle bidimensional de balanço de branco; A/sol/lâmpada | Plano temperatura/matiz e presets |
| ~10 s | Exposição -3,2; controle A e redefinição | Slider EV, automático e reset |
| ~11 s | Distâncias 13/26/35/50 mm | Opções de zoom digital, limite ultrawide informado |
| ~12 s | Retorno aos controles principais | Fechar painel pelo próprio botão |
| ~13,2 s | Alteração do enquadramento | Alternância de enquadramento pelo botão inferior |

A diferença automática identifica maiores mudanças nos quadros 66 (~2,708 s), 157 (~6,500 s) e 318 (~13,208 s), além da alteração final nos quadros 327–328. Timestamps são estimados pelo índice/24.

## Geometria principal

Para viewport de 394 × 854:

- Visor externo: x≈16, y≈86, largura≈362, altura≈543, cantos arredondados.
- Moldura interna: x≈85, y≈189, largura≈224, altura≈337; grade em terços, legenda 42 mm.
- Controles no rodapé do visor: filme, termômetro, distância focal e exposição.
- Faixa de ferramentas próxima de y≈681: importação, dupla exposição, timer, flash e troca de câmera.
- Obturador branco: diâmetro≈77 px, centro próximo de x≈200/y≈755; álbum à esquerda e câmera selecionada à direita.
- Seletor de câmeras em duas fileiras, ações Amostra/lista/favorito, acessórios e botão circular para fechar.

## Escopo e diferenças

A notificação “Não Perturbe” é uma sobreposição do iOS, não um controle do aplicativo, e não foi recriada. O laptop filmado é conteúdo da câmera e não foi incorporado como fundo. A versão web usa a câmera real autorizada ou uma ilustração demonstrativa própria.

Quatro quadros do seletor fornecidos no vídeo são preservados como sprites para exibir apenas as regiões dos ícones. Ícones não visíveis por completo recebem representações aproximadas. Os nomes do catálogo não comprovam equivalência dos algoritmos. A simulação dos filtros, a resolução, os codecs e o acesso às lentes continuam limitados pelo navegador.

Os testes validam medidas do visor e funcionamento dos controles demonstrados. Não foi realizada comparação pixel a pixel dos filtros com o app iOS nem validação em hardware iPhone.
