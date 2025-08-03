---
layout: glassy
title: Wartorn - Game Production
---

<div class="content">
    <div class="project-hero">
        <img src="/assets/img//projects/wartorn/wartorn-steam.png" alt="Wartorn Steam Capsule" class="hero-image-full" />
        <p class="game-tagline">Wartorn is a single-player, squad-based, RTT, roguelite, where players must traverse the wartorn countryside in search for refuge. Harness the elements in fierce real-time battles while upgrading a crew of fantasy creatures as you search for your family.<br><br>
        Think "Lord of the Rings" meets "Oregon Trail."</p>
    </div>
</div>

<div class="project-panes">
    <!-- Project Overview Pane -->
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Project Overview&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Project and Development Details</p>
        </div>
        <div class="collapsible-content">
            <div class="project-meta-section">
                <div class="meta-grid">
                    <div class="meta-item"><strong>Developer:</strong> Stray Kite Studios</div>
                    <div class="meta-item"><strong>Role:</strong> Producer</div>
                    <div class="meta-item"><strong>Platform:</strong> PC (Steam & Epic)</div>
                    <div class="meta-item"><strong>Timeline:</strong> October 2024 - August 2025</div>
                    <div class="meta-item"><strong>Genre:</strong> Single-player, squad-based RTS roguelite</div>
                    <div class="meta-item"><strong>Stores:</strong> <a href="https://store.steampowered.com/app/1296660/Wartorn/" target="_blank">Steam</a> / <a href="https://store.epicgames.com/en-US/p/wartorn-e12425" target="_blank">Epic</a></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Development Gallery Pane -->
    <div class="project-pane pane-gallery collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Development Gallery&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <div class="photo-carousel" id="wartorn-gallery">
                <div class="carousel-container">
                    <div class="carousel-slides">
                        <div class="carousel-slide">
                            <img src="/assets/img/projects/wartorn/screenshot1.jpg" alt="Wartorn Gameplay Screenshot" />
                            <div class="slide-caption">Squad-based tactical combat in action</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/img/projects/wartorn/screenshot2.png" alt="Wartorn Junction" />
                            <div class="slide-caption">Deciding which route to take</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/img/projects/wartorn/screenshot3.png" alt="Wartorn World Map" />
                            <div class="slide-caption">Creating the overworld map</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/img/projects/wartorn/screenshot4.png" alt="Wartorn Development Tools" />
                            <div class="slide-caption">Custom development tools and pipelines</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/img/projects/wartorn/screenshot5.png" alt="Wartorn Development Tools" />
                            <div class="slide-caption">Custom development tools and pipelines</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/img/projects/wartorn/screenshot6.png" alt="Wartorn Development Tools" />
                            <div class="slide-caption">Custom development tools and pipelines</div>
                        </div>
                    </div>
                    <button class="carousel-nav prev">‹</button>
                    <button class="carousel-nav next">›</button>
                    <div class="carousel-indicators">
                        <span class="carousel-dot active"></span>
                        <span class="carousel-dot"></span>
                        <span class="carousel-dot"></span>
                        <span class="carousel-dot"></span>
                        <span class="carousel-dot"></span>
                        <span class="carousel-dot"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Production Management Pane -->
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Production Management&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Responsibilities included Scrum management, Jira administration, project estimation, and more</p>
        </div>
        <div class="collapsible-content">
            <ul>
                <li><strong>Jira Administration:</strong> Managed project workflows through dashboards, bulk issue creation/editing, and automation rules</li>
                <li><strong>Scrum & Meeting Management:</strong> Facilitated daily standups, sprint planning, and retrospectives</li>
                <li><strong>Project Estimation & Roadmapping:</strong> Created Google Sheet dashboards for task estimation, determining effort and project feasibility that resulted in development resource reallocation and schedule changes</li>
                <li><strong>Grant Reporting:</strong> Created reporting tool generating 1000+ issue summaries with JQL support for Texas Film Commission grant proof-of-work</li>
            </ul>
        </div>
    </div>

    <!-- Development Tools Pane -->
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Development Tools&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Beyond production, I also created several dev tools to assist design, marketing, and localization</p>
        </div>
        <div class="collapsible-content">
            <ul>
                <li><strong>Datatable/Curvetable Tools:</strong> Built Python-based import/export tools with Google Cloud API integration, allowing designers to use Google Sheets as single source of truth for 100+ data files</li>
                <li><strong>Patch Note Generator:</strong> Automated system scraping Perforce CL messages and Jira IDs to dynamically report developer-marked changes with status tracking</li>
                <li><strong>Localization Pipeline:</strong> Created Google Sheet to .po file integration for mass visualization, editing, and verification of locstrings (~400 missing entries found in initial Chinese translation)</li>
                <li><strong>Blueprint Integration:</strong> Investigated Unreal Engine code to add Curvetable CSV import/export functionality via Blueprint and Python scripts</li>
            </ul>
        </div>
    </div>

    <!-- Quality Assurance Pane -->
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Quality Assurance&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Also did manual QA, proctored playtests, and collated player feedback</p>
        </div>
        <div class="collapsible-content">
            <ul>
                <li><strong>Build Verification Tests (BVTs):</strong> Executed comprehensive QA playbooks</li>
                <li><strong>Regression Testing:</strong> Validated bug fixes and feature implementations</li>
                <li><strong>Internal Playtests:</strong> Proctored and managed internal testing sessions</li>
                <li><strong>Daily Build Management:</strong> Coordinated QA team rotations tracking new bugs and feature requests</li>
            </ul>
        </div>
    </div>

    <!-- Additional Contributions Pane -->
    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Additional Contributions&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-preview">
            <p>Did miscellaneous support work for varied disciplines, from design and performance to VO recordings and localization support</p>
        </div>
        <div class="collapsible-content">
            <ul>
                <li><strong>Level Design Support:</strong> Placed play area, navigation blocking, and camera blocking volumes</li>
                <li><strong>Performance Analysis:</strong> Used UnrealInsights to gather and investigate performance traces</li>
                <li><strong>Voice Over Production:</strong> Managed async VO recording sessions with REAPER for unit and merchant audio</li>
                <li><strong>Localization Passes:</strong> Organized recruitment efforts and distributed process for ML-translation review on various languages</li>
                <li><strong>Blueprint Automation:</strong> Used Kismet2 API via Python to auto-update SM components for material decal management</li>
            </ul>
        </div>
    </div>
</div>