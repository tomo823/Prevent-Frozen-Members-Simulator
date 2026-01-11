/**
 * GraphViewクラス
 * シミュレーション世界（p5.js）と興味グラフ（Canvas API）の描画を担当
 */

import { CONFIG, PARAMS } from '../config.js';
import Member from '../models/Member.js';

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
        const displayHeight = 200;
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
     * 個々のメンバー（三角形）を描画
     * @private
     */
    _drawMember(member, scaleFactor) {
        push();
        translate(member.pos.x, member.pos.y);

        // --- 共通の計算を先に行う ---
        const interestNorm = member.getInterestNormalized();
        const size = map(interestNorm, 0, 1, 4, 10) * scaleFactor;
        const brightness = map(interestNorm, 0, 1, 0.35, 1.0);
        const c = color(member.color);

        // --- 状態に応じた描画 ---
        
        // 1. AT_RISK（離脱予兆）の場合
        if (member.state === Member.STATES.AT_RISK) {
            // 赤いパルス（脈動）エフェクト
            let pulse = sin(frameCount * 0.15) * 4 + 12 * scaleFactor;
            noFill();
            stroke(255, 60, 60, 150);
            strokeWeight(2 * scaleFactor);
            ellipse(0, 0, pulse, pulse);
            
            // 警告マークの表示（共通計算した size を使用）
            push();
            rotate(-member.vel.heading()); 
            textSize(10 * scaleFactor);
            textAlign(CENTER);
            fill(255, 60, 60);
            noStroke();
            text("⚠️", 0, -size - 5);
            pop();
        }

        // 2. メンバー本体（三角形）の描画（ACTIVE でも AT_RISK でも描画する）
        if (member.vel.mag() > 0.05) rotate(member.vel.heading());

        // 本体の色設定
        fill(red(c) * brightness + 30, green(c) * brightness + 30, blue(c) * brightness + 30, 220);
        stroke(c);
        strokeWeight(1.5 * scaleFactor);

        // AT_RISK なら輪郭を少し赤く強調
        if (member.state === Member.STATES.AT_RISK) {
            stroke(255, 100, 100);
        }

        triangle(size, 0, -size * 0.5, size * 0.5, -size * 0.5, -size * 0.5);

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

        // 背景をクリア
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        const margin = { left: 50, right: 20, top: 25, bottom: 35 };
        const plotW = W - margin.left - margin.right;
        const plotH = H - margin.top - margin.bottom;
        const maxY = CONFIG.groupSize * CONFIG.maxInterest; // 全メンバーの興味の総和の最大値

        // グリッド線の描画
        ctx.strokeStyle = '#2a3a5e';
        ctx.lineWidth = 1;
        
        // 横方向のグリッド線（縦軸の目盛りに対応）
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const y = margin.top + (plotH / yTicks) * i;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + plotW, y);
            ctx.stroke();
        }
        
        // 縦方向のグリッド線（横軸の目盛りに対応）
        const xTicks = Math.min(history.length - 1, 10);
        for (let i = 0; i <= xTicks; i++) {
            const x = margin.left + (plotW / xTicks) * i;
            ctx.beginPath();
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, margin.top + plotH);
            ctx.stroke();
        }

        // 軸の描画
        ctx.strokeStyle = '#4a5a7e';
        ctx.lineWidth = 2;
        
        // 縦軸（左）
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.stroke();
        
        // 横軸（下）
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + plotH);
        ctx.lineTo(margin.left + plotW, margin.top + plotH);
        ctx.stroke();

        // 縦軸のラベル（興味度の値）
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= yTicks; i++) {
            const value = maxY - (maxY / yTicks) * i;
            const y = margin.top + (plotH / yTicks) * i;
            ctx.fillText(value.toFixed(0), margin.left - 8, y);
        }

        // 横軸のラベル（時間/フレーム）
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= xTicks; i++) {
            const x = margin.left + (plotW / xTicks) * i;
            const index = Math.floor((i / xTicks) * (history.length - 1));
            ctx.fillText(index.toString(), x, margin.top + plotH + 8);
        }

        // 軸のタイトル
        ctx.save();
        ctx.translate(15, margin.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Total Interest', 0, 0);
        ctx.restore();

        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Time (frames)', margin.left + plotW / 2, margin.top + plotH + 20);

        // 積み上げ面グラフの描画（各メンバーを色分け）
        
        // 各メンバーの層を下から順に描画
        for (let m = 0; m < CONFIG.groupSize; m++) {
            ctx.beginPath();
            let firstPoint = true;
            const memberColor = CONFIG.memberColors[m % CONFIG.memberColors.length];
            const isLeftOut = group.members[m] && group.members[m].leftOut;
            
            // 上端のパス（累積興味度）
            const topPath = [];
            history.forEach((snap, i) => {
                const x = margin.left + (i / (history.length - 1)) * plotW;
                let cumulative = 0;
                // m番目から最後までのメンバーの興味を累積
                for (let j = m; j < CONFIG.groupSize; j++) {
                    if (snap[j] && !snap[j].leftOut) {
                        cumulative += snap[j].interest;
                    }
                }
                const y = margin.top + plotH - (cumulative / maxY) * plotH;
                topPath.push({ x, y });
                
                if (firstPoint) {
                    ctx.moveTo(x, margin.top + plotH);
                    ctx.lineTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            // 下端のパス（m+1番目以降の累積興味度）
            let hasBottomData = false;
            history.forEach((snap, i) => {
                const x = margin.left + (i / (history.length - 1)) * plotW;
                let cumulative = 0;
                // m+1番目から最後までのメンバーの興味を累積
                for (let j = m + 1; j < CONFIG.groupSize; j++) {
                    if (snap[j] && !snap[j].leftOut) {
                        cumulative += snap[j].interest;
                    }
                }
                const y = margin.top + plotH - (cumulative / maxY) * plotH;
                
                if (i === history.length - 1) {
                    ctx.lineTo(x, y);
                    ctx.lineTo(x, margin.top + plotH);
                    hasBottomData = true;
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            // パスを閉じる
            ctx.closePath();
            
            // 離脱メンバーの場合は半透明に
            if (isLeftOut) {
                ctx.fillStyle = memberColor + '60'; // より透明に
            } else {
                ctx.fillStyle = memberColor + 'CC'; // 不透明
            }
            ctx.fill();
            
            // 境界線を描画
            ctx.strokeStyle = memberColor;
            ctx.lineWidth = isLeftOut ? 1 : 1.5;
            ctx.stroke();
        }
    }
}