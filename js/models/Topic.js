/**
 * Topicクラス
 * 議論のテーマを表現し、その属性（次元ごとの重み）と状態（訪問熱）を管理する
 */

import { CONFIG, PARAMS } from '../config.js';

export default class Topic {
    /**
     * @param {number} id - ユニークなトピックID
     * @param {number} gridX - グリッド上のX座標
     * @param {number} gridY - グリッド上のY座標
     * @param {Object} topicData - 元データ（name, vector）
     */
    constructor(id, gridX, gridY, topicData) {
        this.id = id;
        this.gridX = gridX;
        this.gridY = gridY;
        this.name = topicData.name;
        
        // トピックベクトル Tn の生成と初期化
        // topics.jsonのvectorデータを直接使用（既に正規化されている）
        this.vector = topicData.vector;
        
        // 最も重みが大きい次元（メインテーマ）のインデックス
        this.primaryDim = this.vector.indexOf(Math.max(...this.vector));
        
        // 状態管理
        this.heat = 0;         // 最近訪問されたかを示す（0.0 〜 1.0）
        this.visitCount = 0;   // 累計訪問回数
    }

    /**
     * ベクトルを正規化する（合計が1になるように）
     * @private
     */
    _normalizeVector(vector) {
        const sum = vector.reduce((a, b) => a + b, 0);
        if (sum === 0) {
            // ゼロベクトルの場合は均等に分配
            return new Array(vector.length).fill(1.0 / vector.length);
        }
        return vector.map(v => v / sum);
    }

    /**
     * 他のトピックとのコサイン類似度を計算
     * @param {Topic} otherTopic
     * @returns {number} -1.0 〜 1.0 (1.0に近いほど似ている)
     */
    getSimilarity(otherTopic) {
        const v1 = this.vector;
        const v2 = otherTopic.vector;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < v1.length; i++) {
            dotProduct += v1[i] * v2[i];
            normA += v1[i] ** 2;
            normB += v2[i] ** 2;
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * グループがこのトピックに到達した時の処理
     */
    onEnter() {
        this.heat = 1.0;
        this.visitCount++;
    }

    /**
     * 毎フレーム呼び出され、トピックの「熱」を減衰させる
     */
    coolDown() {
        if (this.heat > 0) {
            this.heat = Math.max(0, this.heat - PARAMS.heatDecayRate);
        }
    }

    /**
     * 表示用の短縮名を取得
     * 例: "talk.politics.misc" -> "misc"
     */
    getShortName() {
        return this.name.split('.').pop();
    }
}