/**
 * 設定ファイル
 * シミュレーションの定数と、UIで変更可能な変数を管理
 */

export const CONFIG = {
    groupSize: 10,
    numGroups: 4,
    numDimensions: 6,

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
    
    // 離脱判定
    leftOutThreshold: 1.0,      // v0
    leftOutCheckFrequency: 45,  // フレーム数
    
    // その他
    heatDecayRate: 0.008,
    momentumWeight: 0.3,
    
    // モード管理
    singleGroupMode: false,
    paused: false,
    selectedGroupId: 0
};

// 20 Newsgroups データセット定義
export const NEWSGROUP_TOPICS = [
    // 政治系トピック（Politics次元が高い）
    { name: 'talk.politics.misc', weights: [0.65, 0.05, 0.02, 0.08, 0.10, 0.10] },
    { name: 'talk.politics.guns', weights: [0.55, 0.08, 0.05, 0.02, 0.15, 0.15] },
    { name: 'talk.politics.mideast', weights: [0.50, 0.05, 0.02, 0.05, 0.30, 0.08] },
    
    // 技術系トピック（Tech次元が高い）
    { name: 'comp.graphics', weights: [0.02, 0.70, 0.02, 0.18, 0.02, 0.06] },
    { name: 'comp.os.ms-windows', weights: [0.03, 0.72, 0.02, 0.10, 0.02, 0.11] },
    { name: 'comp.sys.mac.hardware', weights: [0.02, 0.68, 0.02, 0.12, 0.02, 0.14] },
    { name: 'comp.windows.x', weights: [0.02, 0.75, 0.02, 0.13, 0.02, 0.06] },
    
    // スポーツ系トピック（Sports次元が高い）
    { name: 'rec.sport.baseball', weights: [0.05, 0.03, 0.70, 0.02, 0.02, 0.18] },
    { name: 'rec.sport.hockey', weights: [0.04, 0.03, 0.72, 0.02, 0.02, 0.17] },
    { name: 'rec.autos', weights: [0.05, 0.15, 0.45, 0.10, 0.02, 0.23] },
    { name: 'rec.motorcycles', weights: [0.04, 0.12, 0.48, 0.08, 0.02, 0.26] },
    
    // 科学系トピック（Science次元が高い）
    { name: 'sci.space', weights: [0.10, 0.18, 0.02, 0.60, 0.02, 0.08] },
    { name: 'sci.med', weights: [0.08, 0.12, 0.05, 0.58, 0.05, 0.12] },
    { name: 'sci.electronics', weights: [0.03, 0.30, 0.02, 0.52, 0.02, 0.11] },
    { name: 'sci.crypt', weights: [0.12, 0.28, 0.02, 0.48, 0.02, 0.08] },
    
    // 宗教系トピック（Religion次元が高い）
    { name: 'soc.religion.christian', weights: [0.15, 0.02, 0.02, 0.03, 0.70, 0.08] },
    { name: 'talk.religion.misc', weights: [0.18, 0.03, 0.02, 0.05, 0.65, 0.07] },
    { name: 'alt.atheism', weights: [0.20, 0.05, 0.02, 0.15, 0.50, 0.08] },
    
    // 商業系トピック（Commerce次元が高い）
    { name: 'misc.forsale', weights: [0.05, 0.15, 0.10, 0.05, 0.02, 0.63] },
    { name: 'rec.autos.marketplace', weights: [0.03, 0.10, 0.25, 0.05, 0.02, 0.55] },
];