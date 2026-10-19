// ============================================================================
//  RENDERIZADOR 3D (CONE DUPLO + PLANO DE CORTE + CURVA) E VISTA 2D NO PLANO
// ============================================================================
//  Fiel ao estilo visual da imagem de referência das 4 cônicas e do projeto
//  original em C# (aline/Conicas):
//    • Iluminação meio-Lambert com faixa especular suave no cone duplo
//    • Face interna escura visível na abertura onde o plano corta o cone
//    • Plano de corte translúcido subdividido com ordenação de profundidade (Z-sort)
//    • Curva da seção cônica em vermelho vivo projetada com nitidez
//    • Vista 2D completa com focos, vértices, diretrizes, assíntotas e ponto P móvel
// ============================================================================

window.Cena3D = (function () {
    const { Conica } = window.ConicasModel;
    const TAU = Math.PI * 2;

    // Direção da luz (quase horizontal, produz o degradê metálico azulado clássico)
    const LUZ = normalizar3({ x: -0.58, y: 0.16, z: 0.80 });

    const TEMAS = {
        claro: {
            nome: 'claro',
            fundo: '#f3f6fa',
            coneClaro: [192, 206, 222],
            coneEscuro: [54, 72, 96],
            coneInterno: [38, 52, 70],
            tampa: [110, 128, 152],
            aresta: 'rgba(56, 70, 90, 0.78)',
            planoPreenche: [255, 255, 255, 0.34],
            planoBorda: 'rgba(24, 30, 42, 0.88)',
            curva: '#d62028',
            curvaBrilho: 'rgba(214, 32, 40, 0.22)',
            texto: '#141a24',
            textoFraco: '#5f6c80',
            destaque: '#145aa0',
            foco: '#d97706',
            vertice: '#15803d',
            assintota: 'rgba(100, 116, 139, 0.65)',
            diretriz: '#b45309',
            raioFocal: '#ca8a04',
            grade2D: 'rgba(148, 163, 184, 0.28)',
            eixo2D: 'rgba(71, 85, 105, 0.72)'
        },
        escuro: {
            nome: 'escuro',
            fundo: '#12121c',
            coneClaro: [186, 200, 218],
            coneEscuro: [44, 58, 78],
            coneInterno: [26, 34, 46],
            tampa: [58, 74, 96],
            aresta: 'rgba(150, 168, 190, 0.75)',
            planoPreenche: [150, 195, 240, 0.17],
            planoBorda: 'rgba(210, 228, 248, 0.88)',
            curva: '#ff4646',
            curvaBrilho: 'rgba(255, 70, 70, 0.28)',
            texto: '#ecf0f8',
            textoFraco: '#828ca0',
            destaque: '#5ac8ff',
            foco: '#ffbe3c',
            vertice: '#78ff8c',
            assintota: 'rgba(148, 163, 184, 0.5)',
            diretriz: '#fbbf24',
            raioFocal: '#fde047',
            grade2D: 'rgba(71, 85, 105, 0.32)',
            eixo2D: 'rgba(148, 163, 184, 0.65)'
        }
    };

    function normalizar3(v) {
        const l = Math.hypot(v.x, v.y, v.z);
        return l < 1e-8 ? { x: 0, y: 1, z: 0 } : { x: v.x / l, y: v.y / l, z: v.z / l };
    }

    function dot3(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    function sub3(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    function misturarRGB(c1, c2, k, alpha = 1) {
        const t = Math.max(0, Math.min(1, k));
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        return alpha >= 0.999 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
    }

    // Monta a câmera 3D orbital
    function montarCamera(azimuteGraus, elevacaoGraus, distancia, alvo, fovGraus = 34) {
        const az = (azimuteGraus * Math.PI) / 180;
        const el = (elevacaoGraus * Math.PI) / 180;
        const pos = {
            x: alvo.x + distancia * Math.cos(el) * Math.sin(az),
            y: alvo.y + distancia * Math.sin(el),
            z: alvo.z + distancia * Math.cos(el) * Math.cos(az)
        };

        const forward = normalizar3(sub3(alvo, pos));
        const upMundo = { x: 0, y: 1, z: 0 };
        const right = normalizar3({
            x: forward.y * upMundo.z - forward.z * upMundo.y,
            y: forward.z * upMundo.x - forward.x * upMundo.z,
            z: forward.x * upMundo.y - forward.y * upMundo.x
        });
        const up = {
            x: right.y * forward.z - right.z * forward.y,
            y: right.z * forward.x - right.x * forward.z,
            z: right.x * forward.y - right.y * forward.x
        };

        return { pos, alvo, forward, right, up, fovRad: (fovGraus * Math.PI) / 180 };
    }

    // Projeta um ponto 3D para coordenadas 2D do canvas + profundidade Z na câmera
    function projetar(p, cam, largura, altura) {
        const rel = sub3(p, cam.pos);
        const zCam = dot3(rel, cam.forward);
        if (zCam <= 0.05) return null;

        const xCam = dot3(rel, cam.right);
        const yCam = dot3(rel, cam.up);

        const f = (altura * 0.5) / Math.tan(cam.fovRad * 0.5);
        return {
            x: largura * 0.5 + (xCam * f) / zCam,
            y: altura * 0.5 - (yCam * f) / zCam,
            z: zCam
        };
    }

    function corSuperficieCone(p, cam, tema) {
        const n = Conica.normalCone(p);
        const vista = normalizar3(sub3(cam.pos, p));

        // Face interna do cone (visível através da abertura do corte!)
        if (dot3(n, vista) < 0) {
            const difInt = 0.5 + 0.5 * dot3({ x: -n.x, y: -n.y, z: -n.z }, LUZ);
            return misturarRGB(tema.coneInterno, tema.tampa, 0.55 * Math.max(0, Math.min(1, difInt)));
        }

        // Face externa: sombreamento meio-Lambert idêntico ao Cena3D.cs
        const dif = 0.5 + 0.5 * dot3(n, LUZ);
        const k = 0.07 + 0.93 * Math.pow(Math.max(0, Math.min(1, dif)), 2.1);
        return misturarRGB(tema.coneEscuro, tema.coneClaro, k);
    }

    // ========================================================================
    //  DESENHO COMPLETO DA CENA 3D
    // ========================================================================
    function desenharCena3D(ctx, conica, opcoes = {}) {
        const largura = opcoes.largura || ctx.canvas.width;
        const altura = opcoes.altura || ctx.canvas.height;
        const tema = TEMAS[opcoes.tema || 'claro'];
        const wireframe = !!opcoes.wireframe;
        const mostrarElementos = opcoes.mostrarElementos !== false;
        const nTheta = opcoes.nTheta || 96;
        const nS = opcoes.nS || 16;
        const espessuraCurva = opcoes.espessuraCurva || 3.2;

        const alturaCena = conica.alturaSup + conica.alturaInf;
        const azimute = opcoes.azimute !== undefined ? opcoes.azimute : 24;
        const elevacao = opcoes.elevacao !== undefined ? opcoes.elevacao : 18;
        const zoom = opcoes.zoom || 1.0;

        const alvo = {
            x: 0,
            y: (conica.alturaSup - conica.alturaInf) * 0.46,
            z: 0
        };
        const distancia = (alturaCena * 3.15) / zoom;
        const cam = montarCamera(azimute, elevacao, distancia, alvo, 34);

        // Limpa fundo se solicitado
        if (opcoes.limparFundo !== false) {
            ctx.fillStyle = tema.fundo;
            ctx.fillRect(0, 0, largura, altura);
        }

        const faces = [];
        const passoTheta = TAU / nTheta;

        // 1. Gerar quadriláteros da Folha Superior (+1) e Folha Inferior (-1)
        for (const sinal of [+1, -1]) {
            for (let i = 0; i < nTheta; i++) {
                const th0 = i * passoTheta;
                const th1 = (i + 1) * passoTheta;

                const l0 = sinal > 0 ? conica.limiteFolhaSup(th0) : conica.limiteFolhaInf(th0);
                const l1 = sinal > 0 ? conica.limiteFolhaSup(th1) : conica.limiteFolhaInf(th1);

                for (let j = 0; j < nS; j++) {
                    const s0 = j / nS;
                    const s1 = (j + 1) / nS;

                    const p00 = Conica.pontoConeFolha(th0, l0 * s0, sinal);
                    const p01 = Conica.pontoConeFolha(th0, l0 * s1, sinal);
                    const p11 = Conica.pontoConeFolha(th1, l1 * s1, sinal);
                    const p10 = Conica.pontoConeFolha(th1, l1 * s0, sinal);

                    const centro = {
                        x: (p00.x + p01.x + p11.x + p10.x) * 0.25,
                        y: (p00.y + p01.y + p11.y + p10.y) * 0.25,
                        z: (p00.z + p01.z + p11.z + p10.z) * 0.25
                    };
                    const distCam = Math.hypot(centro.x - cam.pos.x, centro.y - cam.pos.y, centro.z - cam.pos.z);

                    faces.push({
                        tipo: 'cone',
                        pts: [p00, p01, p11, p10],
                        centro,
                        dist: distCam
                    });
                }
            }
        }

        // 2. Tampa circular da base da folha inferior (onde não foi cortada pelo plano)
        const centroBaseInf = { x: 0, y: -conica.alturaInf, z: 0 };
        const corTampa = `rgb(${tema.tampa[0]},${tema.tampa[1]},${tema.tampa[2]})`;
        for (let i = 0; i < nTheta; i++) {
            const th0 = i * passoTheta;
            const th1 = (i + 1) * passoTheta;
            const l0 = conica.limiteFolhaInf(th0);
            const l1 = conica.limiteFolhaInf(th1);

            // Só desenha o setor da tampa onde a geratriz atinge a base inferior
            if (Math.abs(l0 - conica.alturaInf) < 1e-2 && Math.abs(l1 - conica.alturaInf) < 1e-2) {
                const a = Conica.pontoConeFolha(th0, l0, -1);
                const b = Conica.pontoConeFolha(th1, l1, -1);
                const cTri = {
                    x: (centroBaseInf.x + a.x + b.x) / 3,
                    y: (centroBaseInf.y + a.y + b.y) / 3,
                    z: (centroBaseInf.z + a.z + b.z) / 3
                };
                const distCam = Math.hypot(cTri.x - cam.pos.x, cTri.y - cam.pos.y, cTri.z - cam.pos.z);
                faces.push({
                    tipo: 'tampa',
                    pts: [centroBaseInf, a, b],
                    arestaExt: [a, b],
                    dist: distCam
                });
            }
        }

        // 3. Subdividir o plano de corte translúcido em uma grade fina para ordenação Z exata
        const cantos = conica.planoCantos();
        const divPlano = 22;
        const pFill = tema.planoPreenche;
        const corPlano = `rgba(${pFill[0]},${pFill[1]},${pFill[2]},${pFill[3]})`;

        function interpBilinear(u, v) {
            // cantos: 0=(-u,-v), 1=(+u,-v), 2=(+u,+v), 3=(-u,+v)
            const ax = cantos[0].x + (cantos[1].x - cantos[0].x) * u;
            const ay = cantos[0].y + (cantos[1].y - cantos[0].y) * u;
            const az = cantos[0].z + (cantos[1].z - cantos[0].z) * u;

            const bx = cantos[3].x + (cantos[2].x - cantos[3].x) * u;
            const by = cantos[3].y + (cantos[2].y - cantos[3].y) * u;
            const bz = cantos[3].z + (cantos[2].z - cantos[3].z) * u;

            return {
                x: ax + (bx - ax) * v,
                y: ay + (by - ay) * v,
                z: az + (bz - az) * v
            };
        }

        for (let iu = 0; iu < divPlano; iu++) {
            const u0 = iu / divPlano;
            const u1 = (iu + 1) / divPlano;
            for (let iv = 0; iv < divPlano; iv++) {
                const v0 = iv / divPlano;
                const v1 = (iv + 1) / divPlano;
                const q00 = interpBilinear(u0, v0);
                const q10 = interpBilinear(u1, v0);
                const q11 = interpBilinear(u1, v1);
                const q01 = interpBilinear(u0, v1);
                const cQuad = {
                    x: (q00.x + q10.x + q11.x + q01.x) * 0.25,
                    y: (q00.y + q10.y + q11.y + q01.y) * 0.25,
                    z: (q00.z + q10.z + q11.z + q01.z) * 0.25
                };
                const distCam = Math.hypot(cQuad.x - cam.pos.x, cQuad.y - cam.pos.y, cQuad.z - cam.pos.z);
                faces.push({
                    tipo: 'plano',
                    pts: [q00, q10, q11, q01],
                    dist: distCam
                });
            }
        }

        // Ordena do mais distante para o mais próximo (algoritmo do pintor)
        faces.sort((a, b) => b.dist - a.dist);

        // Renderiza todas as faces 3D ordenadas
        for (let idx = 0; idx < faces.length; idx++) {
            const f = faces[idx];
            const proj = [];
            let valido = true;
            for (let k = 0; k < f.pts.length; k++) {
                const s = projetar(f.pts[k], cam, largura, altura);
                if (!s) { valido = false; break; }
                proj.push(s);
            }
            if (!valido) continue;

            if (f.tipo === 'cone') {
                if (wireframe) {
                    ctx.strokeStyle = tema.aresta;
                    ctx.lineWidth = 0.75;
                    ctx.beginPath();
                    ctx.moveTo(proj[0].x, proj[0].y);
                    ctx.lineTo(proj[1].x, proj[1].y);
                    ctx.lineTo(proj[2].x, proj[2].y);
                    ctx.stroke();
                } else {
                    const cor = corSuperficieCone(f.centro, cam, tema);
                    ctx.fillStyle = cor;
                    ctx.strokeStyle = cor;
                    ctx.lineWidth = 0.65;
                    ctx.beginPath();
                    ctx.moveTo(proj[0].x, proj[0].y);
                    ctx.lineTo(proj[1].x, proj[1].y);
                    ctx.lineTo(proj[2].x, proj[2].y);
                    ctx.lineTo(proj[3].x, proj[3].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            } else if (f.tipo === 'tampa') {
                if (!wireframe) {
                    ctx.fillStyle = corTampa;
                    ctx.strokeStyle = corTampa;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(proj[0].x, proj[0].y);
                    ctx.lineTo(proj[1].x, proj[1].y);
                    ctx.lineTo(proj[2].x, proj[2].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                // Aresta circular da base inferior
                ctx.strokeStyle = tema.aresta;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(proj[1].x, proj[1].y);
                ctx.lineTo(proj[2].x, proj[2].y);
                ctx.stroke();
            } else if (f.tipo === 'plano') {
                ctx.fillStyle = corPlano;
                ctx.beginPath();
                ctx.moveTo(proj[0].x, proj[0].y);
                ctx.lineTo(proj[1].x, proj[1].y);
                ctx.lineTo(proj[2].x, proj[2].y);
                ctx.lineTo(proj[3].x, proj[3].y);
                ctx.closePath();
                ctx.fill();
            }
        }

        // 4. Desenha aresta circular superior nas partes não cortadas pelo plano (Parábola e Hipérbole)
        if (conica.tipo === 'parabola' || conica.tipo === 'hiperbole') {
            ctx.strokeStyle = tema.aresta;
            ctx.lineWidth = 1.25;
            for (let i = 0; i < nTheta; i++) {
                const th0 = i * passoTheta;
                const th1 = (i + 1) * passoTheta;
                const l0 = conica.limiteFolhaSup(th0);
                const l1 = conica.limiteFolhaSup(th1);
                if (Math.abs(l0 - conica.alturaSup) < 1e-2 && Math.abs(l1 - conica.alturaSup) < 1e-2) {
                    const pA = projetar(Conica.pontoConeFolha(th0, l0, +1), cam, largura, altura);
                    const pB = projetar(Conica.pontoConeFolha(th1, l1, +1), cam, largura, altura);
                    if (pA && pB) {
                        ctx.beginPath();
                        ctx.moveTo(pA.x, pA.y);
                        ctx.lineTo(pB.x, pB.y);
                        ctx.stroke();
                    }
                }
            }
        }

        // 5. Desenha o contorno retangular do plano de corte por cima (linhas finas e nítidas)
        ctx.strokeStyle = tema.planoBorda;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = projetar(cantos[i], cam, largura, altura);
            const b = projetar(cantos[(i + 1) % 4], cam, largura, altura);
            if (a && b) {
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
            }
        }
        ctx.stroke();

        // 6. Desenha a curva vermelha da seção cônica (interseção plano ∩ cone)
        const ramos = conica.obterRamosCurva3D(640);
        for (const ramo of ramos) {
            if (ramo.length < 2) continue;

            // Halo suave para destaque
            ctx.strokeStyle = tema.curvaBrilho;
            ctx.lineWidth = espessuraCurva * 2.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            let iniciou = false;
            for (let i = 0; i < ramo.length; i++) {
                const s = projetar(ramo[i], cam, largura, altura);
                if (!s) continue;
                if (!iniciou) { ctx.moveTo(s.x, s.y); iniciou = true; }
                else ctx.lineTo(s.x, s.y);
            }
            ctx.stroke();

            // Traço principal nítido
            ctx.strokeStyle = tema.curva;
            ctx.lineWidth = espessuraCurva;
            ctx.beginPath();
            iniciou = false;
            for (let i = 0; i < ramo.length; i++) {
                const s = projetar(ramo[i], cam, largura, altura);
                if (!s) continue;
                if (!iniciou) { ctx.moveTo(s.x, s.y); iniciou = true; }
                else ctx.lineTo(s.x, s.y);
            }
            ctx.stroke();
        }

        // 7. Elementos geométricos em 3D (Centro, Focos, Vértices)
        if (mostrarElementos) {
            const elem = conica.elementos3D();
            for (const v of elem.vertices) {
                const s = projetar(v, cam, largura, altura);
                if (s) desenharMarcador(ctx, s.x, s.y, 4.2, tema.vertice, tema.fundo, '');
            }
            for (const f of elem.focos) {
                const s = projetar(f.pos, cam, largura, altura);
                if (s) desenharMarcador(ctx, s.x, s.y, 5.2, tema.foco, tema.fundo, f.rotulo);
            }
            if (elem.centro) {
                const s = projetar(elem.centro, cam, largura, altura);
                if (s) desenharMarcador(ctx, s.x, s.y, 4.0, tema.texto, tema.fundo, 'C');
            }
        }
    }

    function desenharMarcador(ctx, x, y, raio, cor, corBorda, rotulo) {
        ctx.fillStyle = cor;
        ctx.strokeStyle = corBorda;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x, y, raio, 0, TAU);
        ctx.fill();
        ctx.stroke();

        if (rotulo) {
            ctx.font = 'bold 13px "Inter", "Segoe UI", system-ui, sans-serif';
            ctx.fillStyle = cor;
            ctx.fillText(rotulo, x + 7, y - 6);
        }
    }

    // ========================================================================
    //  VISTA 2D NO PLANO DO CORTE (COM PONTO P ANIMADO E PROPRIEDADE FOCAL)
    // ========================================================================
    function desenharVista2D(ctx, conica, opcoes = {}) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const tema = TEMAS[opcoes.tema || 'claro'];
        const anguloP = opcoes.anguloP || 0;
        const mostrarDiretrizes = opcoes.mostrarDiretrizes !== false;

        ctx.fillStyle = tema.fundo;
        ctx.fillRect(0, 0, w, h);

        const ox = w * 0.5;
        const oy = h * 0.52;

        // Define escala automática baseada no tamanho da cônica
        let maxExt = 6;
        if (conica.tipo === 'circunferencia') maxExt = conica.a * 1.45;
        else if (conica.tipo === 'elipse') maxExt = Math.max(conica.a, conica.b) * 1.42;
        else if (conica.tipo === 'parabola') maxExt = Math.max(conica.p * 4.2, 3.5);
        else if (conica.tipo === 'hiperbole') maxExt = Math.max(conica.a, conica.b) * 2.55;

        const escala = Math.min(w, h) * 0.43 / Math.max(0.5, maxExt);
        const mapa = (x, y) => ({ x: ox + x * escala, y: oy - y * escala });

        // Grade cartesiana suave
        const passoGrade = escolherPassoGrade(maxExt);
        ctx.strokeStyle = tema.grade2D;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = -Math.ceil(maxExt * 1.6 / passoGrade) * passoGrade; gx <= maxExt * 1.6; gx += passoGrade) {
            const p1 = mapa(gx, -maxExt * 1.6);
            const p2 = mapa(gx, +maxExt * 1.6);
            ctx.moveTo(p1.x, 0);
            ctx.lineTo(p2.x, h);
        }
        for (let gy = -Math.ceil(maxExt * 1.6 / passoGrade) * passoGrade; gy <= maxExt * 1.6; gy += passoGrade) {
            const p1 = mapa(-maxExt * 1.6, gy);
            const p2 = mapa(+maxExt * 1.6, gy);
            ctx.moveTo(0, p1.y);
            ctx.lineTo(w, p2.y);
        }
        ctx.stroke();

        // Eixos X e Y
        ctx.strokeStyle = tema.eixo2D;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(10, oy);
        ctx.lineTo(w - 10, oy);
        ctx.moveTo(ox, 10);
        ctx.lineTo(ox, h - 10);
        ctx.stroke();

        ctx.font = '12px "Inter", system-ui, sans-serif';
        ctx.fillStyle = tema.textoFraco;
        ctx.fillText('x', w - 18, oy - 6);
        ctx.fillText('y', ox + 7, 18);

        let infoPontoP = '';

        // ---- 1. CIRCUNFERÊNCIA ----
        if (conica.tipo === 'circunferencia') {
            const R = conica.a;
            const c0 = mapa(0, 0);

            // Curva
            ctx.strokeStyle = tema.curva;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.arc(c0.x, c0.y, R * escala, 0, TAU);
            ctx.stroke();

            // Semieixo/raio r
            const pR = mapa(R, 0);
            ctx.strokeStyle = tema.vertice;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y);
            ctx.lineTo(pR.x, pR.y);
            ctx.stroke();
            ctx.fillStyle = tema.vertice;
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillText(`r = ${ fmtCurto(R) }`, (c0.x + pR.x) * 0.5 - 12, c0.y + 15);

            // Ponto P móvel
            const px = R * Math.cos(anguloP);
            const py = R * Math.sin(anguloP);
            const P = mapa(px, py);

            ctx.strokeStyle = tema.raioFocal;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y);
            ctx.lineTo(P.x, P.y);
            ctx.stroke();
            ctx.setLineDash([]);

            desenharMarcador(ctx, c0.x, c0.y, 4, tema.texto, tema.fundo, 'C');
            desenharMarcador(ctx, P.x, P.y, 4.5, tema.raioFocal, tema.fundo, 'P');
            infoPontoP = `d(P, C) = r = ${fmtCurto(R)}`;
        }

        // ---- 2. ELIPSE ----
        else if (conica.tipo === 'elipse') {
            const A = conica.a;
            const B = conica.b;
            const c = conica.c;
            const e = conica.excentricidade;

            // Diretrizes opcionais x = ± a/e
            if (mostrarDiretrizes && e > 0.02) {
                const xd = A / e;
                ctx.strokeStyle = tema.diretriz;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([5, 4]);
                for (const s of [-1, 1]) {
                    const d1 = mapa(s * xd, -maxExt * 1.5);
                    const d2 = mapa(s * xd, +maxExt * 1.5);
                    ctx.beginPath();
                    ctx.moveTo(d1.x, 0);
                    ctx.lineTo(d2.x, h);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }

            // Semieixos a e b
            const c0 = mapa(0, 0);
            const pA = mapa(A, 0);
            const pB = mapa(0, B);
            ctx.strokeStyle = tema.vertice;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y); ctx.lineTo(pA.x, pA.y);
            ctx.moveTo(c0.x, c0.y); ctx.lineTo(pB.x, pB.y);
            ctx.stroke();

            ctx.fillStyle = tema.vertice;
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillText('a', (c0.x + pA.x) * 0.5, c0.y + 14);
            ctx.fillText('b', c0.x + 6, (c0.y + pB.y) * 0.5);

            // Curva da elipse
            ctx.strokeStyle = tema.curva;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            const passos = 200;
            for (let i = 0; i <= passos; i++) {
                const t = (TAU * i) / passos;
                const pt = mapa(A * Math.cos(t), B * Math.sin(t));
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();
            ctx.stroke();

            // Ponto P móvel e raios focais PF1 + PF2 = 2a
            const px = A * Math.cos(anguloP);
            const py = B * Math.sin(anguloP);
            const P = mapa(px, py);
            const F1 = mapa(-c, 0);
            const F2 = mapa(+c, 0);

            ctx.strokeStyle = tema.raioFocal;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(F1.x, F1.y); ctx.lineTo(P.x, P.y);
            ctx.lineTo(F2.x, F2.y);
            ctx.stroke();
            ctx.setLineDash([]);

            desenharMarcador(ctx, F1.x, F1.y, 4.2, tema.foco, tema.fundo, 'F1');
            desenharMarcador(ctx, F2.x, F2.y, 4.2, tema.foco, tema.fundo, 'F2');
            desenharMarcador(ctx, c0.x, c0.y, 3.5, tema.texto, tema.fundo, '');
            desenharMarcador(ctx, P.x, P.y, 4.5, tema.raioFocal, tema.fundo, 'P');

            const d1 = Math.hypot(px + c, py);
            const d2 = Math.hypot(px - c, py);
            infoPontoP = `d(P,F₁)+d(P,F₂) = ${fmtCurto(d1)} + ${fmtCurto(d2)} = ${fmtCurto(d1 + d2)} (2a)`;
        }

        // ---- 3. PARÁBOLA ----
        else if (conica.tipo === 'parabola') {
            const p = conica.p;
            const horiz = conica.orientacao2D === 'horizontal';

            // Reta diretriz: y = -p (ou x = -p)
            if (mostrarDiretrizes) {
                ctx.strokeStyle = tema.diretriz;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                if (horiz) {
                    const d = mapa(-p, 0);
                    ctx.moveTo(d.x, 0);
                    ctx.lineTo(d.x, h);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = tema.diretriz;
                    ctx.fillText(`diretriz x = -${fmtCurto(p)}`, d.x + 5, h - 12);
                } else {
                    const d = mapa(0, -p);
                    ctx.moveTo(0, d.y);
                    ctx.lineTo(w, d.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = tema.diretriz;
                    ctx.fillText(`diretriz y = -${fmtCurto(p)}`, 12, d.y - 6);
                }
            }

            // Curva da parábola
            ctx.strokeStyle = tema.curva;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            const uLim = maxExt * 1.35;
            const passos = 160;
            for (let i = 0; i <= passos; i++) {
                const u = -uLim + (2 * uLim * i) / passos;
                const v = (u * u) / (4 * p);
                const pt = horiz ? mapa(v, u) : mapa(u, v);
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();

            // Ponto P oscilando na parábola e propriedade d(P,F) = d(P, diretriz)
            const uP = Math.sin(anguloP) * (p * 2.6);
            const vP = (uP * uP) / (4 * p);
            const P = horiz ? mapa(vP, uP) : mapa(uP, vP);
            const F = horiz ? mapa(p, 0) : mapa(0, p);
            const Dproj = horiz ? mapa(-p, uP) : mapa(uP, -p);
            const V = mapa(0, 0);

            ctx.strokeStyle = tema.raioFocal;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(F.x, F.y); ctx.lineTo(P.x, P.y);
            ctx.moveTo(P.x, P.y); ctx.lineTo(Dproj.x, Dproj.y);
            ctx.stroke();
            ctx.setLineDash([]);

            desenharMarcador(ctx, V.x, V.y, 4.0, tema.vertice, tema.fundo, 'V');
            desenharMarcador(ctx, F.x, F.y, 4.5, tema.foco, tema.fundo, 'F');
            desenharMarcador(ctx, P.x, P.y, 4.5, tema.raioFocal, tema.fundo, 'P');

            const distFocal = vP + p;
            infoPontoP = `d(P,F) = d(P,d) = ${fmtCurto(distFocal)}`;
        }

        // ---- 4. HIPÉRBOLE ----
        else if (conica.tipo === 'hiperbole') {
            const A = conica.a;
            const B = conica.b;
            const c = conica.c;
            const vert = conica.orientacao2D === 'vertical';

            // Assíntotas y = ±(b/a)x (ou ±(a/b)x se vertical)
            const mAssint = vert ? A / B : B / A;
            ctx.strokeStyle = tema.assintota;
            ctx.lineWidth = 1.3;
            ctx.setLineDash([5, 4]);
            for (const s of [-1, 1]) {
                const p1 = mapa(-maxExt * 1.5, -s * mAssint * maxExt * 1.5);
                const p2 = mapa(+maxExt * 1.5, +s * mAssint * maxExt * 1.5);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Dois ramos da hipérbole
            ctx.strokeStyle = tema.curva;
            ctx.lineWidth = 2.6;
            const tMax = 1.65;
            const passos = 140;
            for (const ramoSinal of [-1, 1]) {
                ctx.beginPath();
                for (let i = 0; i <= passos; i++) {
                    const t = -tMax + (2 * tMax * i) / passos;
                    const u = ramoSinal * A * Math.cosh(t);
                    const v = B * Math.sinh(t);
                    const pt = vert ? mapa(v, u) : mapa(u, v);
                    if (i === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
            }

            // Vértices, Focos e Ponto P móvel
            const tP = Math.sin(anguloP) * 1.15;
            const uP = A * Math.cosh(tP);
            const vP = B * Math.sinh(tP);
            const P = vert ? mapa(vP, uP) : mapa(uP, vP);

            const V1 = vert ? mapa(0, -A) : mapa(-A, 0);
            const V2 = vert ? mapa(0, +A) : mapa(+A, 0);
            const F1 = vert ? mapa(0, -c) : mapa(-c, 0);
            const F2 = vert ? mapa(0, +c) : mapa(+c, 0);

            ctx.strokeStyle = tema.raioFocal;
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(F1.x, F1.y); ctx.lineTo(P.x, P.y);
            ctx.lineTo(F2.x, F2.y);
            ctx.stroke();
            ctx.setLineDash([]);

            desenharMarcador(ctx, V1.x, V1.y, 4.0, tema.vertice, tema.fundo, 'A1');
            desenharMarcador(ctx, V2.x, V2.y, 4.0, tema.vertice, tema.fundo, 'A2');
            desenharMarcador(ctx, F1.x, F1.y, 4.5, tema.foco, tema.fundo, 'F1');
            desenharMarcador(ctx, F2.x, F2.y, 4.5, tema.foco, tema.fundo, 'F2');
            desenharMarcador(ctx, P.x, P.y, 4.5, tema.raioFocal, tema.fundo, 'P');

            const px = vert ? vP : uP;
            const py = vert ? uP : vP;
            const fx = vert ? 0 : c;
            const fy = vert ? c : 0;
            const d1 = Math.hypot(px + fx, py + fy);
            const d2 = Math.hypot(px - fx, py - fy);
            infoPontoP = `|d(P,F₁)-d(P,F₂)| = |${fmtCurto(d1)}-${fmtCurto(d2)}| = ${fmtCurto(Math.abs(d1 - d2))} (2a)`;
        }

        // Legenda da propriedade focal no rodapé da vista 2D
        if (infoPontoP) {
            ctx.font = '600 11.5px "Inter", system-ui, sans-serif';
            ctx.fillStyle = tema.texto;
            ctx.fillText(infoPontoP, 10, h - 10);
        }
    }

    function escolherPassoGrade(maxExt) {
        if (maxExt <= 4) return 1;
        if (maxExt <= 10) return 2;
        if (maxExt <= 25) return 5;
        return 10;
    }

    function fmtCurto(n) {
        return Number(n.toFixed(2)).toString();
    }

    return {
        TEMAS,
        desenharCena3D,
        desenharVista2D
    };
})();
