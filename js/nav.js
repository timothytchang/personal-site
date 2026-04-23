// Disable browser's native scroll restoration so JS fully controls scroll position.
// Without this, browser's fragment-scroll on initial load lands mid-section.
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Navigation - switch sections
(function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const homeCircle = document.querySelector('.home-circle');
    const homeText = document.querySelector('.home-text');
    let isTransitioning = false;

    function updateHomeLogo(targetId) {
        // Show circle on about page, show "Home" text on other pages
        if (targetId === 'about') {
            homeCircle.style.display = 'block';
            homeText.style.display = 'none';
        } else {
            homeCircle.style.display = 'none';
            homeText.style.display = 'inline';
        }
    }

    function switchSection(targetId, animate = true) {
        if (isTransitioning) return;

        const currentSection = document.querySelector('.section.active');
        const targetSection = document.getElementById(targetId);
        const targetLink = document.querySelector(`a[href="#${targetId}"]`);

        if (!targetSection) return;

        // If already on this section, just return
        if (currentSection === targetSection) {
            return;
        }

        if (animate && currentSection) {
            isTransitioning = true;

            // Step 1: Fade out current section
            currentSection.classList.add('fade-out');

            setTimeout(() => {
                // Step 2: Remove old section and show new one
                sections.forEach(section => {
                    section.classList.remove('active', 'fade-out');
                });

                targetSection.classList.add('active');

                // Update nav
                navLinks.forEach(link => link.classList.remove('active'));
                if (targetLink) targetLink.classList.add('active');

                // Update home logo
                updateHomeLogo(targetId);

                setTimeout(() => {
                    isTransitioning = false;
                }, 150);
            }, 150);
        } else {
            // No animation
            navLinks.forEach(link => link.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));

            if (targetLink) targetLink.classList.add('active');
            targetSection.classList.add('active');

            // Update home logo
            updateHomeLogo(targetId);
        }

        // Scroll to top of page
        window.scrollTo(0, 0);
    }

    // Handle nav clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            switchSection(targetId, true);
            history.pushState(null, '', `#${targetId}`);
        });
    });

    // Handle inline links (like "winnable quantum game")
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link && !link.classList.contains('nav-link')) {
            const targetId = link.getAttribute('href').slice(1);
            if (document.getElementById(targetId)) {
                e.preventDefault();
                switchSection(targetId, true);
                history.pushState(null, '', `#${targetId}`);
            }
        }
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1) || 'about';
        switchSection(hash, true);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1) || 'about';
        switchSection(hash, true);
    });

    // Initial load
    function handleInitialLoad() {
        // Check for query parameter first (fallback for Instagram)
        const urlParams = new URLSearchParams(window.location.search);
        const sectionParam = urlParams.get('section');

        if (sectionParam) {
            switchSection(sectionParam, false);
            history.replaceState(null, '', `#${sectionParam}`);
            return;
        }

        const hash = window.location.hash.slice(1);
        if (hash) {
            switchSection(hash, false);
        } else {
            switchSection('about', false);
        }

        // Set initial home logo state
        updateHomeLogo(hash || 'about');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleInitialLoad);
    } else {
        handleInitialLoad();
    }

    window.addEventListener('load', () => {
        const hash = window.location.hash.slice(1);
        if (hash && hash !== 'about') {
            const currentActive = document.querySelector('.section.active');
            if (currentActive && currentActive.id !== hash) {
                switchSection(hash, false);
            }
        }
        // Always force scroll to top after full load — belt and suspenders
        // against any lingering browser fragment-scroll.
        window.scrollTo(0, 0);
    });
})();

// Scrollbar visibility - show only when actively scrolling
(function() {
    let scrollTimeout;
    const html = document.documentElement;

    window.addEventListener('scroll', () => {
        // Add scrolling class
        html.classList.add('scrolling');

        // Clear existing timeout
        clearTimeout(scrollTimeout);

        // Remove scrolling class after 1 second of no scrolling
        scrollTimeout = setTimeout(() => {
            html.classList.remove('scrolling');
        }, 1000);
    });
})();

// Auto-hide header on scroll, show on mouse to top
(function() {
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Scrolling down
            header.classList.add('header-hidden');
        } else {
            // Scrolling up
            header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    });

    // Show header when mouse goes to top of page
    document.addEventListener('mousemove', (e) => {
        if (e.clientY < 50) {
            header.classList.remove('header-hidden');
        }
    });
})();

// Mobile menu toggle
(function() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('mobile-nav-open');
        });

        // Close menu when clicking a nav link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('mobile-nav-open');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
                nav.classList.remove('mobile-nav-open');
            }
        });
    }
})();
