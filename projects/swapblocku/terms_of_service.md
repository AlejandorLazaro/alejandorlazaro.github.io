---
layout: glassy
title: Swapblocku Terms of Service
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
            <h2>Terms of Service&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            Welcome to <span class="highlight">Swapblocku</span>! These Terms of Service govern your use of the app. By downloading or using <span class="highlight">Swapblocku</span>, you agree to comply with these terms.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>User Responsibilities&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            Users may utilize <span class="highlight">GameCenter</span> to view usernames, participate in leaderboards, and engage in head-to-head matches. Communication is limited to observing gameplay through a shared game board. Users are expected to engage respectfully and may not engage in any unlawful behavior.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>License&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <span class="highlight">Swapblocku</span> is developed and owned solely by <span class="highlight">Alejandro Ramirez</span>. Users are not granted any rights to reproduce, modify, or redistribute the app, in whole or in part, without explicit permission.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Limitation of Liability&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <span class="highlight">Alejandro Ramirez</span> will not be liable for any damages resulting from the use of <span class="highlight">Swapblocku</span>, including but not limited to loss of data, profit, or any direct or indirect damages. Users assume all risks associated with the use of the app.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Termination&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            User access may be terminated without notice for unlawful behavior or violations of these terms. Enforcement of termination is at the discretion of the app management.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Governing Law&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            These Terms of Service are governed by the laws of the State of Texas, USA, without regard to its conflict of law principles.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Changes to Terms&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            Users will be notified within the app about significant changes. Continued use after changes will constitute acceptance of the new Terms.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Intellectual Property&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            All content and intellectual property within <span class="highlight">Swapblocku</span> are protected. Users agree not to infringe upon these rights.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>In-App Purchases&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            All transactions are processed via Apple’s StoreKit API. For issues with purchases, users should contact customer support or contest the charge directly with Apple.
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Contact Information&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            For questions about these Terms of Service, please contact me at alejandro.ramirez.4693@gmail.com.
        </div>
    </div>

    <div class="footer">
        <p><small>© 2026 Alejandro Ramirez. All rights reserved.</small></p>
        <p><small><a href="/projects/swapblocku/privacy_policy">Privacy Policy</a> • <a href="/projects/swapblocku/terms_of_service">Terms of Service</a></small></p>
        <p><small>Apple, iPhone, and the Apple Logo are registered trademarks of Apple Inc.</small></p>
    </div>
</div>
