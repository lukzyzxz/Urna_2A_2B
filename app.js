'use strict';

// Altere aqui o código do mesário. É uma proteção de interface, não autenticação de servidor.
const ADMIN_CODE = '012345678901';
const CANDIDATE_NUMBERS = ['67', '33'];
const STORAGE_KEY = 'urna-2a-2b-v1';
const $ = (id) => document.getElementById(id);
const initialState = () => ({ names: ['Fulano', 'Bertrano'], votes: [0, 0], blank: 0, closed: false });
let state = initialState();
let storageBlocked = false;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.names) || parsed.names.length !== 2 || !parsed.names.every(n => typeof n === 'string' && n.trim().length > 0 && n.length <= 35) || !Array.isArray(parsed.votes) || parsed.votes.length !== 2 || !parsed.votes.every(n => Number.isSafeInteger(n) && n >= 0) || !Number.isSafeInteger(parsed.blank) || parsed.blank < 0 || typeof parsed.closed !== 'boolean') throw new Error('Dados inválidos');
    state = parsed;
  }
} catch {
  storageBlocked = true;
}
let selection = '';
let busy = false;
let soundOn = true;
let audioContext;
let finishTimer;
let noticeTimer;

function notify(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000);
}

function persist(next) {
  if (storageBlocked) {
    notify('Não foi possível carregar os votos. A votação está bloqueada para preservar os dados.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    state = next;
    return true;
  } catch {
    notify('Não foi possível salvar. O voto não foi registrado. Verifique o armazenamento do navegador.');
    return false;
  }
}

// Bipes mais presentes e sequência rápida de confirmação inspirada na urna.
// O ganho é limitado para evitar distorção; o volume final depende do dispositivo.
function playSound(kind = 'key') {
  if (!soundOn) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const now = audioContext.currentTime + .01;
    const notes = kind === 'confirm'
      ? [[1100,0,.065],[1100,.09,.065],[1100,.18,.065],[1100,.27,.065],[1100,.36,.065],[1450,.46,.43]]
      : kind === 'correct' ? [[700,0,.1],[500,.12,.1]] : [[960,0,.11]];
    for (const [frequency, delay, duration] of notes) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      filter.type = 'lowpass';
      filter.frequency.value = 3500;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(.18, now + delay + .006);
      gain.gain.setValueAtTime(.18, now + delay + duration - .015);
      gain.gain.exponentialRampToValueAtTime(.001, now + delay + duration);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration + .01);
    }
  } catch { /* Falha no áudio não impede a votação. */ }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function render() {
  const adminEntry = selection.startsWith('0');
  document.querySelectorAll('.number-key').forEach(button => { button.disabled = busy; });
  $('correct').disabled = busy;
  $('blank').disabled = !canVote();
  $('confirm').disabled = true;
  $('status').textContent = storageBlocked ? 'ARMAZENAMENTO INDISPONÍVEL' : state.closed ? 'VOTAÇÃO ENCERRADA' : busy ? 'VOTO REGISTRADO' : 'URNA PRONTA';
  if (adminEntry) {
    $('screen').innerHTML = `<div class="access-screen"><h2>Acesso do mesário</h2><p>Digite o código de acesso completo.</p><div class="code-dots" aria-label="${selection.length} dígitos inseridos">${'●'.repeat(selection.length)}${'○'.repeat(ADMIN_CODE.length-selection.length)}</div><p>CORRIGE para cancelar</p></div>`;
    return;
  }
  if (storageBlocked || state.closed || busy) {
    $('screen').innerHTML = `<div class="end-screen">${busy ? '<strong>FIM</strong><p>VOTO REGISTRADO</p>' : `<strong class="closed">${storageBlocked ? 'Urna indisponível' : 'Votação encerrada'}</strong><p>Procure o mesário.</p>`}</div>`;
    return;
  }
  if (selection === '') {
    $('screen').innerHTML = `<div class="welcome-screen"><div class="screen-seal">${$('seal-template').innerHTML}</div><h1>JUSTIÇA ELEITORAL</h1><p>Digite o número do seu candidato</p><div class="candidate-guide"><span><b>67</b> ${escapeHTML(state.names[0])}</span><span><b>33</b> ${escapeHTML(state.names[1])}</span></div></div>`;
    return;
  }
  const index = CANDIDATE_NUMBERS.indexOf(selection);
  const candidate = index !== -1;
  const blank = selection === 'blank';
  const invalid = !candidate && !blank && selection.length === 2;
  const name = candidate ? state.names[index] : blank ? 'VOTO EM BRANCO' : invalid ? 'NÚMERO INVÁLIDO' : 'Digite o segundo número';
  const digits = [0,1].map(i => `<span class="digit ${selection.length === i ? 'empty' : ''}">${escapeHTML(selection[i] || '')}</span>`).join('');
  $('screen').innerHTML = `<div class="screen-top">SEU VOTO PARA</div><h2>Representante de turma</h2><div class="vote-content"><div class="candidate-data">${blank ? '' : `<div class="number-line"><span>Número:</span><div class="digits">${digits}</div></div>`}<p class="candidate-name">${escapeHTML(name)}</p><span class="candidate-party">${candidate ? 'ELEIÇÃO ESCOLAR · 2A & 2B' : invalid ? 'USE CORRIGE PARA TENTAR NOVAMENTE' : blank ? 'NENHUM CANDIDATO SELECIONADO' : 'AGUARDANDO PREENCHIMENTO'}</span></div>${candidate ? '<div class="portrait" aria-hidden="true"><svg viewBox="0 0 80 90"><circle cx="40" cy="28" r="18"/><path d="M8 85v-9c0-23 15-30 32-30s32 7 32 30v9z"/></svg></div>' : ''}</div><div class="screen-instructions">Aperte a tecla:<br><b>CONFIRMA</b> para CONFIRMAR este voto<br><b>CORRIGE</b> para REINICIAR este voto</div>`;
  $('confirm').disabled = !(candidate || blank);
}

function canVote() { return !busy && !state.closed && !storageBlocked; }
function openAdmin() {
  selection = '';
  render();
  $('admin-message').textContent = '';
  $('admin-panel').hidden = false;
  renderResults();
  $('admin-dialog').showModal();
}
function pressNumber(number) {
  if (busy || !/^[0-9]$/.test(number)) return;
  playSound();
  // Um zero inicia o código especial. Nunca é contado como voto.
  if (selection.startsWith('0') || (selection === '' && number === '0')) {
    selection += number;
    if (selection.length === ADMIN_CODE.length) {
      if (selection === ADMIN_CODE) { openAdmin(); return; }
      selection = '';
      notify('Código de mesário incorreto. Tente novamente.');
    }
    render();
    return;
  }
  if (!canVote() || selection === 'blank' || selection.length >= 2) return;
  selection += number;
  render();
}
function correct() {
  if (busy) return;
  playSound('correct');
  selection = '';
  render();
}
function voteBlank() {
  if (!canVote()) return;
  playSound();
  selection = 'blank';
  render();
}
function confirmVote() {
  if (!canVote() || ![...CANDIDATE_NUMBERS, 'blank'].includes(selection)) return;
  const next = { ...state, votes: [...state.votes] };
  if (selection === 'blank') next.blank++;
  else next.votes[CANDIDATE_NUMBERS.indexOf(selection)]++;
  if (!persist(next)) return;
  busy = true;
  selection = '';
  playSound('confirm');
  render();
  finishTimer = setTimeout(() => { busy = false; render(); }, 2300);
}
for (const number of ['1','2','3','4','5','6','7','8','9','0']) {
  const button = document.createElement('button');
  button.className = 'number-key';
  button.setAttribute('aria-label', number);
  button.innerHTML = `${number}<span class="tactile" aria-hidden="true">${number === '0' ? '⠚' : ['⠁','⠃','⠉','⠙','⠑','⠋','⠛','⠓','⠊'][Number(number) - 1]}</span>`;
  button.addEventListener('click', () => pressNumber(number));
  document.querySelector('.keypad').append(button);
}
$('blank').addEventListener('click', voteBlank);
$('correct').addEventListener('click', correct);
$('confirm').addEventListener('click', confirmVote);
$('sound').addEventListener('click', () => {
  soundOn = !soundOn;
  $('sound').textContent = soundOn ? 'Som ligado' : 'Som desligado';
  $('sound').setAttribute('aria-pressed', String(soundOn));
  if (soundOn) playSound();
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || $('admin-dialog').open || $('reset-dialog').open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (/^[0-9]$/.test(event.key)) { event.preventDefault(); pressNumber(event.key); }
  else if (event.key === 'Enter' && (event.target.tagName !== 'BUTTON' || event.target.matches('.number-key, .action-keys button')) && event.target.tagName !== 'A') { event.preventDefault(); confirmVote(); }
  else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Escape') { event.preventDefault(); correct(); }
  else if (event.key.toLowerCase() === 'b') { event.preventDefault(); voteBlank(); }
});
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notify('Use a opção de tela cheia do navegador.');
  } catch { notify('Não foi possível ativar a tela cheia. Tente F11 no computador.'); }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? '⛶ Sair da tela cheia' : '⛶ Tela cheia'; });

function renderResults() {
  const total = state.votes[0] + state.votes[1] + state.blank;
  const winner = state.votes[0] === state.votes[1] ? null : state.votes[0] > state.votes[1] ? 0 : 1;
  $('result-title').textContent = total === 0 ? 'Nenhum voto registrado.' : winner === null ? 'Empate! Será necessária uma nova eleição.' : `${state.names[winner]} ${state.closed ? 'venceu' : 'está na frente'} com ${state.votes[winner]} voto(s).`;
  $('results').innerHTML = [...state.names.map((name, i) => `${CANDIDATE_NUMBERS[i]} · ${name}`), 'Em branco'].map((name, index) => {
    const count = index === 2 ? state.blank : state.votes[index];
    const percent = total ? (count / total * 100).toFixed(1) : '0.0';
    return `<div class="result-row"><div class="result-line"><span>${escapeHTML(name)}</span><strong>${count} · ${percent}%</strong></div><div class="bar"><span style="width:${percent}%"></span></div></div>`;
  }).join('');
  $('total').textContent = `${total} voto(s) no total · ${state.votes[0] + state.votes[1]} em candidatos · ${state.closed ? 'Encerrada' : 'Em andamento'}`;
  $('name1').value = state.names[0];
  $('name2').value = state.names[1];
  $('name1').disabled = $('name2').disabled = total > 0 || state.closed || storageBlocked;
  $('settings').querySelector('button').disabled = total > 0 || state.closed || storageBlocked;
  $('end-election').disabled = state.closed || storageBlocked;
  $('end-election').textContent = state.closed ? 'Votação encerrada' : 'Encerrar votação';
  $('reset').disabled = storageBlocked;
}
$('close-admin').addEventListener('click', () => $('admin-dialog').close());
$('admin-dialog').addEventListener('close', () => { $('admin-panel').hidden = true; selection = ''; render(); });
$('settings').addEventListener('submit', event => {
  event.preventDefault();
  if (state.votes[0] + state.votes[1] + state.blank > 0 || state.closed) return;
  const names = [$('name1').value.trim(), $('name2').value.trim()];
  if (names.some(name => !name || name.length > 35)) { $('admin-message').textContent = 'Preencha os dois nomes (até 35 caracteres).'; return; }
  if (persist({ ...state, names })) {
    $('admin-message').textContent = 'Nomes atualizados. A urna está pronta.';
    render();
    renderResults();
  }
});
$('end-election').addEventListener('click', () => {
  if (persist({ ...state, closed: true })) {
    clearTimeout(finishTimer);
    busy = false;
    selection = '';
    render();
    renderResults();
  }
});
$('reset').addEventListener('click', () => $('reset-dialog').showModal());
$('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
$('confirm-reset').addEventListener('click', () => {
  if (!persist({ ...initialState(), names: [...state.names] })) return;
  clearTimeout(finishTimer);
  busy = false;
  selection = '';
  $('reset-dialog').close();
  $('admin-message').textContent = 'Nova eleição iniciada. Contagem zerada.';
  render();
  renderResults();
});
// Cada eleição deve usar uma única aba. Uma mudança externa bloqueia esta aba
// para evitar sobrescrever uma contagem atualizada em outra janela.
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    storageBlocked = true;
    busy = false;
    clearTimeout(finishTimer);
    render();
    if (!$('admin-panel').hidden) renderResults();
    notify('Os dados mudaram em outra aba. Feche as outras abas e recarregue esta página.');
  }
});
render();
if (storageBlocked) notify('Os dados salvos estão indisponíveis. A urna foi bloqueada para evitar perda de votos.');
