// Bot_Health.js
// Handles bot health, hit animations, and death state

// @input Component.Text3D healthText
// @input Component.ScriptComponent animManager
// @input Component.AudioComponent hitSFX
// @input SceneObject victoryConfetti

var health = 3;
var damagePerHit = 1;
var isDead = false;
var hideNumbers = false;

var lastDamageTime = 0;
var damageCooldown = 0.1; // 0.1s cooldown

var resetAnimTime = -1;

var collider = script.getSceneObject().getComponent("Physics.ColliderComponent");
collider.overlapFilter.includeIntangible = false;
collider.overlapFilter.includeDynamic = true;
collider.overlapFilter.includeStatic = true;

function setAnimation(clipName, type) {
    if (!script.animManager) return;

    // Try .api pattern
    if (script.animManager.api && script.animManager.api.setState) {
        script.animManager.api.setState(clipName, type);
    }
    // Try direct script pattern
    else if (script.animManager.setState) {
        script.animManager.setState(clipName, type);
    }
}

// PUBLIC API
script.api.isDead = function () {
    return isDead;
};

script.api.getHealth = function () {
    return health;
};

// PUBLIC API — set custom text (Win/Loss)
// PUBLIC API — set custom text (Win/Loss/Instructions) - Always Visible
script.api.setCustomText = function (text) {
    if (script.healthText) {
        script.healthText.enabled = true;
        script.healthText.text = text;
    }
};

// PUBLIC API — Toggle visibility of NUMBERS
script.api.setHealthHidden = function (hidden) {
    hideNumbers = hidden;
    if (script.healthText) script.healthText.enabled = true;
};

// PUBLIC API - Play Confetti
script.api.playConfetti = function () {
    if (script.victoryConfetti) {
        script.victoryConfetti.enabled = true;
        var d = script.createEvent("DelayedCallbackEvent");
        d.bind(function () {
            if (script.victoryConfetti) script.victoryConfetti.enabled = false;
        });
        d.reset(3.0);
    }
};

script.api.resetHealth = function () {
    health = 3;
    isDead = false;
    if (script.healthText) {
        script.healthText.text = "";
    }
    setAnimation('Idle', 1);

    if (script.victoryConfetti) {
        script.victoryConfetti.enabled = false;
    }

    print("Bot health reset to 3");
};

// Initial display
if (script.healthText) {
    script.healthText.text = "";
}

// Ensure confetti is OFF by default
if (script.victoryConfetti) {
    script.victoryConfetti.enabled = false;
}

// Update loop for animation resetting
script.createEvent("UpdateEvent").bind(function () {
    if (resetAnimTime > 0 && global.getTime() >= resetAnimTime) {
        setAnimation('Idle', 1);
        resetAnimTime = -1;
    }
});

collider.onOverlapEnter.add(function (e) {
    if (isDead) return;

    var other = e.overlap.collider.getSceneObject();
    if (!other) return;

    // Ignore own spells
    if (other.name.includes("Bot_Spell")) return;

    // Damage Cooldown
    var currentTime = global.getTime();
    if (currentTime - lastDamageTime < damageCooldown) {
        // Delay destroy
        var toDestroy = other;
        var d = script.createEvent("DelayedCallbackEvent");
        d.bind(function () { if (toDestroy) toDestroy.destroy(); });
        d.reset(0.02);
        return;
    }
    lastDamageTime = currentTime;

    // Deal damage
    health -= damagePerHit;
    if (health < 0) health = 0;

    if (script.healthText) {
        script.healthText.text = "";
    }

    // Trigger hit state
    // if (script.hitSFX) script.hitSFX.play(1); // Removed: SpellHitSpawner handles impact audio

    setAnimation('Hit', 0);
    resetAnimTime = global.getTime() + 0.1; // Reset to idle in 100ms

    // Death
    if (health <= 0) {
        isDead = true;
        // if (script.healthText) script.healthText.text = "DEAD"; // Removed to avoid flashing text
        setAnimation('Death', 0);
        print("Bot defeated!");
    }

    // Delay destroy
    var toDestroy = other;
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(function () { if (toDestroy) toDestroy.destroy(); });
    d.reset(0.02);
});