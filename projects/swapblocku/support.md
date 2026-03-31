---
layout: glassy
title: Swapblocku Support
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

<div class="hero">
    {% if site.swapblocku_logo and site.swapblocku_logo != "" %}
        <img src="{{ site.swapblocku_logo | relative_url }}" alt="Logo"/>
    {% else %}
        <div>Logo Path: {{ site.swapblocku_logo }}</div>
        <div>Image Not Found</div>
    {% endif %}
    <h1>SWAPBLOCKU</h1>
</div>

<div class="project-panes">
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Welcome to Support&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <p>Welcome to the Swapblocku Support Page! We're here to help you get the most out of your experience with the Swapblocku app. Whether you have questions about features, encounter issues, or want to provide feedback, you've come to the right place.</p>
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
            <h2>Getting Started&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <p>Learn how to navigate through the app and utilize its features. Explore our guides and visual tutorials below to help you get started quickly.</p>
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Photo Gallery&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <div class="photo-gallery">
                <img src="/assets/img/projects/swapblocku/main_menu.png" alt="Photo 1" class="gallery-image" />
                <img src="/assets/img/projects/swapblocku/sologame_menu.png" alt="Photo 2" class="gallery-image" />
                <img src="/assets/img/projects/swapblocku/delete_individual_matches.png" alt="Photo 3" class="gallery-image" />
                <img src="/assets/img/projects/swapblocku/delete_all_matches.png" alt="Photo 4" class="gallery-image" />
                <img src="/assets/img/projects/swapblocku/shop_menu_basic.png" alt="Photo 5" class="gallery-image" />
                <img src="/assets/img/projects/swapblocku/shop_menu_locked.png" alt="Photo 6" class="gallery-image" />
            </div>
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Contact Support&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Contact the Developer</p>
        </div>
        <div class="collapsible-content">
            <form action="mailto:youractualemail@example.com" method="post" enctype="text/plain">
                <label for="name">Name:</label><br>
                <input type="text" id="name" name="name" class="contact-input"><br>
                <label for="email">Email:</label><br>
                <input type="text" id="email" name="email" class="contact-input"><br>
                <label for="message">Message:</label><br>
                <textarea id="message" name="message" class="contact-textarea"></textarea><br>
                <button type="submit" class="glassy_style_button">Send</button>
            </form>
        </div>
    </div>

    <div class="footer">
        <p><small>© 2026 Alejandro Ramirez. All rights reserved.</small></p>
        <p><small><a href="/projects/swapblocku/privacy_policy">Privacy Policy</a> • <a href="/projects/swapblocku/terms_of_service">Terms of Service</a></small></p>
        <p><small>Apple, iPhone, and the Apple Logo are registered trademarks of Apple Inc.</small></p>
    </div>
</div>


<style>
    .contact-input {
        width: calc(100% - 16px);
        padding: 12px;
        margin: 0 0 1rem;
        border: 2px solid rgba(103, 126, 234, 0.3);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.2);
        font-size: 1rem;
        transition: border 0.3s ease, background 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .contact-input:focus {
        outline: none;
        border-color: rgba(103, 126, 234, 0.5);
        background: rgba(255, 255, 255, 0.3);
    }

    .contact-textarea {
        width: calc(100% - 16px);
        padding: 12px;
        border: 2px solid rgba(103, 126, 234, 0.3);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.2);
        font-size: 1rem;
        resize: vertical;
        transition: border 0.3s ease, background 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .contact-textarea:focus {
        outline: none;
        border-color: rgba(103, 126, 234, 0.5);
        background: rgba(255, 255, 255, 0.3);
    }

    .glassy_style_button {
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(103, 126, 234, 0.3);
        color: #2c3e50;
        padding: 12px 24px;
        margin: 0 8px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
    }

    .glassy_style_button:hover {
        background: rgba(103, 126, 234, 0.2);
        border-color: rgba(103, 126, 234, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .glassy_style_button:active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
</style>