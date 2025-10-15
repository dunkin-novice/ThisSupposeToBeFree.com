document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Load Navbar and Footer ---
    const loadComponent = (url, placeholderId) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${url}`);
                return response.text();
            })
            .then(data => {
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                    placeholder.innerHTML = data;
                }
            })
            .catch(error => console.error(error));
    };

    loadComponent('/navbar.html', 'navbar-placeholder');
    loadComponent('/footer.html', 'footer-placeholder');

    // --- 2. Mobile Menu (Hamburger) ---
    // The hamburger element is loaded dynamically, so we need to wait for it.
    // Use a MutationObserver or a timeout to handle this. A simple timeout is often sufficient.
    setTimeout(() => {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            // Close menu when a link is clicked
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }
    }, 500); // Wait 500ms for components to load

    // --- 3. Fade-in Animation on Page Load ---
    document.body.classList.add('loaded');
});
