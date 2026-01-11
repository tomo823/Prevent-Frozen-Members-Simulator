/**
 * Groupクラス
 * メンバーの集合とトピック空間を管理し、シミュレーションの集団挙動を制御する
 */

import { CONFIG, PARAMS } from '../config.js';
import { arrangeTopicsByProjection } from '../utils.js';
import Topic from './Topic.js';
import Member from './Member.js';

export default class Group {
    /**
     * @param {number} id - グループID
     * @param {Object} bounds - 描画領域 {x, y, w, h}
     * @param {Object[]} topicsData - topics.jsonから読み込んだデータ
     */
    constructor(id, bounds, topicsData) {
        this.id = id;
        this.bounds = bounds;
        this.color = CONFIG.groupColors[id];
        this.topicsData = topicsData; // topics.jsonのデータを保存
        
        this.members = [];
        this.topics = [];
        this.currentTopicIndex = 0;
        this.halted = false; // アクティブ人数不足による停止フラグ

        this.windowCentroid = createVector(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
        
        this.groupCentroid = this.windowCentroid.copy();
        this.prevCentroid = this.groupCentroid.copy();
        this.momentum = createVector(0, 0);
        this.lastLeftOutCheck = 0;

        // 履歴データ（グラフ描画用）
        this.interestHistory = [];
        this.topicHistory = [];

        this._initTopics();
        this._initMembers();
        
        // 初期状態の計算
        this._updateMemberInterests();
        this.recordInterestSnapshot();
    }

    /**
     * トピックを類似度に基づいてグリッド配置し初期化
     * @private
     */
    _initTopics() {
        if (!this.topicsData) {
            console.error('Topics data not provided to Group');
            this.topics = [];
            return;
        }
        
        const gridCols = 5;
        const gridRows = 4;
        const arranged = arrangeTopicsByProjection(this.topicsData, gridCols, gridRows);
        
        this.topics = arranged.map((a, i) => new Topic(a.topic.id, a.gridX, a.gridY, a.topic));
    }

    /**
     * メンバーを初期配置
     * @private
     */
    _initMembers() {
        for (let i = 0; i < CONFIG.groupSize; i++) {
            const member = new Member(this.id, i);
            // グループの中央付近にランダム配置
            member.pos = createVector(
                this.windowCentroid.x + (Math.random() - 0.5) * 50,
                this.windowCentroid.y + (Math.random() - 0.5) * 50
            );
            member.vel = p5.Vector.random2D().mult(0.2);
            // モードに応じた速度パラメータを設定
            member.maxSpeed = PARAMS.singleGroupMode ? 1.4 : 0.9;
            member.maxForce = PARAMS.singleGroupMode ? 0.07 : 0.05;
            
            this.members.push(member);
        }
    }

    /**
     * Boidsロジック: 結合（Cohesion）
     */
    _cohesion(m) {
        let steering = createVector(0, 0);
        let count = 0;
        let radius = PARAMS.singleGroupMode ? 80 : 50;
        for (let other of this.members) {
            let d = p5.Vector.dist(m.pos, other.pos);
            if (other !== m && !other.leftOut && d < radius) {
                steering.add(other.pos);
                count++;
            }
        }
        if (count > 0) {
            steering.div(count).sub(m.pos).setMag(m.maxSpeed).sub(m.vel).limit(m.maxForce);
        }
        return steering;
    }

    /**
     * Boidsロジック: 整列（Alignment）
     */
    _alignment(m) {
        let steering = createVector(0, 0);
        let count = 0;
        let radius = PARAMS.singleGroupMode ? 65 : 40;
        for (let other of this.members) {
            let d = p5.Vector.dist(m.pos, other.pos);
            if (other !== m && !other.leftOut && d < radius) {
                steering.add(other.vel);
                count++;
            }
        }
        if (count > 0) {
            steering.div(count).setMag(m.maxSpeed).sub(m.vel).limit(m.maxForce);
        }
        return steering;
    }

    /**
     * Boidsロジック: 分離（Separation）
     */
    _separation(m) {
        let steering = createVector(0, 0);
        let radius = PARAMS.singleGroupMode ? 25 : 15;
        for (let other of this.members) {
            let d = p5.Vector.dist(m.pos, other.pos);
            if (other !== m && d < radius && d > 0) {
                let diff = p5.Vector.sub(m.pos, other.pos).div(d);
                steering.add(diff);
            }
        }
        return steering.limit(m.maxForce);
    }

    /**
     * 興味による引力（Interest Pull）
     */
    _getInterestPull(m) {
        return m.getPreferredDirection(this.topics, this.bounds, 5, 4);
    }

    /**
     * 境界からの反発力
     * @param {Member} m - メンバー
     * @returns {p5.Vector} 反発力ベクトル
     */
    _boundaryRepulsion(m) {
        let margin = 8;
        let force = 0.08;
        let b = this.bounds;
        let repulsion = createVector(0, 0);

        if (m.pos.x < b.x + margin) repulsion.add(createVector(force, 0));
        if (m.pos.x > b.x + b.w - margin) repulsion.add(createVector(-force, 0));
        if (m.pos.y < b.y + margin) repulsion.add(createVector(0, force));
        if (m.pos.y > b.y + b.h - margin) repulsion.add(createVector(0, -force));

        return repulsion;
    }

    /**
     * Boidsアルゴリズム（相互作用）の適用
     * @private
     */
    _applyFlocking(member) {
        // 各種力の計算（Member.jsの実装を呼び出す、あるいはGroup側で計算）
        const coh = this._cohesion(member);
        const ali = this._alignment(member);
        const sep = this._separation(member);
        const pull = this._getInterestPull(member);
        const boundary = this._boundaryRepulsion(member);
        
        const interestNorm = member.getInterestNormalized();

        // パラメータに基づき重み付け
        coh.mult(PARAMS.cohesionWeight * (0.4 + interestNorm * 0.6));
        ali.mult(PARAMS.alignmentWeight * (0.4 + interestNorm * 0.6));
        sep.mult(PARAMS.separationWeight);
        pull.mult(PARAMS.interestPullWeight * member.maxForce * (0.3 + interestNorm * 0.7));

        member.applyForce(coh);
        member.applyForce(ali);
        member.applyForce(sep);
        member.applyForce(pull);
        member.applyForce(boundary);
        
        // グループ全体の慣性（モメンタム）を適用
        const mom = this.momentum.copy().mult(PARAMS.momentumWeight * member.maxForce);
        member.applyForce(mom);
    }

    /**
     * 重心の計算
     */
    _calculateCentroid() {
        const activeMembers = this.members.filter(m => m.isActive);
        if (activeMembers.length === 0) return;

        let sum = createVector(0, 0);
        activeMembers.forEach(m => sum.add(m.pos));
        this.prevGroupCentroid = this.groupCentroid.copy();
        this.groupCentroid = sum.div(activeMembers.length);
        
        let delta = p5.Vector.sub(this.groupCentroid, this.prevGroupCentroid);
        this.momentum.lerp(delta, 0.15);
        if (this.momentum.mag() > 0.01) this.momentum.normalize();
    }

    /**
     * シミュレーションの1ステップ更新
     */
    update() {
        if (this.halted || PARAMS.paused) return;

        // 1. 各トピックの冷却
        this.topics.forEach(t => t.coolDown());

        // 2. 定期的な離脱判定
        if (frameCount - this.lastLeftOutCheck >= PARAMS.leftOutCheckFrequency) {
            this._updateMemberInterests();
            this._handleMemberStates();
            this.lastLeftOutCheck = frameCount;
        }

        // 3. メンバー全員の物理挙動（相互作用）
        this.members.forEach(m => {
            if (m.leftOut) return;
            this._applyFlocking(m);
            m.update();
            m.constrainToBounds(this.bounds);
        });

        // 4. グループ重心と現在のトピックの更新
        this._calculateCentroid();
        this._updateCurrentTopic();
    }

    /**
     * 現在のグループ重心から、滞在中のトピックを特定する
     * @private
     */
    _updateCurrentTopic() {
        const gridCols = 5;
        const gridRows = 4;
        const tileW = this.bounds.w / gridCols;
        const tileH = this.bounds.h / gridRows;

        const col = Math.floor((this.groupCentroid.x - this.bounds.x) / tileW);
        const row = Math.floor((this.groupCentroid.y - this.bounds.y) / tileH);
        
        const newTopic = this.topics.find(t => t.gridX === col && t.gridY === row);

        if (newTopic && newTopic.id !== this.currentTopicIndex) {
            this.currentTopicIndex = newTopic.id;
            newTopic.onEnter();
            this._updateMemberInterests();
            this.recordInterestSnapshot();
        }
    }

    /**
     * 現在のトピックの近傍トピック（類似度が高いもの）を取得する
     * @param {number} threshold - 類似度のしきい値（例: 0.7）
     * @returns {Topic[]}
     */
    getNeighborTopics(threshold = 0.5) {
        const currentTopic = this.topics[this.currentTopicIndex];
        if (!currentTopic) return [];

        // 自分以外のトピックから、類似度が高いものを抽出
        return this.topics.filter(t => {
            if (t === currentTopic) return false;
            const sim = currentTopic.getSimilarity(t);
            return sim > threshold;
        });
    }

    /**
     * 条件を順番に満たす話題を選定し、誘導を行う
     * @private
     */
    _applyMinMaxSteering() {
        // 離脱候補者を抽出
        const atRiskMembers = this.members.filter(m => m.state === Member.STATES.AT_RISK);
        if (atRiskMembers.length === 0) return;

        // --- 条件1: 現在のトピックの近傍話題であること ---
        // 類似度が一定以上のトピックのみを候補にする
        const neighborTopics = this.getNeighborTopics(PARAMS.neighborTopicsThreshold || 0.5);
        if (neighborTopics.length === 0) {
            this.halted = true;
            console.warn('No neighbor topics found for Min-Max steering.');
            return;
        }

        // --- 条件2: 離脱候補者がしきい値を超える興味を持つ話題に絞り込む ---
        // ※ PARAMS.recoveryThreshold は、復帰に必要な興味レベル
        const viableTopics = neighborTopics.filter(topic => {
            return atRiskMembers.every(m => m.calculateInterest(topic) > PARAMS.recoveryThreshold);
        });

        // 候補がない場合は、現在の近傍の中から「最もマシなもの」を選ぶか、移動を諦める
        if (viableTopics.length === 0) {
            this.halted = true;
            console.warn('No viable topics found for Min-Max steering.');
            return;
        }

        // --- 条件3: メンバー全員の興味の「最低値」を「最大化」できる話題を選ぶ ---
        let bestTopic = null;
        let maxOfMinInterest = -1;

        viableTopics.forEach(topic => {
            // この話題に切り替えた場合、全メンバーの中で「一番興味が低い人」のスコアを調べる
            const minInterestInGroup = Math.min(
                ...this.members.map(m => m.calculateInterest(topic))
            );

            // その「最低スコア」が最も高くなる話題を採用する（これがMin-Max）
            if (minInterestInGroup > maxOfMinInterest) {
                maxOfMinInterest = minInterestInGroup;
                bestTopic = topic;
            }
        });

        // 誘導の実行
        if (bestTopic) {
            this._steerToTopic(bestTopic);
        }
    }

    /**
     * 特定のトピックへ重心を誘導する
     * @param {Topic} targetTopic 
     */
    _steerToTopic(targetTopic) {
        const targetPos = createVector(
            this.bounds.x + (targetTopic.gridX + 0.5) * (this.bounds.w / 5),
            this.bounds.y + (targetTopic.gridY + 0.5) * (this.bounds.h / 4)
        );
        
        const steeringForce = p5.Vector.sub(targetPos, this.groupCentroid);
        steeringForce.limit(0.1); 
        this.groupCentroid.add(steeringForce);
    }

    getGroupVelocity() {
        const active = this.members.filter(m => !m.leftOut);
        return active.length > 0 
            ? active.reduce((sum, m) => sum + m.currentVelocity, 0) / active.length 
            : 0;
    }

    /**
     * メンバーの状態（離脱予兆・復帰）を一括管理する
     * @private
     */
    _handleMemberStates() {
        // 重心速度を一度だけ計算して変数に入れる
        const vG = this.getGroupVelocity();
        
        // メンバー全員を一人ずつチェック
        this.members.forEach(m => {
            // グループ速度との差（後退速度）を計算
            const relativeVelocity = vG - m.currentVelocity;

            // 現在の状態に応じて、次の状態を決める
            if (m.state === Member.STATES.ACTIVE) {
                // 通常時：閾値を超えたら「リスクあり」へ
                if (relativeVelocity > PARAMS.recoveryThreshold) {
                    m.state = Member.STATES.AT_RISK;
                    // console.log(`Member ${m.memberId} is lagging behind.`);
                }
            } 
            else if (m.state === Member.STATES.AT_RISK) {
                // リスク時：閾値を下回ったら（追いついたら）「通常」へ
                if (relativeVelocity <= PARAMS.recoveryThreshold) {
                    m.state = Member.STATES.ACTIVE;
                    // console.log(`Member ${m.memberId} recovered.`);
                }
            }
        });
    }

    /**
     * メンバー全員の興味度を最新トピックに合わせて更新
     * @private
     */
    _updateMemberInterests() {
        const topic = this.getCurrentTopic();
        this.members.forEach(m => {
            m.calculateInterest(topic);
            m.calculateVelocity();
        });
    }

    getActiveCount() { return this.members.filter(m => m.state === Member.STATES.ACTIVE).length; }
    getAtRiskCount() { return this.members.filter(m => m.state === Member.STATES.AT_RISK).length; }
    getLeftOutCount() { return this.members.filter(m => m.state === Member.STATES.LEFT_OUT).length; }
    getCurrentTopic() { return this.topics[this.currentTopicIndex]; }

    /**
     * グラフ用のデータを保存
     */
    recordInterestSnapshot() {
        const snapshot = this.members.map(m => ({
            interest: m.currentInterest,
            leftOut: m.leftOut
        }));
        this.interestHistory.push(snapshot);
        this.topicHistory.push(this.currentTopicIndex + 1);
        if (this.interestHistory.length > 20) {
            this.interestHistory.shift();
            this.topicHistory.shift();
        }
    }
}