/**
 * 設定ファイル
 * シミュレーションの定数と、UIで変更可能な変数を管理
 */

export const CONFIG = {
    groupSize: 3,
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
    cohesionWeight: 2.0,
    alignmentWeight: 0.8,
    separationWeight: 1.0,
    interestPullWeight: 0.5,
    
    // 離脱予兆判定
    recoveryThreshold: 0.07,    // v0
    leftOutThreshold: 0.12,     // v1

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
