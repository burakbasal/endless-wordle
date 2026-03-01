(function() {
    let wordList = [];
    let targetWord = "";
    let currentGuess = "";
    let guesses = [];
    let maxGuesses = 6;
    let score = 0;
    let streak = 0;
    let highScore = localStorage.getItem("endlessWordleHighScore") || 0;

    const scoreMap = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 10 };

    const board = document.getElementById("game-board");
    const keyboardContainer = document.getElementById("keyboard-container");
    const modal = document.getElementById("game-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const nextGameBtn = document.getElementById("next-game-btn");

    const keyboardLayout = [
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
        ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
    ];

    // Kelimeleri wordles.json dosyasından çekiyoruz
    async function loadWords() {
        try {
            const response = await fetch('wordles.json');
            const data = await response.json(); // Veriyi doğrudan JSON dizisi olarak çözümlüyoruz
            
            // JSON içindeki kelimeleri güvenlik amaçlı küçük harfe çevirip 5 harfli olanları alıyoruz
            wordList = data.map(w => w.toLowerCase()).filter(w => w.length === 5);
            
            if(wordList.length > 0) {
                initGame();
            } else {
                alert("Kelime listesi yüklenemedi veya boş!");
            }
        } catch (error) {
            console.error("Kelimeler çekilirken hata oluştu:", error);
        }
    }

    function initGame() {
        targetWord = wordList[Math.floor(Math.random() * wordList.length)];
        currentGuess = "";
        guesses = [];
        
        document.getElementById("high-score").innerText = highScore;
        document.getElementById("score").innerText = score;
        document.getElementById("streak").innerText = streak;
        
        modal.classList.add("hidden");
        drawBoard();
        drawKeyboard();
        
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
        keyboardLayout.forEach(rowKeys => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "keyboard-row";
            rowKeys.forEach(key => {
                const button = document.createElement("button");
                button.className = "key";
                if (key === "enter" || key === "backspace") button.classList.add("large");
                button.id = `key-${key}`;
                button.textContent = key === "backspace" ? "⌫" : key;
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
        if (e.key === "Enter") submitGuess();
        else if (e.key === "Backspace") deleteLetter();
        else if (/^[a-zA-Z]$/.test(e.key)) addLetter(e.key.toLowerCase());
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
            // Kelime listede yoksa satırı sallama efekti eklenebilir
            return;
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
                keyBtn.className = "key correct";
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
        
        showModal(`Tebrikler!`, `Kelimeyi ${guesses.length}. denemede buldun. +${points} Puan!`);
    }

    function handleLoss() {
        document.removeEventListener("keydown", handleKeyPress);
        streak = 0;
        showModal("Oyun Bitti", `Doğru kelime: ${targetWord.toUpperCase()}`);
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

    // Oyunu Başlatmak için kelimeleri yükle
    loadWords();
})();
