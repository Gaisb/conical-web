// ============================================================================
//  MODELO MATEMÁTICO DAS 4 SEÇÕES CÔNICAS (3D NO CONE DUPLO + 2D NO PLANO)
// ============================================================================
//  Cone duplo com vértice na origem, eixo Y e semi-ângulo de 45° (K = 1):
//      x² + z² = y²
//  Geratrizes:
//      Folha superior (y >= 0): P_sup(r, θ) = (r·cos θ, +r, r·sen θ), r >= 0
//      Folha inferior (y <= 0): P_inf(r, θ) = (r·cos θ, -r, r·sen θ), r >= 0
//
//  Plano de corte com inclinação α em relação à horizontal (0° <= α < 90°):
//      y·cos α + z·sen α = d_perp     (ou y + m·z = d, onde m = tan α)
//
//  Classificação pelo ângulo α (comparado ao semi-ângulo de 45° do cone):
//    • α = 0°   (m = 0)   -> CIRCUNFERÊNCIA (corta só a folha superior na horizontal)
//    • 0°<α<45° (0<m<1)   -> ELIPSE         (corta só a folha superior, curva fechada)
//    • α = 45°  (m = 1)   -> PARÁBOLA       (paralelo a uma geratriz, curva aberta)
//    • α > 45°  (m > 1)   -> HIPÉRBOLE      (corta AMBAS as folhas do cone duplo)
// ============================================================================

window.ConicasModel = (function () {
    const TAU = Math.PI * 2;
    const DEG2RAD = Math.PI / 180;
    const RAD2DEG = 180 / Math.PI;

    function vec3(x, y, z) { return { x, y, z }; }
    function add3(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
    function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
    function mul3(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
    function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
    function len3(a) { return Math.hypot(a.x, a.y, a.z); }
    function norm3(a) {
        const l = len3(a);
        return l < 1e-8 ? { x: 0, y: 1, z: 0 } : { x: a.x / l, y: a.y / l, z: a.z / l };
    }

    class Conica {
        constructor(tipo, params = {}) {
            this.tipo = tipo; // 'circunferencia' | 'elipse' | 'parabola' | 'hiperbole'
            this.orientacao2D = params.orientacao2D || 'padrao';
            this.configurar(params);
        }

        configurar(params) {
            if (this.tipo === 'circunferencia') {
                const R = Math.max(0.2, params.a || params.r || 4.0);
                this.a = R;
                this.b = R;
                this.c = 0;
                this.p = 0;
                this.excentricidade = 0;

                // Plano horizontal y = R (α = 0°, m = 0)
                this.alphaRad = 0;
                this.inclinacao = 0; // m = tan(α)
                this.distancia = R;  // d na forma y + m·z = d
                this.dPerp = R;      // distância perpendicular à origem

                this.alturaSup = R * 1.01;
                this.alturaInf = R * 1.05;

                this.centro3D = vec3(0, R, 0);
                this.planoCentro = vec3(0, R, 0);
                this.planoDirU = vec3(1, 0, 0);
                this.planoDirV = vec3(0, 0, -1);
                this.planoNormal = vec3(0, 1, 0);
                this.planoU = R * 1.75;
                this.planoV = R * 1.75;
            }
            else if (this.tipo === 'elipse') {
                const A = Math.max(0.2, Math.max(params.a || 5, params.b || 3));
                const B = Math.max(0.15, Math.min(params.a || 5, params.b || 3));
                this.a = A;
                this.b = B;
                this.c = Math.sqrt(Math.max(0, A * A - B * B));
                this.p = 0;
                this.excentricidade = A > 0 ? this.c / A : 0;

                // Caminho inverso exato de aline/Conicas:
                // r = B²/A², m = √((1-r)/(1+r)), d = B·√(1-m²)
                const r = (B * B) / (A * A);
                const m = Math.min(0.992, Math.sqrt(Math.max(0, (1 - r) / (1 + r))));
                const d = B * Math.sqrt(1 - m * m);

                this.inclinacao = m;
                this.alphaRad = Math.atan(m);
                this.distancia = d;
                this.dPerp = d * Math.cos(this.alphaRad);

                const den = 1 - m * m;
                this.centro3D = vec3(0, d / den, -m * d / den);

                const tMax = d / Math.max(1e-3, 1 - m);
                this.alturaSup = tMax * 1.015;
                this.alturaInf = Math.max(2.0, this.alturaSup * 0.88);

                this.planoDirU = vec3(1, 0, 0);
                this.planoDirV = norm3(vec3(0, m, -1));
                this.planoNormal = norm3(vec3(0, 1, m));
                this.planoCentro = this.centro3D;
                this.planoU = B * 1.62;
                this.planoV = A * 1.36;
            }
            else if (this.tipo === 'parabola') {
                // Equação reduzida x² = 4·p·y (ou y = (1/4p)·x²)
                const p = Math.max(0.15, params.p || 1.5);
                this.p = p;
                this.a = p; // guarda p em a também para conveniência de controles
                this.b = 2 * p; // semi-corda focal (latus rectum / 2)
                this.c = p;
                this.excentricidade = 1.0;

                // No cone de 45°, plano paralelo à geratriz: α = 45°, m = tan(45°) = 1
                // Equação do plano: y + z = d
                // Na seção cônica: u² = (√2 · d) · v  =>  4p = √2 · d  =>  d = 2√2 · p
                const m = 1.0;
                const d = 2 * Math.SQRT2 * p;
                this.inclinacao = m;
                this.alphaRad = Math.PI / 4;
                this.distancia = d;
                this.dPerp = d / Math.SQRT2;

                // Vértice da parábola em θ = π/2 (sen θ = 1): t_V = d / (1 + 1) = d/2
                const tVertice = d * 0.5;
                this.vertice3D = vec3(0, tVertice, tVertice);

                // Altura máxima da folha superior (tampa circular no topo, cortada pelo plano na frente)
                this.alturaSup = tVertice * 3.35;
                this.alturaInf = this.alturaSup * 0.85;

                this.planoDirU = vec3(1, 0, 0);
                this.planoDirV = norm3(vec3(0, 1, -1)); // sobe ao longo do plano
                this.planoNormal = norm3(vec3(0, 1, 1));

                // Centraliza o retângulo do plano no meio da região cortada da parábola
                const vMax = (this.alturaSup - tVertice) * Math.SQRT2;
                const uMax = Math.sqrt(Math.max(0, 4 * p * vMax));
                this.vMaxParabola = vMax;
                this.centro3D = add3(this.vertice3D, mul3(this.planoDirV, vMax * 0.45));
                this.planoCentro = this.centro3D;
                this.planoU = Math.max(uMax * 1.42, p * 3.2);
                this.planoV = vMax * 0.78;
            }
            else if (this.tipo === 'hiperbole') {
                // Equação reduzida x²/a² - y²/b² = 1 (ou y²/a² - x²/b² = 1)
                const A = Math.max(0.2, params.a || 3.0);
                const B = Math.max(0.2, params.b || 2.2);
                this.a = A;
                this.b = B;
                this.c = Math.sqrt(A * A + B * B);
                this.p = 0;
                this.excentricidade = this.c / A;

                // Para o corte no cone de 45° (x² + z² = y²), o plano tem α > 45°:
                // y·cos α + z·sen α = d_perp
                // A razão geométrica no cone de 45° usa γ = min(0.86, (B/A)²) para manter
                // o ângulo do plano entre ~56° e ~84°, igual à ilustração clássica!
                const razao = Math.min(0.84, Math.max(0.22, (B * B) / (A * A)));
                const sinAlpha = Math.sqrt((1 + razao) * 0.5);
                const cosAlpha = Math.sqrt((1 - razao) * 0.5);
                this.alphaRad = Math.atan2(sinAlpha, cosAlpha);
                this.inclinacao = Math.tan(this.alphaRad); // m > 1

                const gamma = sinAlpha * sinAlpha - cosAlpha * cosAlpha;
                const dPerp = A * gamma;
                this.dPerp = dPerp;
                this.distancia = dPerp / Math.max(1e-4, cosAlpha);

                // Distâncias dos vértices superior e inferior até a origem ao longo das geratrizes
                const rVertSup = dPerp / (sinAlpha + cosAlpha);
                const rVertInf = dPerp / (sinAlpha - cosAlpha);

                // Para que tanto o ramo superior quanto o ramo inferior apareçam bem proporcionados
                // como na figura clássica, ajustamos a altura das duas folhas:
                this.alturaSup = rVertInf * 1.68;
                this.alturaInf = rVertInf * 1.68;

                this.planoDirU = vec3(1, 0, 0);
                this.planoDirV = vec3(0, sinAlpha, -cosAlpha);
                this.planoNormal = vec3(0, cosAlpha, sinAlpha);

                // Centro hiperbólico 3D (ponto médio entre os dois vértices no plano)
                const vSup = vec3(0, rVertSup, rVertSup);
                const vInf = vec3(0, -rVertInf, rVertInf);
                this.verticeSup3D = vSup;
                this.verticeInf3D = vInf;
                this.centro3D = mul3(add3(vSup, vInf), 0.5);

                // O retângulo do plano cobre do fundo da folha inferior até o topo da folha superior
                this.planoCentro = vec3(0, 0, dPerp * sinAlpha);
                const zTop = (dPerp - this.alturaSup * cosAlpha) / sinAlpha;
                const xMaxSup = Math.sqrt(Math.max(0, this.alturaSup * this.alturaSup - zTop * zTop));
                this.planoU = Math.max(xMaxSup * 1.38, A * 1.8);
                this.planoV = this.alturaSup * 1.16;
            }
        }

        get anguloPlanoGraus() {
            return this.alphaRad * RAD2DEG;
        }

        // Ponto na folha superior (sinal = +1) ou inferior (sinal = -1) para r >= 0
        static pontoConeFolha(theta, r, sinal) {
            return {
                x: r * Math.cos(theta),
                y: sinal * r,
                z: r * Math.sin(theta)
            };
        }

        // Normal externa da superfície do cone duplo
        static normalCone(p) {
            const nx = p.x;
            const ny = -p.y;
            const nz = p.z;
            const l = Math.hypot(nx, ny, nz);
            return l < 1e-6 ? { x: 0, y: 1, z: 0 } : { x: nx / l, y: ny / l, z: nz / l };
        }

        // Raio r >= 0 onde o plano intercepta a geratriz θ na folha (sinal = +1 ou -1)
        // Equação do plano: y·cos α + z·sen α = dPerp
        // Substituindo y = sinal·r, z = r·sen θ:
        //   r · (sinal·cos α + sen α · sen θ) = dPerp
        raioIntersecaoPlano(theta, sinal) {
            const cosA = Math.cos(this.alphaRad);
            const sinA = Math.sin(this.alphaRad);
            const denom = sinal * cosA + sinA * Math.sin(theta);
            if (denom <= 1e-4) return Infinity;
            return this.dPerp / denom;
        }

        // Limite da malha na folha superior (r >= 0)
        // Na Circunferência, Elipse, Parábola e Hipérbole, a folha superior vai de 0 até
        // o menor valor entre alturaSup e a interseção com o plano!
        limiteFolhaSup(theta) {
            const rPlano = this.raioIntersecaoPlano(theta, +1);
            return Math.min(this.alturaSup, rPlano);
        }

        // Limite da malha na folha inferior (r >= 0)
        // Para Circunferência, Elipse e Parábola, o plano não corta a folha inferior.
        // Para a Hipérbole (α > 45°), o plano corta a frente da folha inferior formando o arco!
        limiteFolhaInf(theta) {
            if (this.tipo === 'hiperbole') {
                const rPlano = this.raioIntersecaoPlano(theta, -1);
                return Math.min(this.alturaInf, rPlano);
            }
            return this.alturaInf;
        }

        // Cantos 3D do retângulo do plano de corte
        planoCantos() {
            const u = this.planoU;
            const v = this.planoV;
            const p = (du, dv) => add3(this.planoCentro, add3(mul3(this.planoDirU, du), mul3(this.planoDirV, dv)));
            return [
                p(-u, -v),
                p(+u, -v),
                p(+u, +v),
                p(-u, +v)
            ];
        }

        // Retorna os segmentos de curva 3D da interseção para desenhar em vermelho
        obterRamosCurva3D(amostras = 720) {
            const ramos = [];
            const thInicio = -Math.PI * 0.5;

            // Folha superior (sempre tem interseção nas 4 cônicas)
            let ramoAtual = [];
            for (let i = 0; i <= amostras; i++) {
                const th = thInicio + (TAU * i) / amostras;
                const r = this.raioIntersecaoPlano(th, +1);
                if (r > 0 && r <= this.alturaSup + 1e-3) {
                    ramoAtual.push(Conica.pontoConeFolha(th, r, +1));
                } else if (ramoAtual.length > 0) {
                    ramos.push(ramoAtual);
                    ramoAtual = [];
                }
            }
            if (ramoAtual.length > 0) ramos.push(ramoAtual);

            // Folha inferior (apenas na Hipérbole)
            if (this.tipo === 'hiperbole') {
                ramoAtual = [];
                for (let i = 0; i <= amostras; i++) {
                    const th = thInicio + (TAU * i) / amostras;
                    const r = this.raioIntersecaoPlano(th, -1);
                    if (r > 0 && r <= this.alturaInf + 1e-3) {
                        ramoAtual.push(Conica.pontoConeFolha(th, r, -1));
                    } else if (ramoAtual.length > 0) {
                        ramos.push(ramoAtual);
                        ramoAtual = [];
                    }
                }
                if (ramoAtual.length > 0) ramos.push(ramoAtual);
            }

            return ramos;
        }

        // Elementos notáveis em 3D (Centro, Focos, Vértices) para projetar sobre o cone
        elementos3D() {
            const vertices = [];
            const focos = [];
            let centro = null;

            if (this.tipo === 'circunferencia') {
                centro = this.centro3D;
                const R = this.a;
                vertices.push(
                    add3(centro, mul3(this.planoDirU, R)),
                    add3(centro, mul3(this.planoDirU, -R)),
                    add3(centro, mul3(this.planoDirV, R)),
                    add3(centro, mul3(this.planoDirV, -R))
                );
            } else if (this.tipo === 'elipse') {
                centro = this.centro3D;
                vertices.push(
                    add3(centro, mul3(this.planoDirV, -this.a)),
                    add3(centro, mul3(this.planoDirV, +this.a)),
                    add3(centro, mul3(this.planoDirU, -this.b)),
                    add3(centro, mul3(this.planoDirU, +this.b))
                );
                if (this.c > 1e-3) {
                    focos.push(
                         { pos: add3(centro, mul3(this.planoDirV, -this.c)), rotulo: 'F1' },
                        { pos: add3(centro, mul3(this.planoDirV, +this.c)), rotulo: 'F2' }
                    );
                }
            } else if (this.tipo === 'parabola') {
                const V = this.vertice3D;
                vertices.push(V);
                const F = add3(V, mul3(this.planoDirV, +this.p));
                focos.push({ pos: F, rotulo: 'F' });
            } else if (this.tipo === 'hiperbole') {
                centro = this.centro3D;
                vertices.push(this.verticeSup3D, this.verticeInf3D);
                const dirEixo = norm3(sub3(this.verticeSup3D, this.verticeInf3D));
                const distVert = len3(sub3(this.verticeSup3D, centro));
                const distFoco = distVert * this.excentricidade;
                focos.push(
                    { pos: add3(centro, mul3(dirEixo, +distFoco)), rotulo: 'F1' },
                    { pos: add3(centro, mul3(dirEixo, -distFoco)), rotulo: 'F2' }
                );
            }

            return { centro, vertices, focos };
        }

        // Textos matemáticos formatados para o painel e caderno de cálculo
        equacaoReduzidaTexto() {
            const fmt = (n) => Number(n.toFixed(3)).toString();
            if (this.tipo === 'circunferencia') {
                return `x² + y² = ${fmt(this.a * this.a)}   (r = ${fmt(this.a)})`;
            }
            if (this.tipo === 'elipse') {
                return `x²/${fmt(this.a * this.a)} + y²/${fmt(this.b * this.b)} = 1`;
            }
            if (this.tipo === 'parabola') {
                if (this.orientacao2D === 'horizontal') {
                    return `y² = ${fmt(4 * this.p)}x   (p = ${fmt(this.p)})`;
                }
                return `x² = ${fmt(4 * this.p)}y   (p = ${fmt(this.p)})`;
            }
            if (this.tipo === 'hiperbole') {
                if (this.orientacao2D === 'vertical') {
                    return `y²/${fmt(this.a * this.a)} - x²/${fmt(this.b * this.b)} = 1`;
                }
                return `x²/${fmt(this.a * this.a)} - y²/${fmt(this.b * this.b)} = 1`;
            }
            return '';
        }

        equacaoPlanoTexto() {
            const fmt = (n) => Number(n.toFixed(3)).toString();
            if (this.tipo === 'circunferencia') {
                return `y = ${fmt(this.distancia)}`;
            }
            if (this.tipo === 'hiperbole') {
                const cosA = Math.cos(this.alphaRad);
                const sinA = Math.sin(this.alphaRad);
                return `${fmt(cosA)}·y + ${fmt(sinA)}·z = ${fmt(this.dPerp)}`;
            }
            return `y + ${fmt(this.inclinacao)}·z = ${fmt(this.distancia)}`;
        }
    }

    return { Conica, vec3, add3, sub3, mul3, dot3, len3, norm3 };
})();
