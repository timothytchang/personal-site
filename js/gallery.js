// Photo Gallery
const galleries = {
    "London, Cinestill 800T": [
        "27620004.jpg",
        "27620005-2.JPG",
        "27620010-2.JPG",
        "27620018-2.JPG",
        "27620024-3.JPG",
        "27620036-2.JPG",
        "27620037.JPG"
    ],
    "London, Tri-X 400": [
        "27650009-2.JPG",
        "27650010-2.JPG",
        "27650013-2.JPG",
        "27650021.jpg",
        "27650029.JPG",
        "27650032.JPG",
        "27650033.jpg",
        "27650034.JPG",
        "27650036.JPG"
    ],
    "Scottish Highlands": [
        "TC_01257-2.jpg",
        "TC_01295-3.jpg",
        "TC_01359-2.jpg",
        "TC_01374-2.jpg",
        "TC_01457-2.jpg",
        "TC_01464-2.jpg",
        "TC_01474-2.jpg",
        "R0000737-2-2.jpg"
    ],
    "Yosemite": [
        "TC_00121.jpg",
        "TC_00232.jpg",
        "TC_00253.jpg",
        "TC_00273.jpg",
        "Yosemite 2017 IMG 8293.jpg"
    ],
    "Shanghai, Hong Kong, Japan": [
        "TC_00319.jpg",
        "TC_00391.jpg",
        "TC_00396.jpg",
        "TC_00471.jpg",
        "TC_00583.jpg",
        "TC_00633-3.jpg",
        "TC_00705.jpg",
        "TC_00735.jpg",
        "TC_00802.jpg",
        "TC_00881.jpg",
        "TC_00976.jpg",
        "TC_01026-2-Edit.jpg",
        "TC_01040-2.jpg",
        "TC_01132-Edit.jpg"
    ],
    "Ephemera": [
        "IMG 8391 Mar 26 2016.jpg",
        "Impermanence 2017-18.jpg",
        "Photography CR2 8333.jpg"
    ]
};

// Shuffle function for randomization
function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Build "All" gallery with randomized images from all folders
function buildAllGallery() {
    const allImages = [];
    Object.keys(galleries).forEach(folderName => {
        galleries[folderName].forEach(fileName => {
            allImages.push({ folder: folderName, file: fileName });
        });
    });
    return shuffle(allImages);
}

function initGallery() {
    const viewer = document.querySelector('.gallery-viewer');
    const tabs = document.querySelectorAll('.gallery-tab');

    // Clear existing content
    viewer.innerHTML = '';

    // Build "All" folder first with randomized images
    const allFolder = document.createElement('div');
    allFolder.className = 'gallery-folder';
    allFolder.dataset.folder = 'All';

    const allImages = buildAllGallery();
    allImages.forEach(item => {
        const img = document.createElement('img');
        img.className = 'gallery-image';
        img.src = `Photographs/${item.folder}/${item.file}`;
        img.alt = item.file;
        allFolder.appendChild(img);
    });
    viewer.appendChild(allFolder);

    // Build individual gallery folders
    Object.keys(galleries).forEach(folderName => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'gallery-folder';
        folderDiv.dataset.folder = folderName;

        galleries[folderName].forEach(fileName => {
            const img = document.createElement('img');
            img.className = 'gallery-image';
            img.src = `Photographs/${folderName}/${fileName}`;
            img.alt = fileName;

            folderDiv.appendChild(img);
        });

        viewer.appendChild(folderDiv);
    });

    // Show first tab's folder by default
    const firstTab = tabs[0];
    if (firstTab) {
        const firstFolderName = firstTab.dataset.folder;
        const firstFolder = document.querySelector(`.gallery-folder[data-folder="${firstFolderName}"]`);
        if (firstFolder) {
            firstFolder.classList.add('active');
        }
    }

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const folders = document.querySelectorAll('.gallery-folder');
            folders.forEach(f => f.classList.remove('active'));

            const targetFolder = tab.dataset.folder;
            const activeFolder = document.querySelector(`.gallery-folder[data-folder="${targetFolder}"]`);
            if (activeFolder) {
                activeFolder.classList.add('active');
                // Trigger intersection observer for newly visible images
                observeImages();
            }
        });
    });

    // Set up intersection observer for lazy loading fade-in
    observeImages();
}

function observeImages() {
    const images = document.querySelectorAll('.gallery-image');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;

                // Add loaded class when image enters viewport
                if (img.complete) {
                    img.classList.add('loaded');
                } else {
                    img.addEventListener('load', () => {
                        img.classList.add('loaded');
                    });
                }

                observer.unobserve(img);
            }
        });
    }, {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    });

    images.forEach(img => {
        // If image is already in viewport on load, fade it in
        if (!img.classList.contains('loaded')) {
            imageObserver.observe(img);
        }
    });
}

// Lightbox functionality
function initLightbox() {
    // Create lightbox element
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <button class="lightbox-close" aria-label="Close">&times;</button>
        <button class="lightbox-nav lightbox-prev" aria-label="Previous">&lsaquo;</button>
        <button class="lightbox-nav lightbox-next" aria-label="Next">&rsaquo;</button>
        <div class="lightbox-content">
            <img class="lightbox-image" src="" alt="">
        </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    let currentImages = [];
    let currentIndex = 0;

    function openLightbox(imageSrc, images, index) {
        currentImages = images;
        currentIndex = index;
        lightboxImage.src = imageSrc;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showPrevImage() {
        currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        lightboxImage.src = currentImages[currentIndex].src;
    }

    function showNextImage() {
        currentIndex = (currentIndex + 1) % currentImages.length;
        lightboxImage.src = currentImages[currentIndex].src;
    }

    // Event listeners
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', showPrevImage);
    nextBtn.addEventListener('click', showNextImage);

    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    });

    // Add click handlers to gallery images
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('gallery-image')) {
            const activeFolder = document.querySelector('.gallery-folder.active');
            const images = Array.from(activeFolder.querySelectorAll('.gallery-image'));
            const index = images.indexOf(e.target);
            openLightbox(e.target.src, images, index);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initGallery();
    initLightbox();
});
