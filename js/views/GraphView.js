/**
 * GraphViewクラス
 * シミュレーション世界（p5.js）と興味グラフ（Canvas API）の描画を担当
 */

import { CONFIG, PARAMS } from '../config.js';

export default class GraphView {
    constructor() {
        // グラフ用Canvas（Vanilla JS）のセットアップ
        this.graphCanvas = document.getElementById('graph-canvas');
        this.ctx = this.graphCanvas.getContext('2d');
        this._setupHighDPI();
    }

    /**
     * 高DPIディスプレイ（Retina等）対応のためのスケーリング
     * @private
     */
    _setupHighDPI() {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = 640;
        const displayHeight = 160;
        this.graphCanvas.width = displayWidth * dpr;
        this.graphCanvas.height = displayHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.W = displayWidth;
        this.H = displayHeight;
    }

    /**
     * メインのシミュレーション画面を描画（p5.jsのloopから呼ばれる）
     * @param {Group[]} groups 
     */
    renderSimulation(groups) {
        background(15, 15, 22);
        groups.forEach(group => this._drawGroup(group));
    }

    /**
     * グループ全体の描画（枠、トピック、メンバー）
     * @private
     */
    _drawGroup(group) {
        const { bounds, topics, members, halted, id } = group;
        const scaleFactor = PARAMS.singleGroupMode ? 1.8 : 1.0;
        const tileW = bounds.w / 5; // gridCols
        const tileH = bounds.h / 4; // gridRows

        // 1. トピックグリッドの描画
        topics.forEach(topic => {
            const isCurrent = topic.id === group.currentTopicIndex;
            this._drawTopic(topic, isCurrent, bounds, tileW, tileH, scaleFactor);
        });

        // 2. グループ境界線
        noFill();
        stroke(halted ? color(255, 80, 80) : color(80, 90, 110));
        strokeWeight(halted ? 3 : 2);
        rect(bounds.x, bounds.y, bounds.w, bounds.h, 3);

        // 3. メンバーの描画
        members.filter(m => !m.leftOut).forEach(m => this._drawMember(m, scaleFactor));
        members.filter(m => m.leftOut).forEach(m => this._drawMember(m, scaleFactor));

        // 4. ラベル表示
        this._drawGroupLabels(group, scaleFactor);
    }

    /**
     * 個々のメンバー（三角形または凍結アイコン）を描画
     * @private
     */
    _drawMember(member, scaleFactor) {
        push();
        translate(member.pos.x, member.pos.y);

        if (member.leftOut) {
            // 離脱メンバー（❄️）
            let pulse = sin(frameCount * 0.12) * 3 + 14 * scaleFactor;
            fill(255, 60, 60, 40);
            noStroke();
            ellipse(0, 0, pulse + 8 * scaleFactor, pulse + 8 * scaleFactor);
            fill(70, 70, 80);
            stroke(255, 80, 80);
            strokeWeight(2);
            ellipse(0, 0, pulse, pulse);
            // 簡易的なバツ印
            stroke(255, 120, 120);
            line(-3, -3, 3, 3); line(-3, 3, 3, -3);
        } else {
            // アクティブメンバー（三角形）
            const interestNorm = member.getInterestNormalized();
            const size = map(interestNorm, 0, 1, 4, 10) * scaleFactor;
            const brightness = map(interestNorm, 0, 1, 0.35, 1.0);
            
            if (member.vel.mag() > 0.05) rotate(member.vel.heading());

            const c = color(member.color);
            fill(red(c) * brightness + 30, green(c) * brightness + 30, blue(c) * brightness + 30, 220);
            stroke(c);
            strokeWeight(1.5 * scaleFactor);
            triangle(size, 0, -size * 0.5, size * 0.5, -size * 0.5, -size * 0.5);
        }
        pop();
    }

    /**
     * 個々のトピックタイルの描画
     * @private
     */
    _drawTopic(topic, isCurrent, bounds, tileW, tileH, scaleFactor) {
        const x = bounds.x + topic.gridX * tileW;
        const y = bounds.y + topic.gridY * tileH;

        // config.jsから取得した次元の色をp5.jsのcolorに変換
        const primaryColor = color(CONFIG.dimensionColors[topic.primaryDim]);

        if (isCurrent) {
            fill(red(primaryColor) * 0.35, green(primaryColor) * 0.35, blue(primaryColor) * 0.35);
            stroke(primaryColor);
            strokeWeight(2 * scaleFactor);
        } else {
            const shade = topic.heat > 0.3 ? 0.18 : 0.12;
            fill(red(primaryColor) * shade, green(primaryColor) * shade, blue(primaryColor) * shade);
            stroke(red(primaryColor) * 0.3, green(primaryColor) * 0.3, blue(primaryColor) * 0.3);
            strokeWeight(1);
        }

        rect(x, y, tileW, tileH);

        // トピック名の描画
        fill(isCurrent ? 255 : 100);
        noStroke();
        textSize(5 * scaleFactor);
        textAlign(CENTER, CENTER);
        text(topic.getShortName().substr(0, PARAMS.singleGroupMode ? 8 : 5), x + tileW / 2, y + tileH / 2);
    }

    /**
     * グループのラベル（G1、❄️数、停止表示など）の描画
     * @private
     */
    _drawGroupLabels(group, scaleFactor) {
        const { bounds, halted, id } = group;
        
        fill(255);
        noStroke();
        textSize(7 * scaleFactor);
        textAlign(LEFT, TOP);
        text(CONFIG.groupNames[id], bounds.x + 3, bounds.y + 2);

        const frozen = group.getLeftOutCount();
        if (frozen > 0) {
            fill(255, 100, 100);
            text(`❄️${frozen}`, bounds.x + 16 * scaleFactor, bounds.y + 2);
        }

        if (halted) {
            fill(60, 20, 20, 200);
            rect(bounds.x, bounds.y, bounds.w, bounds.h);
            fill(255, 100, 100);
            textSize(9 * scaleFactor);
            textAlign(CENTER, CENTER);
            text('⛔ HALTED', bounds.x + bounds.w / 2, bounds.y + bounds.h / 2 - 6 * scaleFactor);
        }
    }

    /**
     * 興味変動グラフ（積み上げ面グラフ）を描画
     * @param {Group} group 
     */
    renderInterestGraph(group) {
        const { ctx, W, H } = this;
        const history = group.interestHistory;
        if (history.length < 2) return;

        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        const margin = { left: 45, right: 15, top: 20, bottom: 25 };
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;
        const maxY = CONFIG.groupSize * CONFIG.maxInterest;

        // 背景グリッドと軸の描画（省略）...

        // 積み上げ面グラフの描画
        for (let m = CONFIG.groupSize - 1; m >= 0; m--) {
            ctx.beginPath();
            history.forEach((snap, i) => {
                const x = margin.left + (i / (history.length - 1)) * plotW;
                let cumulative = 0;
                for (let j = m; j < CONFIG.groupSize; j++) {
                    if (!snap[j].leftOut) cumulative += snap[j].interest;
                }
                const y = margin.top + plotH - (cumulative / maxY) * plotH;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            // 下端を閉じるロジック（省略）...
            ctx.fillStyle = CONFIG.memberColors[m] + '99';
            ctx.fill();
        }
    }
}