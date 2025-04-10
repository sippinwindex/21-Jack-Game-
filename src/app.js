document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dealerHandEl = document.getElementById('dealer-hand');
  const playerHandEl = document.getElementById('player-hand');
  const dealerScoreEl = document.getElementById('dealer-score');
  const playerScoreEl = document.getElementById('player-score');
  const betInput = document.getElementById('bet-input');
  const placeBetBtn = document.getElementById('place-bet');
  const hitBtn = document.getElementById('hit-button');
  const standBtn = document.getElementById('stand-button');
  const newGameBtn = document.getElementById('new-game-button');
  const balanceDisplaySpan = document.querySelector('#balance-display span');
  const gameFeedback = document.getElementById('game-feedback');
  const bettingControlsEl = document.getElementById('betting-controls');
  const gameControlsEl = document.getElementById('game-controls');
  const endRoundControlsEl = document.getElementById('end-round-controls');
  const crtOverlay = document.getElementById('crt-overlay');
  const toggleCrtBtn = document.getElementById('toggle-crt-button');

  // CRT Toggle Button
  if (toggleCrtBtn && crtOverlay) {
      toggleCrtBtn.addEventListener('click', () => {
          crtOverlay.classList.toggle('active');
      });
  } else {
      console.error("CRT Toggle Button or Overlay element not found!");
  }
  // Card Data
  const suits = ['♦', '♥', '♠', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const cardValues = { 'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10 };

  // Animation Constants
  const DEAL_DELAY = 150; // ms between card deals
  const REVEAL_DELAY = 500; // ms delay before revealing dealer card/result
  const FEEDBACK_DELAY = 300; // ms delay for feedback animation

  // Game State
  const gameState = {
      deck: [],
      playerHand: [],
      dealerHand: [],
      balance: 1000,
      currentBet: 0,
      gamePhase: 'betting', // 'betting', 'playing', 'dealerTurn', 'roundOver'
      playerScore: 0,
      dealerScore: 0,
      dealerHiddenCard: null // Store the dealer's face-down card element
  };

  // --- Deck Management ---
  function createDeck() {
      const deck = [];
      for (const suit of suits) {
          for (const rank of ranks) {
              deck.push({ suit, rank, value: cardValues[rank] });
          }
      }
      return deck;
  }

  function shuffleDeck(deck) {
      for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
      }
  }

  function dealCard(deck) {
      return deck.pop();
  }

  // --- Hand Evaluation ---
  function calculateHandValue(hand) {
      let value = 0;
      let aceCount = 0;
      hand.forEach(card => {
          value += card.value;
          if (card.rank === 'A') aceCount++;
      });
      // Adjust for Aces
      while (value > 21 && aceCount > 0) {
          value -= 10; // Change Ace from 11 to 1
          aceCount--;
      }
      return value;
  }

  // --- UI Updates ---
  function updateBalanceDisplay() {
      balanceDisplaySpan.textContent = gameState.balance;
      // Add subtle animation later if desired
  }

  function updateScores() {
      gameState.playerScore = calculateHandValue(gameState.playerHand);
      playerScoreEl.textContent = gameState.playerScore;

      // Dealer score display depends on game phase
      if (gameState.gamePhase === 'playing') {
          // Show only value of visible card
          gameState.dealerScore = gameState.dealerHand[0].value; // Assumes first card is visible
          dealerScoreEl.textContent = `${gameState.dealerScore} + ?`;
      } else if (gameState.gamePhase === 'dealerTurn' || gameState.gamePhase === 'roundOver') {
          gameState.dealerScore = calculateHandValue(gameState.dealerHand);
          dealerScoreEl.textContent = gameState.dealerScore;
      } else { // Betting phase
           dealerScoreEl.textContent = '';
           playerScoreEl.textContent = '';
      }
  }

  async function displayHands(revealDealer = false) {
      await displayHand(gameState.playerHand, playerHandEl, true); // Always show player hand fully

      // Clear dealer hand before re-rendering only if needed (e.g. new round)
      if (dealerHandEl.children.length !== gameState.dealerHand.length || revealDealer) {
           await displayHand(gameState.dealerHand, dealerHandEl, revealDealer);
      }

      updateScores(); // Update scores after hands are displayed
  }

  async function displayHand(hand, container, showAll = true) {
      container.innerHTML = ''; // Clear previous cards immediately
      gameState.dealerHiddenCard = null; // Reset hidden card ref

      const cardElements = [];
      for (let i = 0; i < hand.length; i++) {
          const card = hand[i];
          // Determine if this card should be face down (only dealer's second card before reveal)
          const isFaceDown = (container === dealerHandEl && i === 1 && !showAll);
          const cardEl = createCardElement(card, isFaceDown);
          container.appendChild(cardEl);
          cardElements.push(cardEl);

          if (isFaceDown) {
              gameState.dealerHiddenCard = cardEl; // Store reference to the face-down card
          }
      }

      // Animate cards dealing in sequentially
      for (let i = 0; i < cardElements.length; i++) {
          await new Promise(resolve => setTimeout(resolve, DEAL_DELAY));
          cardElements[i].classList.add('deal-in');
      }
       // Add a small extra delay after last card for visual pacing
      await new Promise(resolve => setTimeout(resolve, DEAL_DELAY / 2));
  }


  function createCardElement(card, isFaceDown = false) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    const isRed = card.suit === '♥' || card.suit === '♦';
    cardDiv.classList.add(isRed ? 'red' : 'black');
    cardDiv.dataset.rank = card.rank;
    cardDiv.dataset.suit = card.suit;

    if (isFaceDown) {
        cardDiv.classList.add('face-down');
    } else {
        // Make sure the comment is GONE from this innerHTML part:
        cardDiv.innerHTML = `
            <div class="corner top-left">
                <span class="rank">${card.rank}</span>
                <span class="suit">${card.suit}</span>
            </div>
            <div class="center-rank">${card.rank}</div>  
            <div class="corner bottom-right">
                <span class="rank">${card.rank}</span>
                <span class="suit">${card.suit}</span>
            </div>
        `;
    }
    return cardDiv;
}

  function revealDealerCard() {
      return new Promise(async (resolve) => {
          if (gameState.dealerHiddenCard && gameState.dealerHand.length > 1) {
              const cardData = gameState.dealerHand[1]; // Get data for the hidden card
              const hiddenCardEl = gameState.dealerHiddenCard;

              // Start flip animation
              hiddenCardEl.classList.add('flip');
              hiddenCardEl.classList.remove('face-down');

              // Wait for flip animation halfway to change content (or slightly before end)
              await new Promise(res => setTimeout(res, 250)); // Adjust timing as needed

              // Update content
              const isRed = cardData.suit === '♥' || cardData.suit === '♦';
              hiddenCardEl.classList.add(isRed ? 'red' : 'black'); // Ensure color class is present
              hiddenCardEl.innerHTML = `
                  <div class="corner top-left">
                      <span class="rank">${cardData.rank}</span>
                      <span class="suit">${cardData.suit}</span>
                  </div>
                  <div class="center-rank">${cardData.rank};
                  <div class="corner bottom-right">
                      <span class="rank">${cardData.rank}</span>
                      <span class="suit">${cardData.suit}</span>
                  </div>
              `;

               // Wait for flip animation to complete
               hiddenCardEl.addEventListener('animationend', () => {
                    hiddenCardEl.classList.remove('flip');
                    gameState.dealerHiddenCard = null; // No longer hidden
                    resolve();
               }, { once: true });

          } else {
               resolve(); // No hidden card to reveal
          }
      });
  }


  function setFeedback(message, type = 'info') {
      gameFeedback.textContent = message;
      gameFeedback.className = 'game-feedback'; // Reset classes
      // Add a slight delay for animation trigger
      setTimeout(() => {
          gameFeedback.classList.add('show');
          if (type !== 'info') {
              gameFeedback.classList.add(type); // Add win/lose/push/etc. class
          }
      }, 50); // Small delay to ensure transition triggers
  }

  function resetFeedback() {
      gameFeedback.classList.remove('show', 'win', 'lose', 'push', 'blackjack', 'bust');
      // Optionally set default text after fade out
      setTimeout(() => {
           if (!gameFeedback.classList.contains('show')) { // Check if another feedback hasn't been set
              // setFeedback("Place your bet...", 'info'); // Or leave blank
              gameFeedback.textContent = '';
           }
      }, FEEDBACK_DELAY + 50); // Wait for fade out
  }

  // --- Game Controls Visibility ---
  function updateControlVisibility() {
      bettingControlsEl.style.display = (gameState.gamePhase === 'betting') ? 'flex' : 'none';
      gameControlsEl.style.display = (gameState.gamePhase === 'playing') ? 'flex' : 'none';
      endRoundControlsEl.style.display = (gameState.gamePhase === 'roundOver') ? 'flex' : 'none';

      // Disable/Enable buttons based on state
      placeBetBtn.disabled = gameState.gamePhase !== 'betting' || gameState.balance <= 0;
      hitBtn.disabled = gameState.gamePhase !== 'playing';
      standBtn.disabled = gameState.gamePhase !== 'playing';
      newGameBtn.disabled = gameState.gamePhase !== 'roundOver';

      // Ensure bet input is usable only during betting
      betInput.disabled = gameState.gamePhase !== 'betting';
  }

  // --- Game Logic ---
  function initGame() {
      gameState.balance = 1000;
      gameState.gamePhase = 'betting';
      updateBalanceDisplay();
      resetGameArea();
      setFeedback("Place your bet to start!", 'info');
      updateControlVisibility();
  }

   function resetGameArea() {
      gameState.playerHand = [];
      gameState.dealerHand = [];
      gameState.playerScore = 0;
      gameState.dealerScore = 0;
      dealerHandEl.innerHTML = '';
      playerHandEl.innerHTML = '';
      dealerScoreEl.textContent = '';
      playerScoreEl.textContent = '';
   }


   async function placeBet() {
    const betInput = document.getElementById('bet-input');
    const betAmount = parseInt(betInput.value);
    
    // Validation
    if (isNaN(betAmount) || betAmount <= 0) {
        setFeedback("Bet must be a positive number!", 'error');
        return;
    }
    if (betAmount < 5) {
        setFeedback("Minimum bet is $5!", 'error');
        return;
    }
    if (betAmount > gameState.balance) {
        setFeedback(`Insufficient funds! Balance: $${gameState.balance}`, 'error');
        return;
    }

    // Update game state
    gameState.currentBet = betAmount;
    gameState.balance -= betAmount;
    updateBalanceDisplay();
    setFeedback(`Bet $${betAmount} placed! Dealing...`);

    try {
        await startRound();
    } catch (error) {
        console.error("Error during startRound:", error);
        setFeedback("An error occurred. Please try again.", "lose");
        gameState.gamePhase = 'betting';
        gameState.balance += gameState.currentBet; // Refund bet
        gameState.currentBet = 0;
        updateBalanceDisplay();
        updateControlVisibility();
        resetGameArea();
    }
}

  async function startRound() {
      resetFeedback(); // Clear previous result message
      gameState.gamePhase = 'dealing'; // Temp state during deal animation
      updateControlVisibility(); // Disable buttons during deal

      gameState.deck = createDeck();
      shuffleDeck(gameState.deck);
      gameState.playerHand = [];
      gameState.dealerHand = [];

      // Deal initial cards with animation
      playerHandEl.innerHTML = ''; // Clear hands before dealing
      dealerHandEl.innerHTML = '';

      gameState.playerHand.push(dealCard(gameState.deck));
      await displayHand(gameState.playerHand, playerHandEl, true); // Display first player card

      gameState.dealerHand.push(dealCard(gameState.deck));
      await displayHand(gameState.dealerHand, dealerHandEl, false); // Display first dealer card (visible)

      gameState.playerHand.push(dealCard(gameState.deck));
      await displayHand(gameState.playerHand, playerHandEl, true); // Display second player card

      gameState.dealerHand.push(dealCard(gameState.deck));
      await displayHand(gameState.dealerHand, dealerHandEl, false); // Display second dealer card (face down)

      // Update scores after initial deal
      updateScores();

      // Check for Blackjack immediately after dealing finishes
      const playerValue = calculateHandValue(gameState.playerHand);
      const dealerVisibleValue = gameState.dealerHand[0].value; // Only check visible card for early reveal possibility

      if (playerValue === 21) {
          const dealerTotalValue = calculateHandValue(gameState.dealerHand);
          await revealDealerCard(); // Reveal dealer card since player has BJ
          updateScores(); // Update score after reveal
          await new Promise(res => setTimeout(res, REVEAL_DELAY / 2)); // Short pause

          if (dealerTotalValue === 21) {
              setFeedback("Both have Blackjack! It's a Push.", 'push');
              resolveRound('push');
          } else {
              setFeedback("Blackjack! You Win!", 'blackjack');
              gameState.balance += Math.floor(gameState.currentBet * 2.5); // 3:2 payout
              resolveRound('playerBJ'); // Special result type for BJ
          }
      } else if (dealerVisibleValue >= 10 && calculateHandValue(gameState.dealerHand) === 21) {
           // Dealer shows 10 or Ace and has BJ
          await revealDealerCard();
          updateScores();
          await new Promise(res => setTimeout(res, REVEAL_DELAY / 2));
          setFeedback("Dealer has Blackjack! You lose.", 'lose');
          resolveRound('dealer');
      }
       else {
          // No immediate Blackjack, proceed to player's turn
          gameState.gamePhase = 'playing';
          setFeedback("Your turn: Hit or Stand?", 'info');
          updateControlVisibility(); // Enable Hit/Stand
      }
  }

  async function hit() {
      if (gameState.gamePhase !== 'playing') return;

      gameState.gamePhase = 'dealing'; // Disable buttons during hit anim
      updateControlVisibility();

      const newCard = dealCard(gameState.deck);
      gameState.playerHand.push(newCard);

      // Animate only the new card
      const cardEl = createCardElement(newCard, false);
      playerHandEl.appendChild(cardEl);
      await new Promise(resolve => setTimeout(resolve, 50)); // Short delay before animation
      cardEl.classList.add('deal-in');
      await new Promise(resolve => setTimeout(resolve, DEAL_DELAY + 50)); // Wait for animation

      updateScores();

      if (gameState.playerScore > 21) {
          setFeedback(`Bust! (${gameState.playerScore}) You lose.`, 'bust');
          resolveRound('dealer');
      } else {
          // Re-enable controls if not bust
           gameState.gamePhase = 'playing';
           setFeedback(`You have ${gameState.playerScore}. Hit or Stand?`, 'info');
           updateControlVisibility();
           if (gameState.playerScore === 21) {
              // Automatically stand if player hits 21
              stand();
           }
      }
  }

  async function stand() {
      if (gameState.gamePhase !== 'playing') return;

      gameState.gamePhase = 'dealerTurn';
      setFeedback("Dealer's turn...", 'info');
      updateControlVisibility(); // Disable player controls

      await revealDealerCard();
      updateScores(); // Update score with revealed card

      await new Promise(res => setTimeout(res, REVEAL_DELAY)); // Pause after reveal

      await dealerPlayLogic(); // Start dealer's hitting logic
  }

  async function dealerPlayLogic() {
       updateScores(); // Ensure score is current

      while (gameState.dealerScore < 17) {
          setFeedback(`Dealer has ${gameState.dealerScore}. Dealer hits...`, 'info');
          await new Promise(res => setTimeout(res, REVEAL_DELAY * 1.5)); // Pause before hit

          const newCard = dealCard(gameState.deck);
          gameState.dealerHand.push(newCard);

          // Animate the new card
          const cardEl = createCardElement(newCard, false);
          dealerHandEl.appendChild(cardEl);
          await new Promise(resolve => setTimeout(resolve, 50));
          cardEl.classList.add('deal-in');
          await new Promise(resolve => setTimeout(resolve, DEAL_DELAY + 50));

          updateScores(); // Update score after hit
      }

      // Dealer stands or busts
       await new Promise(res => setTimeout(res, REVEAL_DELAY / 2)); // Short pause before result
      determineWinner();
  }


  function determineWinner() {
      updateScores(); // Final score check

      if (gameState.dealerScore > 21) {
          setFeedback(`Dealer Busts! (${gameState.dealerScore}) You Win!`, 'win');
          resolveRound('player');
      } else if (gameState.playerScore > gameState.dealerScore) {
          setFeedback(`You Win! ${gameState.playerScore} vs ${gameState.dealerScore}`, 'win');
          resolveRound('player');
      } else if (gameState.playerScore < gameState.dealerScore) {
          setFeedback(`Dealer Wins. ${gameState.dealerScore} vs ${gameState.playerScore}`, 'lose');
          resolveRound('dealer');
      } else { // Push
          setFeedback(`Push! Both have ${gameState.playerScore}`, 'push');
          resolveRound('push');
      }
  }

  function resolveRound(result) {
      gameState.gamePhase = 'roundOver';

      if (result === 'player') {
          gameState.balance += gameState.currentBet * 2; // Standard win
      } else if (result === 'push') {
          gameState.balance += gameState.currentBet; // Bet returned
      } else if (result === 'playerBJ') {
          // Balance already updated in startRound for BJ payout
      }
      // No balance change for 'dealer' result

      updateBalanceDisplay();

      if (gameState.balance <= 0) {
          setFeedback(gameFeedback.textContent + " Game Over! You're out of money.", 'lose');
           // Optionally disable New Game button here or handle restart differently
           newGameBtn.disabled = true; // Disable starting new round if broke
      }

      updateControlVisibility(); // Show 'Next Round' button
  }

  function nextRound() {
       if (gameState.balance <= 0) {
           // Could re-initialize or show a specific game over screen
           initGame(); // For now, just restart the whole game
           return;
       }
      gameState.gamePhase = 'betting';
      gameState.currentBet = 0;
      resetGameArea();
      resetFeedback();
      setFeedback("Place your next bet.", 'info');
      updateControlVisibility(); // Show betting controls
  }

  // --- Event Listeners ---
  placeBetBtn.addEventListener('click', placeBet);
  hitBtn.addEventListener('click', hit);
  standBtn.addEventListener('click', stand);
  newGameBtn.addEventListener('click', nextRound); // Changed from newGame to nextRound

  // Initialize Game on Load
  initGame();
});
    // --- Event Listeners ---
    placeBetBtn.addEventListener('click', placeBet);
    hitBtn.addEventListener('click', hit);
    standBtn.addEventListener('click', stand);
    newGameBtn.addEventListener('click', nextRound);

    // CRT Toggle Listener
    if (toggleCrtBtn && crtOverlay) { // Keep checks
      toggleCrtBtn.addEventListener('click', () => { /* ... */ });
  } else {
      console.error("CRT Toggle Button or Overlay element not found!");
  }

// Initialize Game on Load
initGame();