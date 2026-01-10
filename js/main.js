/**
 * main.js
 * シミュレーションの実行エンジン兼コントローラー。
 * ModelとViewを統合し、p5.jsのライフサイクルとUIイベントを管理する。
 */

import { CONFIG, PARAMS } from './config.js';
import Group from './models/Group.js';
import GraphView from './views/GraphView.js';

let groups = [];
let view;
let totalTopicChanges = 0;
let leftOutLog = [];

/**
 * p5.js 初期化
 */
window.setup = () => {
    const canvas = createCanvas(640, 320);
    canvas.parent('canvas-container');
    canvas.id('simulation-canvas');

    view = new GraphView();
    initSimulation();
    setupEventListeners();
};

/**
 * シミュレーションの再初期化
 */
function initSimulation() {
    groups = [];
    totalTopicChanges = 0;
    leftOutLog = [];
    
    const padding = 4;
    const gap = 4;

    if (PARAMS.singleGroupMode) {
        // 1グループモード
        groups.push(new Group(0, { 
            x: padding, y: padding, 
            w: width - padding * 2, h: height - padding * 2 
        }));
    } else {
        // 4グループモード
        const gw = (width - padding * 2 - gap) / 2;
        const gh = (height - padding * 2 - gap) / 2;
        for (let i = 0; i < 4; i++) {
            const x = padding + (i % 2) * (gw + gap);
            const y = padding + Math.floor(i / 2) * (gh + gap);
            groups.push(new Group(i, { x, y, w: gw, h: gh }));
        }
    }
    updateUIStatic();
}

/**
 * p5.js メインループ
 */
window.draw = () => {
    // 1. Modelの更新
    if (!PARAMS.paused) {
        groups.forEach(g => g.update());
    }

    // 2. Viewの描画
    view.renderSimulation(groups);
    view.renderInterestGraph(groups[PARAMS.selectedGroupId]);

    // 3. UIの定期更新（負荷軽減のため8フレームごと）
    if (frameCount % 8 === 0) {
        updateUIDynamic();
    }
};

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // モード切替
    document.getElementById('mode-btn').addEventListener('click', () => {
        PARAMS.singleGroupMode = !PARAMS.singleGroupMode;
        initSimulation();
    });

    // リスタート
    document.getElementById('restart-btn').addEventListener('click', initSimulation);

    // ポーズ
    document.getElementById('pause-btn').addEventListener('click', (e) => {
        PARAMS.paused = !PARAMS.paused;
        e.target.textContent = PARAMS.paused ? '▶️ Resume' : '⏸️ Pause';
    });

    // スライダー群のバインド
    setupSlider('threshold', 'leftOutThreshold');
    setupSlider('cohesion', 'cohesionWeight');
    setupSlider('alignment', 'alignmentWeight');
    setupSlider('separation', 'separationWeight');
    setupSlider('interest-pull', 'interestPullWeight');

    // グループ選択ボタン
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.group-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            PARAMS.selectedGroupId = parseInt(btn.dataset.group);
        });
    });
}

/**
 * スライダーの値と PARAMS を同期させる汎用関数
 */
function setupSlider(domId, paramKey) {
    const el = document.getElementById(domId);
    if (!el) return;
    el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        PARAMS[paramKey] = val;
        const valDisp = document.getElementById(`${domId}-val`);
        if (valDisp) valDisp.textContent = val.toFixed(2);
    });
}

/**
 * 統計情報などの動的なUI更新
 */
function updateUIDynamic() {
    const group = groups[PARAMS.selectedGroupId] || groups[0];
    if (!group) return;

    // 統計値の集計
    let totalActive = 0;
    let totalLeftOut = 0;
    let haltedCount = 0;
    groups.forEach(g => {
        totalActive += g.getActiveCount();
        totalLeftOut += g.getLeftOutCount();
        if (g.halted) haltedCount++;
    });

    // DOMへの反映
    document.getElementById('total-active').textContent = totalActive;
    document.getElementById('total-leftout').textContent = totalLeftOut;
    document.getElementById('halted-count').textContent = haltedCount;
    
    // 現在のトピック情報（左パネル）
    const topic = group.getCurrentTopic();
    document.getElementById('topic-name').textContent = topic.name;
    document.getElementById('vg-display').textContent = group.getGroupVelocity().toFixed(2);
}

function updateUIStatic() {
    // モードによってボタンの表示/非表示を切り替えるなどの処理
}