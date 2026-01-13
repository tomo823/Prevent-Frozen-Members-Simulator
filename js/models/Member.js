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

    // 状態の定義
    static STATES = {
        ACTIVE: 'active',   // 興味が閾値以上
        AT_RISK: 'at_risk', // 興味が閾値未満（検知状態）
        LEFT_OUT: 'left_out' // 完全に離脱（停止状態など）
    };

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

        // 状態管理（初期状態はACTIVE）
        this.state = Member.STATES.ACTIVE;
        
        // 興味プロファイル（潜在興味ベクトル）の初期化
        this.latentInterests = this._generateLatentInterests();
        
        // 現在の状態
        this.currentInterest = 0;   // 現在のトピックに対する興味度
        this.currentVelocity = 0;   // 興味に基づいた計算上の速度
    }

    /**
     * 潜在的な興味ベクトル（W_i）を生成する
     * 20次元すべてに乱数を割り当てて正規化する
     * @param {number[]|null} maxInterests - 他のメンバーの各次元の最大値（ID 9用）
     * @private
     */
    _generateLatentInterests() {
        let interests;
        let maxInterests = null;

        // IDが9（最後の人）かつ、集計データがある場合
        if (this.memberId === 9 && maxInterests) {
            return maxInterests;
        } 
        else {
            // ID 0〜8：特定の分野に強い興味を持つランダム生成
            interests = new Array(CONFIG.numDimensions);
            this.primaryInterest = Math.floor(random(CONFIG.numDimensions));

            for (let k = 0; k < CONFIG.numDimensions; k++) {
                interests[k] = (k === this.primaryInterest) 
                    ? 0.50 + Math.random() * 0.20 
                    : 0.02 + Math.random() * 0.08;
            }

            // 3. L2正規化（ベクトルの長さを1にする：コサイン類似度計算用）
            // 各要素を二乗した合計の平方根（ノルム）で割ります
            const normL2 = Math.sqrt(interests.reduce((a, b) => a + b * b, 0));
            interests = interests.map(v => v / normL2);
        }

        this.primaryInterestDim = interests.indexOf(Math.max(...interests));
        return interests;
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
     * 現在の話題に対する興味度（スカラー値）を計算（式3: 内積）
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

    get isActive() {
        return this.state === Member.STATES.ACTIVE;
    }
}