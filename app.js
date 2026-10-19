// ============================================================================
//  CONTROLADOR PRINCIPAL DA APLICAÇÃO WEB — SEÇÕES CÔNICAS 3D & 2D
// ============================================================================

(function () {
    const { Conica } = window.ConicasModel;
    const Analise = window.AnaliseConicas;
    const Cena3D = window.Cena3D;
    const fmt = Analise.fmt;

    // Estado dos 4 modelos de cônicas (usados tanto na galeria 2x2 quanto na vista detalhada)
    const modelos = {
        circunferencia: new Conica('circunferencia', { a: 4.0, b: 4.0 }),
        elipse: new Conica('elipse', { a: 5.0, b: 3.0 }),
        parabola: new Conica('parabola', { p: 1.6, orientacao2D: 'padrao' }),
        hiperbole: new Conica('hiperbole', { a: 3.2, b: 2.4, orientacao2D: 'padrao' })
    };

    const equacoesPadrao = {
        circunferencia: 'x² + y² = 16',
        elipse: 'x²/25 + y²/9 = 1',
        parabola: 'x² = 6.4y',
        hiperbole: 'x²/10.24 - y²/5.76 = 1'
    };

    const estado = {
        modoVista: 'quatro',       // 'quatro' (2x2 como na imagem) | 'unica' (tela cheia)
        tipoAtivo: 'elipse',       // 'circunferencia' | 'elipse' | 'parabola' | 'hiperbole'
        tema: 'claro',             // 'claro' (igual à imagem enviada) | 'escuro' (igual ao C#)
        girar: true,
        wireframe: false,
        mostrarElementos: true,
        mostrarVista2D: true,
        animarPontoP: true,
        tempo: 0,
        anguloPontoP: 0.65,
        azimuteBase: 24,
        elevacaoBase: 18,
        zoom: 1.0,
        arrastando: false,
        ultimoMouseX: 0,
        ultimoMouseY: 0,
        cadernoEditadoManualmente: false
    };

    // Referências de DOM
    const elInputEq = document.getElementById('inputEquacao');
    const elBtnAplicar = document.getElementById('btnAplicar');
    const elStatus = document.getElementById('statusMensagem');
    const elTituloPainel = document.getElementById('tituloConicaPainel');
    const elSubtituloAngulo = document.getElementById('subtituloAngulo');
    const elEqReduzida = document.getElementById('equacaoReduzidaBox');
    const elListaElementos = document.getElementById('listaElementos');
    const elTxtPlanoEq = document.getElementById('txtPlanoEquacao');
    const elTxtPlanoAng = document.getElementById('txtPlanoAngulo');
    const elTxtRelacaoAng = document.getElementById('txtRelacaoAngulo');

    const elSliderA = document.getElementById('sliderA');
    const elSliderB = document.getElementById('sliderB');
    const elLabelSliderA = document.getElementById('labelSliderA');
    const elLabelSliderB = document.getElementById('labelSliderB');
    const elValSliderA = document.getElementById('valorSliderA');
    const elValSliderB = document.getElementById('valorSliderB');
    const elGrupoSliderB = document.getElementById('grupoSliderB');

    const elGaleriaQuatro = document.getElementById('galeriaQuatro');
    const elVistaUnicaWrap = document.getElementById('vistaUnicaWrap');
    const elPainelVista2D = document.getElementById('painelVista2D');

    const canvasPrincipal = document.getElementById('canvas3DPrincipal');
    const canvas2D = document.getElementById('canvasVista2D');
    const canvasQuad = {
        circunferencia: document.getElementById('canvasQuadCirc'),
        elipse: document.getElementById('canvasQuadElipse'),
        parabola: document.getElementById('canvasQuadParabola'),
        hiperbole: document.getElementById('canvasQuadHiperbole')
    };

    const elAreaCalculo = document.getElementById('areaCalculoUsuario');
    const elListaResultadosCalc = document.getElementById('listaResultadosCalculo');
    const elContainerPassos = document.getElementById('containerPassos');
    const elInputTestX = document.getElementById('inputTestX');
    const elInputTestY = document.getElementById('inputTestY');
    const elResultadoTestePonto = document.getElementById('resultadoTestePonto');

    function conicaAtiva() {
        return modelos[estado.tipoAtivo];
    }

    // ========================================================================
    //  ATUALIZAÇÃO DO PAINEL LATERAL, PASSO A PASSO E CADERNO DE CÁLCULO
    // ========================================================================
    function atualizarInterfaceCompleta(atualizarTextoInput = false) {
        const c = conicaAtiva();
        const tipo = estado.tipoAtivo;

        const nomes = {
            circunferencia: 'CIRCUNFERÊNCIA',
            elipse: 'ELIPSE',
            parabola: 'PARÁBOLA',
            hiperbole: 'HIPÉRBOLE'
        };
        const badgesAngulo = {
            circunferencia: 'α = 0° (e = 0)',
            elipse: '0° < α < 45° (0 < e < 1)',
            parabola: 'α = 45° (e = 1)',
            hiperbole: 'α > 45° (e > 1)'
        };

        elTituloPainel.textContent = nomes[tipo];
        elSubtituloAngulo.textContent = badgesAngulo[tipo];

        if (atualizarTextoInput) {
            if (tipo === 'circunferencia') elInputEq.value = `x² + y² = ${fmt(c.a * c.a)}`;
            else if (tipo === 'elipse') elInputEq.value = `x²/${fmt(c.a * c.a)} + y²/${fmt(c.b * c.b)} = 1`;
            else if (tipo === 'parabola') {
                elInputEq.value = c.orientacao2D === 'horizontal'
                    ? `y² = ${fmt(4 * c.p)}x`
                    : `x² = ${fmt(4 * c.p)}y`;
            } else if (tipo === 'hiperbole') {
                elInputEq.value = c.orientacao2D === 'vertical'
                    ? `y²/${fmt(c.a * c.a)} - x²/${fmt(c.b * c.b)} = 1`
                    : `x²/${fmt(c.a * c.a)} - y²/${fmt(c.b * c.b)} = 1`;
            }
        }

        // Configura Sliders conforme o tipo ativo
        if (tipo === 'circunferencia') {
            elLabelSliderA.textContent = 'Raio (r):';
            elSliderA.value = c.a;
            elValSliderA.textContent = fmt(c.a, 2);
            elGrupoSliderB.classList.add('hidden');
        } else if (tipo === 'parabola') {
            elLabelSliderA.textContent = 'Parâmetro focal (p):';
            elSliderA.value = c.p;
            elValSliderA.textContent = fmt(c.p, 2);
            elGrupoSliderB.classList.add('hidden');
        } else {
            elLabelSliderA.textContent = tipo === 'elipse' ? 'Semieixo maior (a):' : 'Semieixo real (a):';
            elLabelSliderB.textContent = tipo === 'elipse' ? 'Semieixo menor (b):' : 'Semieixo imaginário (b):';
            elSliderA.value = c.a;
            elSliderB.value = c.b;
            elValSliderA.textContent = fmt(c.a, 2);
            elValSliderB.textContent = fmt(c.b, 2);
            elGrupoSliderB.classList.remove('hidden');
        }

        // Equação reduzida e lista de elementos
        elEqReduzida.textContent = c.equacaoReduzidaTexto();
        preencherListaElementos(c);

        // Dados do Corte 3D no Cone
        elTxtPlanoEq.textContent = c.equacaoPlanoTexto();
        elTxtPlanoAng.textContent = `${fmt(c.anguloPlanoGraus, 1)}°`;
        if (tipo === 'circunferencia') {
            elTxtRelacaoAng.textContent = 'α = 0° ⇒ plano horizontal perpendicular ao eixo do cone';
        } else if (tipo === 'elipse') {
            elTxtRelacaoAng.textContent = '0° < α < 45° ⇒ corta apenas uma folha em curva fechada';
        } else if (tipo === 'parabola') {
            elTxtRelacaoAng.textContent = 'α = 45° ⇒ plano paralelo a uma geratriz do cone (curva aberta)';
        } else {
            elTxtRelacaoAng.textContent = 'α > 45° ⇒ plano mais inclinado que a geratriz (corta as 2 folhas)';
        }

        // Atualiza legendas dos 4 cards da galeria
        document.getElementById('legendaQuadCirc').textContent =
            `${modelos.circunferencia.equacaoReduzidaTexto()} • α = 0°`;
        document.getElementById('legendaQuadElipse').textContent =
            `${modelos.elipse.equacaoReduzidaTexto()} • α = ${fmt(modelos.elipse.anguloPlanoGraus, 1)}°`;
        document.getElementById('legendaQuadParabola').textContent =
            `${modelos.parabola.equacaoReduzidaTexto()} • α = 45°`;
        document.getElementById('legendaQuadHiperbole').textContent =
            `${modelos.hiperbole.equacaoReduzidaTexto()} • α = ${fmt(modelos.hiperbole.anguloPlanoGraus, 1)}°`;

        // Destaca card ativo na galeria 2x2 e nas abas superiores
        document.querySelectorAll('.quad-card').forEach((card) => {
            card.classList.toggle('active-card', card.dataset.cardTipo === tipo);
        });
        document.querySelectorAll('.conic-tabs .tab-btn').forEach((btn) => {
            if (estado.modoVista === 'quatro') {
                btn.classList.toggle('active', btn.dataset.modo === 'quatro');
            } else {
                btn.classList.toggle('active', btn.dataset.modo === 'unica' && btn.dataset.tipo === tipo);
            }
        });

        // Atualiza Passo a Passo e Caderno de Cálculo
        renderizarPassoAPasso(c);
        if (!estado.cadernoEditadoManualmente) {
            elAreaCalculo.value = Analise.gerarRascunhoPadrao(c);
            atualizarAvaliacaoCaderno();
        }
        atualizarTestePonto();
    }

    function preencherListaElementos(c) {
        const itens = [];
        if (c.tipo === 'circunferencia') {
            itens.push({ k: 'Raio (r)', v: fmt(c.a), cls: 'val-vertice' });
            itens.push({ k: 'Distância focal (c)', v: '0', cls: 'val-foco' });
            itens.push({ k: 'Excentricidade (e)', v: '0 (círculo perfeito)', cls: 'val-foco' });
            itens.push({ k: 'Centro', v: 'C(0, 0)', cls: '' });
            itens.push({ k: 'Comprimento (2πr)', v: fmt(2 * Math.PI * c.a), cls: '' });
            itens.push({ k: 'Área (πr²)', v: fmt(Math.PI * c.a * c.a), cls: '' });
        } else if (c.tipo === 'elipse') {
            itens.push({ k: 'Semieixo maior (a)', v: fmt(c.a), cls: 'val-vertice' });
            itens.push({ k: 'Semieixo menor (b)', v: fmt(c.b), cls: 'val-vertice' });
            itens.push({ k: 'Dist. focal c = √(a² - b²)', v: fmt(c.c), cls: 'val-foco' });
            itens.push({ k: 'Excentricidade e = c/a', v: fmt(c.excentricidade), cls: 'val-foco' });
            itens.push({ k: 'Soma focal d(P,F₁)+d(P,F₂)', v: `2a = ${fmt(2 * c.a)}`, cls: 'val-curva' });
            itens.push({ k: 'Focos', v: `F₁(-${fmt(c.c, 2)}, 0)  F₂(${fmt(c.c, 2)}, 0)`, cls: '' });
            itens.push({ k: 'Vértices', v: `(±${fmt(c.a, 2)}, 0) e (0, ±${fmt(c.b, 2)})`, cls: '' });
        } else if (c.tipo === 'parabola') {
            const horiz = c.orientacao2D === 'horizontal';
            itens.push({ k: 'Parâmetro focal (p)', v: fmt(c.p), cls: 'val-foco' });
            itens.push({ k: 'Corda focal (|4p|)', v: fmt(4 * c.p), cls: 'val-vertice' });
            itens.push({ k: 'Excentricidade (e)', v: '1', cls: 'val-foco' });
            itens.push({ k: 'Vértice', v: 'V(0, 0)', cls: 'val-vertice' });
            itens.push({ k: 'Foco', v: horiz ? `F(${fmt(c.p, 2)}, 0)` : `F(0, ${fmt(c.p, 2)})`, cls: 'val-foco' });
            itens.push({ k: 'Reta Diretriz (d)', v: horiz ? `x = -${fmt(c.p, 2)}` : `y = -${fmt(c.p, 2)}`, cls: '' });
        } else if (c.tipo === 'hiperbole') {
            const vert = c.orientacao2D === 'vertical';
            itens.push({ k: 'Semieixo real (a)', v: fmt(c.a), cls: 'val-vertice' });
            itens.push({ k: 'Semieixo imaginário (b)', v: fmt(c.b), cls: 'val-vertice' });
            itens.push({ k: 'Dist. focal c = √(a² + b²)', v: fmt(c.c), cls: 'val-foco' });
            itens.push({ k: 'Excentricidade e = c/a', v: fmt(c.excentricidade), cls: 'val-foco' });
            itens.push({ k: 'Dif. focal |d(P,F₁)-d(P,F₂)|', v: `2a = ${fmt(2 * c.a)}`, cls: 'val-curva' });
            itens.push({ k: 'Focos', v: vert ? `(0, ±${fmt(c.c, 2)})` : `(±${fmt(c.c, 2)}, 0)`, cls: '' });
            itens.push({ k: 'Assíntotas', v: `y = ±${fmt(vert ? c.a / c.b : c.b / c.a, 2)}x`, cls: '' });
        }

        elListaElementos.innerHTML = itens
            .map((it) => `<li><span class="data-key">${it.k}</span><span class="data-val ${it.cls}">${it.v}</span></li>`)
            .join('');
    }

    function renderizarPassoAPasso(c) {
        const passos = Analise.gerarPassoAPasso(c);
        elContainerPassos.innerHTML = passos
            .map(
                (p) => `
                <div class="step-card">
                    <h4>${p.titulo}</h4>
                    ${p.linhas.map((l) => `<p>${l}</p>`).join('')}
                </div>
            `
            )
            .join('');
    }

    function atualizarAvaliacaoCaderno() {
        const resultados = Analise.avaliarCaderno(elAreaCalculo.value);
        const validos = resultados.filter((r) => r !== null);
        if (validos.length === 0) {
            elListaResultadosCalc.innerHTML = `<span class="eval-pill">Digite expressões como c = sqrt(5^2 - 3^2) para ver o resultado</span>`;
            return;
        }
        elListaResultadosCalc.innerHTML = validos
            .map((r) => `<span class="eval-pill">${r.varNome ? `${r.varNome} = ` : '= '}${r.texto}</span>`)
            .join('');
    }

    function atualizarTestePonto() {
        const x0 = parseFloat(elInputTestX.value) || 0;
        const y0 = parseFloat(elInputTestY.value) || 0;
        const c = conicaAtiva();
        let texto = '';

        if (c.tipo === 'circunferencia') {
            const esq = x0 * x0 + y0 * y0;
            const dir = c.a * c.a;
            const dif = Math.abs(esq - dir);
            const status = dif < 1e-2 ? '✅ PERTENCE à circunferência!' : (esq < dir ? '🔹 Ponto INTERNO à circunferência' : '🔸 Ponto EXTERNO à circunferência');
            texto = `(${fmt(x0)})² + (${fmt(y0)})² = ${fmt(esq)}  (r² = ${fmt(dir)})<br><strong>${status}</strong>`;
        } else if (c.tipo === 'elipse') {
            const val = (x0 * x0) / (c.a * c.a) + (y0 * y0) / (c.b * c.b);
            const dif = Math.abs(val - 1);
            const status = dif < 1e-2 ? '✅ PERTENCE à elipse!' : (val < 1 ? '🔹 Ponto INTERNO à elipse' : '🔸 Ponto EXTERNO à elipse');
            texto = `(${fmt(x0)})²/${fmt(c.a * c.a)} + (${fmt(y0)})²/${fmt(c.b * c.b)} = ${fmt(val, 4)}<br><strong>${status}</strong>`;
        } else if (c.tipo === 'parabola') {
            const horiz = c.orientacao2D === 'horizontal';
            const esq = horiz ? y0 * y0 : x0 * x0;
            const dir = 4 * c.p * (horiz ? x0 : y0);
            const dif = Math.abs(esq - dir);
            const status = dif < 1e-2 ? '✅ PERTENCE à parábola!' : '🔸 Não pertence à curva (diferença = ' + fmt(dif) + ')';
            texto = horiz
                ? `y₀² = ${fmt(esq)}  |  4p·x₀ = ${fmt(dir)}<br><strong>${status}</strong>`
                : `x₀² = ${fmt(esq)}  |  4p·y₀ = ${fmt(dir)}<br><strong>${status}</strong>`;
        } else if (c.tipo === 'hiperbole') {
            const vert = c.orientacao2D === 'vertical';
            const val = vert
                ? (y0 * y0) / (c.a * c.a) - (x0 * x0) / (c.b * c.b)
                : (x0 * x0) / (c.a * c.a) - (y0 * y0) / (c.b * c.b);
            const dif = Math.abs(val - 1);
            const status = dif < 1e-2 ? '✅ PERTENCE à hipérbole!' : '🔸 Não pertence à curva (valor = ' + fmt(val, 3) + ' ≠ 1)';
            texto = `Substituição = ${fmt(val, 4)} (esperado = 1)<br><strong>${status}</strong>`;
        }

        elResultadoTestePonto.innerHTML = texto;
    }

    // ========================================================================
    //  LEITURA DA EQUAÇÃO DIGITADA PELO USUÁRIO
    // ========================================================================
    function aplicarEquacaoDigitada() {
        const res = Analise.ler(elInputEq.value, estado.tipoAtivo);
        if (!res.ok) {
            elStatus.textContent = res.mensagem;
            elStatus.className = 'status-box erro';
            return;
        }

        elStatus.textContent = res.mensagem;
        elStatus.className = 'status-box ok';

        estado.tipoAtivo = res.tipo;
        modelos[res.tipo].configurar(res.params);
        equacoesPadrao[res.tipo] = elInputEq.value;

        atualizarInterfaceCompleta(false);
    }

    // ========================================================================
    //  EVENTOS DE UI, ABAS, SLIDERS E BOTÕES
    // ========================================================================
    elBtnAplicar.addEventListener('click', aplicarEquacaoDigitada);
    elInputEq.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            aplicarEquacaoDigitada();
        } else if (e.key === 'Escape') {
            elInputEq.blur();
        }
    });

    // Chips de exemplo rápido
    document.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            elInputEq.value = chip.dataset.eq;
            if (chip.dataset.tipo) estado.tipoAtivo = chip.dataset.tipo;
            aplicarEquacaoDigitada();
        });
    });

    // Abas superiores (As 4 Cônicas vs Cada Cônica)
    document.querySelectorAll('.conic-tabs .tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const modo = btn.dataset.modo;
            const tipo = btn.dataset.tipo;
            estado.modoVista = modo;
            if (tipo) {
                estado.tipoAtivo = tipo;
                elInputEq.value = equacoesPadrao[tipo];
                elStatus.textContent = `OK — Visualizando ${tipo.toUpperCase()}`;
                elStatus.className = 'status-box ok';
            }
            alternarModoViewport();
            atualizarInterfaceCompleta(true);
        });
    });

    // Cards da galeria 2x2
    document.querySelectorAll('.quad-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            const tipo = card.dataset.cardTipo;
            if (!tipo) return;
            estado.tipoAtivo = tipo;
            if (e.target.closest('.quad-expand-btn')) {
                estado.modoVista = 'unica';
                alternarModoViewport();
            }
            atualizarInterfaceCompleta(true);
        });
        card.addEventListener('dblclick', () => {
            const tipo = card.dataset.cardTipo;
            if (!tipo) return;
            estado.tipoAtivo = tipo;
            estado.modoVista = 'unica';
            alternarModoViewport();
            atualizarInterfaceCompleta(true);
        });
    });

    document.getElementById('btnVoltarQuatro').addEventListener('click', () => {
        estado.modoVista = 'quatro';
        alternarModoViewport();
        atualizarInterfaceCompleta(false);
    });

    function alternarModoViewport() {
        const ehQuatro = estado.modoVista === 'quatro';
        elGaleriaQuatro.classList.toggle('hidden', !ehQuatro);
        elVistaUnicaWrap.classList.toggle('hidden', ehQuatro);
        redimensionarCanvases();
    }

    // Sliders
    function aoMoverSliders() {
        const tipo = estado.tipoAtivo;
        const c = conicaAtiva();
        let vA = parseFloat(elSliderA.value);
        let vB = parseFloat(elSliderB.value);

        if (tipo === 'circunferencia') {
            c.configurar({ a: vA, b: vA });
            elStatus.textContent = `OK — Circunferência: r = ${fmt(vA)}`;
        } else if (tipo === 'parabola') {
            c.configurar({ p: vA, orientacao2D: c.orientacao2D });
            elStatus.textContent = `OK — Parábola: p = ${fmt(vA)}`;
        } else if (tipo === 'elipse') {
            const maior = Math.max(vA, vB);
            const menor = Math.min(vA, vB);
            c.configurar({ a: maior, b: menor });
            elStatus.textContent = Math.abs(maior - menor) < 1e-3
                ? `OK — a = b = ${fmt(maior)} (caso particular: Circunferência)`
                : `OK — Elipse: a = ${fmt(maior)}, b = ${fmt(menor)}`;
        } else if (tipo === 'hiperbole') {
            c.configurar({ a: vA, b: vB, orientacao2D: c.orientacao2D });
            elStatus.textContent = `OK — Hipérbole: a = ${fmt(vA)}, b = ${fmt(vB)}`;
        }

        elStatus.className = 'status-box ok';
        atualizarInterfaceCompleta(true);
    }

    elSliderA.addEventListener('input', aoMoverSliders);
    elSliderB.addEventListener('input', aoMoverSliders);

    // Botões da barra de ferramentas
    const btnGirar = document.getElementById('btnGirar');
    const btnWireframe = document.getElementById('btnWireframe');
    const btnElementos = document.getElementById('btnElementos');
    const btnVista2D = document.getElementById('btnVista2D');
    const btnTema = document.getElementById('btnTema');
    const btnPrint = document.getElementById('btnPrint');

    function toggleGirar() {
        estado.girar = !estado.girar;
        btnGirar.textContent = `Girar: ${estado.girar ? 'ON' : 'OFF'}`;
        btnGirar.classList.toggle('active', estado.girar);
    }
    function toggleWireframe() {
        estado.wireframe = !estado.wireframe;
        btnWireframe.classList.toggle('active', estado.wireframe);
    }
    function toggleElementos() {
        estado.mostrarElementos = !estado.mostrarElementos;
        btnElementos.classList.toggle('active', estado.mostrarElementos);
    }
    function toggleVista2D() {
        estado.mostrarVista2D = !estado.mostrarVista2D;
        btnVista2D.classList.toggle('active', estado.mostrarVista2D);
        elPainelVista2D.classList.toggle('hidden', !estado.mostrarVista2D);
    }
    function toggleTema() {
        estado.tema = estado.tema === 'claro' ? 'escuro' : 'claro';
        document.documentElement.setAttribute('data-tema', estado.tema);
        btnTema.textContent = `Tema: ${estado.tema === 'claro' ? 'Claro' : 'Escuro'}`;
    }
    function salvarPrintPNG() {
        const alvoCanvas = estado.modoVista === 'quatro'
            ? gerarCanvasCompostoQuatro()
            : canvasPrincipal;
        const link = document.createElement('a');
        link.download = `conica_${estado.tipoAtivo}.png`;
        link.href = alvoCanvas.toDataURL('image/png');
        link.click();
    }

    btnGirar.addEventListener('click', toggleGirar);
    btnWireframe.addEventListener('click', toggleWireframe);
    btnElementos.addEventListener('click', toggleElementos);
    btnVista2D.addEventListener('click', toggleVista2D);
    btnTema.addEventListener('click', toggleTema);
    btnPrint.addEventListener('click', salvarPrintPNG);

    document.getElementById('chkAnimarP').addEventListener('change', (e) => {
        estado.animarPontoP = e.target.checked;
    });
    document.getElementById('btnResetCamera').addEventListener('click', () => {
        estado.azimuteBase = 24;
        estado.elevacaoBase = 18;
        estado.zoom = 1.0;
    });

    // Abas do painel direito (Caderno de Cálculo vs Passo a Passo)
    document.querySelectorAll('.calc-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.calc-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            const alvo = tab.dataset.calctab;
            document.getElementById('abaCaderno').classList.toggle('hidden', alvo !== 'caderno');
            document.getElementById('abaPassos').classList.toggle('hidden', alvo !== 'passos');
        });
    });

    // Barra de símbolos matemáticos do caderno de cálculo
    document.querySelectorAll('.sym-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const sym = btn.dataset.insert;
            const start = elAreaCalculo.selectionStart;
            const end = elAreaCalculo.selectionEnd;
            const texto = elAreaCalculo.value;
            elAreaCalculo.value = texto.slice(0, start) + sym + texto.slice(end);
            elAreaCalculo.focus();
            const offset = sym === '√()' ? sym.length - 1 : sym.length;
            elAreaCalculo.setSelectionRange(start + offset, start + offset);
            estado.cadernoEditadoManualmente = true;
            atualizarAvaliacaoCaderno();
        });
    });

    elAreaCalculo.addEventListener('input', () => {
        estado.cadernoEditadoManualmente = true;
        atualizarAvaliacaoCaderno();
    });

    document.getElementById('btnPreencherCalculo').addEventListener('click', () => {
        estado.cadernoEditadoManualmente = false;
        elAreaCalculo.value = Analise.gerarRascunhoPadrao(conicaAtiva());
        atualizarAvaliacaoCaderno();
    });

    document.getElementById('btnEnviarParaCaderno').addEventListener('click', () => {
        estado.cadernoEditadoManualmente = false;
        elAreaCalculo.value = Analise.gerarRascunhoPadrao(conicaAtiva());
        atualizarAvaliacaoCaderno();
        document.querySelector('.calc-tab[data-calctab="caderno"]').click();
    });

    document.getElementById('btnCopiarCalculo').addEventListener('click', () => {
        navigator.clipboard?.writeText(elAreaCalculo.value);
        const btn = document.getElementById('btnCopiarCalculo');
        const original = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = original; }, 1200);
    });

    document.getElementById('btnLimparCalculo').addEventListener('click', () => {
        estado.cadernoEditadoManualmente = true;
        elAreaCalculo.value = '';
        atualizarAvaliacaoCaderno();
        elAreaCalculo.focus();
    });

    elInputTestX.addEventListener('input', atualizarTestePonto);
    elInputTestY.addEventListener('input', atualizarTestePonto);

    // ========================================================================
    //  INTERAÇÃO 3D COM MOUSE (ÓRBITA + ZOOM) E ATALHOS DE TECLADO
    // ========================================================================
    const areaViewport = document.querySelector('.viewport-area');
    areaViewport.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.inset-2d-card') || e.target.closest('button') || e.target.closest('input')) return;
        estado.arrastando = true;
        estado.ultimoMouseX = e.clientX;
        estado.ultimoMouseY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
        if (!estado.arrastando) return;
        const dx = e.clientX - estado.ultimoMouseX;
        const dy = e.clientY - estado.ultimoMouseY;
        estado.ultimoMouseX = e.clientX;
        estado.ultimoMouseY = e.clientY;

        estado.azimuteBase -= dx * 0.45;
        estado.elevacaoBase = Math.max(-40, Math.min(72, estado.elevacaoBase + dy * 0.35));
    });

    window.addEventListener('pointerup', () => {
        estado.arrastando = false;
    });

    areaViewport.addEventListener('wheel', (e) => {
        if (e.target.closest('.inset-2d-card')) return;
        e.preventDefault();
        const fator = e.deltaY < 0 ? 1.08 : 0.92;
        estado.zoom = Math.max(0.45, Math.min(2.6, estado.zoom * fator));
    }, { passive: false });

    // Atalhos de teclado idênticos ao projeto original C# (aline/Conicas)
    window.addEventListener('keydown', (e) => {
        const tag = document.activeElement?.tagName;
        const digitando = tag === 'INPUT' || tag === 'TEXTAREA';

        if (e.key === 'Tab' && !e.shiftKey && document.activeElement !== elAreaCalculo) {
            e.preventDefault();
            if (document.activeElement === elInputEq) elInputEq.blur();
            else elInputEq.focus();
            return;
        }

        if (digitando) return;

        if (e.key === 'r' || e.key === 'R') toggleGirar();
        else if (e.key === 'w' || e.key === 'W') toggleWireframe();
        else if (e.key === 'e' || e.key === 'E') toggleElementos();
        else if (e.key === '2') toggleVista2D();
        else if (e.key === 'b' || e.key === 'B') toggleTema();
        else if (e.key === 'F10') { e.preventDefault(); salvarPrintPNG(); }
        else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            const passo = 0.2;
            if (e.key === 'ArrowRight') elSliderA.value = Math.min(15, parseFloat(elSliderA.value) + passo);
            if (e.key === 'ArrowLeft') elSliderA.value = Math.max(0.5, parseFloat(elSliderA.value) - passo);
            if (e.key === 'ArrowUp') elSliderB.value = Math.min(15, parseFloat(elSliderB.value) + passo);
            if (e.key === 'ArrowDown') elSliderB.value = Math.max(0.5, parseFloat(elSliderB.value) - passo);
            aoMoverSliders();
        }
    });

    // ========================================================================
    //  REDIMENSIONAMENTO E LOOP DE ANIMAÇÃO (60 FPS)
    // ========================================================================
    function redimensionarCanvases() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        if (estado.modoVista === 'quatro') {
            for (const ch of Object.keys(canvasQuad)) {
                const cv = canvasQuad[ch];
                const rect = cv.parentElement.getBoundingClientRect();
                const w = Math.max(200, Math.floor(rect.width * dpr));
                const h = Math.max(150, Math.floor(rect.height * dpr));
                if (cv.width !== w || cv.height !== h) {
                    cv.width = w;
                    cv.height = h;
                }
            }
        } else {
            const rect = canvasPrincipal.parentElement.getBoundingClientRect();
            const w = Math.max(300, Math.floor(rect.width * dpr));
            const h = Math.max(250, Math.floor(rect.height * dpr));
            if (canvasPrincipal.width !== w || canvasPrincipal.height !== h) {
                canvasPrincipal.width = w;
                canvasPrincipal.height = h;
            }
        }
    }

    window.addEventListener('resize', redimensionarCanvases);

    // Gera uma imagem única 2x2 com as 4 cônicas para o botão Salvar PNG no modo galeria
    function gerarCanvasCompostoQuatro() {
        const out = document.createElement('canvas');
        out.width = 1200;
        out.height = 900;
        const ctx = out.getContext('2d');
        const temaObj = Cena3D.TEMAS[estado.tema];

        ctx.fillStyle = temaObj.fundo;
        ctx.fillRect(0, 0, out.width, out.height);

        const lista = [
            { tipo: 'circunferencia', titulo: 'Circunferência', x: 0, y: 0 },
            { tipo: 'elipse', titulo: 'Elipse', x: 600, y: 0 },
            { tipo: 'parabola', titulo: 'Parábola', x: 0, y: 450 },
            { tipo: 'hiperbole', titulo: 'Hipérbole', x: 600, y: 450 }
        ];

        for (const item of lista) {
            const sub = document.createElement('canvas');
            sub.width = 600;
            sub.height = 400;
            Cena3D.desenharCena3D(sub.getContext('2d'), modelos[item.tipo], {
                tema: estado.tema,
                azimute: estado.azimuteBase,
                elevacao: estado.elevacaoBase,
                zoom: estado.zoom,
                wireframe: estado.wireframe,
                mostrarElementos: estado.mostrarElementos,
                nTheta: 108,
                nS: 16
            });
            ctx.drawImage(sub, item.x, item.y);
            ctx.fillStyle = temaObj.texto;
            ctx.font = 'bold 28px "Inter", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.titulo, item.x + 300, item.y + 425);
        }
        return out;
    }

    let ultimoT = performance.now();
    function loop(agora) {
        const dt = Math.min(0.05, (agora - ultimoT) / 1000);
        ultimoT = agora;

        if (estado.girar && !estado.arrastando) {
            estado.tempo += dt;
        }
        if (estado.animarPontoP) {
            estado.anguloPontoP += dt * 0.85;
        }

        const azimuteAtual = estado.girar
            ? estado.azimuteBase + 20 * Math.sin(estado.tempo * 0.42)
            : estado.azimuteBase;

        if (estado.modoVista === 'quatro') {
            for (const tipo of ['circunferencia', 'elipse', 'parabola', 'hiperbole']) {
                const cv = canvasQuad[tipo];
                if (cv.width === 0 || cv.height === 0) redimensionarCanvases();
                const ctx = cv.getContext('2d');
                Cena3D.desenharCena3D(ctx, modelos[tipo], {
                    tema: estado.tema,
                    azimute: azimuteAtual,
                    elevacao: estado.elevacaoBase,
                    zoom: estado.zoom,
                    wireframe: estado.wireframe,
                    mostrarElementos: estado.mostrarElementos,
                    nTheta: 72,
                    nS: 12,
                    espessuraCurva: 2.8
                });
            }
        } else {
            if (canvasPrincipal.width === 0 || canvasPrincipal.height === 0) redimensionarCanvases();
            const ctx3D = canvasPrincipal.getContext('2d');
            Cena3D.desenharCena3D(ctx3D, conicaAtiva(), {
                tema: estado.tema,
                azimute: azimuteAtual,
                elevacao: estado.elevacaoBase,
                zoom: estado.zoom,
                wireframe: estado.wireframe,
                mostrarElementos: estado.mostrarElementos,
                nTheta: 108,
                nS: 16,
                espessuraCurva: 3.4
            });
        }

        if (estado.mostrarVista2D) {
            const ctx2D = canvas2D.getContext('2d');
            Cena3D.desenharVista2D(ctx2D, conicaAtiva(), {
                tema: estado.tema,
                anguloP: estado.anguloPontoP
            });
        }

        requestAnimationFrame(loop);
    }

    // Inicialização
    redimensionarCanvases();
    atualizarInterfaceCompleta(true);
    requestAnimationFrame(loop);
})();
