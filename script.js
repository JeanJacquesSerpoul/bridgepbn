// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Références DOM ---
    // ... (keep existing DOM references) ...
    const loadDefaultBtn = document.getElementById('load-default-btn');
    const loadCustomBtn = document.getElementById('load-custom-btn');
    const clearHandsBtn = document.getElementById('clear-hands-btn');
    const pbnFileInput = document.getElementById('pbn-file-input');
    const fileInfo = document.getElementById('file-info');
    const dealSelectionSection = document.getElementById('deal-selection-section');
    const dealSelector = document.getElementById('deal-selector');
    const dealDisplaySection = document.getElementById('deal-display-section');
    const dealNumberDisplay = document.getElementById('deal-number-display');
    const dealerSelector = document.getElementById('dealer-selector');
    const vulnerabilitySelector = document.getElementById('vulnerability-selector');
    const intermediateZone = document.getElementById('intermediate-zone');
    const intermediateDropzone = document.getElementById('intermediate-dropzone');
    const saveSection = document.getElementById('save-section');
    const saveDealBtn = document.getElementById('save-deal-btn');
    const saveFeedback = document.getElementById('save-feedback');
    const handNCountSpan = document.getElementById('hand-N-count');
    const handECountSpan = document.getElementById('hand-E-count');
    const handSCountSpan = document.getElementById('hand-S-count');
    const handWCountSpan = document.getElementById('hand-W-count');
    const countSpans = { N: handNCountSpan, E: handECountSpan, S: handSCountSpan, W: handWCountSpan };


    // --- Données d'état ---
    let parsedDeals = []; // Stores { sequentialIndex, dealNumber (original Board#), dealer, vulnerability, hands, allTags } objects
    let currentDealData = null; // Includes N, E, S, W, I, dealer, vulnerability, dealNumber, allTags
    let currentDealIndex = -1; // Stores the sequential index (0-based) of the currently displayed deal
    let draggedElement = null;
    let draggedCardInfo = null;

    // --- Constantes et Mappings ---
    // ... (keep existing constants and mappings) ...
    const cardOrder = "AKQJT98765432";
    const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
    const suitColors = { S: 'black', H: 'red', D: 'red', C: 'black' };
    const cardRankDisplayFr = { 'A': 'A', 'K': 'R', 'Q': 'D', 'J': 'V', 'T': 'X' };
    const players = ['N', 'E', 'S', 'W'];
    const suits = ['S', 'H', 'D', 'C'];

    const PBN_VULNERABILITY = {
        NONE: 'None',
        NS: 'NS',
        EW: 'EW',
        ALL: 'All'
    };

    // --- Fonctions Utilitaires ---
    // ... (keep existing utility functions: getFrenchRank, sortCards, sortCardElements, normalizeVulnerability, displayFeedback, clearFeedback, askConfirmation, calculatePlayerHandCount, updateHandCountsDisplay) ...
    function getFrenchRank(rank) { return cardRankDisplayFr[rank] || rank; }
    function sortCards(cardsArray) { return cardsArray.sort((a, b) => cardOrder.indexOf(a) - cardOrder.indexOf(b)); }
    function sortCardElements(container) {
        if (!container) return;
        const cardElements = Array.from(container.children).filter(el => el.classList.contains('card'));
        cardElements.sort((a, b) => {
            const rankA = a.dataset.card;
            const rankB = b.dataset.card;
            return cardOrder.indexOf(rankA) - cardOrder.indexOf(rankB);
        });
        cardElements.forEach(el => container.appendChild(el));
    }
    function normalizeVulnerability(vulnString) {
        if (!vulnString) return PBN_VULNERABILITY.NONE;
        const upperVuln = vulnString.toUpperCase();
        if (upperVuln === PBN_VULNERABILITY.NONE.toUpperCase() || upperVuln === '-' || upperVuln === 'O') return PBN_VULNERABILITY.NONE;
        if (upperVuln === PBN_VULNERABILITY.NS.toUpperCase() || upperVuln === 'N' || upperVuln === 'S') return PBN_VULNERABILITY.NS;
        if (upperVuln === PBN_VULNERABILITY.EW.toUpperCase() || upperVuln === 'E' || upperVuln === 'W') return PBN_VULNERABILITY.EW;
        if (upperVuln === PBN_VULNERABILITY.ALL.toUpperCase() || upperVuln === 'BOTH' || upperVuln === 'B') return PBN_VULNERABILITY.ALL;
        return PBN_VULNERABILITY.NONE;
    }
    function displayFeedback(element, message, type = 'info', duration = 0) {
        if (!element) return;
        element.textContent = message;
        element.className = 'feedback-message';
        element.classList.add(`feedback-${type}`);
        element.style.display = 'block';

        if (duration > 0) {
            setTimeout(() => {
                if (element.textContent === message) {
                    element.textContent = '';
                    element.style.display = 'none';
                    element.className = 'mt-2 text-sm min-h-[1.5em]';
                }
            }, duration);
        }
    }
    function clearFeedback(element) {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.className = 'mt-2 text-sm min-h-[1.5em]';
    }
    function askConfirmation(message, onConfirm, onCancel) {
        clearFeedback(saveFeedback);
        saveFeedback.style.display = 'block';
        saveFeedback.className = 'feedback-message feedback-warning';

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.classList.add('mr-4');

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Oui';
        confirmBtn.className = 'bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded mr-2';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Non';
        cancelBtn.className = 'bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded';

        const cleanupAndEnable = () => {
            clearFeedback(saveFeedback);
            saveDealBtn.disabled = false;
        };

        confirmBtn.onclick = () => {
            cleanupAndEnable();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            cleanupAndEnable();
            if (onCancel) onCancel();
        };

        saveFeedback.appendChild(messageSpan);
        saveFeedback.appendChild(confirmBtn);
        saveFeedback.appendChild(cancelBtn);

        saveDealBtn.disabled = true;
    }
    function calculatePlayerHandCount(player) {
        if (!currentDealData || !currentDealData[player]) {
            return 0;
        }
        let count = 0;
        suits.forEach(suit => {
            count += currentDealData[player][suit]?.length || 0;
        });
        return count;
    }
    function updateHandCountsDisplay() {
        if (!currentDealData) {
            players.forEach(player => {
                 const span = countSpans[player];
                 if (span) {
                     span.textContent = '';
                     span.className = 'card-count';
                 }
             });
            return;
        }

        players.forEach(player => {
            const count = calculatePlayerHandCount(player);
            const span = countSpans[player];
            if (span) {
                span.textContent = `(${count})`;
                span.className = 'card-count';
                if (count === 13) {
                    span.classList.add('count-correct');
                } else {
                    span.classList.add('count-incorrect');
                }
            }
        });
    }

    // --- Chargement et Initialisation ---

// --- Event Listeners for Dealer/Vulnerability Selectors ---
dealerSelector.addEventListener('change', (event) => {
    if (currentDealData) {
        currentDealData.dealer = event.target.value; // Updates the current state
        console.log("Dealer changed to:", currentDealData.dealer);
    }
});

vulnerabilitySelector.addEventListener('change', (event) => {
    if (currentDealData) {
        currentDealData.vulnerability = event.target.value; // Updates the current state
        console.log("Vulnerability changed to:", currentDealData.vulnerability);
    }
});

    loadDefaultBtn.addEventListener('click', () => {
        clearFeedback(saveFeedback);
        fetch('default.pbn')
            .then(response => response.ok ? response.text() : Promise.reject(`HTTP error! status: ${response.status}`))
            .then(pbnText => {
                fileInfo.textContent = `Fichier chargé : default.pbn`;
                parseAndSetup(pbnText);
            })
            .catch(error => {
                console.error('Erreur chargement fichier défaut:', error);
                fileInfo.textContent = `Erreur: Impossible de charger default.pbn. ${error.message}`;
                resetUI();
            });
    });

    loadCustomBtn.addEventListener('click', () => {
        clearFeedback(saveFeedback);
        pbnFileInput.click();
    });

    pbnFileInput.addEventListener('change', (event) => {
        clearFeedback(saveFeedback);
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                fileInfo.textContent = `Fichier chargé : ${file.name}`;
                parseAndSetup(e.target.result);
            };
            reader.onerror = (e) => {
                console.error("Erreur lecture fichier:", e);
                fileInfo.textContent = `Erreur: Impossible de lire ${file.name}.`;
                resetUI();
            };
            reader.readAsText(file);
        }
        pbnFileInput.value = null;
    });

    clearHandsBtn.addEventListener('click', () => {
        if (!currentDealData) {
            displayFeedback(saveFeedback, "Aucune donne chargée pour vider les mains.", 'warning', 4000);
            return;
        }
        clearFeedback(saveFeedback);

        console.log("Clearing hands to intermediate zone...");

        if (!currentDealData.I) {
            currentDealData.I = { S: [], H: [], D: [], C: [] };
        } else {
             suits.forEach(suit => {
                 if (!Array.isArray(currentDealData.I[suit])) {
                     currentDealData.I[suit] = [];
                 }
             });
        }

        const cardsToMove = [];
        players.forEach(player => {
            suits.forEach(suit => {
                const playerSuitContainer = document.getElementById(`hand-${player}-${suit}`);
                if (playerSuitContainer) {
                    playerSuitContainer.querySelectorAll('.card').forEach(cardElement => {
                        cardsToMove.push({ element: cardElement, targetSuit: suit });
                    });
                }
            });
        });

        cardsToMove.forEach(item => {
            const cardElement = item.element;
            const targetSuit = item.targetSuit;
            const cardRank = cardElement.dataset.card;

            const targetIntermediateSpan = intermediateDropzone.querySelector(`[data-intermediate-suit="${targetSuit}"]`);
            if (targetIntermediateSpan) {
                targetIntermediateSpan.appendChild(cardElement);
                cardElement.dataset.currentPlayer = 'I';
                cardElement.dataset.currentSuit = targetSuit;
                if (!currentDealData.I[targetSuit].includes(cardRank)) {
                    currentDealData.I[targetSuit].push(cardRank);
                }
            } else {
                console.error(`Intermediate span for suit ${targetSuit} not found!`);
            }
        });

        players.forEach(player => {
             if (currentDealData[player]) {
                 suits.forEach(suit => {
                     currentDealData[player][suit] = [];
                 });
             }
         });

        suits.forEach(suit => {
            if (currentDealData.I[suit]) {
                sortCards(currentDealData.I[suit]);
                const targetIntermediateSpan = intermediateDropzone.querySelector(`[data-intermediate-suit="${suit}"]`);
                sortCardElements(targetIntermediateSpan);
            }
        });

        updateHandCountsDisplay();
        displayFeedback(saveFeedback, "Toutes les cartes des mains ont été déplacées vers la zone intermédiaire.", 'info', 5000);
        console.log("Hands cleared. Current Data:", JSON.parse(JSON.stringify(currentDealData)));
    });

    // --- Parsing PBN ---

    /**
     * Parses the entire PBN text, extracting deals and associated tags.
     * Assigns a sequential index based on order of appearance.
     */
    function parsePBN(pbnText) {
        const deals = [];
        const tagRegex = /\[(\w+)\s+"([^"]+)"\]/g;
        let match;
        let currentTags = {};
        let sequentialDealIndex = 0; // <<< CHANGED: Counter for sequential index

        const lines = pbnText.split('\n');

        for (const line of lines) {
             while ((match = tagRegex.exec(line)) !== null) {
                const tagName = match[1];
                const tagValue = match[2];
                currentTags[tagName] = tagValue;

                if (tagName.toUpperCase() === 'DEAL') {
                    const dealString = tagValue;
                    const hands = parseDealString(dealString);

                    if (hands) {
                        // <<< CHANGED: Determine original board number, default if missing
                        const boardNumberFromTag = parseInt(currentTags['Board'], 10);
                        const finalDealNumber = !isNaN(boardNumberFromTag) ? boardNumberFromTag : (sequentialDealIndex + 1); // Use 1-based sequential if Board missing/invalid

                        const dealer = currentTags['Dealer'] ? currentTags['Dealer'].toUpperCase() : 'N';
                        const vulnerability = normalizeVulnerability(currentTags['Vulnerable']);

                        deals.push({
                            sequentialIndex: sequentialDealIndex, // <<< ADDED
                            dealNumber: finalDealNumber,          // <<< CHANGED: Stores original or default board number
                            dealer: dealer,
                            vulnerability: vulnerability,
                            hands: hands,
                            allTags: { ...currentTags }
                        });
                        sequentialDealIndex++; // <<< CHANGED: Increment after successfully adding a deal
                    } else {
                        // Use sequential index + 1 for warning message if Board tag is missing/invalid
                        const boardDisplay = currentTags['Board'] || `(Ordre #${sequentialDealIndex + 1})`;
                        console.warn(`Impossible de parser la donne (Board ${boardDisplay}): ${dealString}`);
                    }
                    currentTags = {}; // Reset tags for the next potential deal
                }
             }
              tagRegex.lastIndex = 0;
        }

        console.log("Parsed Deals:", deals);
        return deals;
    }


    function parseDealString(dealStr) {
        // ... (keep existing parseDealString implementation) ...
        if (!/^[NESW]:/.test(dealStr.toUpperCase())) return null;

        const firstPlayer = dealStr[0].toUpperCase();
        const handsData = { N: { S: [], H: [], D: [], C: [] }, E: { S: [], H: [], D: [], C: [] }, S: { S: [], H: [], D: [], C: [] }, W: { S: [], H: [], D: [], C: [] } };
        const playersOrder = ['N', 'E', 'S', 'W'];
        let currentPlayerIndex = playersOrder.indexOf(firstPlayer);

        const handsStr = dealStr.substring(2).trim();
        const handsParts = handsStr.split(/\s+/);

        if (handsParts.length !== 4) {
             console.warn("Invalid deal string format: expected 4 hand parts, got", handsParts.length, "in", dealStr);
             return null;
        }

        for (let i = 0; i < 4; i++) {
            const player = playersOrder[currentPlayerIndex % 4];
            const suitStrings = handsParts[i].split('.');

            if (suitStrings.length > 4) {
                console.warn("Invalid hand format: more than 4 suit parts for player", player, "in", handsParts[i]);
                suitStrings[3] = suitStrings.slice(3).join('');
            }

            for (let s = 0; s < suits.length; s++) {
                const suitKey = suits[s];
                const cardsStr = suitStrings[s] || '';
                const validCards = cardsStr.toUpperCase().split('').filter(c => cardOrder.includes(c));
                handsData[player][suitKey] = sortCards(validCards);
            }
            currentPlayerIndex++;
        }
        return handsData;
    }


    function parseAndSetup(pbnText) {
        parsedDeals = parsePBN(pbnText);
        if (parsedDeals.length > 0) {
            dealSelectionSection.classList.remove('hidden');
            populateDealSelector();
            dealSelector.value = '0'; // Select first deal by default (using sequential index 0)
            displayDeal(0); // Display the first deal (index 0)
            saveSection.classList.remove('hidden');
            intermediateZone.classList.remove('hidden');
            clearFeedback(saveFeedback);
        } else {
            fileInfo.textContent += " Aucune donne [Deal] valide trouvée.";
            resetUI();
        }
    }

    function resetUI() {
        dealSelectionSection.classList.add('hidden');
        dealDisplaySection.classList.add('hidden');
        intermediateZone.classList.add('hidden');
        saveSection.classList.add('hidden');
        dealSelector.innerHTML = '';
        parsedDeals = [];
        currentDealData = null;
        currentDealIndex = -1; // Reset current index
        clearDealDisplay();
        clearIntermediateZoneDisplay();
        clearFeedback(saveFeedback);
        fileInfo.textContent = '';
        dealerSelector.value = 'N';
        vulnerabilitySelector.value = PBN_VULNERABILITY.NONE;
        updateHandCountsDisplay();
    }

    // --- Sélection et Affichage Donne ---
    function populateDealSelector() {
        dealSelector.innerHTML = '';
        parsedDeals.forEach((deal, index) => { // index here is the sequentialIndex (0, 1, 2...)
            const option = document.createElement('option');
            option.value = index; // <<< CHANGED: Use the array index (sequential) as the value
            // <<< CHANGED: Display both sequential (1-based) and original Board number
            option.textContent = `Donne ${index + 1} (Board ${deal.dealNumber || '?'})`; // deal.dealNumber holds the original [Board] value or default
            dealSelector.appendChild(option);
        });
     }

    dealSelector.addEventListener('change', (event) => {
        clearFeedback(saveFeedback);
        const selectedSequentialIndex = parseInt(event.target.value, 10); // <<< CHANGED: Value is the sequential index
        displayDeal(selectedSequentialIndex);
    });

    // --- Event Listeners for Dealer/Vulnerability Selectors ---
    dealerSelector.addEventListener('change', (event) => {
        if (currentDealData) {
            currentDealData.dealer = event.target.value;
            console.log("Dealer changed to:", currentDealData.dealer);
        }
    });

    vulnerabilitySelector.addEventListener('change', (event) => {
        if (currentDealData) {
            currentDealData.vulnerability = event.target.value;
            console.log("Vulnerability changed to:", currentDealData.vulnerability);
        }
    });

    function displayDeal(sequentialIndex) { // <<< CHANGED: Parameter is the sequential index
        if (sequentialIndex < 0 || sequentialIndex >= parsedDeals.length) return;

        const selectedDeal = parsedDeals[sequentialIndex];
        currentDealIndex = sequentialIndex; // <<< CHANGED: Store the current sequential index

        // Deep copy hands and other relevant info for editing
        currentDealData = {
             N: JSON.parse(JSON.stringify(selectedDeal.hands.N)),
             E: JSON.parse(JSON.stringify(selectedDeal.hands.E)),
             S: JSON.parse(JSON.stringify(selectedDeal.hands.S)),
             W: JSON.parse(JSON.stringify(selectedDeal.hands.W)),
             I: { S: [], H: [], D: [], C: [] },
             dealer: selectedDeal.dealer,
             vulnerability: selectedDeal.vulnerability,
             dealNumber: selectedDeal.dealNumber, // <<< CHANGED: Store the *original* board number (from Board tag or default)
             allTags: JSON.parse(JSON.stringify(selectedDeal.allTags))
        };

        // <<< CHANGED: Display the original/default board number in the title
        dealNumberDisplay.textContent = currentDealData.dealNumber;
        clearDealDisplay();
        clearIntermediateZoneDisplay();
        clearFeedback(saveFeedback);

        dealerSelector.value = currentDealData.dealer;
        vulnerabilitySelector.value = currentDealData.vulnerability;

        players.forEach(player => {
            suits.forEach(suit => {
                const suitContainer = document.getElementById(`hand-${player}-${suit}`);
                if (!suitContainer) return;
                const cards = currentDealData[player][suit] || [];
                suitContainer.querySelectorAll('.card').forEach(c => c.remove());
                cards.forEach(card => {
                    const cardElement = createCardElement(card, player, suit);
                    suitContainer.appendChild(cardElement);
                });
                 sortCardElements(suitContainer);
                enableDropzone(suitContainer);
            });
        });

         if (intermediateDropzone) {
             enableDropzone(intermediateDropzone);
         } else {
             console.error("La zone de drop intermédiaire (#intermediate-dropzone) est introuvable!");
         }

        dealDisplaySection.classList.remove('hidden');
        intermediateZone.classList.remove('hidden');
        saveSection.classList.remove('hidden');

        updateHandCountsDisplay();
    }

    function clearDealDisplay() {
        document.querySelectorAll('#deal-display .card').forEach(card => card.remove());
    }

    function clearIntermediateZoneDisplay() {
        intermediateDropzone?.querySelectorAll('.card').forEach(card => card.remove());
    }

    function createCardElement(card, player, suit) {
        // ... (keep existing createCardElement implementation) ...
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.textContent = getFrenchRank(card);
        cardElement.style.color = suitColors[suit];
        cardElement.draggable = true;
        cardElement.dataset.card = card;
        cardElement.dataset.currentPlayer = player;
        cardElement.dataset.currentSuit = suit;
        cardElement.id = `card-${player}-${suit}-${card}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        cardElement.addEventListener('dragstart', handleDragStart);
        cardElement.addEventListener('dragend', handleDragEnd);
        return cardElement;
    }


    // --- Logique Drag and Drop ---
    // ... (keep existing drag/drop handlers: handleDragStart, handleDragEnd, enableDropzone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop) ...
    // Note: No changes needed in drag/drop logic itself based on this request.
    function handleDragStart(event) {
        const targetCard = event.target.closest('.card');
        if (!targetCard) {
             event.preventDefault(); return;
        }
        draggedElement = targetCard;

        const currentContainer = draggedElement.closest('.suit-container, span[data-intermediate-suit]');
        let currentSuit = 'unknown';
        let currentPlayer = 'unknown';

        if (currentContainer?.dataset.player) {
            currentPlayer = currentContainer.dataset.player;
            currentSuit = currentContainer.dataset.suit;
        } else if (currentContainer?.dataset.intermediateSuit) {
            currentPlayer = 'I';
            currentSuit = currentContainer.dataset.intermediateSuit;
        } else {
            console.warn("Cannot determine current location of dragged card from parent", draggedElement);
            currentPlayer = draggedElement.dataset.currentPlayer || 'unknown';
            currentSuit = draggedElement.dataset.currentSuit || 'unknown';
        }

        draggedCardInfo = {
            card: draggedElement.dataset.card,
            suit: currentSuit, // This should represent the *actual* suit of the card, not container suit
            player: currentPlayer,
            elementId: draggedElement.id
        };

        // Re-determine actual suit from card data if possible (more robust)
        // This requires parsing the card ID or having suit info in dataset. Let's assume dataset.currentSuit IS the card's actual suit.
        // If card is 'AH' (Ace of Hearts), dataset.currentSuit should be 'H' regardless of container.
        // Let's ensure createCardElement sets dataset.currentSuit correctly as the card's actual suit.
        // (On review, createCardElement receives `suit`, which IS the actual suit. So `draggedCardInfo.suit` should be correct).

        try {
            event.dataTransfer.setData('text/plain', draggedElement.id);
            event.dataTransfer.effectAllowed = 'move';
        } catch (e) { console.error("setData failed:", e); event.dataTransfer.effectAllowed = 'none';}

        setTimeout(() => draggedElement?.classList.add('dragging'), 0);
        clearFeedback(saveFeedback);
    }
    function handleDragEnd(event) {
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
        }
        document.querySelectorAll('.suit-container.drag-over, .suit-container.drag-invalid').forEach(dz => {
            dz.classList.remove('drag-over', 'drag-invalid');
        });
        draggedElement = null;
        draggedCardInfo = null;
    }
    function enableDropzone(container) {
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('dragenter', handleDragEnter);
        container.removeEventListener('dragleave', handleDragLeave);
        container.removeEventListener('drop', handleDrop);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
     }
    function handleDragOver(event) {
        event.preventDefault();
        if (!draggedCardInfo) {
            event.dataTransfer.dropEffect = 'none'; return;
        }

        const container = event.target.closest('.suit-container');
        if (!container) {
            event.dataTransfer.dropEffect = 'none'; return;
        }

        const isIntermediateSingleZone = container.id === 'intermediate-dropzone';
        const isHandZoneSuit = !!container.dataset.player && !!container.dataset.suit;

        // Use the suit info stored during drag start (should be the card's actual suit)
        const cardActualSuit = draggedCardInfo.suit;

        let canDrop = false;
        if (isHandZoneSuit) {
            canDrop = (cardActualSuit === container.dataset.suit);
        } else if (isIntermediateSingleZone || container.closest('#intermediate-dropzone')) {
            canDrop = true;
        }

        event.dataTransfer.dropEffect = canDrop ? 'move' : 'none';

         if (container) {
             container.classList.remove('drag-over', 'drag-invalid');
             if (canDrop) {
                 container.classList.add('drag-over');
             } else if (isHandZoneSuit && cardActualSuit !== container.dataset.suit) {
                 container.classList.add('drag-invalid');
             }
         }
    }
    function handleDragEnter(event) {
        event.preventDefault();
        if (!draggedCardInfo) return;

        const container = event.target.closest('.suit-container');
        if (!container) return;

        const isIntermediateSingleZone = container.id === 'intermediate-dropzone';
        const isHandZoneSuit = !!container.dataset.player && !!container.dataset.suit;
        const cardActualSuit = draggedCardInfo.suit;

        let isValidTarget = false;
        if (isHandZoneSuit && cardActualSuit === container.dataset.suit) {
            isValidTarget = true;
        } else if (isIntermediateSingleZone || container.closest('#intermediate-dropzone')) {
             isValidTarget = true;
        }

        container.classList.remove('drag-over', 'drag-invalid');
        if (isValidTarget) {
            container.classList.add('drag-over');
        } else if (isHandZoneSuit) {
             container.classList.add('drag-invalid');
        }
    }
    function handleDragLeave(event) {
        const container = event.target.closest('.suit-container');
        if (container && !container.contains(event.relatedTarget)) {
            container.classList.remove('drag-over', 'drag-invalid');
        }
        else if (event.target === container) {
             container.classList.remove('drag-over', 'drag-invalid');
        }
    }
    function handleDrop(event) {
        event.preventDefault();
        const draggedElementId = event.dataTransfer.getData('text/plain');
        const localDraggedElement = document.getElementById(draggedElementId);

        if (!localDraggedElement || !draggedCardInfo) {
             console.warn("Drop cancelled: Dragged element or info missing.");
             handleDragEnd(); return;
        }

        const dropzoneContainer = event.target.closest('.suit-container[data-player][data-suit], #intermediate-dropzone');

        event.target.closest('.suit-container')?.classList.remove('drag-over', 'drag-invalid');
        dropzoneContainer?.classList.remove('drag-over', 'drag-invalid');


        if (!dropzoneContainer) {
             console.warn("Drop cancelled: Dropped outside a valid zone.");
             handleDragEnd(); return;
        }

        const cardToMove = draggedCardInfo.card;
        const cardActualSuit = draggedCardInfo.suit; // Actual suit of the card
        const sourcePlayer = draggedCardInfo.player; // 'N', 'E', 'S', 'W', or 'I'

        // Determine source suit context (where it visually came FROM)
        const sourceContainer = localDraggedElement.parentElement;
        let sourceSuitContext = 'unknown';
         if (sourceContainer?.dataset.player && sourceContainer?.dataset.suit) { // From a player hand suit
             sourceSuitContext = sourceContainer.dataset.suit;
         } else if (sourceContainer?.dataset.intermediateSuit) { // From an intermediate span
             sourceSuitContext = sourceContainer.dataset.intermediateSuit;
             // IMPORTANT: In intermediate zone, sourceSuitContext MUST match cardActualSuit
             if(sourceSuitContext !== cardActualSuit) {
                 console.error(`Data inconsistency detected! Card ${cardToMove}${cardActualSuit} was in intermediate span for ${sourceSuitContext}. Correcting source context.`);
                 sourceSuitContext = cardActualSuit; // Trust the card's actual suit
             }
         } else {
             sourceSuitContext = cardActualSuit; // Fallback: assume context matches actual suit
             console.warn("Could not determine source suit context from parent, using card's actual suit:", sourceSuitContext);
         }


        const isTargetHand = !!dropzoneContainer.dataset.player;
        const isTargetIntermediate = dropzoneContainer.id === 'intermediate-dropzone';

        let targetPlayer = null;
        let targetSuit = null; // Suit array in data model
        let targetContainerForDOM = null; // DOM element to append to

        if (isTargetHand) {
            targetPlayer = dropzoneContainer.dataset.player;
            targetSuit = dropzoneContainer.dataset.suit;
            if (cardActualSuit !== targetSuit) {
                console.warn(`Action denied: Cannot drop ${cardActualSuit} card into ${targetSuit} hand zone.`);
                handleDragEnd(); return;
            }
            targetContainerForDOM = dropzoneContainer;
        } else if (isTargetIntermediate) {
            targetPlayer = 'I';
            targetSuit = cardActualSuit; // Goes into intermediate array matching its own suit
            targetContainerForDOM = dropzoneContainer.querySelector(`[data-intermediate-suit="${cardActualSuit}"]`);
            if (!targetContainerForDOM) {
                 console.error("Internal suit span for", cardActualSuit, "not found in intermediate zone!");
                 handleDragEnd(); return;
            }
        } else {
            console.warn("Drop target not recognized."); handleDragEnd(); return;
        }

        if (localDraggedElement.parentElement === targetContainerForDOM) {
            console.log("Drop cancelled: Dropped onto the same location."); handleDragEnd(); return;
        }

         // Data Consistency Check
         const sourceDataArray = currentDealData?.[sourcePlayer]?.[sourceSuitContext];
         if (!Array.isArray(sourceDataArray)) {
             console.error("Internal error: Invalid source data structure.", {sourcePlayer, sourceSuitContext, sourceDataArray, currentDealData});
             // Attempt recovery by using cardActualSuit if sourcePlayer is 'I'
             if (sourcePlayer === 'I' && sourceSuitContext !== cardActualSuit) {
                 sourceSuitContext = cardActualSuit; // Trust card's actual suit for intermediate
                 const correctedSourceDataArray = currentDealData?.I?.[sourceSuitContext];
                 if (!Array.isArray(correctedSourceDataArray)) {
                     handleDragEnd(); return; // Still invalid
                 }
                 console.warn("Corrected sourceSuitContext for intermediate removal to:", sourceSuitContext);
             } else {
                 handleDragEnd(); return; // Give up
             }
         }
         const targetDataArray = currentDealData?.[targetPlayer]?.[targetSuit];
         if (!Array.isArray(targetDataArray)) {
             console.error("Internal error: Invalid target data structure.", {targetPlayer, targetSuit, targetDataArray, currentDealData});
             handleDragEnd(); return;
         }

        // --- Update Data Model ---
        // 1. Remove from source data
        const cardIndex = currentDealData[sourcePlayer][sourceSuitContext].indexOf(cardToMove); // Use potentially corrected sourceSuitContext
        if (cardIndex === -1) {
            console.error(`Card ${cardToMove} (Actual Suit: ${cardActualSuit}) not found in source data ${sourcePlayer}[${sourceSuitContext}]. Data:`, JSON.stringify(currentDealData[sourcePlayer][sourceSuitContext]), "Current Parent:", localDraggedElement.parentElement);
             let foundAndRemoved = false;
             const searchSuits = sourcePlayer === 'I' ? [cardActualSuit] : suits; // Only search relevant suit in intermediate
             searchSuits.forEach(s => {
                 const idx = currentDealData[sourcePlayer]?.[s]?.indexOf(cardToMove);
                 if (idx > -1) {
                     currentDealData[sourcePlayer][s].splice(idx, 1);
                     console.log(`Corrected removal: Removed ${cardToMove} from ${sourcePlayer}[${s}]`);
                     foundAndRemoved = true;
                 }
             });
             if (!foundAndRemoved) {
                console.error("Could not find and remove card from any source location. Aborting drop.");
                handleDragEnd(); return;
             }
        } else {
            currentDealData[sourcePlayer][sourceSuitContext].splice(cardIndex, 1);
        }

        // 2. Add to target data
        if (!targetDataArray.includes(cardToMove)) {
            targetDataArray.push(cardToMove);
            sortCards(targetDataArray);
        }

        // --- Update DOM ---
        targetContainerForDOM.appendChild(localDraggedElement);
        sortCardElements(targetContainerForDOM);

        // --- Update Card Element State ---
        localDraggedElement.dataset.currentPlayer = targetPlayer;
        // Ensure dataset.currentSuit always reflects the CARD's actual suit, which doesn't change.
        // It was set correctly on creation and used in dragInfo. No need to change it here.
        // localDraggedElement.dataset.currentSuit = targetSuit; // NO! This is wrong.

        console.log(`Moved ${cardToMove}${cardActualSuit} from ${sourcePlayer} (context: ${sourceSuitContext}) to ${targetPlayer}-${targetSuit}`);

        updateHandCountsDisplay();
        handleDragEnd();
    }


    // --- Sauvegarde ---

    /**
     * Finalizes the save process after confirmation (if needed).
     * Uses the original dealNumber stored in currentDealData.
     */
    function proceedWithSave(handsToSave, totalCardsInHands, dealer, vulnerability, originalDealNumber, allOtherTags, intermediateCardsFound, intermediateCardCount) { // <<< CHANGED parameter name
        let warningMessage = "";
        if (totalCardsInHands !== 52) {
             const missing = 52 - totalCardsInHands;
             warningMessage = `Attention : Total de ${totalCardsInHands} cartes dans les mains N,E,S,W (au lieu de 52). Il manque ${missing} carte(s). ${intermediateCardsFound ? `(${intermediateCardCount} dans la zone intermédiaire)` : ''} La sauvegarde peut être incorrecte.`;
             displayFeedback(saveFeedback, warningMessage, 'warning');
         } else {
            if (saveFeedback.classList.contains('feedback-warning')) {
                clearFeedback(saveFeedback);
            }
         }

        const pbnDealString = generatePbnDealString(handsToSave, dealer);
        // <<< CHANGED: Use originalDealNumber for filename
        const filename = `deal_${originalDealNumber}_modified_${Date.now()}.pbn`;

        let outputPbn = "";
        const tagsToInclude = {...allOtherTags};
        delete tagsToInclude.Deal;
        delete tagsToInclude.Dealer;
        delete tagsToInclude.Vulnerable;

        // <<< CHANGED: Ensure Board tag uses the originalDealNumber
        tagsToInclude.Board = originalDealNumber.toString();

        const tagOrder = ['Event', 'Site', 'Date', 'Board', 'West', 'North', 'East', 'South', 'Dealer', 'Vulnerable', 'Scoring', 'Declarer', 'Contract', 'Result'];

        tagOrder.forEach(tagName => {
            if (tagsToInclude[tagName] !== undefined) { // Check existence explicitly
                outputPbn += `[${tagName} "${tagsToInclude[tagName]}"]\n`;
                delete tagsToInclude[tagName];
            }
        });

        outputPbn += `[Dealer "${dealer}"]\n`;
        outputPbn += `[Vulnerable "${vulnerability}"]\n`;

        Object.entries(tagsToInclude).forEach(([tagName, tagValue]) => {
             outputPbn += `[${tagName} "${tagValue}"]\n`;
        });

        outputPbn += `[Deal "${pbnDealString}"]\n`;

        const blob = new Blob([outputPbn], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        if (!warningMessage) {
             // <<< CHANGED: Use originalDealNumber in success message
            displayFeedback(saveFeedback, `Donne N°${originalDealNumber} sauvegardée sous ${filename}`, 'success', 5000);
        }
    }

    saveDealBtn.addEventListener('click', () => {
        clearFeedback(saveFeedback);

        if (!currentDealData || currentDealIndex === -1) { // Check currentDealIndex too
            displayFeedback(saveFeedback, "Aucune donne n'est actuellement chargée pour la sauvegarde.", 'error', 5000);
            return;
        }

        let intermediateCardsFound = false;
        let intermediateCardCount = 0;
        if (currentDealData.I) {
             suits.forEach(suit => {
                 const count = currentDealData.I[suit]?.length || 0;
                 if (count > 0) {
                     intermediateCardsFound = true;
                     intermediateCardCount += count;
                 }
             });
        }

        const handsToSave = {};
        let totalCardsInHands = 0;
        players.forEach(p => {
            handsToSave[p] = { S: [], H: [], D: [], C: [] };
             if(currentDealData[p]) {
                 suits.forEach(suit => {
                    const cards = currentDealData[p][suit] || [];
                    handsToSave[p][suit] = sortCards([...cards]);
                    totalCardsInHands += cards.length;
                });
             }
        });

        // <<< CHANGED: Get original deal number from currentDealData
        const currentDealer = currentDealData.dealer;
        const currentVulnerability = currentDealData.vulnerability;
        const originalDealNumber = currentDealData.dealNumber; // Use the stored original number
        const allOtherTags = currentDealData.allTags || {};

        if (intermediateCardsFound) {
            askConfirmation(
                `Il y a ${intermediateCardCount} carte(s) dans la zone intermédiaire qui ne seront PAS sauvegardées. Continuer ?`,
                () => { // onConfirm
                    proceedWithSave(handsToSave, totalCardsInHands, currentDealer, currentVulnerability, originalDealNumber, allOtherTags, intermediateCardsFound, intermediateCardCount);
                },
                () => { // onCancel
                    displayFeedback(saveFeedback, "Sauvegarde annulée.", 'info', 3000);
                }
            );
        } else {
            proceedWithSave(handsToSave, totalCardsInHands, currentDealer, currentVulnerability, originalDealNumber, allOtherTags, intermediateCardsFound, intermediateCardCount);
        }
    });

    function generatePbnDealString(handsData, firstPlayer = 'N') {
         // ... (keep existing generatePbnDealString implementation) ...
         if (!['N', 'E', 'S', 'W'].includes(firstPlayer)) firstPlayer = 'N';
        const dealParts = [];
        const playersOrder = ['N', 'E', 'S', 'W'];
        let startIndex = playersOrder.indexOf(firstPlayer);
        if (startIndex === -1) startIndex = 0;

        for (let i = 0; i < 4; i++) {
            const player = playersOrder[(startIndex + i) % 4];
            const suitStrings = [];
            if (handsData[player]) {
                suits.forEach(suit => {
                    const cards = handsData[player][suit] || [];
                    suitStrings.push(cards.join(''));
                });
                 dealParts.push(suitStrings.join('.'));
            } else {
                 dealParts.push('...');
            }
        }
        return `${firstPlayer}:${dealParts.join(' ')}`;
     }

}); // Fin du DOMContentLoaded