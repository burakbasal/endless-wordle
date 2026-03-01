(function() {
    let wordList = [];
    let targetWord = "";
    let currentGuess = "";
    let guesses = [];
    let maxGuesses = 6;
    let score = 0;
    let streak = 0;
    let highScore = localStorage.getItem("endlessWordleHighScore") || 0;
    
    let currentLang = "tr"; // Varsayılan Dil

    const scoreMap = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 10 };

    const board = document.getElementById("game-board");
    const keyboardContainer = document.getElementById("keyboard-container");
    const modal = document.getElementById("game-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const nextGameBtn = document.getElementById("next-game-btn");
    
    // UI Label elementleri
    const langSelect = document.getElementById("lang-select");
    const labelScore = document.getElementById("label-score");
    const labelStreak = document.getElementById("label-streak");
    const labelHighscore = document.getElementById("label-highscore");

    // Dillerin Tüm Ayarları (Klavye Düzeni, Çeviriler, Regex, Kelime Dosyası)
    const langConfig = {
        en: {
            file: 'wordles.json',
            layout: [
                ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
                ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
                ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
            ],
            regex: /^[a-zA-Z]$/,
            lower: (s) => s.toLowerCase(),
            upper: (s) => s.toUpperCase(),
            winTitle: "Congratulations!",
            winMsg: (g, p) => `You guessed it in ${g} tries. +${p} Points!`,
            loseTitle: "Game Over",
            loseMsg: (w) => `The word was: ${w}`,
            errorMsg: "Word list could not be loaded!",
            nextBtn: "Next Word",
            labels: { score: "SCORE", streak: "STREAK", highscore: "BEST" }
        },
        tr: {
            file: 'wordles-tr.json',
            layout: [
                ["e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
                ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
                ["enter", "z", "c", "v", "b", "n", "m", "ö", "ç", "backspace"]
            ],
            regex: /^[a-zA-ZçğıöşüÇĞİÖŞÜ]$/,
            lower: (s) => s.toLocaleLowerCase('tr-TR'),
            upper: (s) => s.toLocaleUpperCase('tr-TR'),
            winTitle: "Tebrikler!",
            winMsg: (g, p) => `Kelimeyi ${g}. denemede buldun. +${p} Puan!`,
            loseTitle: "Oyun Bitti",
            loseMsg: (w) => `Doğru kelime: ${w}`,
            errorMsg: "Kelime listesi yüklenemedi!",
            nextBtn: "Sonraki Kelime",
            labels: { score: "SKOR", streak: "SERİ", highscore: "EN YÜKSEK" }
        }
    };

    // Dil seçildiğinde olanlar
    if (langSelect) {
        langSelect.addEventListener("change", (e) => {
            currentLang = e.target.value;
            score = 0;   // Yeni dile geçince rekabet sıfırlanır
            streak = 0; 
            updateUILabels();
            updateStats();
            loadWords(); 
        });
    }

    function updateUILabels() {
        const config = langConfig[currentLang];
        labelScore.innerText = config.labels.score;
        labelStreak.innerText = config.labels.streak;
        labelHighscore.innerText = config.labels.highscore;
        nextGameBtn.innerText = config.nextBtn;
    }

    function updateStats() {
        document.getElementById("high-score").innerText = highScore;
        document.getElementById("score").innerText = score;
        document.getElementById("streak").innerText = streak;
    }

    async function loadWords() {
        try {
            const config = langConfig[currentLang];
            const response = await fetch(config.file);
            const data = await response.json(); 
            
            // Veriyi çekip ilgili dil formatında küçük harfe dönüştürüyoruz
            wordList = data.map(w => config.lower(w)).filter(w => w.length === 5);
            
            if(wordList.length > 0) {
                initGame();
            } else {
                alert(config.errorMsg);
            }
        } catch (error) {
            console.error("Kelime yükleme hatası:", error);
        }
    }

    function initGame() {
        targetWord = wordList[Math.floor(Math.random() * wordList.length)];
        currentGuess = "";
        guesses = [];
        
        updateStats();
        
        modal.classList.add("hidden");
        drawBoard();
        drawKeyboard(); // Klavye dil konfigürasyonuna göre baştan çizilir
        
        // Önceki dinleyicileri temizleyip yeniden ekliyoruz
        document.removeEventListener("keydown", handleKeyPress);
        document.addEventListener("keydown", handleKeyPress);
    }

    function drawBoard() {
        board.innerHTML = "";
        for (let i = 0; i < maxGuesses; i++) {
            const row = document.createElement("div");
            row.className = "row";
            for (let j = 0; j < 5; j++) {
                const tile = document.createElement("div");
                tile.className = "tile";
                tile.id = `tile-${i}-${j}`;
                row.appendChild(tile);
            }
            board.appendChild(row);
        }
    }

    function drawKeyboard() {
        keyboardContainer.innerHTML = "";
        const layout = langConfig[currentLang].layout; 

        layout.forEach(rowKeys => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "keyboard-row";
            rowKeys.forEach(key => {
                const button = document.createElement("button");
                button.className = "key";
                if (key === "enter" || key === "backspace") button.classList.add("large");
                button.id = `key-${key}`;
                button.textContent = key === "backspace" ? "⌫" : (key === "enter" ? (currentLang === "tr" ? "GİR" : "ENTER") : key);
                button.onclick = () => handleVirtualKey(key);
                rowDiv.appendChild(button);
            });
            keyboardContainer.appendChild(rowDiv);
        });
    }

    function updateGrid() {
        const row = guesses.length;
        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`tile-${row}-${i}`);
            tile.textContent = currentGuess[i] || "";
            if (currentGuess[i]) {
                tile.classList.add("filled");
            } else {
                tile.classList.remove("filled");
            }
        }
    }

    function handleVirtualKey(key) {
        if (key === "enter") submitGuess();
        else if (key === "backspace") deleteLetter();
        else addLetter(key);
    }

    function handleKeyPress(e) {
        const config = langConfig[currentLang];
        if (e.key === "Enter") submitGuess();
        else if (e.key === "Backspace") deleteLetter();
        // Dilin kurallarına göre regex kontrolü yap
        else if (config.regex.test(e.key)) addLetter(config.lower(e.key));
    }

    function addLetter(letter) {
        if (currentGuess.length < 5) {
            currentGuess += letter;
            updateGrid();
        }
    }

    function deleteLetter() {
        if (currentGuess.length > 0) {
            currentGuess = currentGuess.slice(0, -1);
            updateGrid();
        }
    }

    function submitGuess() {
        if (currentGuess.length !== 5) return;
        
        if (!wordList.includes(currentGuess)) {
            return; // Kelime yoksa işlem yapma
        }

        guesses.push(currentGuess);
        colorizeBoard();
        
        if (currentGuess === targetWord) {
            handleWin();
        } else if (guesses.length === maxGuesses) {
            handleLoss();
        } else {
            currentGuess = "";
        }
    }

    function colorizeBoard() {
        const row = guesses.length - 1;
        let targetLetterCount = {};
        
        for (let char of targetWord) {
            targetLetterCount[char] = (targetLetterCount[char] || 0) + 1;
        }

        let tileColors = ["absent", "absent", "absent", "absent", "absent"];

        for (let i = 0; i < 5; i++) {
            if (currentGuess[i] === targetWord[i]) {
                tileColors[i] = "correct";
                targetLetterCount[currentGuess[i]] -= 1;
            }
        }

        for (let i = 0; i < 5; i++) {
            if (tileColors[i] === "absent" && targetLetterCount[currentGuess[i]] > 0) {
                tileColors[i] = "present";
                targetLetterCount[currentGuess[i]] -= 1;
            }
        }

        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`tile-${row}-${i}`);
            const letter = currentGuess[i];
            tile.classList.add(tileColors[i]);
            
            const keyBtn = document.getElementById(`key-${letter}`);
            if (tileColors[i] === "correct") {
                keyBtn.className = "key correct" + (letter === "enter" || letter === "backspace" ? " large" : "");
            } else if (tileColors[i] === "present" && !keyBtn.classList.contains("correct")) {
                keyBtn.classList.add("present");
            } else if (tileColors[i] === "absent" && !keyBtn.classList.contains("correct") && !keyBtn.classList.contains("present")) {
                keyBtn.classList.add("absent");
            }
        }
    }

    function handleWin() {
        document.removeEventListener("keydown", handleKeyPress);
        streak++;
        let points = scoreMap[guesses.length] * (streak > 0 ? streak : 1);
        score += points;
        
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("endlessWordleHighScore", highScore);
        }
        
        const config = langConfig[currentLang];
        showModal(config.winTitle, config.winMsg(guesses.length, points));
    }

    function handleLoss() {
        document.removeEventListener("keydown", handleKeyPress);
        streak = 0;
        const config = langConfig[currentLang];
        showModal(config.loseTitle, config.loseMsg(config.upper(targetWord)));
    }

    function showModal(title, message) {
        modalTitle.innerText = title;
        modalMessage.innerText = message;
        setTimeout(() => {
            modal.classList.remove("hidden");
        }, 1000);
    }

    nextGameBtn.addEventListener("click", () => {
        initGame();
    });

    // Oyunu ilk açılışta başlat
    updateUILabels();
    loadWords();
})();
