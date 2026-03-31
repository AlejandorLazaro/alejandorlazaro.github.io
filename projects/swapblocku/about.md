---
layout: glassy
title: Swapblocku
---

<script>
const cursors = [
  {url: '/assets/img/projects/swapblocku/domino_yellow32.png', x: 32, y: 32},
  {url: '/assets/img/projects/swapblocku/l_mino_blue32.png', x: 32, y: 32},
  {url: '/assets/img/projects/swapblocku/l_mino_red32.png', x: 32, y: 32}
];

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function applyCursor(obj){
  // obj: {url, x, y}
  // include fallback 'auto' (or 'pointer' etc.)
  document.documentElement.style.cursor = `url("${obj.url}") ${obj.x} ${obj.y}, auto`;
}

// random on page load
applyCursor(pickRandom(cursors));

const intervalMs = 10000; // change every 10s

setInterval(() => applyCursor(pickRandom(cursors)), intervalMs);
</script>

<!-- HERO -->
<div class="hero" role="region" aria-label="Swapblocku hero">
  {% if site.swapblocku_logo and site.swapblocku_logo != "" %}
    <img src="{{ site.swapblocku_logo | relative_url }}" alt="Swapblocku app icon" class="hero-logo" />
  {% else %}
    <div class="hero-logo-fallback">Logo Path: {{ site.swapblocku_logo }}</div>
  {% endif %}
  <h1 class="app-name">SWAPBLOCKU</h1>
  <p class="tagline">Relaxing yet brain-engaging sudoku-solving block puzzles — solo, vs AI, or multiplayer.</p>
  <br>

  <!-- Primary CTA: App Store badge -->
  <p class="hero-cta">
    <a href="https://apps.apple.com/app/swapblocku/id6760370309" target="_blank" rel="noopener" aria-label="Open Swapblocku on the App Store">
      <img src="/assets/img/ui/app-store-badge.svg" alt="Download on the App Store" class="app-store-badge"/>
    </a>
  </p>
  <br>

  <p class="meta-line">Version: 1.3.1 • Requires iOS or iPadOS 18.6+ • Languages: English</p>
</div>

<div class="project-panes">
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Swapblocku<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <span class="highlight">Swapblocku</span> is a sudoku-inspired game where you take turns placing shaped pieces onto a 9x9 grid and try to clear lines and squares to score the most points possible before you can't place anymore!<br>
            <br>
            In a unique take on the block puzzle genre, it adds the ability to play against an AI player or other humans online—as well as being able to rewind time to review past turns!
        </div>
    </div>

    <!-- App Links / Legal / Support -->
    <div class="project-pane collapsible collapsed">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>App Links&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Legal and support links</p>
        </div>
        <div class="collapsible-content">
            <div id="applinks-content" class="collapsible-content">
                <p class="button-row" style="text-align:center;">
                    <a class="glassy_style_button" href="/projects/swapblocku/terms_of_service" role="button" aria-label="Terms of Service">Terms of Service</a>
                    <a class="glassy_style_button" href="/projects/swapblocku/privacy_policy" role="button" aria-label="Privacy Policy">Privacy Policy</a>
                    <a class="glassy_style_button" href="/projects/swapblocku/support" role="button" aria-label="Support">Support</a>
                </p>
            </div>
        </div>
    </div>

    <!-- Features / Value Props -->
    <div class="project-pane pane-features collapsible" aria-expanded="true">
        <div class="collapsible-header" onclick="toggleSection(this)" role="button" aria-controls="features-content" aria-expanded="true">
        <h2>Key Features <span class="toggle-icon">▼</span></h2>
        </div>
        <div id="features-content" class="collapsible-content">
        <ul class="feature-list">
            <li><strong>Solo &  multiplayer:</strong> Play classic solo highscore mode, or vs AI or other players.</li>
            <li><strong>Replay turns:</strong> Use the rewind button to see up to 10 perfectly simulated previous turns.</li>
            <li><strong>Relaxing gameplay:</strong> Gentle sounds, subtle animations, and focused puzzle design.</li>
            <li><strong>Accessibility:</strong> Simple design, light and dark mode support options, and visual customization.</li>
            <li><strong>No account required:</strong> Play offline with local scores.</li>
        </ul>
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Gameplay&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <div class="photo-gallery">
                <img src="/assets/img/projects/swapblocku/iphone_swapblocku_screenshot_01.png" alt="Clearing lines and squares" class="gallery-image-no-shadow" />
                <img src="/assets/img/projects/swapblocku/iphone_swapblocku_screenshot_02.png" alt="Swap turns with AI" class="gallery-image-no-shadow" />
                <img src="/assets/img/projects/swapblocku/iphone_swapblocku_screenshot_03.png" alt="Replay turns" class="gallery-image-no-shadow" />
            </div>
        </div>
    </div>

    <!-- FAQ-->
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)" role="button" aria-controls="faq-content" aria-expanded="false">
            <h2>Frequently Asked Questions&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div id="faq-content" class="collapsible-content">
            <div class="faq-item">
                <p><strong>Do I need a GameCenter account?</strong><br> No — Swapblocku works offline without accounts; online/GameCenter features are optional.</p>
            </div>
            <br>
            <div class="faq-item">
                <p><strong>How can I play in multiplayer?</strong><br> Create a GameCenter account with Apple. Multiplayer games will be enabled on successful GameCenter sign in. Multiplayer games require a data connection.</p>
            </div>
            <br>
            <div class="faq-item">
                <p><strong>Are there in-app purchases?</strong><br> Yes - some cosmetics are purchase-only, but several can be earned through playing!</p>
            </div>
            <br>
            <div class="faq-item">
                <p><strong>How do I see the hand I picked?</strong><br> The hand cosmetics selected in the Shop are visible when you replay a turn in solo and in multiplayer. Opponents see your cosmetics when in a match, and you see theirs!</p>
            </div>
            <br>
            <div class="faq-item">
                <p><strong>Can I turn off ads?</strong><br> Purchase the Ad-Free option to disable ads forever!</p>
            </div>
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Contact&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            For questions about this app, please use the contact form in the <a href="/projects/swapblocku/support"><span class="highlight">Support</span></a> page.
        </div>
    </div>

    <div class="footer">
        <p><small>© 2026 Alejandro Ramirez. All rights reserved.</small></p>
        <p><small><a href="/projects/swapblocku/privacy_policy">Privacy Policy</a> • <a href="/projects/swapblocku/terms_of_service">Terms of Service</a></small></p>
        <p><small>Apple, iPhone, and the Apple Logo are registered trademarks of Apple Inc.</small></p>
    </div>
</div>
