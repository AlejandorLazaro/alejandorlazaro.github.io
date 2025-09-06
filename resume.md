---
layout: glassy
title: Alejandro L. Ramirez - Resume
---

<div class="hero">
    {% if site.logo %}
    <img src="{{ site.logo | relative_url }}" alt="Logo" class="profile-img-actual" />
    {% else %}
    <div class="profile-img">AL</div>
    {% endif %}
    <h1>Resume</h1>
    <div class="title">Alejandro L. Ramirez - Game Producer & Developer Tools Engineer</div>
    <div class="bio">
        View or download my complete resume below. Choose between game development or software engineering focus. For additional portfolio information, please visit my <a href="/" class="highlight">main portfolio page</a>.
    </div>
</div>

<div class="sections">
    <div class="section full-width">
        <h2>Resume Selection</h2>

        <!-- Resume Type Selector -->
        <div class="resume-selector" style="margin-bottom: 2rem;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <button id="gamedevBtn" class="resume-type-btn active" onclick="switchResume('gamedev')">
                    🎮 Game Development
                </button>
                <button id="softwareBtn" class="resume-type-btn" onclick="switchResume('software')">
                    💻 Software Engineering
                </button>
            </div>

            <!-- Download Buttons -->
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <a id="gamedevDownload" href="/assets/resume_gamedev.pdf" download="Alejandro_Ramirez_GameDev_Resume.pdf" class="download-btn">
                    📄 Download Game Dev Resume (PDF)
                </a>
                <a id="softwareDownload" href="/assets/resume_software.pdf" download="Alejandro_Ramirez_Software_Resume.pdf" class="download-btn" style="display: none;">
                    📄 Download Software Resume (PDF)
                </a>
            </div>
        </div>

        <!-- Resume Viewers -->
        <div class="project">
            <div class="project-desc">
                <div id="gamedevViewer" class="resume-viewer" style="width: 100%; height: 800px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; overflow: hidden; background: rgba(255, 255, 255, 0.05);">
                    <iframe src="/assets/resume_gamedev.pdf" width="100%" height="100%" style="border: none;" type="application/pdf"></iframe>
                    <div class="pdf-fallback" style="display: none;">
                        <p>Your browser doesn't support PDF viewing.</p>
                        <p>Please <a href="/assets/resume_gamedev.pdf" download="Alejandro_Ramirez_GameDev_Resume.pdf" class="highlight">download the game dev resume</a> to view it.</p>
                    </div>
                </div>

                <div id="softwareViewer" class="resume-viewer" style="display: none; width: 100%; height: 800px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; overflow: hidden; background: rgba(255, 255, 255, 0.05);">
                    <iframe src="/assets/resume_software.pdf" width="100%" height="100%" style="border: none;" type="application/pdf"></iframe>
                    <div class="pdf-fallback" style="display: none;">
                        <p>Your browser doesn't support PDF viewing.</p>
                        <p>Please <a href="/assets/resume_software.pdf" download="Alejandro_Ramirez_Software_Resume.pdf" class="highlight">download the software resume</a> to view it.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="section full-width">
        <h2>Summary</h2>

        <div id="gamedevSummary" class="resume-summary">
            <div class="project">
                <div class="project-title">Game Development Highlights</div>
                <div class="project-desc">
                    <strong>Recent Role:</strong> Producer/Dev Tools/QA at Stray Kite Studios<br>
                    <strong>Shipped Titles:</strong> Wartorn, Asurya's Embers, SeaFeud<br>
                    <strong>Education:</strong> M.S. Interactive Technology (SMU), B.S. Computer Science (LeTourneau)<br>
                    <strong>Core Skills:</strong> Game Production, Games User Testing, QA Automation, Team Leadership<br>
                    <strong>Specialties:</strong> Developer Tools, Gameplay Programming, Production Pipeline
                </div>
            </div>
        </div>

        <div id="softwareSummary" class="resume-summary">
            <div class="project">
                <div class="project-title">Software Engineering Highlights</div>
                <div class="project-desc">
                    <strong>Recent Role:</strong> iOS Automation Software Engineer at Apple Inc.<br>
                    <strong>Background:</strong> Full-stack development, Automation, and Developer Tools<br>
                    <strong>Education:</strong> M.S. Interactive Technology (SMU), B.S. Computer Science (LeTourneau)<br>
                    <strong>Core Skills:</strong> Python, C++, Test Automation, CI/CD<br>
                    <strong>Specialties:</strong> Developer Tools, Test Framework Design, Process Automation
                </div>
            </div>
        </div>
    </div>
</div>

<div class="social-contact collapsible collapsed">
    <div class="collapsible-header" onclick="toggleSection(this)">
        <h2>Contact Information&ensp;<span class="toggle-icon">▼</span></h2>
    </div>
    <div class="collapsible-content">
        <div class="contact-container">
            <div class="contact-grid">
                <a href="https://linkedin.com/in/alramirez" target="_blank" class="contact-item">
                    <img src="/assets/img/icons/linkedin.svg" alt="LinkedIn" class="contact-icon" />
                    <span>LinkedIn</span>
                </a>

                <a href="https://github.com/AlejandorLazaro" target="_blank" class="contact-item">
                    <img src="/assets/img/icons/github.svg" alt="GitHub" class="contact-icon" />
                    <span>GitHub</span>
                </a>

                <a href="mailto:alejandro.ramirez.4693@gmail.com" class="contact-item">
                    <img src="/assets/img/icons/email.svg" alt="Email" class="contact-icon" />
                    <span>Email</span>
                </a>
            </div>
        </div>
    </div>
</div>

<script>
    // Resume switching functionality
    function switchResume(type) {
        const gamedevBtn = document.getElementById('gamedevBtn');
        const softwareBtn = document.getElementById('softwareBtn');
        const gamedevViewer = document.getElementById('gamedevViewer');
        const softwareViewer = document.getElementById('softwareViewer');
        const gamedevDownload = document.getElementById('gamedevDownload');
        const softwareDownload = document.getElementById('softwareDownload');
        const gamedevSummary = document.getElementById('gamedevSummary');
        const softwareSummary = document.getElementById('softwareSummary');

        if (type === 'gamedev') {
            // Update buttons
            gamedevBtn.classList.add('active');
            softwareBtn.classList.remove('active');

            // Show/hide viewers
            gamedevViewer.style.display = 'block';
            softwareViewer.style.display = 'none';
            refreshiFrame(gamedevViewer, '/assets/resume_gamedev.pdf');

            // Show/hide download links
            gamedevDownload.style.display = 'inline-block';
            softwareDownload.style.display = 'none';

            // Show/hide summaries
            gamedevSummary.style.display = 'block';
            softwareSummary.style.display = 'none';
        } else if (type === 'software') {
            // Update buttons
            softwareBtn.classList.add('active');
            gamedevBtn.classList.remove('active');

            // Show/hide viewers
            softwareViewer.style.display = 'block';
            gamedevViewer.style.display = 'none';
            refreshiFrame(softwareViewer, '/assets/resume_software.pdf');

            // Show/hide download links
            softwareDownload.style.display = 'inline-block';
            gamedevDownload.style.display = 'none';

            // Show/hide summaries
            softwareSummary.style.display = 'block';
            gamedevSummary.style.display = 'none';
        }
    }

    // Helper function to refresh iframe elements
    function refreshiFrame(container, pdfSrc) {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            const newIframe = iframe.cloneNode(true);
            newIframe.src = pdfSrc + '?t=' + Date.now(); // force reload
            iframe.parentNode.replaceChild(newIframe, iframe);
        }
    }

    // Initialize resume view on page load
    document.addEventListener('DOMContentLoaded', function() {
        switchResume('gamedev');
    });
</script>