# Cobertura da reconstrução

| Subsistema observado na referência | Implementação web | Estado |
|---|---|---|
| Captura e importação | Câmera, JPEG, imagens e vídeos | Implementado; hardware real ainda não validado |
| Seleção de câmeras e processamento | 15 receitas Canvas próprias e perfis derivados para os nomes do vídeo | Parcial: catálogo e filtros não equivalentes aos originais |
| Controles de exposição/cor | Ajustes digitais, contraste, saturação, temperatura | Parcial: ISO/obturador, curvas e HSL ausentes |
| Molduras, carimbo, grão | Composição Canvas e marcação de data | Implementado como aproximação |
| Dupla exposição | Duas capturas combinadas | Implementado; não importa segunda imagem nessa sequência |
| Meio quadro | Duas capturas D Half lado a lado | Implementado |
| Álbum e favoritos | IndexedDB, visualização e exclusão | Implementado |
| Exportação | JPEG, vídeo, ZIP do álbum | Implementado |
| Negativos | Original armazenado e nova revelação | Parcial: fotos simples; sem reconstrução das camadas de dupla exposição/colagem/vídeo |
| Colagem | 2–6 imagens, três composições | Implementado |
| Vídeo | MediaRecorder, efeitos em tempo real, áudio | Parcial: não há paridade de codecs nem controles avançados |
| ProRAW, profundidade, Live Photos | — | Não implementado; dependências nativas |
| Curvas/HSL, presets, burst, fisheye, jitter | — | Não implementado |
| Compras, widgets, iCloud | — | Não implementado |
| Visual original | Layout principal medido no vídeo 394 × 854 | Parcial: tela principal e painéis observados; demais telas adaptadas |

A solicitação de reprodução integral permanece parcialmente atendida. Não há evidência para declarar equivalência de todos os recursos, filtros ou telas.
