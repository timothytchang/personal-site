// Recipe Tab Switching and Gantt Chart Hover Interaction

document.addEventListener('DOMContentLoaded', function() {
    // Recipe Tab Switching
    const recipeTabs = document.querySelectorAll('.recipe-tab');
    const recipePages = document.querySelectorAll('.recipe-page');
    
    recipeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const recipeId = this.dataset.recipe;
            
            // Update active tab
            recipeTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding recipe page
            recipePages.forEach(page => {
                if (page.dataset.recipe === recipeId) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
        });
    });

    // Gantt Chart Hover Interaction
    const stepElements = document.querySelectorAll('[data-step]');
    
    stepElements.forEach(el => {
        el.addEventListener('mouseenter', function() {
            const step = this.getAttribute('data-step');
            highlightStep(step);
        });
        
        el.addEventListener('mouseleave', function() {
            clearHighlights();
        });
    });
    
    function highlightStep(step) {
        // Clear any existing highlights first
        clearHighlights();

        // Find the active recipe page
        const activeRecipe = document.querySelector('.recipe-page.active');
        if (!activeRecipe) return;

        // Add highlight class to all elements with matching data-step in active recipe
        activeRecipe.querySelectorAll(`[data-step="${step}"]`).forEach(el => {
            el.classList.add('highlight');
        });

        // Find gantt blocks with this step in the active recipe only
        const blocks = activeRecipe.querySelectorAll(`.gantt-block[data-step="${step}"]`);
        if (blocks.length > 0) {
            // Get the parent track of the first block
            const track = blocks[0].closest('.gantt-track');
            if (track) {
                const highlightBar = track.querySelector('.track-highlight-bar');
                if (highlightBar) {
                    // Calculate the span of all blocks with this step in this track
                    let minLeft = 100;
                    let maxRight = 0;

                    blocks.forEach(block => {
                        // Only count blocks in the same track
                        if (block.closest('.gantt-track') === track) {
                            const left = parseFloat(block.style.left);
                            const width = parseFloat(block.style.width);
                            if (left < minLeft) minLeft = left;
                            if (left + width > maxRight) maxRight = left + width;
                        }
                    });

                    highlightBar.style.left = minLeft + '%';
                    highlightBar.style.width = (maxRight - minLeft) + '%';
                    highlightBar.classList.add('visible');
                }
            }
        }
    }
    
    function clearHighlights() {
        document.querySelectorAll('[data-step].highlight').forEach(el => {
            el.classList.remove('highlight');
        });
        
        document.querySelectorAll('.track-highlight-bar.visible').forEach(bar => {
            bar.classList.remove('visible');
        });
    }
});
