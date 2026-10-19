# Seções Cônicas 3D & 2D — Simulador Web + Espaço de Cálculo

Simulação interativa para navegador das **4 seções cônicas** (**Circunferência**, **Elipse**, **Parábola** e **Hipérbole**), mostrando simultaneamente:
1. **Galeria 3D das 4 Cônicas (como na imagem clássica)** e **Modo 3D Detalhado** do cone duplo ($x^2 + z^2 = y^2$) cortado pelo plano;
2. **Vista 2D no Plano do Corte** com centro, focos ($F, F_1, F_2$), vértices, diretrizes, assíntotas e animação do ponto $P$ verificando a propriedade focal ao vivo;
3. **Campo de Entrada de Equações e Parâmetros** com detecção automática da cônica e validação;
4. **Espaço de Digitação do Cálculo (Caderno Interativo + Passo a Passo)** com barra de símbolos matemáticos, avaliador numérico ao vivo e verificador de pontos $(x_0, y_0)$.

---

## Como Executar

Basta abrir o arquivo [`index.html`](index.html) diretamente em qualquer navegador moderno (Chrome, Edge, Firefox), ou rodar um servidor local na pasta:

```bash
npx serve .
```

---

## Formatos Aceitos no Campo de Equação

| Cônica | Exemplos de Entrada |
|--------|---------------------|
| **Circunferência** ($\alpha = 0^\circ, e = 0$) | `x² + y² = 16` • `x²/25 + y²/25 = 1` • `r=4` • `a=4 b=4` |
| **Elipse** ($0^\circ < \alpha < 45^\circ, 0 < e < 1$) | `x²/25 + y²/9 = 1` • `9x² + 25y² = 225` • `a=5 b=3` • `5 3` |
| **Parábola** ($\alpha = 45^\circ, e = 1$) | `x² = 8y` • `y = 0.25x²` • `y² = 12x` • `p=2` |
| **Hipérbole** ($\alpha > 45^\circ, e > 1$) | `x²/16 - y²/9 = 1` • `y²/9 - x²/16 = 1` • `9x² - 16y² = 144` • `hip a=4 b=3` |

---

## Controles e Atalhos

| Tecla / Ação | Função |
|--------------|--------|
| **Arrastar com Mouse** | Gira a câmera 3D livremente em qualquer direção |
| **Roda do Mouse (Scroll)** | Zoom in / Zoom out na cena 3D |
| **Enter** | Aplica a equação digitada no campo |
| **TAB** | Entra / sai do campo de equação |
| **← →** e **↑ ↓** | Ajustam os parâmetros (`a`, `b`, `r`, `p`) ao vivo |
| **R** | Liga / desliga a rotação suave da câmera |
| **W** | Alterna modo Malha (Wireframe) / Sólido |
| **E** | Mostra / oculta Centro, Focos e Vértices em 3D |
| **2** | Mostra / oculta a janela da Vista 2D no plano do corte |
| **B** | Alterna entre **Tema Claro** (padrão da imagem) e **Tema Escuro** |
| **F10** | Salva uma imagem `.png` da simulação |
