/**
 * Memberクラス
 * 個々のエージェント（Boid）の状態と意思決定ロジックを管理
 */

import { CONFIG, PARAMS } from '../config.js';

export default class Member {
    /**
     * @param {number} groupId - 所属グループID
     * @param {number} memberId - グループ内での一意のID
     */
    constructor(groupId, memberId) {
        this.groupId = groupId;
        this.memberId = memberId;
        this.color = CONFIG.memberColors[memberId % CONFIG.memberColors.length];
        
        // 物理状態（p5.Vectorを使用）
        // ※ main.jsでp5.jsが読み込まれている前提
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        
        this.maxSpeed = 0; // モードによって動的に変化
        this.maxForce = 0;
        this.leftOut = false; // 離脱状態
        
        // 興味プロファイル（潜在興味ベクトル）の初期化
        this.latentInterests = this._generateLatentInterests();
        
        // 現在の状態
        this.currentInterest = 0;   // 現在のトピックに対する興味度
        this.currentVelocity = 0;   // 興味に基づいた計算上の速度
    }

    /**
     * 潜在的な興味ベクトル（W_i）を生成する
     * @private
     */
    _generateLatentInterests() {
        let interests = new Array(CONFIG.numDimensions).fill(0);
        
        // 主要興味と副次興味をランダムに決定
        this.primaryInterestDim = Math.floor(Math.random() * CONFIG.numDimensions);
        this.secondaryInterestDim = (this.primaryInterestDim + 1 + Math.floor(Math.random() * (CONFIG.numDimensions - 1))) % CONFIG.numDimensions;

        for (let k = 0; k < CONFIG.numDimensions; k++) {
            if (k === this.primaryInterestDim) {
                interests[k] = 0.45 + Math.random() * 0.15;
            } else if (k === this.secondaryInterestDim) {
                interests[k] = 0.15 + Math.random() * 0.12;
            } else {
                interests[k] = 0.02 + Math.random() * 0.08;
            }
        }

        // 合計が1になるよう正規化
        const sum = interests.reduce((a, b) => a + b, 0);
        return interests.map(v => v / sum);
    }

    /**
     * 興味に基づく移動方向を計算
     * @param {Topic[]} topics - トピック配列
     * @param {Object} bounds - 境界
     * @param {number} gridCols - グリッド列数
     * @param {number} gridRows - グリッド行数
     * @returns {p5.Vector} 移動方向ベクトル
     */
    getPreferredDirection(topics, bounds, gridCols, gridRows) {
        let pullX = 0, pullY = 0, totalWeight = 0;
        let tileW = bounds.w / gridCols;
        let tileH = bounds.h / gridRows;

        for (let topic of topics) {
            // トピックとの興味マッチ度を計算
            let match = 0;
            for (let k = 0; k < CONFIG.numDimensions; k++) {
                match += this.latentInterests[k] * topic.vector[k];
            }

            let topicCenterX = bounds.x + (topic.gridX + 0.5) * tileW;
            let topicCenterY = bounds.y + (topic.gridY + 0.5) * tileH;

            // 熱ペナルティ（最近訪問したトピックは避ける）
            let heatPenalty = topic.heat * 0.7;
            let weight = match * match * (1 - heatPenalty);

            // 未訪問ボーナス
            if (topic.visitCount === 0) weight += 0.1;
            weight = Math.max(0.01, weight);

            pullX += topicCenterX * weight;
            pullY += topicCenterY * weight;
            totalWeight += weight;
        }

        if (totalWeight > 0) {
            let pull = createVector(pullX / totalWeight - this.pos.x, pullY / totalWeight - this.pos.y);
            pull.normalize();
            return pull;
        }
        return createVector(0, 0);
    }

    /**
     * 特定のトピックに対する興味度を計算（式3: 内積）
     * @param {Topic} topic 
     */
    calculateInterest(topic) {
        let dotProduct = 0;
        for (let k = 0; k < CONFIG.numDimensions; k++) {
            dotProduct += this.latentInterests[k] * topic.vector[k];
        }
        this.currentInterest = dotProduct * CONFIG.maxInterest;
        return this.currentInterest;
    }

    /**
     * 興味度に基づいた理論上の速度を計算（式5）
     */
    calculateVelocity() {
        this.currentVelocity = (this.currentInterest * CONFIG.maxVelocity) / CONFIG.maxInterest;
        return this.currentVelocity;
    }

    /**
     * 興味度の正規化値（0.0 〜 1.0）を取得
     */
    getInterestNormalized() {
        return this.currentInterest / CONFIG.maxInterest;
    }

    /**
     * 加速度を加える
     */
    applyForce(force) {
        this.acc.add(force);
    }

    /**
     * 物理状態の更新（位置と速度の計算）
     */
    update() {
        if (this.leftOut) return;

        this.vel.add(this.acc);
        
        // 興味レベルに応じてスピードを制限（興味があるほど機敏に動く）
        let speedMult = map(this.currentVelocity, 0, CONFIG.maxVelocity, 0.4, 1.0);
        this.vel.limit(this.maxSpeed * speedMult);
        
        this.pos.add(this.vel);
        this.acc.mult(0); // 加速度リセット
    }

    /**
     * 境界内への制限
     */
    constrainToBounds(bounds) {
        if (this.leftOut) return;
        this.pos.x = constrain(this.pos.x, bounds.x + 5, bounds.x + bounds.w - 5);
        this.pos.y = constrain(this.pos.y, bounds.y + 5, bounds.y + bounds.h - 5);
    }
}