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
        View or download my complete resume below. For the most up-to-date version and additional portfolio information, please visit my <a href="/" class="highlight">main portfolio page</a>.
    </div>
</div>

<div class="sections">
    <div class="section full-width">
        <h2>Resume</h2>

        <div class="project">
            <div class="project-desc">
                <div style="width: 100%; height: 800px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; overflow: hidden; background: rgba(255, 255, 255, 0.05);">
                    <embed src="/assets/resume.pdf" type="application/pdf" width="100%" height="100%" style="border: none;">

                    <!-- Fallback for browsers that don't support embed -->
                    <div style="padding: 40px; text-align: center">
                        <p>Your browser doesn't support PDF viewing.</p>
                        <p>Please <a href="/assets/resume.pdf" download="Alejandro_Ramirez_Resume.pdf" class="highlight">download the resume</a> to view it.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="section full-width">
        <h2>Summary</h2>

        <div class="project">
            <div class="project-title">Professional Highlights</div>
            <div class="project-desc">
                <strong>Recent Role:</strong> Producer/Dev Tools/QA at Stray Kite Studios<br>
                <strong>Background:</strong> iOS Automation Software Engineer at Apple Inc.<br>
                <strong>Education:</strong> M.S. Interactive Technology (SMU), B.S. Computer Science (LeTourneau)<br>
                <strong>Shipped Titles:</strong> Wartorn, Asurya's Embers, SeaFeud<br>
                <strong>Specialties:</strong> Game Production, Developer Tools, QA, Automation
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