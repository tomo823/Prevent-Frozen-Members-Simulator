/**
 * Groupクラス
 * メンバーの集合とトピック空間を管理し、シミュレーションの集団挙動を制御する
 */

import { CONFIG, PARAMS } from '../config.js';
import { arrangeTopicsByProjection, saveCSV } from '../utils.js';
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

        this.logs = [];
        this.timeStep = 0;
        this.isIntervening = false;
        this.currentLeader = null;
        this.targetTopic = null;            // リーダーの目標トピック


        this._initTopics();
        this._initMembers();
        
        // 初期状態の計算
        this._updateMemberInterests();
        this._recordSnapshot();
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

    // Group.js
    _initMembers() {
        for (let i = 0; i < CONFIG.groupSize; i++) {
            // 最後の一人をエージェント（isAgent = true）にする
            const isAgent = (i === CONFIG.groupSize - 1);
            
            // Member側で自律的にベクトルを生成するため、agentInterestsは渡さない
            const member = new Member(this.id, i, isAgent);
            
            this._setupMemberPhysics(member);
            this.members.push(member);
        }
    }

    /**
     * 物理パラメータと初期位置の設定
     * @private
     */
    _setupMemberPhysics(member) {
        member.pos = createVector(
            this.windowCentroid.x + (Math.random() - 0.5) * 50,
            this.windowCentroid.y + (Math.random() - 0.5) * 50
        );
        member.vel = p5.Vector.random2D().mult(0.2);
        member.maxSpeed = PARAMS.singleGroupMode ? 1.4 : 0.9;
        member.maxForce = PARAMS.singleGroupMode ? 0.07 : 0.05;
    }

    /**
     * 一般メンバーの興味からエージェントのベクトルを計算（各次元の最大値）
     * @private
     */
    _calculateAgentVector(interestArray) {
        let maxInterests = new Array(CONFIG.numDimensions).fill(0);
        
        for (let k = 0; k < CONFIG.numDimensions; k++) {
            // 各次元において全メンバーの中の最大値を採用
            maxInterests[k] = Math.max(...interestArray.map(v => v[k]));
        }

        // 合成したベクトルをL2正規化
        const normL2 = Math.sqrt(maxInterests.reduce((a, b) => a + b * b, 0));
        return maxInterests.map(v => (normL2 > 0 ? v / normL2 : 0));
        // return maxInterests;
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
        let mCoh, mAli, mSep, mPull;

        if (member.isLeader) {
            // リーダーのBoids力を大幅に減衰（引っ張られ防止）
            mCoh = 0.1; 
            mAli = 0.1;
            mSep = 0.4;
            mPull = PARAMS.interestPullWeight * member.maxForce * member.pullFactor * PARAMS.leaderSteeringFactor;
        } else {
            // 結合力と整列力は興味に比例させる [cite: 322, 330, 355]
            mCoh = member.cohesionFactor;
            mAli = member.alignmentFactor;
            mSep = member.separationFactor;
            mPull = PARAMS.interestPullWeight * member.maxForce * member.pullFactor;
        }

        coh.mult(mCoh);
        ali.mult(mAli);
        sep.mult(mSep);
        pull.mult(mPull);

        // 全ての力を適用
        [coh, ali, sep, pull, boundary].forEach(f => member.applyForce(f));
        
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

        // 2. リーダーシップと目標の更新
        if (!this.targetLocked && this.settlingTimer <= 0) {
            this._updateLeader();       // 最も興味がある人をリーダーに
            this._decideNextTarget();   // リーダーが次の行き先を決める
        }

        // 離脱候補者の数をカウント
        const atRiskCount = this.members.filter(m => 
            m.state === Member.STATES.AT_RISK || m.state === Member.STATES.LEFT_OUT
        ).length;

        // 2人以上が離脱候補（または既に離脱）ならグループを停止
        if (atRiskCount >= 2) {
            // this.halted = true;
            console.log(`Group ${this.id} halted: too many at-risk members (${atRiskCount})`);
        }

        // 1. 各トピックの冷却
        this.topics.forEach(t => t.coolDown());

        // 2. 定期的な離脱判定
        if (frameCount - this.lastLeftOutCheck >= PARAMS.leftOutCheckFrequency) {
            this._updateMemberInterests();
            this._handleMemberStates();

            // 【追加】リスクメンバーが1人いる場合、Min-Max誘導を開始
            if (atRiskCount === 1) {
                this._applyMinMaxSteering();
            }

            this.lastLeftOutCheck = frameCount;
        }

        // 3. メンバー全員の物理挙動（相互作用）
        this.members.forEach(m => {
            if (m.leftOut) return;
            m.updateInterestFactors();
            this._applyFlocking(m);
            m.update();
            m.constrainToBounds(this.bounds);
        });

        // 4. グループ重心と現在のトピックの更新
        this._calculateCentroid();
        this._updateCurrentTopic();

        // 4. 到着判定とタイマー更新
        this._checkTopicArrival();
        if (this.settlingTimer > 0) this.settlingTimer--;
    }

    /**
     * 創発的リーダーの選定と役割の更新
     * @private
     */
    _updateLeader() {
        // 1. 全員のリーダーフラグを一旦リセット
        for (let member of this.members) {
            member.isLeader = false;
        }

        // 2. 現在のトピックに対する興味が最も高いメンバーを探す
        // ※ 介入中（isIntervening）であっても、物理演算上の「リーダー」は一人に絞る
        let nextLeader = null;
        let maxInterest = -1;

        for (let member of this.members) {
            // 現在の話題(this.currentTopicIndex)に対する興味度を確認
            if (member.currentInterest > maxInterest) {
                maxInterest = member.currentInterest;
                nextLeader = member;
            }
        }

        // 3. 最大興味者（シングルリーダー）を決定
        if (nextLeader) {
            nextLeader.isLeader = true;
            this.currentLeader = nextLeader;
        }
    }

    /**
     * リーダーが自身の興味に基づき、次に進むトピックを決定する [cite: 85-86, 350]
     */
    _decideNextTarget() {
        if (!this.currentLeader) return;

        const leader = this.currentLeader;
        let bestTopic = null;
        let maxScore = -1;

        // 1. 【安定期間チェック】グループが現在のトピックに到着して間もない場合は、次の話題を決めない 
        // これにより、一つの話題にある程度留まる現実の議論を再現する 
        if (this.settlingTimer > 0) {
            return;
        }

        // 2. 【目標ロック】既に目標が決まっていて、まだ移動中の場合は何もしない [cite: 373-375]
        if (this.targetLocked && leader.steeringTarget) {
            return;
        }

        // 3. 【候補の選定】隣接トピックを優先し、自然な会話の流れを作る [cite: 365, 366]
        let currentTopic = this.topics[this.currentTopicIndex];
        let adjacentTopics = currentTopic.getAdjacent(this.topics);
        
        // 隣接がない場合は全トピックを対象にする
        let candidates = adjacentTopics.length > 0 ? adjacentTopics : this.topics;

        // 4. 【フィルタリング】現在の話題と直前の話題を除外（循環防止/No Backtracking） 
        candidates = candidates.filter(t => 
            t.id !== this.currentTopicIndex && 
            t.id !== this.lastTopicIndex
        );

        if (candidates.length === 0) {
            // 候補がない場合は直前トピック以外の隣接も許可
            candidates = currentTopic.getAdjacent(this.topics).filter(t => 
                t.id !== currentTopic.id
            );
        }
        
        if (candidates.length === 0) {
            this.targetTopic = null;
            return createVector(0, 0);
        }

        candidates.forEach(topic => {
            // 1. リーダーの興味との一致度を計算 [cite: 86, 403]
            // calculateInterestメソッドがある場合はそれを利用、ない場合は以下のように計算
            let interestMatch = leader.latentInterests.reduce((sum, val, k) => {
                return sum + val * topic.vector[k];
            }, 0);

            // 2. 熱ペナルティ（最近訪問したトピックを避ける） [cite: 86, 108]
            let heatPenalty = topic.heat * 0.8;

            // 3. 訪問回数ペナルティ（マンネリ防止）
            let visitPenalty = Math.min(topic.visitCount * 0.1, 0.5);

            // 4. 未訪問ボーナス（新規性）
            let noveltyBonus = topic.visitCount === 0 ? 0.2 : 0;

            // 5. 最終スコアの算出（自己利益型） [cite: 86]
            let score = interestMatch * (1 - heatPenalty) * (1 - visitPenalty) + noveltyBonus;

            // 6. ベストスコアの更新
            if (score > bestScore) {
                bestScore = score;
                bestTopic = topic;
            }
        });

        if (bestTopic) {
            // リーダーに目標をセットし、ターゲットをロックする [cite: 373-374]
            leader.steeringTarget = bestTopic;
            this.targetLocked = true;
            console.log(`Leader ${leader.memberId} decided next topic: ${bestTopic.name}`);
        }
    }

    /**
     * 目標トピックへの到着を確認し、議論の状態を更新する
     * @private
     */
    _checkTopicArrival() {
        // 目標がロックされていない、またはリーダーがいない場合は判定不要
        if (!this.targetLocked || !this.currentLeader) return;

        const leader = this.currentLeader;
        const target = leader.steeringTarget; // リーダーが目指しているTopicオブジェクト

        if (!target) return;

        // 1. リーダーと目標タイルの距離を計算
        // タイルの中心（target.x, target.y）とリーダーの現在位置の距離
        let distance = dist(leader.pos.x, leader.pos.y, target.x, target.y);

        // 2. 到着判定（タイルの中心にある程度近づいたら到着とみなす）
        // タイルサイズに対して十分小さい閾値（例: 10〜20ピクセル）を設定
        const arrivalThreshold = 15; 

        if (distance < arrivalThreshold) {
            // --- 到着時の処理 ---

            // A. 直前のトピックIDを記録（循環防止/No Backtracking用） [cite: 370, 371]
            this.lastTopicIndex = this.currentTopicIndex;

            // B. 現在のトピックIDを更新
            this.currentTopicIndex = target.id;

            // C. 訪問回数をインクリメント（スコアリングに影響）
            target.visitCount++;

            // D. 到着したトピックに「熱（Heat）」を付与 [cite: 86]
            target.heat = 1.0;

            // E. 目標ロックを解除し、リーダーのターゲットをクリア [cite: 373, 374]
            this.targetLocked = false;
            leader.steeringTarget = null;

            // F. 安定期間（Settling Period）を開始 
            // パラメータで設定したフレーム数（例: 60）をセット
            this.settlingTimer = PARAMS.settlingPeriod;

            console.log(`Arrived at Topic: ${target.name} (ID: ${target.id})`);
            console.log(`Settling Period started for ${PARAMS.settlingPeriod} frames.`);
        }
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

            // 【追加】話題が遷移したらエージェントの誘導ターゲットをクリア
            const agent = this.members[CONFIG.groupSize - 1];
            if (agent) {
                agent.steeringTarget = null;
            }

            this._updateMemberInterests();
            this._handleMemberStates(); // 状態も再判定
            this._recordSnapshot();
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

        if (bestTopic) {
            // 【追加】エージェントに誘導目標をセットし、興味を最大化させる
            const agent = this.members[CONFIG.groupSize - 1];
            if (agent) {
                agent.steeringTarget = bestTopic;
                // 強制的に再計算させて引力（Pull Force）を生む
                this._updateMemberInterests();
            }
            
            this._steerToTopic(bestTopic);
            console.log(`Agent is steering group to: ${bestTopic.name}`);
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

    // 話題が切り替わった時に呼ぶメソッド
    _recordSnapshot() {
        // メンバーがいない場合は警告
        if (!this.members || this.members.length === 0) {
            console.warn(`Group ${this.id}: No members found during snapshot!`);
            return;
        }

        const currentTopic = this.getCurrentTopic();
        const topicName = currentTopic ? currentTopic.name : "None";

        this.members.forEach(m => {
            const entry = {
                time_step: this.timeStep,
                topic_name: topicName,
                member_id: m.memberId,
                interest: m.currentInterest ? m.currentInterest.toFixed(4) : "0.0000",
                status: m.state || "unknown",
                is_intervening: this.isIntervening ? 1 : 0
            };
            this.logs.push(entry);
        });

        console.log(`Group ${this.id}: Snapshot recorded. Total logs: ${this.logs.length}`);
        this.timeStep++;
    }

    // 外部からCSV出力を命令されるメソッド
    exportGroupLog() {
        console.log(`Exporting log for group ${this.id}...`);
        // downloadCSV ではなく saveCSV を呼ぶ
        saveCSV(this.logs, `group_${this.id}_log.csv`);
    }
}