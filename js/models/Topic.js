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
     * @param {Object} newsgroup - 元データ（name, weights）
     */
    constructor(id, gridX, gridY, newsgroup) {
        this.id = id;
        this.gridX = gridX;
        this.gridY = gridY;
        this.name = newsgroup.name;
        
        // トピックベクトル Tn の生成と初期化
        this.vector = this._generateVector(newsgroup.weights);
        
        // 最も重みが大きい次元（メインテーマ）のインデックス
        this.primaryDim = this.vector.indexOf(Math.max(...this.vector));
        
        // 状態管理
        this.heat = 0;         // 最近訪問されたかを示す（0.0 〜 1.0）
        this.visitCount = 0;   // 累計訪問回数
    }

    /**
     * 元の重みにランダムな揺らぎを加え、合計が1になるよう正規化する（内部メソッド）
     * @private
     */
    _generateVector(baseWeights) {
        let varied = baseWeights.map(w => {
            // 元の重みに ±0.025 の変動を加える
            let v = w + (Math.random() - 0.5) * 0.05;
            return Math.max(0.01, Math.min(0.95, v));
        });

        const sum = varied.reduce((a, b) => a + b, 0);
        return varied.map(v => v / sum);
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