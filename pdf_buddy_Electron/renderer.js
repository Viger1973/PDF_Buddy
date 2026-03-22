import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

// Set worker source from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

// Use require from Electron since nodeIntegration is true
// Use window.require and window.ipcRenderer for Electron APIs in ESM
const ipcRenderer = window.ipcRenderer || (window.require ? window.require('electron').ipcRenderer : null);
const fs = window.require ? window.require('fs') : null;

const fileInput = document.getElementById('file-input');
const fileNameSpan = document.getElementById('file-name');
const viewer = document.getElementById('viewer');
const popup = document.getElementById('translation-popup');
const originalTextEl = document.getElementById('original-text');
const translatedTextEl = document.getElementById('translated-text');
const speakBtn = document.getElementById('speak-btn');
const closeBtn = document.getElementById('close-btn');

const historyList = document.getElementById('history-list');
const historySet = new Set();
let historyArray = [];

// New UI Elements
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about-btn');

const playFlashcardBtn = document.getElementById('play-flashcard-btn');
const flashcardModal = document.getElementById('flashcard-modal');
const closeGameBtn = document.getElementById('close-game-btn');
const nextWordBtn = document.getElementById('next-word-btn');

let currentWord = '';
let hoverTimer = null;

// Game State & Dictionary
let gameScore = 0;
let currentTargetWord = null;
const distractorsDictionary = [
    {en: "Apple", it: "Mela"}, {en: "Dog", it: "Cane"}, {en: "Cat", it: "Gatto"},
    {en: "House", it: "Casa"}, {en: "Car", it: "Automobile"}, {en: "Book", it: "Libro"},
    {en: "Water", it: "Acqua"}, {en: "Sun", it: "Sole"}, {en: "Moon", it: "Luna"},
    {en: "Tree", it: "Albero"}, {en: "Fire", it: "Fuoco"}, {en: "Earth", it: "Terra"},
    {en: "Time", it: "Tempo"}, {en: "Friend", it: "Amico"}, {en: "Love", it: "Amore"},
    {en: "Life", it: "Vita"}, {en: "Day", it: "Giorno"}, {en: "Night", it: "Notte"},
    {en: "Hand", it: "Mano"}, {en: "Eye", it: "Occhio"}, {en: "City", it: "Città"},
    {en: "Country", it: "Nazione"}, {en: "World", it: "Mondo"}, {en: "Star", it: "Stella"},
    {en: "Sky", it: "Cielo"}, {en: "Sea", it: "Mare"}, {en: "Mountain", it: "Montagna"},
    {en: "River", it: "Fiume"}, {en: "Flower", it: "Fiore"}, {en: "Bird", it: "Uccello"}
];

// About Modal Handlers
aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
closeAboutBtn.addEventListener('click', () => aboutModal.classList.add('hidden'));

function updateFlashcardButton() {
    if (historySet.size >= 10) {
        playFlashcardBtn.disabled = false;
        playFlashcardBtn.textContent = `Gioca a Flashcard (${historySet.size} parole)`;
    } else {
        playFlashcardBtn.disabled = true;
        playFlashcardBtn.textContent = `Gioca a Flashcard (${historySet.size}/10)`;
    }
}

function addWordToHistory(original, translation) {
    const key = original.toLowerCase();
    if (historySet.has(key)) return;
    historySet.add(key);
    historyArray.push({ original, translation });

    const card = document.createElement('div');
    card.className = 'history-card';
    
    const textGroup = document.createElement('div');
    textGroup.className = 'history-text';
    
    const origEl = document.createElement('div');
    origEl.className = 'history-original';
    origEl.textContent = original;
    
    const translEl = document.createElement('div');
    translEl.className = 'history-translated';
    translEl.textContent = translation;

    textGroup.appendChild(origEl);
    textGroup.appendChild(translEl);

    const btn = document.createElement('button');
    btn.className = 'history-speak-btn';
    btn.innerHTML = '🔊';
    btn.onclick = (e) => {
        e.stopPropagation();
        speak(original);
    };

    card.appendChild(textGroup);
    card.appendChild(btn);

    historyList.insertBefore(card, historyList.firstChild);
    updateFlashcardButton();
}

// Flashcard Game Mechanics
playFlashcardBtn.addEventListener('click', () => {
    gameScore = 0;
    document.getElementById('score-val').textContent = gameScore;
    flashcardModal.classList.remove('hidden');
    loadNextFlashcard();
});

closeGameBtn.addEventListener('click', () => {
    flashcardModal.classList.add('hidden');
});

nextWordBtn.addEventListener('click', () => {
    loadNextFlashcard();
});

function loadNextFlashcard() {
    const feedbackEl = document.getElementById('game-feedback');
    const optionsGrid = document.getElementById('game-options');
    const gameWordEl = document.getElementById('game-word');
    
    feedbackEl.classList.add('hidden');
    feedbackEl.className = 'game-feedback hidden';
    nextWordBtn.style.display = 'none';
    optionsGrid.innerHTML = '';
    
    const targetItem = historyArray[Math.floor(Math.random() * historyArray.length)];
    currentTargetWord = targetItem;
    
    gameWordEl.textContent = targetItem.original;
    document.getElementById('game-speak-btn').onclick = () => speak(targetItem.original);
    
    let options = [{ text: targetItem.translation, isCorrect: true }];
    let shuffledDict = [...distractorsDictionary].sort(() => 0.5 - Math.random());
    
    for(let i = 0; i < shuffledDict.length && options.length < 4; i++) {
        if(shuffledDict[i].it.toLowerCase() !== targetItem.translation.toLowerCase()) {
            options.push({ text: shuffledDict[i].it, isCorrect: false });
        }
    }
    
    options = options.sort(() => 0.5 - Math.random());
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt.text;
        btn.onclick = () => handleGameAnswer(btn, opt.isCorrect);
        optionsGrid.appendChild(btn);
    });
}

function handleGameAnswer(clickedBtn, isCorrect) {
    const optionsGrid = document.getElementById('game-options');
    Array.from(optionsGrid.children).forEach(b => b.disabled = true);
    
    const feedbackEl = document.getElementById('game-feedback');
    feedbackEl.classList.remove('hidden');
    
    if (isCorrect) {
        clickedBtn.classList.add('correct');
        feedbackEl.textContent = 'Corretto! +10 punti';
        feedbackEl.classList.add('success');
        gameScore += 10;
        document.getElementById('score-val').textContent = gameScore;
    } else {
        clickedBtn.classList.add('wrong');
        feedbackEl.textContent = 'Sbagliato! Era: ' + currentTargetWord.translation;
        feedbackEl.classList.add('error');
        Array.from(optionsGrid.children).forEach(b => {
             if(b.textContent === currentTargetWord.translation) b.classList.add('correct');
        });
    }
    
    nextWordBtn.style.display = 'block';
}

const log = (msg) => { 
    console.log(msg);
    if (fs) {
        try { fs.appendFileSync('/tmp/pdfbuddy_debug.log', msg + '\n'); } catch(e){} 
    }
};

fileInput.addEventListener('change', async (e) => {
    try {
        const file = e.target.files[0];
        if (!file) return;

        fileNameSpan.textContent = file.name;
        const arrayBuffer = await file.arrayBuffer();
        await renderPDF(arrayBuffer);
    } catch (err) {
        console.error("PDF Load Error:", err);
        alert("Errore caricamento PDF: " + err.message);
    }
});

async function renderPDF(data) {
    viewer.innerHTML = '';
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.style.width = `${viewport.width}px`;
        pageDiv.style.height = `${viewport.height}px`;
        viewer.appendChild(pageDiv);

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pageDiv.appendChild(canvas);

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        };
        await page.render(renderContext).promise;

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.setProperty('--scale-factor', viewport.scale);
        pageDiv.appendChild(textLayerDiv);

        const textContent = await page.getTextContent();
        const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport
        });
        await textLayer.render();
    }
}
window.renderPDF = renderPDF;

// Hover Dwell Logic
document.addEventListener('mousemove', (e) => {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const overText = element && (
        element.classList.contains('textLayer') || 
        (element.parentElement && element.parentElement.classList.contains('textLayer')) ||
        (element.closest && element.closest('.textLayer'))
    );
    const overPopup = element && element.closest && element.closest('#translation-popup');

    // Only hide popup when mouse leaves BOTH text and popup
    if (!overText && !overPopup && !popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
        currentWord = '';
    }

    clearTimeout(hoverTimer);
    if (overText) {
        hoverTimer = setTimeout(() => handleHoverDwell(e.clientX, e.clientY), 500);
    }
});

async function handleHoverDwell(x, y) {
    const word = getWordAtPoint(x, y);
    if (word && word.length > 1) {
        if (word === currentWord && !popup.classList.contains('hidden')) return;
        
        currentWord = word;
        showPopup(word, x, y);
    }
}

function getWordAtPoint(x, y) {
    const spans = document.querySelectorAll('.textLayer span');
    log('--- getWordAtPoint called at ' + x.toFixed(0) + ',' + y.toFixed(0) + ' spans=' + spans.length);

    let hitSpan = null;
    for (const span of spans) {
        const r = span.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            hitSpan = span;
            break;
        }
    }

    if (!hitSpan) {
        log('  => no hitSpan, returning null');
        return null;
    }

    const text = hitSpan.textContent;
    log('  hitSpan text="' + text.slice(0,50) + '"');

    if (!text || !text.trim()) return null;

    // Single-word span: return directly
    if (!/\s/.test(text.trim())) {
        log('  => single token: "' + text.trim() + '"');
        return text.trim();
    }

    // Multi-word: estimate by proportional x
    const rect = hitSpan.getBoundingClientRect();
    const relX = (x - rect.left) / (rect.width || 1);
    const approxIndex = Math.floor(relX * text.length);
    const idx = Math.max(0, Math.min(approxIndex, text.length - 1));

    let start = idx;
    // Match any non-space, non-punctuation character (includes accented characters)
    const isWordChar = (c) => /[^\s\.,;!?"\(\)\[\]]/.test(c);
    while (start > 0 && isWordChar(text[start - 1])) start--;
    let end = idx;
    while (end < text.length && isWordChar(text[end])) end++;

    const word = text.slice(start, end).trim();
    log('  relX=' + relX.toFixed(2) + ' idx=' + idx + ' => word="' + word + '"');
    return word.length >= 2 ? word : null;
}

async function showPopup(word, x, y) {
    originalTextEl.textContent = word;
    translatedTextEl.textContent = 'Traducendo...';
    
    // Position the popup centered above the mouse
    popup.style.left = `${Math.max(10, Math.min(window.innerWidth - 230, x - 100))}px`;
    popup.style.top = `${Math.max(10, y - 120)}px`;
    popup.classList.remove('hidden');

    try {
        speak(word);
        const translation = await translateWord(word);
        translatedTextEl.textContent = translation;
        addWordToHistory(word, translation);
    } catch (err) {
        translatedTextEl.textContent = 'Errore traduzione';
        console.error(err);
    }
}

async function translateWord(word) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=it&dt=t&q=${encodeURIComponent(word)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data[0][0][0];
}

function speak(text) {
    if (ipcRenderer) {
        ipcRenderer.send('speak-native', text);
    }
}

closeBtn.addEventListener('click', () => {
    popup.classList.add('hidden');
    currentWord = '';
});

speakBtn.addEventListener('click', () => {
    if (currentWord) speak(currentWord);
});

