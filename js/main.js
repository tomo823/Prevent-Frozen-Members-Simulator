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
let previousLeftOutMembers = new Set(); // 前回のチェック時の離脱メンバーIDを記録
let topicsData = null; // topics.jsonから読み込んだデータ

/**
 * topics.jsonを読み込む
 */
async function loadTopicsData() {
    try {
        const response = await fetch('data/topics/topics.json');
        topicsData = await response.json();
        return topicsData;
    } catch (error) {
        console.error('Failed to load topics.json:', error);
        return null;
    }
}

window.setup = async () => {
    const canvas = createCanvas(640, 320);
    canvas.parent('canvas-container');
    canvas.id('simulation-canvas');

    // 描画ループを一時停止
    noLoop(); 

    await loadTopicsData();
    
    view = new GraphView();
    initSimulation();
    setupEventListeners();

    // 全ての準備ができたら描画ループを再開
    loop(); 
};

/**
 * シミュレーションの再初期化
 */
function initSimulation() {
    if (!topicsData) {
        console.error('Topics data not loaded yet');
        return;
    }
    
    groups = [];
    totalTopicChanges = 0;
    leftOutLog = [];
    previousLeftOutMembers = new Set();
    
    const padding = 4;
    const gap = 4;

    if (PARAMS.singleGroupMode) {
        // 1グループモード
        groups.push(new Group(0, { 
            x: padding, y: padding, 
            w: width - padding * 2, h: height - padding * 2 
        }, topicsData));
    } else {
        // 4グループモード
        const gw = (width - padding * 2 - gap) / 2;
        const gh = (height - padding * 2 - gap) / 2;
        for (let i = 0; i < 4; i++) {
            const x = padding + (i % 2) * (gw + gap);
            const y = padding + Math.floor(i / 2) * (gh + gap);
            groups.push(new Group(i, { x, y, w: gw, h: gh }, topicsData));
        }
    }
    updateUIStatic();
}

/**
 * p5.js メインループ
 */
window.draw = () => {
// 【重要】viewが準備できていなければ、このフレームの処理をすべてスキップする
    if (!view) return; 

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
    setupSlider('threshold', 'leftOutThreshold', (val) => {
        // v0-displayも更新
        const v0Display = document.getElementById('v0-display');
        if (v0Display) v0Display.textContent = val.toFixed(2);
    });
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
function setupSlider(domId, paramKey, onUpdate = null) {
    const el = document.getElementById(domId);
    if (!el) return;
    el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        PARAMS[paramKey] = val;
        const valDisp = document.getElementById(`${domId}-val`);
        if (valDisp) valDisp.textContent = val.toFixed(2);
        if (onUpdate) onUpdate(val);
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
    document.getElementById('v0-display').textContent = PARAMS.leftOutThreshold.toFixed(2);
    
    // メンバーリストの表示
    updateMemberList(group, topic);
    
    // 離脱ログの更新
    updateLeftOutLog();
    
    // グラフ凡例の更新
    updateGraphLegend();
}

function updateUIStatic() {
    // モードによってボタンの表示/非表示を切り替えるなどの処理
}

/**
 * メンバーリストを更新（興味度降順で表示）
 */
function updateMemberList(group, topic) {
    const container = document.getElementById('member-list');
    if (!container || !group || !topic) return;
    
    // メンバーを現在のトピックに対する興味度でソート（降順）
    const membersWithInterest = group.members.map(member => {
        // 現在のトピックに対する興味度を計算（既に計算済みの場合はそれを使用）
        const interest = member.currentInterest || 0;
        const interestPercent = (interest / CONFIG.maxInterest) * 100;
        
        return {
            member,
            interest,
            interestPercent
        };
    });
    
    // 興味度で降順ソート
    membersWithInterest.sort((a, b) => b.interest - a.interest);
    
    container.innerHTML = '';
    
    membersWithInterest.forEach(({ member, interestPercent }) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'member-item';
        
        // 離脱メンバーは赤く表示
        if (member.leftOut) {
            itemDiv.classList.add('left-out');
        }
        
        // メンバーID
        const idSpan = document.createElement('span');
        idSpan.className = 'member-id';
        idSpan.textContent = `M${member.memberId + 1}`;
        idSpan.style.fontWeight = 'bold';
        idSpan.style.minWidth = '30px';
        
        // 興味カテゴリ（3文字以内）
        const categorySpan = document.createElement('span');
        categorySpan.className = 'member-category';
        const categoryName = getCategoryAbbreviation(member.primaryInterestDim);
        categorySpan.textContent = categoryName;
        categorySpan.style.fontWeight = 'bold';
        categorySpan.style.minWidth = '35px';
        // 20次元に対応するため、色は循環させる
        const colorIndex = member.primaryInterestDim % CONFIG.dimensionColors.length;
        categorySpan.style.color = CONFIG.dimensionColors[colorIndex];
        
        // 興味度バーグラフ
        const barContainer = document.createElement('div');
        barContainer.className = 'member-interest-bar-container';
        
        const barTrack = document.createElement('div');
        barTrack.className = 'member-interest-bar-track';
        
        const barFill = document.createElement('div');
        barFill.className = 'member-interest-bar-fill';
        barFill.style.width = `${interestPercent}%`;
        
        // 離脱メンバーのバーは赤色、それ以外はカテゴリの色
        if (member.leftOut) {
            barFill.style.background = '#ff4444';
        } else {
            // 20次元に対応するため、色は循環させる
            const colorIndex = member.primaryInterestDim % CONFIG.dimensionColors.length;
            barFill.style.background = CONFIG.dimensionColors[colorIndex];
        }
        
        barTrack.appendChild(barFill);
        barContainer.appendChild(barTrack);
        
        // 興味度パーセンテージ
        const interestSpan = document.createElement('span');
        interestSpan.className = 'member-interest';
        interestSpan.textContent = `${interestPercent.toFixed(1)}%`;
        interestSpan.style.fontWeight = 'bold';
        interestSpan.style.minWidth = '45px';
        interestSpan.style.textAlign = 'right';
        
        // 離脱表示
        if (member.leftOut) {
            const leftOutSpan = document.createElement('span');
            leftOutSpan.className = 'left-out-label';
            leftOutSpan.textContent = '❄️';
            leftOutSpan.style.marginLeft = '4px';
            itemDiv.appendChild(idSpan);
            itemDiv.appendChild(categorySpan);
            itemDiv.appendChild(barContainer);
            itemDiv.appendChild(interestSpan);
            itemDiv.appendChild(leftOutSpan);
        } else {
            itemDiv.appendChild(idSpan);
            itemDiv.appendChild(categorySpan);
            itemDiv.appendChild(barContainer);
            itemDiv.appendChild(interestSpan);
        }
        
        container.appendChild(itemDiv);
    });
}

/**
 * 次元インデックスから3文字の略称を取得
 * 20次元に対応（D0-D19の形式）
 */
function getCategoryAbbreviation(dimIndex) {
    if (dimIndex >= 0 && dimIndex < CONFIG.numDimensions) {
        return `D${dimIndex}`;
    }
    return 'UNK';
}

/**
 * 離脱ログを更新
 */
function updateLeftOutLog() {
    const currentLeftOutMembers = new Set();
    
    // 全グループの離脱メンバーを収集
    groups.forEach(group => {
        group.members.forEach(member => {
            if (member.leftOut) {
                const memberKey = `${group.id}-${member.memberId}`;
                currentLeftOutMembers.add(memberKey);
                
                // 新しく離脱したメンバーを検出
                if (!previousLeftOutMembers.has(memberKey)) {
                    const category = getCategoryAbbreviation(member.primaryInterestDim);
                    const topic = group.getCurrentTopic();
                    const logEntry = {
                        timestamp: frameCount,
                        groupId: group.id,
                        memberId: member.memberId,
                        category: category,
                        categoryDimIndex: member.primaryInterestDim,
                        topic: topic ? topic.name : 'Unknown',
                        vG: group.getGroupVelocity().toFixed(2),
                        vI: member.currentVelocity.toFixed(2)
                    };
                    leftOutLog.push(logEntry);
                    
                    // ログが長すぎる場合は古いものを削除（最新50件を保持）
                    if (leftOutLog.length > 50) {
                        leftOutLog.shift();
                    }
                }
            }
        });
    });
    
    previousLeftOutMembers = currentLeftOutMembers;
    
    // UIに表示
    displayLeftOutLog();
}

/**
 * 離脱ログをUIに表示
 */
function displayLeftOutLog() {
    const container = document.getElementById('leftout-log');
    if (!container) return;
    
    if (leftOutLog.length === 0) {
        container.innerHTML = '<div style="color: #888; font-size: 0.7rem;">No members left out yet...</div>';
        return;
    }
    
    // 最新のログを上に表示（降順）
    const recentLogs = [...leftOutLog].reverse().slice(0, 10);
    
    container.innerHTML = recentLogs.map(log => {
        const time = Math.floor(log.timestamp / 60); // 秒単位に変換（60fps想定）
        return `
            <div class="leftout-log-entry">
                <span class="leftout-time">${time}s</span>
                <span class="leftout-group">G${log.groupId + 1}</span>
                <span class="leftout-member">M${log.memberId + 1}</span>
                <span class="leftout-category" style="color: ${CONFIG.dimensionColors[log.categoryDimIndex % CONFIG.dimensionColors.length] || '#888'}">${log.category}</span>
                <span class="leftout-topic">${log.topic.split('.').pop()}</span>
                <span class="leftout-velocity">vG=${log.vG} vI=${log.vI}</span>
            </div>
        `;
    }).join('');
}

/**
 * グラフ凡例を更新
 */
function updateGraphLegend() {
    const container = document.getElementById('graph-legend');
    if (!container) return;
    
    const group = groups[PARAMS.selectedGroupId] || groups[0];
    if (!group) return;
    
    container.innerHTML = '';
    
    // メンバーごとに凡例を作成
    group.members.forEach((member, index) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        // 色の四角
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color-box';
        colorBox.style.background = CONFIG.memberColors[member.memberId % CONFIG.memberColors.length];
        
        // メンバーID
        const memberLabel = document.createElement('span');
        memberLabel.className = 'legend-label';
        memberLabel.textContent = `M${member.memberId + 1}`;
        
        // 離脱メンバーはグレーアウト
        if (member.leftOut) {
            legendItem.classList.add('legend-item-leftout');
            colorBox.style.opacity = '0.5';
            memberLabel.style.color = '#888';
        }
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(memberLabel);
        container.appendChild(legendItem);
    });
}