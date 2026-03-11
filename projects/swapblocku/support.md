---
layout: glassy
title: Swapblocku Support
---

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
                <img src="/assets/images/photo1.jpg" alt="Photo 1" class="gallery-image" />
                <img src="/assets/images/photo2.jpg" alt="Photo 2" class="gallery-image" />
                <img src="/assets/images/photo3.jpg" alt="Photo 3" class="gallery-image" />
                <img src="/assets/images/photo4.jpg" alt="Photo 4" class="gallery-image" />
            </div>
        </div>
    </div>

    <div class="project-pane collapsible">
        <div class="collapsible-header" onclick="toggleSection(this)">
            <h2>Photo Carousel&ensp;<span class="toggle-icon">▼</span></h2>
        </div>
        <div class="collapsible-content">
            <div class="photo-carousel">
                <div class="carousel-container">
                    <div class="carousel-slides">
                        <div class="carousel-slide">
                            <img src="/assets/images/image1.jpg" alt="Image 1">
                            <div class="slide-caption">Caption for Image 1</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/images/image2.jpg" alt="Image 2">
                            <div class="slide-caption">Caption for Image 2</div>
                        </div>
                        <div class="carousel-slide">
                            <img src="/assets/images/image3.jpg" alt="Image 3">
                            <div class="slide-caption">Caption for Image 3</div>
                        </div>
                    </div>
                    <button class="carousel-nav prev">&#10094;</button>
                    <button class="carousel-nav next">&#10095;</button>
                    <div class="carousel-indicators">
                        <div class="carousel-dot"></div>
                        <div class="carousel-dot"></div>
                        <div class="carousel-dot"></div>
                    </div>
                </div>
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
                <button type="submit" class="resume-type-btn">Send</button>
            </form>
        </div>
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

    .resume-type-btn {
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

    .resume-type-btn:hover {
        background: rgba(103, 126, 234, 0.2);
        border-color: rgba(103, 126, 234, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .resume-type-btn:active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
</style>