/**
 * 設定ファイル
 * シミュレーションの定数と、UIで変更可能な変数を管理
 */

export const CONFIG = {
    groupSize: 4,
    numGroups: 4,
    numDimensions: 20,

    // 6つの次元の名前（論文の「視点」に相当）
    dimensionNames: ['Politics', 'Tech', 'Sports', 'Science', 'Religion', 'Commerce'],
    dimensionColors: ['#e74c3c', '#3498db', '#27ae60', '#9b59b6', '#f39c12', '#1abc9c'],
    
    maxVelocity: 10,
    maxInterest: 10,
    
    // グループの表示色
    groupColors: ['#ff6b35', '#4ecdc4', '#95e86f', '#ffd93d'],
    groupNames: ['G1', 'G2', 'G3', 'G4'],

    // メンバーの個別色（グラフ表示用）
    memberColors: [
        '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e86f', '#ff9ff3',
        '#54a0ff', '#ff9f43', '#a55eea', '#26de81', '#fd79a8'
    ],
    minActiveMembers: 3
};

// UIスライダー等でリアルタイムに変更されるパラメータ
export const PARAMS = {
    // 1. 早期検出: 多段階警告システム [cite: 24-34]
    thresholdSafe: 0.2,     // 安全閾値（これ以上はエンゲージ中/緑） [cite: 26]
    thresholdCritical: 0.5, // 危険閾値（これ以下は危機状態/橙。介入トリガー） [cite: 29]
    thresholdLeftout: 1.0,  // 離脱閾値（これ以下は離脱済み/赤。凍結判定） [cite: 32, 442]

    cohesionBase: 0.1,
    alignmentBase: 1.5,
    separationBase: 1.0,
    interestPullWeight: 0.5,
    interestSensitivity: 1.0,

    // 3. リーダーシップと循環防止 [cite: 341-375]
    leaderSteeringFactor: 3.5, // リーダーの舵取り強化倍率 [cite: 351]
    settlingPeriod: 60,        // 新トピック到達後の安定期間（フレーム） [cite: 367]

    // 4. ファシリテーターの介入ロジック [cite: 83-112]
    lambda: 0.5,               // 最小興味最大化と分散最小化のバランス係数（λ） [cite: 105, 112]
    steeringIntensity: 0.7,    // 介入強度（介入時の同調度 0.0-1.0）
    stabilityRequired: 60,     // 介入解除に必要な連続安定フレーム数（ヒステリシス） [cite: 174]

    // 5. 検出シグナルの窓幅 [cite: 36]
    trendWindowSize: 30,       // 速度トレンド計算用のフレーム数 [cite: 36]

    // 近傍話題の類似度閾値
    neighborTopicsThreshold: 0.5,
    leftOutCheckFrequency: 45,  // フレーム数
    
    // その他
    heatDecayRate: 0.008,
    momentumWeight: 0.3,
    
    // モード管理
    singleGroupMode: false,
    paused: false,
    selectedGroupId: 0
};
