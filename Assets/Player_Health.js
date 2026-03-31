// @input Component.Text3D healthTextEditor      // Editor preview
// @input Component.Text3D healthTextHeadset     // Spectacles headset (Right Hand)
// @input Component.Text3D healthTextLeft        // Spectacles headset (Left Hand)
// @input Component.AudioComponent hitSFX        // Hit sound

var collider = script.getSceneObject().getComponent("Physics.ColliderComponent");

collider.overlapFilter.includeIntangible = false;
collider.overlapFilter.includeDynamic = true;
collider.overlapFilter.includeStatic = true;

// ────── HEALTH SYSTEM ──────
var health = 3;
var damagePerHit = 1;
var hideNumbers = false;

// PUBLIC API — other scripts can check if player is dead
script.api.isDead = function () {
    return health <= 0;
};

// PUBLIC API — get current health
script.api.getHealth = function () {
    return health;
};

// PUBLIC API — reset health (for round restart)
script.api.resetHealth = function () {
    health = 3;
    updateHealthDisplay();
};

// PUBLIC API — set custom text (Win/Loss)
// Helper to manage component state
function ensureCorrectComponentsEnabled() {
    if (global.isHeadsetMode) {
        if (script.healthTextHeadset) script.healthTextHeadset.enabled = true;
        if (script.healthTextLeft) script.healthTextLeft.enabled = true;
        if (script.healthTextEditor) script.healthTextEditor.enabled = false;
    } else {
        if (script.healthTextEditor) script.healthTextEditor.enabled = true;
        if (script.healthTextHeadset) script.healthTextHeadset.enabled = false;
        if (script.healthTextLeft) script.healthTextLeft.enabled = false;
    }
}

// PUBLIC API — set custom text (Win/Loss)
script.api.setCustomText = function (text) {
    ensureCorrectComponentsEnabled();
    if (global.isHeadsetMode) {
        if (script.healthTextHeadset) script.healthTextHeadset.text = text;
        if (script.healthTextLeft) script.healthTextLeft.text = text;
    } else {
        if (script.healthTextEditor) script.healthTextEditor.text = text;
    }
};

// PUBLIC API — Toggle visibility of NUMBERS
script.api.setHealthHidden = function (hidden) {
    hideNumbers = hidden;
    ensureCorrectComponentsEnabled();
    updateHealthDisplay();
};

// Update the correct health text based on status
function updateHealthDisplay() {
    var displayText;
    if (hideNumbers) {
        displayText = "";
    } else {
        displayText = (health > 0) ? health.toString() : "DEAD";
    }
    script.api.setCustomText(displayText);
}

// Initial setup
updateHealthDisplay();

// ────── DAMAGE ON HIT ──────
var lastDamageTime = 0;  // Track when we last took damage
var damageCooldown = 0.1;  // 0.1 second cooldown between hits

collider.onOverlapEnter.add(function (e) {
    var other = e.overlap.collider.getSceneObject();

    // Ignore your own spells
    if (other && other.name.includes("Player_Spell")) {
        return;
    }

    if (!other) return;

    // DAMAGE COOLDOWN - Prevent damage if we were hit recently
    var currentTime = getTime();
    var timeSinceLastDamage = currentTime - lastDamageTime;

    if (timeSinceLastDamage < damageCooldown) {
        print("⚠️ Damage on cooldown (" + (timeSinceLastDamage * 1000).toFixed(0) + "ms since last hit)");
        // Delay destroy to allow VFX
        var toDestroy = other;
        var d = script.createEvent("DelayedCallbackEvent");
        d.bind(function () { if (toDestroy) toDestroy.destroy(); });
        d.reset(0.02);
        return;
    }

    // Update last damage time
    lastDamageTime = currentTime;

    print("✓ Hit by: " + other.name + " - dealing " + damagePerHit + " damage");

    // Take damage
    health -= damagePerHit;
    if (health < 0) health = 0;

    print("✓ Health is now: " + health);

    // Play hit sound
    if (script.hitSFX) {
        script.hitSFX.play(1);
    }

    // Update correct display
    updateHealthDisplay();

    // Death
    if (health <= 0) {
        print("💀 Player defeated!");
    }

    // Destroy projectile with slight delay to allow its own events (VFX) to fire
    var toDestroy = other;
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(function () {
        if (toDestroy) toDestroy.destroy();
    });
    d.reset(0.02);
});