document.addEventListener('DOMContentLoaded', () => {
	const VERSION = '1.01';

	let timerInterval;
	let startTime;
	let elapsedTime = 0;
	let isTimerStarted = false;

	const GUESS_COUNT = 6;
	const WORD_LENGTH = 5;
	let currentRow = 0;
	let currentCol = 0;
	let guesses;
	let secretWord;
	let guessList = [];

	const gameBoard = document.getElementById('game-board');
	const keyboardContainer = document.getElementById('keyboard-container');
	const messageContainer = document.getElementById('message-container');
	const messageToast = new bootstrap.Toast(messageContainer, { delay: 2000 });

	const EnterKey = '&crarr;';
	const BackSpaceKey = '&#x232B;';
	const keyboardLayout = [
		['Ď', 'Ť', 'Ň', 'Ó', 'Ú', 'Ů'],
		['Ě', 'Š', 'Č', 'Ř', 'Ž', 'Ý', 'Á', 'Í', 'É'],
		['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
		[BackSpaceKey, 'Y', 'X', 'C', 'V', 'B', 'N', 'M', EnterKey]
	];

	async function startGame() {
		try {
			const [answersResponse, guessesResponse] = await Promise.all([
				fetch('data/tajenky.csv'),
				fetch('data/slova.csv')
			]);
			const answersText = await answersResponse.text();
			const guessesText = await guessesResponse.text();
			const answerList = answersText.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length === WORD_LENGTH);
			guessList = guessesText.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length === WORD_LENGTH);

			secretWord = answerList[Math.floor(Math.random() * answerList.length)];
			console.log(`Hledané slovo (pro ladění): ${secretWord}`);

			guesses = Array(GUESS_COUNT).fill(null).map(() => Array(WORD_LENGTH).fill(''));

			initialize();

		} catch (error) {
			console.error("Chyba při načítání souborů se slovy:", error);
			showMessage("Nepodařilo se načíst slova.", true);
		}
	}

	function submitGuess() {
		if (!secretWord) return;
		const guess = guesses[currentRow].join('');

		if (guess.length !== WORD_LENGTH) {
			showMessage("Slovo musí mít 5 písmen!");
			return;
		}

		if (!guessList.includes(guess)) {
			showMessage("Toto slovo není ve slovníku.");
			return;
		}

		if (!isTimerStarted) {
			startTimer();
			isTimerStarted = true;
		}

		evaluateGuess(guess);
	}

	function startTimer() {
		startTime = Date.now();
		timerInterval = setInterval(() => {
			elapsedTime = Date.now() - startTime;
			updateTimerDisplay(elapsedTime);
		}, 1000);
	}

	function stopTimer() {
		clearInterval(timerInterval);
	}

	function formatTime(ms) {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	function updateTimerDisplay(ms) {
		const timerElement = document.getElementById('timer');
		timerElement.textContent = formatTime(ms);
	}

	function checkGameEnd(guess) {
		const finalTime = formatTime(elapsedTime);

		if (guess === secretWord) {
			stopTimer();
			showMessage(`Gratuluji, vyhrál jsi! Čas: ${finalTime}`, true);
			endGame();
		} else {
			currentRow++;
			currentCol = 0;
			if (currentRow === GUESS_COUNT) {
				stopTimer();
				showMessage(`Prohrál jsi, saláte! Hledané slovo bylo: ${secretWord.toUpperCase()}. Čas: ${finalTime}`, true);
				endGame();
			}
		}
	}

	function initialize() {
		createGameBoard();
		createKeyboard();
		listenForInput();
	}

	function createGameBoard() {
		gameBoard.innerHTML = '';
		for (let i = 0; i < GUESS_COUNT; i++) {
			const row = document.createElement('div');
			row.className = 'row-wordle';
			for (let j = 0; j < WORD_LENGTH; j++) {
				const tile = document.createElement('div');
				tile.className = 'tile';
				tile.id = `tile-${i}-${j}`;
				row.appendChild(tile);
			}
			gameBoard.appendChild(row);
		}
	}

	function createKeyboard() {
		let versionInserted = false;
		let timerInserted = false;
		const versionEl = document.createElement('span');
		versionEl.id = 'version';
		versionEl.className = 'badge text-bg-light text-muted pt-2 fs-6';
		versionEl.innerHTML = 'v' + VERSION;

		const timerEl = document.createElement('span');
		timerEl.id = 'timer';
		timerEl.className = 'badge text-bg-light text-muted pt-2 fs-6';
		timerEl.innerHTML = '00:00';

		keyboardContainer.innerHTML = '';

		keyboardLayout.forEach(rowKeys => {
			const row = document.createElement('div');
			row.className = 'd-flex justify-content-center mb-1';
			if (!versionInserted) {
				row.appendChild(versionEl);
				versionInserted = true;
			}
			keysGroup = row.appendChild(document.createElement('div'));
			keysGroup.className = 'btn-group w-100';
			if (!timerInserted) {
				row.appendChild(timerEl);
				timerInserted = true;
			}
			rowKeys.forEach(key => {
				const keyButton = document.createElement('button');
				if (key === BackSpaceKey) {
					keyButton.className = 'btn btn-danger py-2 p-lg-3 fw-bold key';
				} else if (key === EnterKey) {
					keyButton.className = 'btn btn-success py-2 p-lg-3 fw-bold key';
				} else {
					keyButton.className = 'btn btn-outline-primary p-2 p-lg-3 fw-bold key';
				}
				keyButton.innerHTML = key;
				if (key === EnterKey) {
					keyButton.setAttribute('data-key', 'enter');
				} else if (key === BackSpaceKey) {
					keyButton.setAttribute('data-key', 'bs');
				} else {
					keyButton.setAttribute('data-key', key.toLowerCase());
				}
				keysGroup.appendChild(keyButton);
			});
			keyboardContainer.appendChild(row);
		});
	}

	function listenForInput() {
		keyboardContainer.addEventListener('click', (e) => {
			if (e.target.matches('[data-key]')) {
				handleKeyPress(e.target.getAttribute('data-key'));
			}
		});
		document.addEventListener('keydown', handlePhysicalKeyboard);
	}

	function handlePhysicalKeyboard(e) {
		const key = e.key;
		let keys = keyboardLayout.flat();
		if (key === 'Enter') {
			handleKeyPress('enter');
		} else if (key === 'Backspace') {
			handleKeyPress('bs');
		} else if (keys.includes(key.toUpperCase())) {
			handleKeyPress(key.toLowerCase());
		}
	}

	function handleKeyPress(key) {
		if (key === 'enter') {
			submitGuess();
		} else if (key === 'bs') {
			deleteLetter();
		} else if (currentCol < WORD_LENGTH) {
			addLetter(key);
		}
		updateGameBoard();
	}

	function addLetter(letter) {
		guesses[currentRow][currentCol] = letter;
		currentCol++;
	}

	function deleteLetter() {
		if (currentCol > 0) {
			currentCol--;
			guesses[currentRow][currentCol] = '';
		}
	}

	function updateGameBoard() {
		for (let i = 0; i < GUESS_COUNT; i++) {
			for (let j = 0; j < WORD_LENGTH; j++) {
				const tile = document.getElementById(`tile-${i}-${j}`);
				tile.textContent = guesses[i][j];
				if (guesses[i][j]) {
					tile.classList.add('filled');
				} else {
					tile.classList.remove('filled');
				}
			}
		}
	}

	function evaluateGuess(guess) {
		const secretWordLetters = secretWord.split('');
		const guessLetters = guess.split('');
		const rowTiles = document.querySelectorAll(`.row-wordle:nth-child(${currentRow + 1}) .tile`);
		guessLetters.forEach((letter, index) => {
			if (letter === secretWordLetters[index]) {
				rowTiles[index].classList.add('correct', 'reveal');
				secretWordLetters[index] = null;
			}
		});
		guessLetters.forEach((letter, index) => {
			if (!rowTiles[index].classList.contains('correct')) {
				if (secretWordLetters.includes(letter)) {
					rowTiles[index].classList.add('present', 'reveal');
					secretWordLetters[secretWordLetters.indexOf(letter)] = null;
				} else {
					rowTiles[index].classList.add('absent', 'reveal');
				}
			}
		});
		updateKeyboard(guessLetters, rowTiles);
		checkGameEnd(guess);
	}

	function updateKeyboard(letters, tiles) {
		const keyStatus = {};
		const correctPositions = {};

		const secretLetterCounts = [...secretWord].reduce((acc, letter) => {
				acc[letter] = (acc[letter] || 0) + 1;
				return acc;
		}, {});

		for (let i = 0; i <= currentRow; i++) {
			const guess = guesses[i].join('');
			if (guess.length === 0) continue;

			const tempSecret = secretWord.split('');

			for (let j = 0; j < WORD_LENGTH; j++) {
				const letter = guess[j];
				if (letter === tempSecret[j]) {
					keyStatus[letter] = 'correct';

					if (!correctPositions[letter]) correctPositions[letter] = new Set();
					correctPositions[letter].add(j);

					tempSecret[j] = null;
				}
			}

			for (let j = 0; j < WORD_LENGTH; j++) {
				const letter = guess[j];
				if (guess[j] === secretWord[j]) continue;

				if (tempSecret.includes(letter)) {
					if (keyStatus[letter] !== 'correct') {
						keyStatus[letter] = 'present';
					}
					tempSecret[tempSecret.indexOf(letter)] = null;
				} else {
					if (!keyStatus[letter]) {
						keyStatus[letter] = 'absent';
					}
				}
			}
		}

		for (const key of keyboardContainer.querySelectorAll('.key[data-key]')) {
			const letter = key.getAttribute('data-key');
			if (letter.length > 1) continue;

			const status = keyStatus[letter];
			if (!status) continue;

			const numInSecret = secretLetterCounts[letter] || 0;
			const numCorrectFound = correctPositions[letter] ? correctPositions[letter].size : 0;

			key.classList.remove('correct', 'present', 'absent');

			if (numInSecret > 0 && numCorrectFound === numInSecret) {
				key.classList.add('correct');
			} else if (status === 'correct' || status === 'present') {
				key.classList.add('present');
			} else {
				key.classList.add('absent');
			}
		}
	}

	function endGame() {
		document.removeEventListener('keydown', handlePhysicalKeyboard);
		keyboardContainer.style.pointerEvents = 'none';
	}

	function showMessage(msg, isPermanent = false) {
		const toastBody = messageContainer.querySelector('.toast-body');
		toastBody.textContent = msg;

		messageToast._config.autohide = !isPermanent;
		messageToast.show();
	}
	startGame();
});
