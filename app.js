'use strict';

// Altere aqui o código do mesário. É uma proteção de interface, não autenticação de servidor.
const ADMIN_CODE = '12345678901';
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

// Sons sintetizados localmente: nenhuma gravação ou biblioteca é necessária.
function playSound(kind = 'key') {
  if (!soundOn) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const now = audioContext.currentTime;
    const notes = kind === 'confirm'
      ? [[880, 0, .09], [880, .13, .09], [880, .26, .09], [1320, .4, .35]]
      : kind === 'correct' ? [[420, 0, .12]] : [[1046, 0, .055]];
    for (const [frequency, delay, duration] of notes) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(.035, now + delay + .005);
      gain.gain.exponentialRampToValueAtTime(.001, now + delay + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration + .01);
    }
  } catch { /* O áudio é opcional: uma falha não impede a votação. */ }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function render() {
  $('guide1').textContent = state.names[0];
  $('guide2').textContent = state.names[1];
  const disabled = busy || state.closed || storageBlocked;
  document.querySelectorAll('.number-key, .action-keys button').forEach(button => { button.disabled = disabled; });
  $('status').textContent = storageBlocked ? 'ARMAZENAMENTO INDISPONÍVEL' : state.closed ? 'VOTAÇÃO ENCERRADA' : busy ? 'VOTO REGISTRADO' : 'URNA PRONTA';
  if (storageBlocked || state.closed || busy) {
    $('screen').innerHTML = `<div class="screen-top"><span>ELEIÇÃO ESCOLAR</span><span>2A & 2B</span></div><div class="end-screen">${busy ? '<strong>FIM</strong><p>Seu voto foi registrado.</p>' : `<strong class="closed">${storageBlocked ? 'Urna indisponível' : 'Votação encerrada'}</strong><p>Procure o mesário.</p>`}</div>`;
    return;
  }
  const candidate = selection === '1' || selection === '2';
  const blank = selection === 'blank';
  const invalid = selection !== '' && !candidate && !blank;
  const name = candidate ? state.names[Number(selection) - 1] : blank ? 'VOTO EM BRANCO' : invalid ? 'NÚMERO INVÁLIDO' : 'Aguardando seu voto';
  $('screen').innerHTML = `<div class="screen-top"><span>SEU VOTO PARA</span><span>2A & 2B</span></div><h2>Representante de turma</h2><div class="vote-content"><div>${blank ? '<span class="vote-label">Nenhum candidato selecionado</span>' : `<span class="vote-label">Número:</span><span class="digit ${selection === '' ? 'empty' : ''}">${escapeHTML(selection)}</span>`}<p class="candidate-name">${escapeHTML(name)}</p><span class="candidate-party">${candidate ? 'CANDIDATO À REPRESENTAÇÃO' : invalid ? 'USE CORRIGE PARA TENTAR NOVAMENTE' : blank ? 'CONFIRME PARA REGISTRAR' : 'DIGITE 1 OU 2 NO TECLADO'}</span></div>${candidate ? '<div class="portrait" aria-hidden="true"><svg viewBox="0 0 80 90"><circle cx="40" cy="28" r="18"/><path d="M8 85v-9c0-23 15-30 32-30s32 7 32 30v9z"/></svg></div>' : ''}</div><div class="screen-instructions"><b>CONFIRMA</b> para confirmar seu voto<br><b>CORRIGE</b> para reiniciar o preenchimento</div>`;
  $('confirm').disabled = !(candidate || blank);
}

function canVote() { return !busy && !state.closed && !storageBlocked; }
function pressNumber(number) {
  if (!canVote()) return;
  playSound();
  if (selection !== '') return;
  selection = number === '3' ? 'blank' : number;
  render();
}
function correct() {
  if (!canVote()) return;
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
  if (!canVote() || !['1', '2', 'blank'].includes(selection)) return;
  const next = { ...state, votes: [...state.votes] };
  if (selection === 'blank') next.blank++;
  else next.votes[Number(selection) - 1]++;
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
  else if (event.key === 'Enter' && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A') { event.preventDefault(); confirmVote(); }
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
  $('results').innerHTML = [...state.names, 'Em branco'].map((name, index) => {
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
$('admin').addEventListener('click', () => {
  $('login-form').hidden = false;
  $('admin-panel').hidden = true;
  $('login-error').textContent = '';
  $('admin-message').textContent = '';
  $('password').value = '';
  $('admin-dialog').showModal();
  $('password').focus();
});
$('close-admin').addEventListener('click', () => $('admin-dialog').close());
$('admin-dialog').addEventListener('close', () => {
  $('password').value = '';
  $('admin-panel').hidden = true;
  $('login-form').hidden = false;
});
$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('password').value !== ADMIN_CODE) {
    $('login-error').textContent = 'Código incorreto. Tente novamente.';
    $('password').select();
    return;
  }
  $('password').value = '';
  $('login-form').hidden = true;
  $('admin-panel').hidden = false;
  renderResults();
});
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
