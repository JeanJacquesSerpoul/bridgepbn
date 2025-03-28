document.addEventListener('DOMContentLoaded', () => {
    // --- Références DOM ---
    const loadDefaultBtn = document.getElementById('load-default-btn');
    const loadCustomBtn = document.getElementById('load-custom-btn');
    const clearHandsBtn = document.getElementById('clear-hands-btn'); // Reference for the new button
    const pbnFileInput = document.getElementById('pbn-file-input');
    const fileInfo = document.getElementById('file-info');
    const dealSelectionSection = document.getElementById('deal-selection-section');
    const dealSelector = document.getElementById('deal-selector');
    const dealDisplaySection = document.getElementById('deal-display-section');
    const dealNumberDisplay = document.getElementById('deal-number-display');
    const dealerSelector = document.getElementById('dealer-selector'); // Added
    const vulnerabilitySelector = document.getElementById('vulnerability-selector'); // Added
    const intermediateZone = document.getElementById('intermediate-zone');
    const intermediateDropzone = document.getElementById('intermediate-dropzone');
    const saveSection = document.getElementById('save-section');
    const saveDealBtn = document.getElementById('save-deal-btn');
    const saveFeedback = document.getElementById('save-feedback'); // Zone pour les messages
    const handNCountSpan = document.getElementById('hand-N-count');
    const handECountSpan = document.getElementById('hand-E-count');
    const handSCountSpan = document.getElementById('hand-S-count');
    const handWCountSpan = document.getElementById('hand-W-count');
    const countSpans = { N: handNCountSpan, E: handECountSpan, S: handSCountSpan, W: handWCountSpan }; // Map for easy access

    // --- Données d'état ---
    let parsedDeals = []; // Stores { dealNumber, dealer, vulnerability, hands, allTags } objects
    let currentDealData = null; // Includes N, E, S, W, I, dealer, vulnerability, allTags
    let currentDealIndex = -1;
    let draggedElement = null;
    let draggedCardInfo = null; // { card, suit, player, elementId }

    // --- Constantes et Mappings ---
    const cardOrder = "AKQJT98765432"; // Keep T for internal data/sorting consistency
    const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
    const suitColors = { S: 'black', H: 'red', D: 'red', C: 'black' };
    const cardRankDisplayFr = { 'A': 'A', 'K': 'R', 'Q': 'D', 'J': 'V', 'T': 'X' };
    const players = ['N', 'E', 'S', 'W']; // Define players list
    const suits = ['S', 'H', 'D', 'C'];    // Define suits list

    // Standard PBN Vulnerability values
    const PBN_VULNERABILITY = {
        NONE: 'None',
        NS: 'NS',
        EW: 'EW',
        ALL: 'All'
    };

    // --- Fonctions Utilitaires ---
    function getFrenchRank(rank) { return cardRankDisplayFr[rank] || rank; }
    function sortCards(cardsArray) { return cardsArray.sort((a, b) => cardOrder.indexOf(a) - cardOrder.indexOf(b)); }
    function sortCardElements(container) {
        // Ensure container is valid before querying
        if (!container) return;
        // Select only direct children that are cards to avoid sorting symbols/spans
        const cardElements = Array.from(container.children).filter(el => el.classList.contains('card'));
        cardElements.sort((a, b) => {
            const rankA = a.dataset.card;
            const rankB = b.dataset.card;
            return cardOrder.indexOf(rankA) - cardOrder.indexOf(rankB);
        });
        // Re-append only the sorted card elements
        cardElements.forEach(el => container.appendChild(el));
    }

    /**
     * Maps various PBN vulnerability inputs to standard values.
     */
    function normalizeVulnerability(vulnString) {
        if (!vulnString) return PBN_VULNERABILITY.NONE;
        const upperVuln = vulnString.toUpperCase();
        if (upperVuln === PBN_VULNERABILITY.NONE.toUpperCase() || upperVuln === '-' || upperVuln === 'O') return PBN_VULNERABILITY.NONE; // 'O' sometimes used for None
        if (upperVuln === PBN_VULNERABILITY.NS.toUpperCase() || upperVuln === 'N' || upperVuln === 'S') return PBN_VULNERABILITY.NS;
        if (upperVuln === PBN_VULNERABILITY.EW.toUpperCase() || upperVuln === 'E' || upperVuln === 'W') return PBN_VULNERABILITY.EW;
        if (upperVuln === PBN_VULNERABILITY.ALL.toUpperCase() || upperVuln === 'BOTH' || upperVuln === 'B') return PBN_VULNERABILITY.ALL;
        return PBN_VULNERABILITY.NONE; // Default fallback
    }

    // ... (keep existing displayFeedback, clearFeedback, askConfirmation, calculatePlayerHandCount, updateHandCountsDisplay functions) ...
    function displayFeedback(element, message, type = 'info', duration = 0) {
        if (!element) return;
        element.textContent = message;
        // Reset classes, add base and type class
        element.className = 'feedback-message'; // Start fresh
        element.classList.add(`feedback-${type}`);
        element.style.display = 'block'; // Ensure it's visible

        if (duration > 0) {
            setTimeout(() => {
                // Check if the message hasn't been changed by another call
                if (element.textContent === message) {
                    element.textContent = '';
                    element.style.display = 'none';
                    element.className = 'mt-2 text-sm min-h-[1.5em]'; // Reset to default empty state classes
                }
            }, duration);
        }
    }
    function clearFeedback(element) {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none'; // Hide it
        element.className = 'mt-2 text-sm min-h-[1.5em]'; // Reset to default empty state classes
    }
    function askConfirmation(message, onConfirm, onCancel) {
        clearFeedback(saveFeedback); // Clear previous messages
        saveFeedback.style.display = 'block';
        saveFeedback.className = 'feedback-message feedback-warning'; // Style as warning

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.classList.add('mr-4'); // Add margin between text and buttons

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Oui';
        confirmBtn.className = 'bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded mr-2';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Non';
        cancelBtn.className = 'bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded';

        const cleanupAndEnable = () => {
            clearFeedback(saveFeedback); // Clears the confirmation UI
            saveDealBtn.disabled = false; // Re-enable save button
        };

        confirmBtn.onclick = () => {
            cleanupAndEnable();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            cleanupAndEnable();
            if (onCancel) onCancel();
        };

        // Append elements inside the feedback div
        saveFeedback.appendChild(messageSpan);
        saveFeedback.appendChild(confirmBtn);
        saveFeedback.appendChild(cancelBtn);

        saveDealBtn.disabled = true; // Disable save button while confirming
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
        if (!currentDealData) { // If no deal is loaded, clear counts
            players.forEach(player => {
                 const span = countSpans[player];
                 if (span) {
                     span.textContent = '';
                     span.className = 'card-count'; // Reset classes
                 }
             });
            return;
        }

        players.forEach(player => {
            const count = calculatePlayerHandCount(player);
            const span = countSpans[player];
            if (span) {
                span.textContent = `(${count})`;
                span.className = 'card-count'; // Reset classes first
                if (count === 13) {
                    span.classList.add('count-correct');
                } else {
                    span.classList.add('count-incorrect');
                }
            }
        });
    }


    // --- Chargement et Initialisation ---

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
        pbnFileInput.value = null; // Allow re-selection of the same file
    });

    // --- Clear Hands Button Listener ---
    clearHandsBtn.addEventListener('click', () => {
        if (!currentDealData) {
            displayFeedback(saveFeedback, "Aucune donne chargée pour vider les mains.", 'warning', 4000);
            return;
        }
        clearFeedback(saveFeedback); // Clear any previous message

        console.log("Clearing hands to intermediate zone...");

        // Ensure intermediate data structure exists and is complete
        if (!currentDealData.I) {
            currentDealData.I = { S: [], H: [], D: [], C: [] };
        } else {
             suits.forEach(suit => { // Ensure all suit arrays exist within I
                 if (!Array.isArray(currentDealData.I[suit])) {
                     currentDealData.I[suit] = [];
                 }
             });
        }

        // Use a temporary list to avoid issues with live NodeList
        const cardsToMove = [];
        players.forEach(player => {
            suits.forEach(suit => {
                const playerSuitContainer = document.getElementById(`hand-${player}-${suit}`);
                if (playerSuitContainer) {
                    // Get a static list of cards currently in this container
                    playerSuitContainer.querySelectorAll('.card').forEach(cardElement => {
                        cardsToMove.push({ element: cardElement, targetSuit: suit });
                    });
                }
            });
        });

        // Now, move the cards based on the static list
        cardsToMove.forEach(item => {
            const cardElement = item.element;
            const targetSuit = item.targetSuit;
            const cardRank = cardElement.dataset.card;

            const targetIntermediateSpan = intermediateDropzone.querySelector(`[data-intermediate-suit="${targetSuit}"]`);
            if (targetIntermediateSpan) {
                // Move DOM element
                targetIntermediateSpan.appendChild(cardElement);

                // Update card's state attributes
                cardElement.dataset.currentPlayer = 'I';
                cardElement.dataset.currentSuit = targetSuit;

                // Add card rank to intermediate data (prevent duplicates)
                if (!currentDealData.I[targetSuit].includes(cardRank)) {
                    currentDealData.I[targetSuit].push(cardRank);
                }
            } else {
                console.error(`Intermediate span for suit ${targetSuit} not found!`);
            }
        });

        // Clear all player hand data
        players.forEach(player => {
             if (currentDealData[player]) {
                 suits.forEach(suit => {
                     currentDealData[player][suit] = [];
                 });
             }
         });


        // Sort intermediate zone data and DOM elements
        suits.forEach(suit => {
            if (currentDealData.I[suit]) {
                sortCards(currentDealData.I[suit]); // Sort data array
                const targetIntermediateSpan = intermediateDropzone.querySelector(`[data-intermediate-suit="${suit}"]`);
                sortCardElements(targetIntermediateSpan); // Sort DOM elements within the span
            }
        });

        // Update hand counts (should all be 0)
        updateHandCountsDisplay();

        displayFeedback(saveFeedback, "Toutes les cartes des mains ont été déplacées vers la zone intermédiaire.", 'info', 5000);
        console.log("Hands cleared. Current Data:", JSON.parse(JSON.stringify(currentDealData))); // Deep copy for logging
    });

    // --- Parsing PBN ---

    /**
     * Parses the entire PBN text, extracting deals and associated tags.
     */
    function parsePBN(pbnText) {
        const deals = [];
        // Regex to find any PBN tag: [TagName "TagValue"]
        const tagRegex = /\[(\w+)\s+"([^"]+)"\]/g;
        let match;
        let currentTags = {}; // Accumulates tags for the current deal
        let dealCounter = 0; // Tracks the Board number if [Board] tag is missing

        // Split text into lines for potentially better context, though regex works on the whole string
        const lines = pbnText.split('\n');

        for (const line of lines) {
             // Process each tag found in the line
             while ((match = tagRegex.exec(line)) !== null) {
                const tagName = match[1];
                const tagValue = match[2];
                currentTags[tagName] = tagValue; // Store/overwrite tag

                // If we found a [Deal] tag, process the accumulated tags
                if (tagName.toUpperCase() === 'DEAL') {
                    dealCounter++;
                    const dealString = tagValue;
                    const hands = parseDealString(dealString);

                    if (hands) {
                        // Assign a deal number, preferring [Board] tag, else use counter
                        const boardNumber = parseInt(currentTags['Board'], 10) || dealCounter;

                        // Extract and normalize Dealer and Vulnerability
                        const dealer = currentTags['Dealer'] ? currentTags['Dealer'].toUpperCase() : 'N'; // Default N
                        const vulnerability = normalizeVulnerability(currentTags['Vulnerable']); // Default None (handled by normalize)

                        deals.push({
                            dealNumber: boardNumber,
                            dealer: dealer,
                            vulnerability: vulnerability,
                            hands: hands,
                            allTags: { ...currentTags } // Store a copy of all tags found for this deal
                        });
                    } else {
                        console.warn(`Impossible de parser la donne (Board ${currentTags['Board'] || dealCounter}): ${dealString}`);
                    }
                    // Reset for the next potential deal block, but keep tags that might span multiple deals?
                    // Let's reset completely for simplicity. PBN viewers often assume tags apply to the immediately following deal.
                    currentTags = {};
                }
             }
             // Reset regex state if line doesn't end with a match (necessary when using exec in a loop on substrings/lines)
              tagRegex.lastIndex = 0;
        }

        console.log("Parsed Deals:", deals);
        return deals;
    }


    function parseDealString(dealStr) {
        // Check if deal string starts with player indicator (N:, E:, S:, W:)
        if (!/^[NESW]:/.test(dealStr.toUpperCase())) return null;

        const firstPlayer = dealStr[0].toUpperCase();
        const handsData = { N: { S: [], H: [], D: [], C: [] }, E: { S: [], H: [], D: [], C: [] }, S: { S: [], H: [], D: [], C: [] }, W: { S: [], H: [], D: [], C: [] } };
        const playersOrder = ['N', 'E', 'S', 'W'];
        let currentPlayerIndex = playersOrder.indexOf(firstPlayer);
        // Note: PBN standard requires the firstPlayer to be N, E, S, or W.

        const handsStr = dealStr.substring(2).trim(); // Remove player indicator and trim whitespace
        const handsParts = handsStr.split(/\s+/); // Split hands by space

        // Each player's hand is represented by S.H.D.C format
        if (handsParts.length !== 4) {
             console.warn("Invalid deal string format: expected 4 hand parts, got", handsParts.length, "in", dealStr);
             return null;
        }

        for (let i = 0; i < 4; i++) {
            const player = playersOrder[currentPlayerIndex % 4];
            const suitStrings = handsParts[i].split('.'); // Split hand part by '.' for suits

            // Handle cases where trailing suits might be omitted (e.g., "AKQ..." instead of "AKQ...")
            if (suitStrings.length > 4) {
                console.warn("Invalid hand format: more than 4 suit parts for player", player, "in", handsParts[i]);
                // Attempt recovery: Join extra parts back to the last expected part (Clubs)
                suitStrings[3] = suitStrings.slice(3).join('');
            }

            for (let s = 0; s < suits.length; s++) {
                const suitKey = suits[s];
                const cardsStr = suitStrings[s] || ''; // Handle potentially missing suit strings (e.g., "..AK.")
                // Filter out any non-card characters, though PBN shouldn't have them here
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
            dealSelector.value = '0'; // Select first deal by default
            displayDeal(0); // This will call updateHandCountsDisplay
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
        currentDealData = null; // Crucial to clear data
        currentDealIndex = -1;
        clearDealDisplay();
        clearIntermediateZoneDisplay();
        clearFeedback(saveFeedback);
        fileInfo.textContent = '';
        // Reset Dealer/Vulnerability selectors to default visually
        dealerSelector.value = 'N';
        vulnerabilitySelector.value = PBN_VULNERABILITY.NONE;
        updateHandCountsDisplay(); // Clear counts when resetting UI
    }

    // --- Sélection et Affichage Donne ---
    function populateDealSelector() {
        dealSelector.innerHTML = '';
        parsedDeals.forEach((deal, index) => {
            const option = document.createElement('option');
            option.value = index;
            // Display Board number from parsed data
            option.textContent = `Donne N° ${deal.dealNumber}`;
            dealSelector.appendChild(option);
        });
     }

    dealSelector.addEventListener('change', (event) => {
        clearFeedback(saveFeedback); // Clear feedback when changing deal
        displayDeal(parseInt(event.target.value, 10));
    });

    // --- Event Listeners for Dealer/Vulnerability Selectors ---
    dealerSelector.addEventListener('change', (event) => {
        if (currentDealData) {
            currentDealData.dealer = event.target.value;
            console.log("Dealer changed to:", currentDealData.dealer);
            // Optional: Add visual cue that data changed
        }
    });

    vulnerabilitySelector.addEventListener('change', (event) => {
        if (currentDealData) {
            currentDealData.vulnerability = event.target.value;
            console.log("Vulnerability changed to:", currentDealData.vulnerability);
            // Optional: Add visual cue that data changed
        }
    });

    function displayDeal(dealIndex) {
        if (dealIndex < 0 || dealIndex >= parsedDeals.length) return;

        const selectedDeal = parsedDeals[dealIndex];
        currentDealIndex = dealIndex;

        // Deep copy hands and other relevant info for editing
        currentDealData = {
             N: JSON.parse(JSON.stringify(selectedDeal.hands.N)),
             E: JSON.parse(JSON.stringify(selectedDeal.hands.E)),
             S: JSON.parse(JSON.stringify(selectedDeal.hands.S)),
             W: JSON.parse(JSON.stringify(selectedDeal.hands.W)),
             I: { S: [], H: [], D: [], C: [] }, // Init/Reset intermediate zone data
             dealer: selectedDeal.dealer,
             vulnerability: selectedDeal.vulnerability,
             dealNumber: selectedDeal.dealNumber, // Keep track of original deal number
             allTags: JSON.parse(JSON.stringify(selectedDeal.allTags)) // Keep other tags too
        };

        dealNumberDisplay.textContent = currentDealData.dealNumber; // Use number from parsed data
        clearDealDisplay();
        clearIntermediateZoneDisplay(); // Clear visual intermediate zone
        clearFeedback(saveFeedback); // Clear save feedback

        // --- Update Dealer and Vulnerability Selectors ---
        dealerSelector.value = currentDealData.dealer;
        vulnerabilitySelector.value = currentDealData.vulnerability;
        // --- ---

        // Display player hands and enable dropzones
        players.forEach(player => {
            suits.forEach(suit => {
                const suitContainer = document.getElementById(`hand-${player}-${suit}`);
                if (!suitContainer) return;
                const cards = currentDealData[player][suit] || [];
                suitContainer.querySelectorAll('.card').forEach(c => c.remove()); // Clear existing cards
                cards.forEach(card => {
                    const cardElement = createCardElement(card, player, suit);
                    suitContainer.appendChild(cardElement);
                });
                 sortCardElements(suitContainer); // Sort visually
                enableDropzone(suitContainer);
            });
        });

         // Enable intermediate dropzone
         if (intermediateDropzone) {
             enableDropzone(intermediateDropzone);
         } else {
             console.error("La zone de drop intermédiaire (#intermediate-dropzone) est introuvable!");
         }

        // Show relevant sections
        dealDisplaySection.classList.remove('hidden');
        intermediateZone.classList.remove('hidden');
        saveSection.classList.remove('hidden');

        updateHandCountsDisplay(); // Update counts after displaying
    }

    function clearDealDisplay() {
        // Only remove cards from player hands, not the structure or count spans
        document.querySelectorAll('#deal-display .card').forEach(card => card.remove());
    }

    function clearIntermediateZoneDisplay() {
        // Remove only card elements from the intermediate zone's spans
        intermediateDropzone?.querySelectorAll('.card').forEach(card => card.remove());
    }

    // Crée l'élément carte
    function createCardElement(card, player, suit) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.textContent = getFrenchRank(card);
        cardElement.style.color = suitColors[suit];
        cardElement.draggable = true;
        cardElement.dataset.card = card; // The rank ('A', 'T', '7')
        // Store initial location, will be updated on drop/clear
        cardElement.dataset.currentPlayer = player;
        cardElement.dataset.currentSuit = suit;
        cardElement.id = `card-${player}-${suit}-${card}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`; // Unique ID
        cardElement.addEventListener('dragstart', handleDragStart);
        cardElement.addEventListener('dragend', handleDragEnd);
        return cardElement;
    }


    // --- Logique Drag and Drop ---
    // ... (keep existing handleDragStart, handleDragEnd, enableDropzone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop functions) ...
    function handleDragStart(event) {
        const targetCard = event.target.closest('.card');
        if (!targetCard) {
             event.preventDefault(); return;
        }
        draggedElement = targetCard;

        // Determine current location more reliably from parent structure
        const currentContainer = draggedElement.closest('.suit-container, span[data-intermediate-suit]');
        let currentSuit = 'unknown';
        let currentPlayer = 'unknown';

        if (currentContainer?.dataset.player) { // In a player hand suit container
            currentPlayer = currentContainer.dataset.player;
            currentSuit = currentContainer.dataset.suit;
        } else if (currentContainer?.dataset.intermediateSuit) { // In an intermediate zone span
            currentPlayer = 'I';
            currentSuit = currentContainer.dataset.intermediateSuit;
        } else {
            // Fallback if somehow the card is not in an expected container
            console.warn("Cannot determine current location of dragged card from parent", draggedElement);
            currentPlayer = draggedElement.dataset.currentPlayer || 'unknown';
            currentSuit = draggedElement.dataset.currentSuit || 'unknown';
        }

        draggedCardInfo = {
            card: draggedElement.dataset.card, // Rank ('T' for Ten)
            suit: currentSuit, // The suit context it's coming from (ACTUAL suit of card)
            player: currentPlayer, // Where it's coming FROM ('N', 'E', 'S', 'W', or 'I')
            elementId: draggedElement.id
        };

        try {
            // Use the unique element ID for transfer data
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
        // Clear highlights from all potential dropzones
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
        event.preventDefault(); // Necessary to allow drop
        if (!draggedCardInfo) {
            event.dataTransfer.dropEffect = 'none'; return;
        }

        const container = event.target.closest('.suit-container');
        if (!container) {
            event.dataTransfer.dropEffect = 'none'; return;
        }

        // Check if the target is the intermediate zone's *main container*
        const isIntermediateSingleZone = container.id === 'intermediate-dropzone';
        // Check if the target is a player's specific *suit container*
        const isHandZoneSuit = !!container.dataset.player && !!container.dataset.suit;

        const cardActualSuit = draggedCardInfo.suit; // The actual suit of the card

        let canDrop = false;
        if (isHandZoneSuit) {
            // Can drop into a hand's suit container only if the suits match
            canDrop = (cardActualSuit === container.dataset.suit);
        } else if (isIntermediateSingleZone) {
            // Can drop any card into the main intermediate zone container
            canDrop = true;
        } else if (container.closest('#intermediate-dropzone')) {
            // If dragging over an element *inside* the intermediate zone (like a suit span or another card)
            // Allow the drop - it will be handled by the 'drop' listener on #intermediate-dropzone
            canDrop = true;
        }


        event.dataTransfer.dropEffect = canDrop ? 'move' : 'none';

         // Add visual feedback if needed here (often done in dragenter)
         if (container) {
             container.classList.remove('drag-over', 'drag-invalid'); // Reset first
             if (canDrop) {
                 container.classList.add('drag-over');
             } else if (isHandZoneSuit && cardActualSuit !== container.dataset.suit) {
                 // Only show invalid if it's the wrong suit for a hand
                 container.classList.add('drag-invalid');
             }
         }
    }
    function handleDragEnter(event) {
        event.preventDefault();
        if (!draggedCardInfo) return;

        const container = event.target.closest('.suit-container');
        if (!container) return;

        // Check drop validity (similar logic to handleDragOver)
        const isIntermediateSingleZone = container.id === 'intermediate-dropzone';
        const isHandZoneSuit = !!container.dataset.player && !!container.dataset.suit;
        const cardActualSuit = draggedCardInfo.suit;

        let isValidTarget = false;
        if (isHandZoneSuit && cardActualSuit === container.dataset.suit) {
            isValidTarget = true;
        } else if (isIntermediateSingleZone || container.closest('#intermediate-dropzone')) {
             isValidTarget = true; // Always valid target (or element within it)
        }

        container.classList.remove('drag-over', 'drag-invalid'); // Clear previous states first
        if (isValidTarget) {
            container.classList.add('drag-over');
        } else if (isHandZoneSuit) { // Only mark hand zones as invalid if suit mismatches
             container.classList.add('drag-invalid');
        }
    }
    function handleDragLeave(event) {
        const container = event.target.closest('.suit-container');
        // Check if the relatedTarget (where the mouse is going) is outside the container
        if (container && !container.contains(event.relatedTarget)) {
            container.classList.remove('drag-over', 'drag-invalid');
        }
        // If leaving the container itself (e.g., mouse moved out of the browser window)
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

        // Find the logical dropzone: either hand suit container or the main intermediate one
        const dropzoneContainer = event.target.closest('.suit-container[data-player][data-suit], #intermediate-dropzone');

        // Clean up visual state from the element that received the event, if it was a container
        event.target.closest('.suit-container')?.classList.remove('drag-over', 'drag-invalid');
        // Also ensure the logical container is cleaned up if different
        dropzoneContainer?.classList.remove('drag-over', 'drag-invalid');


        if (!dropzoneContainer) {
             console.warn("Drop cancelled: Dropped outside a valid zone.");
             handleDragEnd(); return;
        }

        const cardToMove = draggedCardInfo.card;    // Rank: 'A', 'K', 'T', '7'
        const cardActualSuit = draggedCardInfo.suit; // Actual suit: 'S', 'H' etc. (determined on dragstart)
        const sourcePlayer = draggedCardInfo.player; // Where it came from: 'N', 'E', 'S', 'W', or 'I'
        // Determine source suit context carefully
        const sourceContainer = localDraggedElement.parentElement;
        let sourceSuitContext = 'unknown';
        if (sourceContainer?.dataset.player && sourceContainer?.dataset.suit) {
             sourceSuitContext = sourceContainer.dataset.suit;
        } else if (sourceContainer?.dataset.intermediateSuit) {
             sourceSuitContext = sourceContainer.dataset.intermediateSuit;
        } else {
             // Fallback using draggedCardInfo if parent isn't informative (should be rare)
             sourceSuitContext = draggedCardInfo.suit; // Use actual card suit as best guess
             console.warn("Could not determine source suit context from parent, using card's actual suit:", sourceSuitContext);
        }


        const isTargetHand = !!dropzoneContainer.dataset.player;
        const isTargetIntermediate = dropzoneContainer.id === 'intermediate-dropzone';

        let targetPlayer = null;
        let targetSuit = null; // The suit array in the data model to update
        let targetContainerForDOM = null; // The specific DOM element to append the card element to

        if (isTargetHand) {
            targetPlayer = dropzoneContainer.dataset.player;
            targetSuit = dropzoneContainer.dataset.suit;
            if (cardActualSuit !== targetSuit) {
                console.warn(`Action denied: Cannot drop ${cardActualSuit} card into ${targetSuit} hand zone.`);
                handleDragEnd(); return; // Invalid move
            }
            targetContainerForDOM = dropzoneContainer; // Append to the suit container itself
        } else if (isTargetIntermediate) {
            targetPlayer = 'I'; // Target is the Intermediate data structure
            targetSuit = cardActualSuit; // Card goes into the intermediate data array matching its own suit
            // Find the specific span within the intermediate dropzone for this suit
            targetContainerForDOM = dropzoneContainer.querySelector(`[data-intermediate-suit="${cardActualSuit}"]`);
            if (!targetContainerForDOM) {
                 console.error("Internal suit span for", cardActualSuit, "not found in intermediate zone!");
                 handleDragEnd(); return;
            }
            // Target DOM is the span for that suit
        } else {
            console.warn("Drop target not recognized."); handleDragEnd(); return;
        }

        // Prevent dropping onto the exact same container (DOM parent)
        if (localDraggedElement.parentElement === targetContainerForDOM) {
            console.log("Drop cancelled: Dropped onto the same location."); handleDragEnd(); return;
        }

         // --- Data Consistency Check (More specific) ---
         // Source Check
         const sourceDataArray = currentDealData?.[sourcePlayer]?.[sourceSuitContext];
         if (!Array.isArray(sourceDataArray)) {
             console.error("Internal error: Invalid source data structure.", {sourcePlayer, sourceSuitContext, sourceDataArray, currentDealData});
             handleDragEnd(); return;
         }
         // Target Check
         const targetDataArray = currentDealData?.[targetPlayer]?.[targetSuit];
         if (!Array.isArray(targetDataArray)) {
             console.error("Internal error: Invalid target data structure.", {targetPlayer, targetSuit, targetDataArray, currentDealData});
             handleDragEnd(); return;
         }


        // --- Update Data Model ---
        // 1. Remove from source data
        const cardIndex = sourceDataArray.indexOf(cardToMove);
        if (cardIndex === -1) {
            // This might happen if the drag started, but the data changed before drop (unlikely but possible)
            // OR if the sourceSuitContext was misidentified. Let's log detailed info.
            console.error(`Card ${cardToMove} (Actual Suit: ${cardActualSuit}) not found in source data ${sourcePlayer}[${sourceSuitContext}]. Data:`, JSON.stringify(sourceDataArray), "Current Parent:", localDraggedElement.parentElement);
             // Attempt to find and remove from *any* source location based on player/I
             let foundAndRemoved = false;
             if (sourcePlayer !== 'I') { // Search player's hand thoroughly
                 suits.forEach(s => {
                     const idx = currentDealData[sourcePlayer]?.[s]?.indexOf(cardToMove);
                     if (idx > -1) {
                         currentDealData[sourcePlayer][s].splice(idx, 1);
                         console.log(`Corrected removal: Removed ${cardToMove} from ${sourcePlayer}[${s}]`);
                         foundAndRemoved = true;
                     }
                 });
             } else { // Search intermediate zone thoroughly
                 suits.forEach(s => {
                     const idx = currentDealData.I?.[s]?.indexOf(cardToMove);
                     if (idx > -1) {
                         currentDealData.I[s].splice(idx, 1);
                         console.log(`Corrected removal: Removed ${cardToMove} from I[${s}]`);
                         foundAndRemoved = true;
                     }
                 });
             }
             if (!foundAndRemoved) {
                console.error("Could not find and remove card from any source location. Aborting drop to prevent data duplication.");
                handleDragEnd(); return; // Avoid corrupting data
             }
        } else {
            // Normal removal
            sourceDataArray.splice(cardIndex, 1);
        }


        // 2. Add to target data (avoid duplicates)
        if (!targetDataArray.includes(cardToMove)) {
            targetDataArray.push(cardToMove);
            sortCards(targetDataArray); // Keep target data sorted
        }

        // --- Update DOM ---
        targetContainerForDOM.appendChild(localDraggedElement); // Move the element
        sortCardElements(targetContainerForDOM); // Sort visually within the target container

        // Optional: If source container is now empty, maybe add a placeholder or style? (Not implemented here)

        // --- Update Card Element State ---
        localDraggedElement.dataset.currentPlayer = targetPlayer;
        localDraggedElement.dataset.currentSuit = targetSuit;

        console.log(`Moved ${cardToMove} from ${sourcePlayer} (context: ${sourceSuitContext}) to ${targetPlayer}-${targetSuit}`);

        updateHandCountsDisplay(); // Update counts after move
        handleDragEnd(); // Final cleanup
    }

    // --- Sauvegarde ---

    /**
     * Finalizes the save process after confirmation (if needed).
     * Now includes Dealer and Vulnerability.
     */
    function proceedWithSave(handsToSave, totalCardsInHands, dealer, vulnerability, dealNumber, allOtherTags, intermediateCardsFound, intermediateCardCount) {
        let warningMessage = "";
        if (totalCardsInHands !== 52) {
             const missing = 52 - totalCardsInHands;
             warningMessage = `Attention : Total de ${totalCardsInHands} cartes dans les mains N,E,S,W (au lieu de 52). Il manque ${missing} carte(s). ${intermediateCardsFound ? `(${intermediateCardCount} dans la zone intermédiaire)` : ''} La sauvegarde peut être incorrecte.`;
             displayFeedback(saveFeedback, warningMessage, 'warning'); // Persistent warning
         } else {
            // If count is correct now, clear any previous warning
            if (saveFeedback.classList.contains('feedback-warning')) {
                clearFeedback(saveFeedback);
            }
         }

        const pbnDealString = generatePbnDealString(handsToSave, dealer); // Use current dealer
        const filename = `deal_${dealNumber}_modified_${Date.now()}.pbn`;

        // --- Construct full PBN output with tags ---
        let outputPbn = "";
        // Add other relevant tags first (like Board, Event, etc.), excluding Deal, Dealer, Vulnerable which we handle specifically
        const tagsToInclude = {...allOtherTags};
        delete tagsToInclude.Deal; // Will be added last
        delete tagsToInclude.Dealer; // Handled explicitly
        delete tagsToInclude.Vulnerable; // Handled explicitly

        // Ensure Board tag is present using the dealNumber
        tagsToInclude.Board = dealNumber.toString();

        // Define a preferred tag order (optional but nice)
        const tagOrder = ['Event', 'Site', 'Date', 'Board', 'West', 'North', 'East', 'South', 'Dealer', 'Vulnerable', 'Scoring', 'Declarer', 'Contract', 'Result'];

        // Add tags in preferred order
        tagOrder.forEach(tagName => {
            if (tagsToInclude[tagName]) {
                outputPbn += `[${tagName} "${tagsToInclude[tagName]}"]\n`;
                delete tagsToInclude[tagName]; // Remove from map so it's not added again
            }
        });

        // Add Dealer and Vulnerability explicitly using current values
        outputPbn += `[Dealer "${dealer}"]\n`;
        outputPbn += `[Vulnerable "${vulnerability}"]\n`;

        // Add any remaining tags that weren't in the preferred list
        Object.entries(tagsToInclude).forEach(([tagName, tagValue]) => {
             outputPbn += `[${tagName} "${tagValue}"]\n`;
        });

        // Finally, add the Deal string
        outputPbn += `[Deal "${pbnDealString}"]\n`;
        // --- End PBN construction ---


        const blob = new Blob([outputPbn], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Show success only if no card count warning was displayed
        if (!warningMessage) {
            displayFeedback(saveFeedback, `Donne N°${dealNumber} sauvegardée sous ${filename}`, 'success', 5000);
        }
    }

    saveDealBtn.addEventListener('click', () => {
        clearFeedback(saveFeedback); // Clear previous messages

        if (!currentDealData || currentDealIndex === -1) {
            displayFeedback(saveFeedback, "Aucune donne n'est actuellement chargée pour la sauvegarde.", 'error', 5000);
            return;
        }

        // Check intermediate zone
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

        // Prepare data for saving
        const handsToSave = {};
        let totalCardsInHands = 0;
        players.forEach(p => {
            handsToSave[p] = { S: [], H: [], D: [], C: [] };
             if(currentDealData[p]) {
                 suits.forEach(suit => {
                    const cards = currentDealData[p][suit] || [];
                    // Ensure data is sorted before saving
                    handsToSave[p][suit] = sortCards([...cards]);
                    totalCardsInHands += cards.length;
                });
             }
        });

        // Get current Dealer, Vulnerability, DealNumber, and other tags from currentDealData
        const currentDealer = currentDealData.dealer;
        const currentVulnerability = currentDealData.vulnerability;
        const currentDealNumber = currentDealData.dealNumber;
        const allOtherTags = currentDealData.allTags || {}; // Get other tags captured during parsing

        // --- Confirmation Flow ---
        if (intermediateCardsFound) {
            askConfirmation(
                `Il y a ${intermediateCardCount} carte(s) dans la zone intermédiaire qui ne seront PAS sauvegardées. Continuer ?`,
                () => { // onConfirm
                    proceedWithSave(handsToSave, totalCardsInHands, currentDealer, currentVulnerability, currentDealNumber, allOtherTags, intermediateCardsFound, intermediateCardCount);
                },
                () => { // onCancel
                    displayFeedback(saveFeedback, "Sauvegarde annulée.", 'info', 3000);
                }
            );
        } else {
            // No intermediate cards, proceed directly
            proceedWithSave(handsToSave, totalCardsInHands, currentDealer, currentVulnerability, currentDealNumber, allOtherTags, intermediateCardsFound, intermediateCardCount);
        }
    });

    // Génère la string PBN pour la balise [Deal]
    function generatePbnDealString(handsData, firstPlayer = 'N') {
         if (!['N', 'E', 'S', 'W'].includes(firstPlayer)) firstPlayer = 'N';
        const dealParts = [];
        const playersOrder = ['N', 'E', 'S', 'W'];
        //const suitOrder = ['S', 'H', 'D', 'C']; // Use global 'suits'
        let startIndex = playersOrder.indexOf(firstPlayer);
        if (startIndex === -1) startIndex = 0; // Should not happen

        for (let i = 0; i < 4; i++) {
            const player = playersOrder[(startIndex + i) % 4];
            const suitStrings = [];
            if (handsData[player]) {
                suits.forEach(suit => {
                    // Assumes handsData[player][suit] is already sorted
                    const cards = handsData[player][suit] || [];
                    // Join cards including 'T'. If a suit is empty, join results in "".
                    suitStrings.push(cards.join(''));
                });
                 // Join the suits with '.', representing the hand for one player
                 dealParts.push(suitStrings.join('.'));
            } else {
                 // Should not happen if handsData is properly constructed, but as fallback:
                 dealParts.push('...'); // Represents an empty hand S.H.D.C
            }
        }
        // Join the four players' hands with spaces
        return `${firstPlayer}:${dealParts.join(' ')}`;
     }

}); // Fin du DOMContentLoaded