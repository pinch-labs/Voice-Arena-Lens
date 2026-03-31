// RoundManager.js - Handles round restarts when player or bot dies
// Optimized for Spectacles stability using single-event timers

// @input Component.ScriptComponent playerHealthScript
// @input Component.ScriptComponent botHealthScript
// @input Component.ScriptComponent botSpawnerScript
// @input Component.ScriptComponent botBehaviourScript
// @input float restartDelay = 10.0
// @input bool skipPlayerIntro = false
// @input bool hideHealthUI = false
// @input bool isHeadsetMode = false
// @input SceneObject editorSpawner
// @input Component.ScriptComponent ttsController
// @input SceneObject headsetSpawner
// @input SceneObject playerConfetti

// Initialize Global Headset Mode
global.isHeadsetMode = script.isHeadsetMode;
print("👓 Mode: " + (global.isHeadsetMode ? "HEADSET" : "EDITOR"));

// Enable/Disable specific spawners based on mode
if (script.editorSpawner) {
    script.editorSpawner.enabled = !global.isHeadsetMode;
}
if (script.headsetSpawner) {
    script.headsetSpawner.enabled = global.isHeadsetMode;
}

// Ensure Player Confetti is OFF by default
if (script.playerConfetti) {
    script.playerConfetti.enabled = false;
}

// Ensure correct text display initializes AFTER mode is set
if (script.playerHealthScript && script.playerHealthScript.api && script.playerHealthScript.api.resetHealth) {
    print("🔄 RoundManager: Force-initializing health display...");
    script.playerHealthScript.api.resetHealth();
}

// Function to safely speak
function speak(text) {
    if (script.ttsController && script.ttsController.api && script.ttsController.api.speak) {
        script.ttsController.api.speak(text);
    } else {
        print("⚠️ RoundManager: TTS Controller not assigned or missing 'speak' API. Message skipped: '" + text + "'");
    }
}
global.speak = speak;

// Initial Instruction Text on Bot - Delayed to override Bot_Health.js default
var lastCountdownVal = -1;

// Helper for delays
function delay(seconds, callback) {
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(callback);
    d.reset(seconds);
}

// Helper to show text on bot and speak it
function displayAndSpeak(text) {
    if (global.playerHasShot) return;

    if (script.botHealthScript && script.botHealthScript.api && script.botHealthScript.api.setCustomText) {
        script.botHealthScript.api.setCustomText(text);
    }
    speak(text);
}

// Intro Part 2: Rules and Start (After hand chosen)
function playIntroPart2() {
    displayAndSpeak("Now let's do\nsome wand duelling!");

    delay(3.0, function () {
        displayAndSpeak("First to 3 wins!");

        delay(4.0, function () {
            displayAndSpeak("Say \"rock\" to\ncast a spell");
        });
    });
}

// Helper to start intro or skip it
function startIntroOrGame() {
    // Check if skipping intro
    if (script.skipPlayerIntro) {
        global.handChosen = true;
        print("📝 RoundManager: Skipping Intro -> Setting 'Rock' text.");
        displayAndSpeak("Say \"rock\" to\ncast a spell");
        return;
    }

    // PLAY INTRO PART 1
    print("🎬 Starting Intro Part 1...");
    displayAndSpeak("Welcome wizard!");

    delay(3.0, function () {
        displayAndSpeak("I have a wand for you.\nJust let me know\nwhich hand you are using.");

        delay(4.0, function () {
            if (!global.handChosen) {
                print("📝 RoundManager: Waiting for hand choice...");
                displayAndSpeak("Say \"left\" or \"right\"\nto choose hand");
            }
        });
    });
}

var delayedInit = script.createEvent("DelayedCallbackEvent");
delayedInit.bind(function () {
    // Apply Visibility setting
    if (script.playerHealthScript && script.playerHealthScript.api && script.playerHealthScript.api.setHealthHidden) {
        script.playerHealthScript.api.setHealthHidden(script.hideHealthUI);
    }
    if (script.botHealthScript && script.botHealthScript.api && script.botHealthScript.api.setHealthHidden) {
        script.botHealthScript.api.setHealthHidden(script.hideHealthUI);
    }

    if (global.playerHasShot) return;

    // WAIT FOR PLACEMENT
    if (global.isPlacingBot) {
        print("⏳ RoundManager: Waiting for Bot Placement (paused intro).");
        return;
    }

    startIntroOrGame();
});
delayedInit.reset(0.5); // 0.5s delay to be safe against execution order

var restartTime = -1;
global.playerHasShot = false;
global.handChosen = false; // Track if hand has been selected logic
global.isRoundWaiting = false;

// Match Score Tracking (Best of 3)
var playerScore = 0;
var botScore = 0;
var isMatchOver = false;

// PUBLIC API
script.api.onBotPlaced = function (newBotScript, newBotSpawnerScript, newBotBehaviourScript) {
    print("🤖 RoundManager: Bot Placed -> Triggering Start Text.");

    // Update reference to the new bot instance
    if (newBotScript) {
        script.botHealthScript = newBotScript;
        print("   -> Linked RoundManager to new Bot Health.");
    }

    if (newBotSpawnerScript) {
        script.botSpawnerScript = newBotSpawnerScript;
        print("   -> Linked RoundManager to new Bot Spawner.");
    }

    if (newBotBehaviourScript) {
        script.botBehaviourScript = newBotBehaviourScript;
        print("   -> Linked RoundManager to new Bot Behaviour.");
    }

    // Start Intro or Game Loop
    startIntroOrGame();
};

script.api.onHandChosen = function () {
    if (!global.handChosen && !global.playerHasShot) {
        global.handChosen = true;
        print("🙌 Hand chosen! Starting Intro Part 2.");
        playIntroPart2();
    }
};

script.api.onMatchDecision = function (decision) {
    if (!isMatchOver) return;

    print("🔎 Match Decision Received: " + decision);

    if (decision === "yes") {
        print("✅ Play Again Accepted");
        speak("Starting new match! Good luck trying to beat me.");

        // Start immediately
        playerScore = 0;
        botScore = 0;
        isMatchOver = false;
        restartRound();

    } else if (decision === "no") {
        print("❌ Play Again Declined");
        speak("Okay, bye! Taking your L with you I see.");
        if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
            script.botHealthScript.api.setCustomText("GAME OVER");
        }
    }
};

script.api.onPlayerShot = function () {
    if (!global.playerHasShot) {
        global.playerHasShot = true;
        global.handChosen = true; // Ensure this is set so we don't go back
        print("🎮 Game started! Player shot first spell.");

        // Reset bot health text to number when game starts
        if (script.botHealthScript && script.botHealthScript.api && script.botHealthScript.api.resetHealth) {
            script.botHealthScript.api.resetHealth();
        }
    }
};

script.api.hasGameStarted = function () {
    return global.playerHasShot;
};

function restartRound() {
    print("🔄 Restarting round...");

    if (script.playerHealthScript && script.playerHealthScript.api) script.playerHealthScript.api.resetHealth();
    if (script.botHealthScript && script.botHealthScript.api) script.botHealthScript.api.resetHealth();
    if (script.botSpawnerScript && script.botSpawnerScript.api) script.botSpawnerScript.api.restartShooting();
    if (script.botBehaviourScript && script.botBehaviourScript.api) script.botBehaviourScript.api.resetMovement();

    global.isRoundWaiting = false;
    restartTime = -1;
    lastCountdownVal = -1; // Reset countdown TTS

    // Safety: Turn off player confetti if round restarts early
    if (script.playerConfetti) {
        script.playerConfetti.enabled = false;
    }

    // Display Score brief
    if (!isMatchOver) {
        print("✅ Round restarted! Fight!");
        if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
            // Optional: Show Score briefly? 
            // script.botHealthScript.api.setCustomText(botScore + " - " + playerScore);
        }
    }
}

script.createEvent("UpdateEvent").bind(function () {
    // If not waiting for restart, check if anyone died
    if (restartTime < 0 && !isMatchOver) {
        // if (script.playerHealthScript && !script.playerHealthScript.api.isDead) {
        //     print("⚠️ RoundManager: playerHealthScript.api.isDead is missing!");
        // }
        // if (script.botHealthScript && !script.botHealthScript.api.isDead) {
        //     print("⚠️ RoundManager: botHealthScript.api.isDead is missing!");
        // }

        var playerDead = script.playerHealthScript && script.playerHealthScript.api && script.playerHealthScript.api.isDead && script.playerHealthScript.api.isDead();
        var botDead = script.botHealthScript && script.botHealthScript.api && script.botHealthScript.api.isDead && script.botHealthScript.api.isDead();

        if (playerDead || botDead) {

            // --- SCORING LOGIC ---
            if (playerDead) {
                botScore++;
            } else {
                playerScore++;
            }
            print("📊 Score Update: Bot " + botScore + " - " + playerScore + " Player");


            // --- ROUND END SPEECH (Generic Brain Rot) ---
            // Get Health for "Close Match" logic
            var pHealth = (script.playerHealthScript && script.playerHealthScript.api.getHealth) ? script.playerHealthScript.api.getHealth() : 0;
            var bHealth = (script.botHealthScript && script.botHealthScript.api.getHealth) ? script.botHealthScript.api.getHealth() : 0;
            var phrase = "";
            var phrases = [];

            if (playerDead) {
                print("🔄 Bot won! (Bot Remaining Health: " + bHealth + ")");
                if (script.playerHealthScript && script.playerHealthScript.api.setCustomText) {
                    // script.playerHealthScript.api.setCustomText("YOU LOSE"); // Hidden as requested
                }

                if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
                    script.botHealthScript.api.setCustomText("I WON");
                }

                // Bot Confetti (Celebration)
                if (script.botHealthScript && script.botHealthScript.api.playConfetti) {
                    script.botHealthScript.api.playConfetti();
                }

                // Bot Speech
                if (bHealth <= 1) {
                    phrases = ["Stop glazing, I know I'm good!", "Mid diff", "A little sweaty ngl", "Bro almost clipped me", "Damn dude, that was close!", "Chat, spam W!"];
                } else {
                    phrases = ["Stop glazing me bro!", "Walking L", "No cap, you fell off", "Common Wizard L", "Ratio plus L plus No Wand", "Did you even try?", "NPC energy", "Chat, is this real?", "Get wrecked!", "EZ!"];
                }

            } else {
                print("🔄 Player won! (Player Remaining Health: " + pHealth + ")");
                if (script.playerHealthScript && script.playerHealthScript.api.setCustomText) {
                    // script.playerHealthScript.api.setCustomText("YOU WIN"); // Hidden
                }
                if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
                    script.botHealthScript.api.setCustomText("YOU WON!");
                }

                // Player Confetti
                if (script.playerConfetti) {
                    script.playerConfetti.enabled = true;
                    var d = script.createEvent("DelayedCallbackEvent");
                    d.bind(function () {
                        if (script.playerConfetti) script.playerConfetti.enabled = false;
                    });
                    d.reset(3.0);
                }

                // Bot Speech (congratulating player / lamenting loss)
                if (pHealth <= 1) {
                    phrases = ["Stop aura farming!", "We take those", "Clutch moment", "Bro is the goat", "Saved by the ping", "Touch grass!", "Sheesh, close one!", "Chat, spam L for me!"];
                } else {
                    phrases = ["Stop aura farming bro!", "Hacks?", "Reports coming in", "Main character energy", "Built different", "Sheesh, pop off", "Okay, you are cracked!", "Chat, spam W for this guy!", "Wizard God mode activated!"];
                }
            }

            // Speak Random Phrase
            if (phrases.length > 0) {
                phrase = phrases[Math.floor(Math.random() * phrases.length)];
                speak(phrase);
            }

            // --- GAME OVER CHECK (Best of 3) ---
            if (botScore >= 2 || playerScore >= 2) {
                isMatchOver = true;
                restartTime = -1; // No auto restart
                global.isRoundWaiting = true; // Stop hits

                print("🏆 MATCH OVER! " + (botScore >= 2 ? "Bot" : "Player") + " Wins!");

                // Queue Match Over Speech
                delay(4.0, function () {
                    var matchText = (botScore >= 2) ? "I WON MATCH!" : "YOU WON MATCH!";
                    if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
                        script.botHealthScript.api.setCustomText(matchText);
                    }

                    if (botScore >= 2) {
                        speak("I won the match! GG EZ, catch you in the lobby.");
                    } else {
                        speak("You won the match! Giga Chad confirmed. Respect.");
                    }

                    // Ask for Rematch
                    delay(5.0, function () {
                        if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
                            script.botHealthScript.api.setCustomText("PLAY AGAIN?\nSAY YES / NO");
                        }
                        speak("Do you want to play again? Say Yes or No.");
                    });
                });

                return; // STOP HERE
            }

            // --- NORMAL ROUND RESTART ---
            restartTime = global.getTime() + script.restartDelay;
            global.isRoundWaiting = true;
        }
    } else if (!isMatchOver) {
        // We are waiting for restart
        var remaining = restartTime - global.getTime();

        // Final Countdown (3..2..1..FIGHT)
        if (remaining <= 4.0) {
            var val = Math.floor(remaining);
            if (val > 3) val = 3;

            if (val > 0) {
                // Update Text (Bot Only)
                if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
                    script.botHealthScript.api.setCustomText(val.toString());
                }

                // Speak
                if (val !== lastCountdownVal) {
                    lastCountdownVal = val;
                    speak(val.toString());
                }
            } else if (val <= 0 && lastCountdownVal > 0) {
                // FIGHT!
                lastCountdownVal = 0;
                speak("Fight!");
                if (script.botHealthScript && script.botHealthScript.api.setCustomText) {
                    script.botHealthScript.api.setCustomText("FIGHT!");
                }
                restartRound(); // Restart immediately
            }
        }

        if (global.getTime() >= restartTime) {
            restartRound();
        }
    }
});
