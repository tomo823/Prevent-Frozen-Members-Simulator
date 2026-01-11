/**
 * ユーティリティ関数群
 * 状態を持たず、入力に対して出力を返すだけの純粋関数を集約
 */

/**
 * K次元ベクトルを2D座標に射影する
 * @param {number[]} vector - K次元の重みベクトル
 * @returns {{x: number, y: number}} 2D座標
 */
export function projectTo2D(vector) {
    let x = 0;
    let y = 0;
    const K = vector.length;
    for (let k = 0; k < K; k++) {
        let angle = (k / K) * Math.PI * 2;
        x += vector[k] * Math.cos(angle);
        y += vector[k] * Math.sin(angle);
    }
    return { x, y };
}

/**
 * トピックをベクトル類似度（2D射影）に基づいてグリッドに配置する
 * @param {Object[]} topics - topics.jsonの配列（name, vectorを含む）
 * @param {number} cols - グリッド列数
 * @param {number} rows - グリッド行数
 * @returns {Object[]} 配置情報が付与されたトピック配列
 */
export function arrangeTopicsByProjection(topics, cols, rows) {
    // 1. 全トピックを2Dに射影（grid_posは使わず、vectorから計算）
    let projected = topics.map((t, i) => ({
        originalIndex: i, 
        topic: t, 
        pos: projectTo2D(t.vector)
    }));
    
    // 2. 座標の正規化
    let minX = Math.min(...projected.map(p => p.pos.x));
    let maxX = Math.max(...projected.map(p => p.pos.x));
    let minY = Math.min(...projected.map(p => p.pos.y));
    let maxY = Math.max(...projected.map(p => p.pos.y));
    
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    
    projected.forEach(p => {
        p.normX = (p.pos.x - minX) / rangeX;
        p.normY = (p.pos.y - minY) / rangeY;
    });
    
    // 3. グリッド配置（スパイラル探索による空きセル埋め）
    let result = [];
    let occupied = new Set();
    
    // 重なりを避けるためにソートしてから配置
    projected.sort((a, b) => (a.normY !== b.normY) ? (a.normY - b.normY) : (a.normX - b.normX));
    
    for (let p of projected) {
        let targetCol = Math.max(0, Math.min(cols - 1, Math.floor(p.normX * cols * 0.999)));
        let targetRow = Math.max(0, Math.min(rows - 1, Math.floor(p.normY * rows * 0.999)));
        
        let placed = false;
        for (let radius = 0; radius <= Math.max(cols, rows) && !placed; radius++) {
            for (let dy = -radius; dy <= radius && !placed; dy++) {
                for (let dx = -radius; dx <= radius && !placed; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    let c = targetCol + dx, r = targetRow + dy;
                    if (c >= 0 && c < cols && r >= 0 && r < rows) {
                        let key = `${c},${r}`;
                        if (!occupied.has(key)) {
                            occupied.add(key);
                            result.push({ topic: p.topic, gridX: c, gridY: r });
                            placed = true;
                        }
                    }
                }
            }
        }
    }
    return result;
}