document.addEventListener('DOMContentLoaded', function() {
    // Theme Switch
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            themeSwitch.checked = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    // Initialize DataTables if table exists
    const dataTable = document.querySelector('.data-table');
    if (dataTable) {
        $(dataTable).DataTable({
            responsive: true,
            pageLength: 10,
            dom: 'Bfrtip',
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
        });
    }

    // Initialize Charts
    let charts = {};

    // Upload Chart
    const uploadChart = document.getElementById('uploadChart');
    if (uploadChart && typeof uploadData !== 'undefined') {
        // Destroy existing chart if it exists
        if (charts.uploadChart) {
            charts.uploadChart.destroy();
        }
        charts.uploadChart = new Chart(uploadChart, {
            type: 'line',
            data: {
                labels: Object.keys(uploadData),
                datasets: [{
                    label: 'Uploads',
                    data: Object.values(uploadData),
                    borderColor: '#3498db',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Upload Trends'
                    }
                }
            }
        });
    }

    // Vendor Chart
    const vendorChart = document.getElementById('vendorChart');
    if (vendorChart && typeof vendorData !== 'undefined') {
        // Destroy existing chart if it exists
        if (charts.vendorChart) {
            charts.vendorChart.destroy();
        }
        charts.vendorChart = new Chart(vendorChart, {
            type: 'doughnut',
            data: {
                labels: vendorData.map(v => v.name),
                datasets: [{
                    data: vendorData.map(v => v.count),
                    backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
    }

    // Initialize Map if container exists
    const mapContainer = document.getElementById('locationMap');
    if (mapContainer && typeof geoData !== 'undefined') {
        const map = L.map('locationMap').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers if geoData exists
        geoData.forEach(location => {
            if (location.lat && location.lon) {
                L.marker([location.lat, location.lon])
                    .bindPopup(`Records: ${location.count}`)
                    .addTo(map);
            }
        });
    }

    // Add fade-in animation to cards
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('fade-in');
    });

    // Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip();

    // Handle file upload preview
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || 'No file chosen';
            const label = document.querySelector('.custom-file-label');
            if (label) {
                label.textContent = fileName;
            }
        });
    }

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Handle notifications
    window.showNotification = function(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    };

    // Export functionality
    window.exportData = function(format) {
        showNotification(`Exporting data as ${format}...`);
        // Implement actual export logic here
    };
});
