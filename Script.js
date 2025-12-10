const BOARD_SIZE = 8;
const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

// Startaufstellung
const INITIAL_BOARD = [
    ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
    ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
    ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

let board = [];
let turn = 'w'; // 'w' oder 'b'
let selectedSquare = null;

const boardElement = document.getElementById('chessboard');
const statusElement = document.getElementById('status-display');
const resetBtn = document.getElementById('reset-btn');

// --- Initialisierung ---

function initGame() {
    // Tiefe Kopie des Initial Boards erstellen
    board = JSON.parse(JSON.stringify(INITIAL_BOARD));
    turn = 'w';
    selectedSquare = null;
    updateStatus();
    renderBoard();
}

// --- Rendering ---

function renderBoard() {
    boardElement.innerHTML = '';
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            const pieceCode = board[row][col];
            if (pieceCode) {
                const color = pieceCode[0];
                const type = pieceCode[1];
                const pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${color === 'w' ? 'white' : 'black'}`;
                pieceSpan.textContent = PIECES[color][type];
                square.appendChild(pieceSpan);
            }

            // Highlighting für Auswahl
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }

            // Highlighting für mögliche Züge
            if (selectedSquare) {
                const moves = getValidMoves(selectedSquare.row, selectedSquare.col);
                const isPossible = moves.some(m => m.row === row && m.col === col);
                if (isPossible) {
                    if (pieceCode) {
                        square.classList.add('capture-move'); // Gegner schlagen
                    } else {
                        square.classList.add('possible-move'); // Normaler Zug
                    }
                }
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }
}

// --- Logik & Interaktion ---

function handleSquareClick(row, col) {
    const clickedPiece = board[row][col];
    const isOwnPiece = clickedPiece && clickedPiece.startsWith(turn);

    // 1. Eigene Figur auswählen
    if (isOwnPiece) {
        selectedSquare = { row, col };
        renderBoard();
        return;
    }

    // 2. Wenn eine Figur ausgewählt ist, versuche zu ziehen
    if (selectedSquare) {
        const moves = getValidMoves(selectedSquare.row, selectedSquare.col);
        const validMove = moves.find(m => m.row === row && m.col === col);

        if (validMove) {
            executeMove(selectedSquare, { row, col });
            turn = turn === 'w' ? 'b' : 'w';
            selectedSquare = null;
            updateStatus();
            renderBoard();
        } else {
            // Klick ins Leere oder ungültig -> Auswahl aufheben
            selectedSquare = null;
            renderBoard();
        }
    }
}

function executeMove(from, to) {
    const piece = board[from.row][from.col];
    board[to.row][to.col] = piece;
    board[from.row][from.col] = '';
    
    // Einfache Bauernumwandlung (immer zur Dame)
    if (piece[1] === 'p') {
        if ((piece[0] === 'w' && to.row === 0) || (piece[0] === 'b' && to.row === 7)) {
            board[to.row][to.col] = piece[0] + 'q';
        }
    }
}

function updateStatus() {
    statusElement.textContent = turn === 'w' ? "Weiß ist am Zug" : "Schwarz ist am Zug";
    
    // Prüfen ob Schachmatt (sehr vereinfacht: keine Züge mehr möglich)
    // Hinweis: Ein echter Schachmatt-Check ist rechenintensiv, hier prüfen wir nur
    // ob der aktuelle Spieler überhaupt noch gültige Züge hat.
    let hasMoves = false;
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if (board[r][c].startsWith(turn)) {
                if (getValidMoves(r, c).length > 0) {
                    hasMoves = true;
                    break;
                }
            }
        }
    }
    
    if (!hasMoves) {
        // Prüfen ob Schach oder Patt
        if (isKingInCheck(turn, board)) {
            statusElement.textContent = `SCHACHMATT! ${turn === 'w' ? 'Schwarz' : 'Weiß'} gewinnt!`;
        } else {
            statusElement.textContent = "Patt! Unentschieden.";
        }
    } else if (isKingInCheck(turn, board)) {
        statusElement.textContent += " (SCHACH!)";
    }
}

// --- Regelwerk ---

// Gibt ALLE Züge zurück (auch die, die den König ins Schach stellen würden)
function getPseudoLegalMoves(row, col, currentBoard) {
    const piece = currentBoard[row][col];
    if (!piece) return [];
    
    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const directions = {
        'r': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
        'q': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
        'n': [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]],
        'k': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    };

    // Helper: Prüft ob Position auf Brett ist
    const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

    if (type === 'p') { // PAWN (Bauer)
        const direction = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;

        // 1 Schritt vorwärts
        if (onBoard(row + direction, col) && currentBoard[row + direction][col] === '') {
            moves.push({ row: row + direction, col: col });
            // 2 Schritte vorwärts (nur von Startreihe)
            if (row === startRow && currentBoard[row + direction * 2][col] === '') {
                moves.push({ row: row + direction * 2, col: col });
            }
        }
        // Schlagen (diagonal)
        [[direction, 1], [direction, -1]].forEach(([dr, dc]) => {
            const tr = row + dr, tc = col + dc;
            if (onBoard(tr, tc)) {
                const target = currentBoard[tr][tc];
                if (target && target[0] !== color) {
                    moves.push({ row: tr, col: tc });
                }
            }
        });
    } 
    else if (type === 'n') { // KNIGHT (Springer)
        directions.n.forEach(([dr, dc]) => {
            const tr = row + dr, tc = col + dc;
            if (onBoard(tr, tc)) {
                const target = currentBoard[tr][tc];
                if (!target || target[0] !== color) {
                    moves.push({ row: tr, col: tc });
                }
            }
        });
    } 
    else if (type === 'k') { // KING (König)
        directions.k.forEach(([dr, dc]) => {
            const tr = row + dr, tc = col + dc;
            if (onBoard(tr, tc)) {
                const target = currentBoard[tr][tc];
                if (!target || target[0] !== color) {
                    moves.push({ row: tr, col: tc });
                }
            }
        });
    } 
    else { // SLIDING PIECES (Turm, Läufer, Dame)
        const dirs = directions[type];
        dirs.forEach(([dr, dc]) => {
            let tr = row + dr, tc = col + dc;
            while (onBoard(tr, tc)) {
                const target = currentBoard[tr][tc];
                if (!target) {
                    moves.push({ row: tr, col: tc });
                } else {
                    if (target[0] !== color) moves.push({ row: tr, col: tc });
                    break; // Blockiert
                }
                tr += dr;
                tc += dc;
            }
        });
    }

    return moves;
}

// Gibt nur die Züge zurück, die LEGAL sind (kein Schach am Ende)
function getValidMoves(row, col) {
    const piece = board[row][col];
    const color = piece[0];
    const pseudoMoves = getPseudoLegalMoves(row, col, board);
    const validMoves = [];

    pseudoMoves.forEach(move => {
        // Simuliere den Zug
        const tempBoard = JSON.parse(JSON.stringify(board));
        tempBoard[move.row][move.col] = tempBoard[row][col];
        tempBoard[row][col] = '';

        // Wenn der König danach NICHT im Schach steht, ist der Zug gültig
        if (!isKingInCheck(color, tempBoard)) {
            validMoves.push(move);
        }
    });

    return validMoves;
}

// Prüft, ob der König einer Farbe im Schach steht
function isKingInCheck(color, currentBoard) {
    // 1. Finde den König
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (currentBoard[r][c] === color + 'k') {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }

    if (!kingPos) return true; // Sollte nicht passieren (König gefressen), aber sicherheitshalber

    // 2. Prüfe, ob irgendeine gegnerische Figur den König angreifen kann
    const enemyColor = color === 'w' ? 'b' : 'w';
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece && piece.startsWith(enemyColor)) {
                const moves = getPseudoLegalMoves(r, c, currentBoard);
                if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

resetBtn.addEventListener('click', initGame);

// Start
initGame();
