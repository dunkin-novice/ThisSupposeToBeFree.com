document.addEventListener("DOMContentLoaded", function() {
    // Function to fetch and insert HTML content
    const loadComponent = (url, placeholderId) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Could not load ${url}`);
                return response.text();
            })
            .then(data => {
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) placeholder.innerHTML = data;
            })
            .catch(console.error);
    };

    // Load navbar and footer
    loadComponent('/navbar.html', 'navbar-placeholder');
    loadComponent('/footer.html', 'footer-placeholder');
});
