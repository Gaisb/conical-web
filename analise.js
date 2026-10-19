// ============================================================================
//  ANALISADOR DE EQUAÇÕES E GERADOR DE CÁLCULOS PASSO A PASSO
// ============================================================================
//  Reconhece automaticamente equações e parâmetros das 4 cônicas:
//    • Circunferência:  x² + y² = 16   |   r=4   |   a=4 b=4
//    • Elipse:          x²/25 + y²/9 = 1   |   9x² + 25y² = 225   |   a=5 b=3
//    • Parábola:        x² = 8y   |   y = 0.25x²   |   y² = 12x   |   p=2
//    • Hipérbole:       x²/16 - y²/9 = 1   |   9x² - 16y² = 144   |   hip a=4 b=3
// ============================================================================

window.AnaliseConicas = (function () {
    const MIN_VAL = 0.1;
    const MAX_VAL = 200.0;
    const RAZAO_MAX = 10.0;

    function fmt(n, casas = 3) {
        if (!Number.isFinite(n)) return '—';
        return Number(n.toFixed(casas)).toString();
    }

    function normalizar(str) {
        let s = (str || '').trim().toLowerCase();
        s = s.replace(/[−–—]/g, '-');
        s = s.replace(/[·×]/g, '*');
        s = s.replace(/²/g, '^2').replace(/\^²/g, '^2');
        // Vírgula entre dígitos vira ponto decimal; fora disso vira espaço
        s = s.replace(/(\d),(\d)/g, '$1.$2');
        s = s.replace(/,/g, ' ');
        return s;
    }

    // Analisa a string digitada considerando a aba/tipo atual como contexto padrão para a=.. b=..
    function ler(entrada, tipoContexto = 'elipse') {
        if (!entrada || !entrada.trim()) {
            return erro('Digite uma equação ou parâmetros (ex.: x²/25 + y²/9 = 1, x² = 8y, x²/16 - y²/9 = 1).');
        }

        const s = normalizar(entrada);

        // Prefixo explícito de tipo: "hip a=4 b=3", "elipse 5 3", "parabola p=2", "circ r=4"
        let tipoExplicito = null;
        let sLimpo = s;
        if (/^(hip|hiperbole|hipérbole)\b/.test(sLimpo)) {
            tipoExplicito = 'hiperbole';
            sLimpo = sLimpo.replace(/^(hip|hiperbole|hipérbole)\s*/, '');
        } else if (/^(elipse|eli)\b/.test(sLimpo)) {
            tipoExplicito = 'elipse';
            sLimpo = sLimpo.replace(/^(elipse|eli)\s*/, '');
        } else if (/^(parabola|parábola|par)\b/.test(sLimpo)) {
            tipoExplicito = 'parabola';
            sLimpo = sLimpo.replace(/^(parabola|parábola|par)\s*/, '');
        } else if (/^(circunferencia|circunferência|circulo|círculo|circ)\b/.test(sLimpo)) {
            tipoExplicito = 'circunferencia';
            sLimpo = sLimpo.replace(/^(circunferencia|circunferência|circulo|círculo|circ)\s*/, '');
        }

        const tipoAlvo = tipoExplicito || tipoContexto;

        // 1. Parâmetro de raio r=... (Circunferência)
        const mRaio = sLimpo.match(/^(?:r|raio)\s*=\s*([+-]?\d+(?:\.\d+)?)$/);
        if (mRaio) {
            const r = parseFloat(mRaio[1]);
            if (r <= 0) return erro('O raio r precisa ser maior que zero.');
            if (r < MIN_VAL || r > MAX_VAL) return erro(`Valor fora da faixa desenhável (${MIN_VAL} a ${MAX_VAL}).`);
            return valido('circunferencia', { a: r, b: r }, `OK — Circunferência de raio r = ${fmt(r)}`);
        }

        // 2. Parâmetro focal p=... (Parábola)
        const mParP = sLimpo.match(/^(?:p|foco)\s*=\s*([+-]?\d+(?:\.\d+)?)$/);
        if (mParP) {
            const p = Math.abs(parseFloat(mParP[1]));
            if (p <= 0) return erro('O parâmetro focal p precisa ser diferente de zero.');
            if (p < MIN_VAL || p > MAX_VAL) return erro(`Valor fora da faixa desenhável (${MIN_VAL} a ${MAX_VAL}).`);
            return valido('parabola', { p, orientacao2D: 'padrao' }, `OK — Parábola com parâmetro focal p = ${fmt(p)}`);
        }

        // 3. Atribuições a=... b=...
        const rxAtrib = /(?:^|[^a-z0-9])([ab])\s*=\s*([+-]?\d+(?:\.\d+)?)/g;
        let mAtrib;
        let va = null, vb = null, countAtrib = 0;
        while ((mAtrib = rxAtrib.exec(sLimpo)) !== null) {
            countAtrib++;
            const val = parseFloat(mAtrib[2]);
            if (mAtrib[1] === 'a') va = val;
            else vb = val;
        }
        if (countAtrib > 0 && !sLimpo.includes('^2')) {
            if (va === null || vb === null) {
                return erro('Informe os dois semieixos: ex. a=5 b=3');
            }
            return validarSemieixos(va, vb, tipoAlvo === 'hiperbole' ? 'hiperbole' : 'elipse');
        }

        // 4. Dois números separados por espaço ("5 3") ou um único número para circunferência/parábola
        const mDois = sLimpo.match(/^([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)$/);
        if (mDois) {
            return validarSemieixos(
                parseFloat(mDois[1]),
                parseFloat(mDois[2]),
                tipoAlvo === 'hiperbole' ? 'hiperbole' : 'elipse'
            );
        }
        const mUm = sLimpo.match(/^([+-]?\d+(?:\.\d+)?)$/);
        if (mUm) {
            const v = parseFloat(mUm[1]);
            if (v <= 0) return erro('O parâmetro precisa ser maior que zero.');
            if (tipoAlvo === 'parabola') {
                return valido('parabola', { p: v }, `OK — Parábola com p = ${fmt(v)}`);
            }
            return valido('circunferencia', { a: v, b: v }, `OK — Circunferência com r = ${fmt(v)}`);
        }

        // 5. Equação algébrica com "="
        const idxIgual = sLimpo.indexOf('=');
        if (idxIgual < 0) {
            return erro('Falta o "=" da equação (ex.: x²/25 + y²/9 = 1, x² = 8y, x²/16 - y²/9 = 1).');
        }

        const esq = sLimpo.slice(0, idxIgual).trim();
        const dir = sLimpo.slice(idxIgual + 1).trim();

        if (!esq || !dir) {
            return erro('Equação incompleta: preencha os dois lados do "=".');
        }

        // Verifica se há letras desconhecidas além de x e y
        if (/[a-wz]/.test(esq.replace(/[xy]/g, '')) || /[a-wz]/.test(dir.replace(/[xy]/g, ''))) {
            return erro('Troque letras como a², b² ou p por valores numéricos (ex.: x²/25 + y²/9 = 1).');
        }

        // Tenta ler como Parábola se tiver um termo quadrático e um termo linear (ex: x² = 8y, y = 0.25x², y² = 12x)
        const tentativaParabola = tentarLerParabola(esq, dir);
        if (tentativaParabola) {
            return tentativaParabola;
        }

        // Caso contrário, analisa os termos quadráticos em x² e y²
        return analisarQuadraticaCentrada(esq, dir);
    }

    function tentarLerParabola(esq, dir) {
        // Passa tudo para o lado esquerdo: esq - (dir) = 0
        // Mas primeiro testamos os formatos clássicos diretos:
        // Formato A: [k] * x^2 [/ d] = [m] * y [/ n]  ou vice-versa
        const todosTermos = extrairPolinomioSimples(esq, dir);
        if (!todosTermos.ok) return null;

        const { cx2, cy2, cx, cy, c0 } = todosTermos;

        // Se tem tanto x² quanto y², não é parábola reduzida
        if (Math.abs(cx2) > 1e-8 && Math.abs(cy2) > 1e-8) return null;

        // Parábola vertical: cx2 * x² + cy * y + c0 = 0
        if (Math.abs(cx2) > 1e-8 && Math.abs(cy2) < 1e-8) {
            if (Math.abs(cx) > 1e-8) {
                return erro('Termo linear em x junto com x²: use a forma reduzida no vértice (ex.: x² = 8y).');
            }
            if (Math.abs(cy) < 1e-8) {
                return erro('Falta o termo em y (ou y²): com apenas x² = k temos duas retas paralelas, não uma cônica.');
            }
            // cx2 * x² = -cy * y  =>  x² = (-cy / cx2) * y = 4p * y
            const quatroP = Math.abs(cy / cx2);
            const p = quatroP / 4;
            if (p < MIN_VAL * 0.25 || p > MAX_VAL) {
                return erro(`Parâmetro focal p = ${fmt(p)} fora da faixa desenhável.`);
            }
            return valido(
                'parabola',
                { p, orientacao2D: 'padrao' },
                `OK — Parábola identificada: x² = ${fmt(4 * p)}y  (p = ${fmt(p)}, foco F(0, ${fmt(p)}))`
            );
        }

        // Parábola horizontal: cy2 * y² + cx * x + c0 = 0
        if (Math.abs(cy2) > 1e-8 && Math.abs(cx2) < 1e-8) {
            if (Math.abs(cy) > 1e-8) {
                return erro('Termo linear em y junto com y²: use a forma reduzida no vértice (ex.: y² = 8x).');
            }
            if (Math.abs(cx) < 1e-8) {
                return erro('Falta o termo em x (ou x²): com apenas y² = k temos duas retas paralelas.');
            }
            const quatroP = Math.abs(cx / cy2);
            const p = quatroP / 4;
            if (p < MIN_VAL * 0.25 || p > MAX_VAL) {
                return erro(`Parâmetro focal p = ${fmt(p)} fora da faixa desenhável.`);
            }
            return valido(
                'parabola',
                { p, orientacao2D: 'horizontal' },
                `OK — Parábola identificada: y² = ${fmt(4 * p)}x  (p = ${fmt(p)}, foco F(${fmt(p)}, 0))`
            );
        }

        return null;
    }

    // Extrai coeficientes de x^2, y^2, x, y e constante em esq = dir
    function extrairPolinomioSimples(esq, dir) {
        let cx2 = 0, cy2 = 0, cx = 0, cy = 0, c0 = 0;

        function processarLado(str, multLado) {
            // Tokeniza por + ou - mantendo o sinal
            const limpo = str.replace(/\s+/g, '');
            if (!limpo) return false;
            const partes = limpo.match(/[+-]?[^+-]+/g);
            if (!partes) return false;

            for (const p of partes) {
                // Termo quadrático: [sinal][num][*]x^2[/den]
                let m = p.match(/^([+-])?(\d+(?:\.\d+)?)?\*?([xy])\^2(?:\/(\d+(?:\.\d+)?))?$/);
                if (m) {
                    const sinal = m[1] === '-' ? -1 : 1;
                    const num = m[2] !== undefined && m[2] !== '' ? parseFloat(m[2]) : 1;
                    const den = m[4] !== undefined ? parseFloat(m[4]) : 1;
                    if (Math.abs(den) < 1e-9) return false;
                    const val = multLado * sinal * (num / den);
                    if (m[3] === 'x') cx2 += val; else cy2 += val;
                    continue;
                }
                // Termo linear: [sinal][num][*]x[/den]
                m = p.match(/^([+-])?(\d+(?:\.\d+)?)?\*?([xy])(?:\/(\d+(?:\.\d+)?))?$/);
                if (m) {
                    const sinal = m[1] === '-' ? -1 : 1;
                    const num = m[2] !== undefined && m[2] !== '' ? parseFloat(m[2]) : 1;
                    const den = m[4] !== undefined ? parseFloat(m[4]) : 1;
                    if (Math.abs(den) < 1e-9) return false;
                    const val = multLado * sinal * (num / den);
                    if (m[3] === 'x') cx += val; else cy += val;
                    continue;
                }
                // Termo numérico constante: [sinal]num[/den]
                m = p.match(/^([+-])?(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
                if (m) {
                    const sinal = m[1] === '-' ? -1 : 1;
                    const num = parseFloat(m[2]);
                    const den = m[3] !== undefined ? parseFloat(m[3]) : 1;
                    if (Math.abs(den) < 1e-9) return false;
                    c0 += multLado * sinal * (num / den);
                    continue;
                }
                return false;
            }
            return true;
        }

        if (!processarLado(esq, +1)) return { ok: false };
        if (!processarLado(dir, -1)) return { ok: false };
        return { ok: true, cx2, cy2, cx, cy, c0 };
    }

    function analisarQuadraticaCentrada(esq, dir) {
        const poly = extrairPolinomioSimples(esq, dir);
        if (!poly.ok) {
            return erro('Formato não reconhecido. Exemplos: x²/25 + y²/9 = 1, x² + y² = 16, x²/16 - y²/9 = 1, x² = 8y.');
        }

        let { cx2, cy2, cx, cy, c0 } = poly;
        // Equação na forma cx2 * x² + cy2 * y² + cx * x + cy * y = rhs (onde rhs = -c0)
        let rhs = -c0;

        if (Math.abs(cx) > 1e-8 || Math.abs(cy) > 1e-8) {
            return erro('Use a forma reduzida centrada na origem (sem termos lineares isolados misturados com x² e y²).');
        }

        if (Math.abs(cx2) < 1e-9 && Math.abs(cy2) < 1e-9) {
            return erro('Não encontrei os termos quadráticos x² ou y² na equação.');
        }

        if (Math.abs(rhs) < 1e-9) {
            return erro('Termo independente igual a zero (x²/a² ± y²/b² = 0): isso representa um ponto ou par de retas (cônica degenerada).');
        }

        // Normaliza para rhs > 0
        if (rhs < 0) {
            cx2 = -cx2;
            cy2 = -cy2;
            rhs = -rhs;
        }

        if (cx2 < 0 && cy2 < 0) {
            return erro('Os dois coeficientes quadráticos são negativos para lado direito positivo: conjunto vazio (sem curva real).');
        }

        // Sinais opostos => HIPÉRBOLE!
        if (cx2 * cy2 < 0) {
            const orientacao2D = cx2 > 0 ? 'padrao' : 'vertical';
            const coefPos = cx2 > 0 ? cx2 : cy2;
            const coefNeg = cx2 > 0 ? -cy2 : -cx2;
            const a = Math.sqrt(rhs / coefPos);
            const b = Math.sqrt(rhs / coefNeg);
            return validarSemieixos(a, b, 'hiperbole', orientacao2D);
        }

        // Mesmos sinais positivos => CIRCUNFERÊNCIA ou ELIPSE
        const a1 = Math.sqrt(rhs / cx2);
        const b1 = Math.sqrt(rhs / cy2);
        return validarSemieixos(a1, b1, 'elipse');
    }

    function validarSemieixos(v1, v2, tipoBase, orientacao2D = 'padrao') {
        if (!Number.isFinite(v1) || !Number.isFinite(v2)) {
            return erro('Valor numérico inválido.');
        }
        if (v1 <= 0 || v2 <= 0) {
            return erro('Os semieixos a e b precisam ser maiores que zero.');
        }

        if (tipoBase === 'hiperbole') {
            if (v1 < MIN_VAL || v2 < MIN_VAL || v1 > MAX_VAL || v2 > MAX_VAL) {
                return erro(`Valores fora da faixa desenhável (${MIN_VAL} a ${MAX_VAL}).`);
            }
            if (Math.max(v1, v2) / Math.min(v1, v2) > RAZAO_MAX) {
                return erro(`Hipérbole muito extrema para o desenho (razão máxima ${RAZAO_MAX}).`);
            }
            return valido(
                'hiperbole',
                { a: v1, b: v2, orientacao2D },
                `OK — Hipérbole: a = ${fmt(v1)}, b = ${fmt(v2)}, c = ${fmt(Math.hypot(v1, v2))}`
            );
        }

        // Elipse ou Circunferência
        const A = Math.max(v1, v2);
        const B = Math.min(v1, v2);

        if (B < MIN_VAL || A > MAX_VAL) {
            return erro(`Valores fora da faixa desenhável (${MIN_VAL} a ${MAX_VAL}).`);
        }
        if (A / B > RAZAO_MAX) {
            return erro(`Elipse muito alongada para o desenho: a/b = ${fmt(A / B, 1)} (máximo ${RAZAO_MAX}).`);
        }

        if (Math.abs(A - B) < 1e-4) {
            return valido(
                'circunferencia',
                { a: A, b: A },
                `OK — a = b = ${fmt(A)} (caso particular: Circunferência de raio r = ${fmt(A)})`
            );
        }

        return valido(
            'elipse',
            { a: A, b: B },
            `OK — Elipse: a = ${fmt(A)}, b = ${fmt(B)}, c = ${fmt(Math.sqrt(A * A - B * B))}`
        );
    }

    function erro(mensagem) {
        return { ok: false, mensagem };
    }

    function valido(tipo, params, mensagem) {
        return { ok: true, tipo, params, mensagem };
    }

    // ========================================================================
    //  GERADOR DE RESOLUÇÃO PASSO A PASSO (PARA PAINEL E CADERNO DE CÁLCULO)
    // ========================================================================
    function gerarPassoAPasso(conica) {
        const t = conica.tipo;
        const a = conica.a;
        const b = conica.b;
        const c = conica.c;
        const e = conica.excentricidade;
        const ang = conica.anguloPlanoGraus;

        if (t === 'circunferencia') {
            return [
                {
                    titulo: '1. Identificação e Equação Reduzida',
                    linhas: [
                        `Tipo: CIRCUNFERÊNCIA (plano horizontal α = 0°, perpendicular ao eixo Y do cone)`,
                        `Raio: r = ${fmt(a)}   ⇒   r² = ${fmt(a * a)}`,
                        `Equação reduzida: x² + y² = ${fmt(a * a)}   ou   x²/${fmt(a * a)} + y²/${fmt(a * a)} = 1`
                    ]
                },
                {
                    titulo: '2. Elementos Geométricos no Plano',
                    linhas: [
                        `Centro: C(0, 0)   |   Distância focal: c = √(r² - r²) = 0`,
                        `Excentricidade: e = c / r = 0 / ${fmt(a)} = 0`,
                        `Extremos dos eixos: (±${fmt(a)}, 0) e (0, ±${fmt(a)})`,
                        `Comprimento: C = 2πr = ${fmt(2 * Math.PI * a)}   |   Área: A = πr² = ${fmt(Math.PI * a * a)}`
                    ]
                },
                {
                    titulo: '3. Corte 3D no Cone Duplo (x² + z² = y²)',
                    linhas: [
                        `Plano de corte horizontal: y = ${fmt(conica.distancia)} (inclinação m = tan 0° = 0)`,
                        `Substituindo y = ${fmt(a)} em x² + z² = y²  ⇒  x² + z² = ${fmt(a * a)}`
                    ]
                }
            ];
        }

        if (t === 'elipse') {
            const r = (b * b) / (a * a);
            return [
                {
                    titulo: '1. Identificação e Equação Reduzida',
                    linhas: [
                        `Tipo: ELIPSE (0° < α < 45°: plano corta apenas uma folha em curva fechada)`,
                        `Semieixo maior: a = ${fmt(a)} (a² = ${fmt(a * a)})   |   Semieixo menor: b = ${fmt(b)} (b² = ${fmt(b * b)})`,
                        `Equação reduzida: x²/${fmt(a * a)} + y²/${fmt(b * b)} = 1`
                    ]
                },
                {
                    titulo: '2. Relação Fundamental, Focos e Excentricidade',
                    linhas: [
                        `Relação pitagórica da elipse: a² = b² + c²  ⇒  c = √(a² - b²)`,
                        `c = √(${fmt(a * a)} - ${fmt(b * b)}) = √(${fmt(a * a - b * b)}) = ${fmt(c)}`,
                        `Excentricidade: e = c / a = ${fmt(c)} / ${fmt(a)} = ${fmt(e)}   (0 < e < 1)`,
                        `Focos: F₁(-${fmt(c)}, 0) e F₂(${fmt(c)}, 0)   |   Soma focal constante: d(P,F₁) + d(P,F₂) = 2a = ${fmt(2 * a)}`,
                        `Vértices: A₁(-${fmt(a)}, 0), A₂(${fmt(a)}, 0), B₁(0, -${fmt(b)}), B₂(0, ${fmt(b)})`
                    ]
                },
                {
                    titulo: '3. Cálculo Inverso do Plano no Cone 3D (x² + z² = y²)',
                    linhas: [
                        `Razão quadrática: r = b² / a² = ${fmt(b * b)} / ${fmt(a * a)} = ${fmt(r)}`,
                        `Inclinação do plano: m = √((1 - r)/(1 + r)) = ${fmt(conica.inclinacao)}  (α = ${fmt(ang, 1)}° < 45°)`,
                        `Distância do plano: d = b·√(1 - m²) = ${fmt(conica.distancia)}  ⇒  Plano: ${conica.equacaoPlanoTexto()}`
                    ]
                }
            ];
        }

        if (t === 'parabola') {
            const p = conica.p;
            const horiz = conica.orientacao2D === 'horizontal';
            return [
                {
                    titulo: '1. Identificação e Equação Reduzida',
                    linhas: [
                        `Tipo: PARÁBOLA (α = 45°: plano exatamente paralelo a uma geratriz do cone)`,
                        `Parâmetro focal: p = ${fmt(p)}   ⇒   4p = ${fmt(4 * p)}`,
                        `Equação reduzida: ${horiz ? `y² = ${fmt(4 * p)}x` : `x² = ${fmt(4 * p)}y`}   (ou ${horiz ? `x = ${fmt(1 / (4 * p))}y²` : `y = ${fmt(1 / (4 * p))}x²`})`
                    ]
                },
                {
                    titulo: '2. Vértice, Foco, Diretriz e Excentricidade',
                    linhas: [
                        `Excentricidade característica da parábola: e = 1`,
                        `Vértice na origem do plano: V(0, 0)`,
                        `Foco: ${horiz ? `F(${fmt(p)}, 0)` : `F(0, ${fmt(p)})`}   |   Equação da reta diretriz: ${horiz ? `x = -${fmt(p)}` : `y = -${fmt(p)}`}`,
                        `Propriedade focal: para todo ponto P da curva, d(P, F) = d(P, diretriz)`,
                        `Corda focal mínima (Latus Rectum): |4p| = ${fmt(4 * p)}`
                    ]
                },
                {
                    titulo: '3. Corte 3D no Cone Duplo (x² + z² = y²)',
                    linhas: [
                        `Inclinação igual à geratriz do cone: α = 45° (m = tan 45° = 1)`,
                        `Distância calculada: d = 2√2 · p = ${fmt(conica.distancia)}  ⇒  Plano: y + z = ${fmt(conica.distancia)}`,
                        `Vértice 3D na superfície do cone: V = (0, ${fmt(conica.distancia / 2)}, ${fmt(conica.distancia / 2)})`
                    ]
                }
            ];
        }

        // Hipérbole
        const vert = conica.orientacao2D === 'vertical';
        return [
            {
                titulo: '1. Identificação e Equação Reduzida',
                linhas: [
                    `Tipo: HIPÉRBOLE (α > 45°: plano mais inclinado que a geratriz, corta as DUAS folhas)`,
                    `Semieixo real (transverso): a = ${fmt(a)} (a² = ${fmt(a * a)})   |   Semieixo imaginário: b = ${fmt(b)} (b² = ${fmt(b * b)})`,
                    `Equação reduzida: ${vert ? `y²/${fmt(a * a)} - x²/${fmt(b * b)} = 1` : `x²/${fmt(a * a)} - y²/${fmt(b * b)} = 1`}`
                ]
            },
            {
                titulo: '2. Relação Fundamental, Focos, Excentricidade e Assíntotas',
                linhas: [
                    `Relação pitagórica da hipérbole: c² = a² + b²  ⇒  c = √(a² + b²)`,
                    `c = √(${fmt(a * a)} + ${fmt(b * b)}) = √(${fmt(a * a + b * b)}) = ${fmt(c)}`,
                    `Excentricidade: e = c / a = ${fmt(c)} / ${fmt(a)} = ${fmt(e)}   (e > 1)`,
                    `Focos: ${vert ? `F₁(0, -${fmt(c)}) e F₂(0, ${fmt(c)})` : `F₁(-${fmt(c)}, 0) e F₂(${fmt(c)}, 0)`}   |   |d(P,F₁) - d(P,F₂)| = 2a = ${fmt(2 * a)}`,
                    `Assíntotas: y = ±(${fmt(vert ? a / b : b / a)})x   (ou y = ±${vert ? '(a/b)' : '(b/a)'}·x)`
                ]
            },
            {
                titulo: '3. Corte 3D nas Duas Folhas do Cone (x² + z² = y²)',
                linhas: [
                    `Ângulo do plano: α = ${fmt(ang, 1)}° > 45° (atinge folha superior y > 0 e inferior y < 0)`,
                    `Equação do plano 3D: ${conica.equacaoPlanoTexto()}`
                ]
            }
        ];
    }

    // Gera texto editável inicial para o Caderno de Cálculo do usuário
    function gerarRascunhoPadrao(conica) {
        const passos = gerarPassoAPasso(conica);
        const linhas = [
            `# Caderno de Cálculo — ${conica.tipo.toUpperCase()}`,
            `# Você pode digitar suas contas abaixo. Linhas com expressões mostram o resultado ao vivo!`,
            ``
        ];
        for (const p of passos) {
            linhas.push(`// ${p.titulo}`);
            for (const l of p.linhas) linhas.push(l);
            linhas.push('');
        }
        if (conica.tipo === 'elipse') {
            linhas.push(`// Faça seus testes numéricos abaixo:`);
            linhas.push(`a = ${fmt(conica.a)}`);
            linhas.push(`b = ${fmt(conica.b)}`);
            linhas.push(`c = sqrt(a^2 - b^2)`);
            linhas.push(`e = c / a`);
            linhas.push(`soma_focal = 2 * a`);
        } else if (conica.tipo === 'hiperbole') {
            linhas.push(`// Faça seus testes numéricos abaixo:`);
            linhas.push(`a = ${fmt(conica.a)}`);
            linhas.push(`b = ${fmt(conica.b)}`);
            linhas.push(`c = sqrt(a^2 + b^2)`);
            linhas.push(`e = c / a`);
            linhas.push(`inclinacao_assintota = b / a`);
        } else if (conica.tipo === 'parabola') {
            linhas.push(`// Faça seus testes numéricos abaixo:`);
            linhas.push(`p = ${fmt(conica.p)}`);
            linhas.push(`corda_focal = 4 * p`);
            linhas.push(`d_plano_3d = 2 * sqrt(2) * p`);
        } else {
            linhas.push(`// Faça seus testes numéricos abaixo:`);
            linhas.push(`r = ${fmt(conica.a)}`);
            linhas.push(`comprimento = 2 * pi * r`);
            linhas.push(`area = pi * r^2`);
        }
        return linhas.join('\n');
    }

    // ========================================================================
    //  AVALIADOR INTERATIVO DO CADERNO DE CÁLCULOS
    // ========================================================================
    function avaliarCaderno(textoCompleto) {
        const linhas = (textoCompleto || '').split('\n');
        const escopo = {
            pi: Math.PI,
            e_num: Math.E
        };
        const resultados = [];

        for (let i = 0; i < linhas.length; i++) {
            const bruta = linhas[i].trim();
            if (!bruta || bruta.startsWith('#') || bruta.startsWith('//')) {
                resultados.push(null);
                continue;
            }

            // Só tenta avaliar se parecer uma expressão ou atribuição matemática simples
            // Ex: "c = sqrt(5^2 - 3^2)" ou "sqrt(25 - 9)" ou "2 * pi * 4"
            let varNome = null;
            let expr = bruta;

            const mAtrib = bruta.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=]+)$/);
            if (mAtrib) {
                varNome = mAtrib[1];
                expr = mAtrib[2].trim();
            } else if (bruta.includes(':') || bruta.includes('⇒') || /[xy]\s*\^?\s*2/.test(bruta)) {
                // Linha descritiva de texto ou equação implícita
                resultados.push(null);
                continue;
            }

            const valor = avaliarExpressaoSegura(expr, escopo);
            if (valor !== null && Number.isFinite(valor)) {
                if (varNome) escopo[varNome] = valor;
                resultados.push({ varNome, valor, texto: fmt(valor, 4) });
            } else {
                resultados.push(null);
            }
        }
        return resultados;
    }

    function avaliarExpressaoSegura(expr, escopo) {
        try {
            let s = expr
                .replace(/²/g, '**2')
                .replace(/³/g, '**3')
                .replace(/\^/g, '**')
                .replace(/√\s*\(/g, 'Math.sqrt(')
                .replace(/√\s*(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)')
                .replace(/π/g, 'Math.PI')
                .replace(/[·×]/g, '*')
                .replace(/(\d),(\d)/g, '$1.$2');

            // Substitui funções matemáticas conhecidas
            s = s.replace(/\b(sqrt|sin|cos|tan|atan|abs|hypot|pow)\b/gi, (m) => `Math.${m.toLowerCase()}`);
            s = s.replace(/\bsen\b/gi, 'Math.sin');

            // Substitui variáveis do escopo
            s = s.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (id) => {
                if (id === 'Math' || id === 'PI' || id === 'sqrt' || id === 'sin' || id === 'cos' || id === 'tan' || id === 'atan' || id === 'abs' || id === 'hypot' || id === 'pow') {
                    return id;
                }
                if (Object.prototype.hasOwnProperty.call(escopo, id)) {
                    return `(${escopo[id]})`;
                }
                throw new Error('Identificador desconhecido: ' + id);
            });

            // Verifica se só restaram caracteres matemáticos seguros
            if (!/^[0-9+\-*/().\sMathPIsqrtsincostanbsypow,]+$/.test(s)) {
                return null;
            }

            // eslint-disable-next-line no-new-func
            const fn = new Function(`"use strict"; return (${s});`);
            const res = fn();
            return typeof res === 'number' && Number.isFinite(res) ? res : null;
        } catch (_e) {
            return null;
        }
    }

    return {
        ler,
        gerarPassoAPasso,
        gerarRascunhoPadrao,
        avaliarCaderno,
        fmt
    };
})();
