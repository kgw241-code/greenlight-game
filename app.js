(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panel = $('game');
  const TOTAL = 5;
  // Earlier single-attempt records remain untouched in their original key.
  const STORAGE_KEY = 'greenlight.games.v2';
  let state = 'idle', timeout = null, frame = null, generation = 0;
  let readyAt = 0, retryAfter = 0, storageAvailable = true;
  let rounds = [];
  let records = { best: null, count: 0, recent: [] };
  const trafficLight = '<span class="signal-case"><i class="lamp red-lamp"></i><i class="lamp amber-lamp"></i><i class="lamp green-lamp"></i></span>';
  const mean = (values) => Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
  const format = (value) => value === null ? '—' : value.toFixed(1);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid = (n) => Number.isFinite(n) && n >= 0;
    if (saved && Array.isArray(saved.recent) && Number.isSafeInteger(saved.count) && saved.count >= 0) {
      records = { best: valid(saved.best) ? saved.best : null, count: saved.count, recent: saved.recent.filter(valid).slice(0, 20) };
    }
  } catch { storageAvailable = false; }
  function announce(text) { $('announcement').textContent = text; }
  function cancelPending() {
    generation++;
    clearTimeout(timeout);
    cancelAnimationFrame(frame);
    timeout = frame = null;
  }
  function renderScreen(next, config) {
    state = next;
    panel.dataset.state = next;
    panel.setAttribute('aria-disabled', String(next === 'complete'));
    $('status').textContent = config.status;
    $('game-title').textContent = config.title;
    $('game-description').textContent = config.description;
    $('state-icon').innerHTML = trafficLight;
    $('action-label').textContent = config.action;
    $('panel-hint').textContent = config.hint;
    $('new-game').hidden = next !== 'complete';
    $('panel-index').textContent = next === 'complete' ? 'FINISH / 5 OF 5' : `ROUND ${Math.min(rounds.length + 1, TOTAL)} / ${TOTAL}`;
    panel.setAttribute('aria-label', `${config.title}. ${config.description}. ${config.action}`);
    announce(`${config.title}. ${config.description}`);
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
    catch { storageAvailable = false; }
  }
  function renderStats() {
    $('best').textContent = format(records.best);
    $('average').textContent = rounds.length ? format(mean(rounds)) : '—';
    $('count').textContent = rounds.length;
    $('best-caption').textContent = records.count ? `완료한 ${records.count}게임 중 가장 낮은 평균` : '5회를 마치면 최고 스코어가 저장됩니다.';
    $('reset').disabled = records.count === 0 && rounds.length === 0;
    if (!storageAvailable) $('storage-note').textContent = '저장 공간을 사용할 수 없어 이번 방문에서만 유지됩니다.';
    const list = document.createElement('ol');
    list.className = 'history-list';
    for (let index = 0; index < TOTAL; index++) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${index + 1}회 측정</span><span class="history-time">${index < rounds.length ? `${rounds[index]} <small>ms</small>` : '<small>대기</small>'}</span>`;
      list.append(li);
    }
    $('history').replaceChildren(list);
    $('round-progress').textContent = `${rounds.length} / ${TOTAL}회 완료`;
    $('round-dots').innerHTML = Array.from({ length: TOTAL }, (_, i) => `<span class="round-dot${i < rounds.length ? ' done' : ''}" aria-hidden="true">${i + 1}</span>`).join('');
  }
  function start() {
    if (rounds.length >= TOTAL) return;
    cancelPending();
    renderScreen('waiting', { status: `빨간불 · ${rounds.length + 1}회차`, title: '정지! 신호를 기다리세요.', description: '초록불이 켜지면 바로 클릭하세요.', action: 'RED. SET…', hint: '정지선에서 잠시 대기하세요' });
    const currentGeneration = generation;
    timeout = setTimeout(() => {
      frame = requestAnimationFrame(() => {
        if (currentGeneration !== generation || state !== 'waiting' || document.hidden) return;
        renderScreen('ready', { status: '초록불 · 출발', title: '출발! 지금 클릭!', description: '화면을 클릭하거나 스페이스바를 누르세요.', action: 'GREEN. GO!', hint: `${rounds.length + 1}번째 반응시간을 측정하고 있어요` });
        readyAt = performance.now();
      });
    }, 1800 + Math.random() * 3200);
  }
  function finishGame() {
    const score = mean(rounds);
    const isBest = records.best === null || score < records.best;
    records.count++;
    records.recent = [score, ...records.recent].slice(0, 20);
    if (isBest) records.best = score;
    save();
    renderStats();
    renderScreen('complete', { status: '게임 종료 · 5회 완료', title: `${format(score)} ms`, description: isBest ? '5회 평균으로 새로운 최고 스코어를 달성했어요!' : '5회 평균 반응시간이에요. 낮을수록 좋은 스코어!', action: 'FINAL SCORE · 5회 평균', hint: `(${rounds.join(' + ')}) ÷ 5 = ${format(score)} ms` });
    $('game-title').innerHTML = `${format(score)}<span class="result-unit">ms</span>`;
    window.dispatchEvent(new CustomEvent('greenlight:complete', {detail:{gameId:crypto.randomUUID(),rounds:[...rounds]}}));
  }
  function activate() {
    const now = performance.now();
    if ($('reset-dialog').open || document.hidden || now < retryAfter || state === 'complete') return;
    if (state === 'waiting') {
      cancelPending();
      retryAfter = now + 300;
      renderScreen('early', { status: '신호 위반!', title: '앗, 아직 빨간불이에요!', description: `${rounds.length + 1}회차를 다시 도전하세요. 측정 횟수는 그대로예요.`, action: '같은 회차 다시 도전 →', hint: '조기 클릭은 횟수와 평균에서 제외됩니다' });
    } else if (state === 'ready') {
      const ms = Math.max(0, Math.round(now - readyAt));
      cancelPending();
      retryAfter = now + 300;
      rounds.push(ms);
      if (rounds.length === TOTAL) { finishGame(); return; }
      renderStats();
      renderScreen('result', { status: `${rounds.length} / ${TOTAL}회 측정 완료`, title: `${ms} ms`, description: `${rounds.length}회차 기록이에요. 이제 ${TOTAL - rounds.length}회 남았어요.`, action: `클릭해서 ${rounds.length + 1}회차 시작 →`, hint: '5회 측정을 모두 마치면 최종 스코어가 나와요' });
      $('game-title').innerHTML = `${ms}<span class="result-unit">ms</span>`;
    } else start();
  }
  function resetCurrentGame() {
    cancelPending();
    rounds = [];
    retryAfter = 0;
    renderStats();
    renderScreen('idle', { status: '출발 준비', title: '출발선에 서볼까요?', description: '총 5회 측정해 평균 반응시간으로 스코어를 산정해요.', action: '시동 걸고 시작하기 →', hint: '5회 평균이 낮을수록 좋은 스코어예요' });
  }
  $('new-game').addEventListener('click', () => { resetCurrentGame(); start(); panel.focus({ preventScroll: true }); });
  panel.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (event.pointerType === 'mouse') panel.focus({ preventScroll: true });
    activate();
  });
  panel.addEventListener('click', (event) => { if (event.detail === 0) activate(); });
  document.addEventListener('keydown', (event) => {
    if (!['Space', 'Enter'].includes(event.code) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (![document.body, panel, document.documentElement].includes(event.target)) return;
    event.preventDefault();
    if (!event.repeat) activate();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'waiting' || state === 'ready')) {
      cancelPending();
      renderScreen('paused', { status: '잠시 정차 중', title: '다시 출발해 볼까요?', description: '다른 화면으로 이동해 이번 측정을 중단했어요.', action: '같은 회차 다시 시작 →', hint: '완료한 측정 기록은 그대로 유지됩니다' });
    }
  });
  $('reset').addEventListener('click', () => {
    if (state === 'waiting' || state === 'ready') {
      cancelPending();
      renderScreen('paused', { status: '잠시 정차 중', title: '다시 출발할 준비 완료', description: '준비되면 같은 회차를 다시 시작하세요.', action: '같은 회차 다시 시작 →', hint: '완료한 측정 기록은 그대로 유지됩니다' });
    }
    $('reset-dialog').showModal();
    $('cancel-reset').focus();
  });
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => {
    records = { best: null, count: 0, recent: [] };
    save();
    $('reset-dialog').close();
    resetCurrentGame();
    announce('스코어와 현재 게임을 초기화했습니다. 새 게임을 시작하세요.');
    panel.focus({ preventScroll: true });
  });
  resetCurrentGame();
})();
