/**
 * Memberクラス
 * 個々のエージェント（Boid）の状態と意思決定ロジックを管理
 */

import { CONFIG, PARAMS } from '../config.js';

export default class Member {
    /**
     * @param {number} groupId - 所属グループID
     * @param {number} memberId - グループ内での一意のID
     * @param {number[]|null} agentInterests - エージェント用の計算済み興味ベクトル
     */

    // 状態の定義
    static STATES = {
        ACTIVE: 'active',   // 興味が閾値以上
        AT_RISK: 'at_risk', // 興味が閾値未満（検知状態）
        CRITICAL: 'critical', // 危機状態（橙）
        LEFT_OUT: 'left_out' // 完全に離脱（停止状態など）
    };

    constructor(groupId, memberId, isAgent = false, agentInterests = null) {
        this.groupId = groupId;
        this.memberId = memberId;
        this.isAgent = isAgent; // エージェントフラグ
        this.isLeader = false;  // 創発的リーダーフラグ（動的に変化）
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
        this.currentInterest = 0;   // 現在の話題に対する興味 (u_in) [cite: 150]
        this.currentVelocity = 0;   // 発言意欲のメタファーとしての速度 (v_i) [cite: 157-160]
        this.velocityHistory = [];  // トレンド計算用の窓 [cite: 242]

        // 早期警告シグナル用変数 [cite: 242]
        this.velocityTrend = 0;     // 速度の傾き (d(v_i)/dt)
        this.distanceFromCentroid = 0; // 空間的ドリフト

        // 1. 興味ベクトルの初期化
        if (this.isAgent) {
            // 全次元に均等な興味を持つ（バランス型） 
            this.latentInterests = new Array(CONFIG.numDimensions).fill(0.5);
            // L2正規化
            // const norm = Math.sqrt(this.latentInterests.reduce((a, b) => a + b * b, 0));
            // this.latentInterests = this.latentInterests.map(v => v / norm);
        } else {
            this.latentInterests = this._generateLatentInterests();
        }
        
        // 物理係数の初期化（undefinedエラー防止）
        this.cohesionFactor = 0;
        this.alignmentFactor = 0;
        this.separationFactor = 0;
        this.pullFactor = 0;

        // 初回の係数計算
        this.updateInterestFactors();

        // ★修正：エージェントでも一般人でも、決定したベクトルから最大次元を特定する
        // this.primaryInterestDim = this.latentInterests.indexOf(Math.max(...this.latentInterests));

        this.steeringTarget = null; // 介入ターゲットのトピック
    }

    /**
     * 潜在的な興味ベクトル（W_i）を生成する
     * 20次元すべてに乱数を割り当てて正規化する
     * @param {number[]|null} maxInterests - 他のメンバーの各次元の最大値（ID 9用）
     * @private
     */
    _generateLatentInterests() {
        let interests = new Array(CONFIG.numDimensions);
        // 特定の分野に強い興味を持つランダム生成
        this.primaryInterest = Math.floor(random(CONFIG.numDimensions));

        for (let k = 0; k < CONFIG.numDimensions; k++) {
            interests[k] = (k === this.primaryInterest) 
                ? 0.50 + Math.random() * 0.20 
                : 0.02 + Math.random() * 0.08;
        }

        // L2正規化
        const normL2 = Math.sqrt(interests.reduce((a, b) => a + b * b, 0));
        interests = interests.map(v => v / normL2);

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
        // // 【追加】もしエージェントがこの話題へ誘導中なら、興味を最大にする
        // if (this.steeringTarget && this.steeringTarget.id === topic.id) {
        //     // this.currentInterest = CONFIG.maxInterest * 0.5; // 最大値(10など)
        //     return this.currentInterest;
        // }

        let dotProduct = 0;
        for (let k = 0; k < CONFIG.numDimensions; k++) {
            dotProduct += this.latentInterests[k] * topic.vector[k];
        }
        this.currentInterest = dotProduct * CONFIG.maxInterest;
        return this.currentInterest;
    }

    // Member.js 内の更新メソッドの一部
    updateInterestFactors() {
        // 興味レベルを0~1に正規化 (式3に基づく計算後) [cite: 324-326, 403]
        const interestNorm = this.currentInterest / CONFIG.maxInterest;
        const adjInt = interestNorm * PARAMS.interestSensitivity;

        // 興味に応じたBoids重みの動的変更
        // 高興味 → 結合力強 [cite: 329, 330]
        this.cohesionFactor = PARAMS.cohesionBase * (0.1 + adjInt);
        console.log("Cohesion Factor:", this.cohesionFactor);

        // 高興味 → 同調力強 [cite: 328]
        this.alignmentFactor = PARAMS.alignmentBase * (0.2 + adjInt);

        // 低興味 → 分離力・放浪力強 [cite: 331-334]
        this.separationFactor = PARAMS.separationBase * (1.5 - adjInt * 1.2);

        this.pullFactor = 0.3 + adjInt * 0.7; // 最大1.0
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