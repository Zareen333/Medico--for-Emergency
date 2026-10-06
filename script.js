let userLat = 18.9888; // Default Panvel location
let userLng = 73.1111;

// Fallback Mock Data for UI Development
const mockHospitals = [
    { hospital_id: 1, name: "Sub District Hospital Panvel", type: "Government", latitude: 18.9890, longitude: 73.1170, address: "Old Panvel, Navi Mumbai", contact: "022-27452345", insurance: false, available_beds: 12, distance_km: 0.8 },
    { hospital_id: 2, name: "MGM Hospital & Research Centre", type: "Private", latitude: 19.0180, longitude: 73.1040, address: "Kamothe, Navi Mumbai", contact: "022-27437900", insurance: true, available_beds: 28, distance_km: 3.4 },
    { hospital_id: 3, name: "Lifeline Hospital Panvel", type: "Private", latitude: 18.9860, longitude: 73.1230, address: "Near Station, Panvel", contact: "022-27464000", insurance: true, available_beds: 8, distance_km: 1.2 }
];

const mockDoctors = {
    1: [{ name: "Dr. Rajesh Patil", specialty: "General Physician", days: "Mon - Sat", hours: "09:00 AM - 02:00 PM" }],
    2: [
        { name: "Dr. Ananya Sharma", specialty: "Cardiologist", days: "Mon, Wed, Fri", hours: "10:00 AM - 04:00 PM" },
        { name: "Dr. Suresh Mehta", specialty: "Radiologist", days: "Tue, Thu, Sat", hours: "11:00 AM - 05:00 PM" }
    ],
    3: [{ name: "Dr. Priya Nair", specialty: "Pediatrician", days: "Mon - Fri", hours: "04:00 PM - 08:00 PM" }]
};

// Capture user location & setup handlers on load
window.onload = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { 
                userLat = pos.coords.latitude; 
                userLng = pos.coords.longitude; 
            },
            () => console.log("Geolocation defaulting to Panvel coordinates.")
        );
    }
    setupSidebarNav();
    setupSearchBar();
    setupThemeToggle();
    setupModalBackdropClose();
};

// Sidebar Tab Switching
function setupSidebarNav() {
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            if (index === 0) findHospitals(); // Dashboard
            else if (index === 1) findHospitals(); // Hospitals
            else if (index === 2) openModal('sosModal'); // SOS Ambulance
            else if (index === 3) openDoctorDirectory(); // Doctors
            else if (index === 4) openModal('bookingModal'); // Bookings
            else if (index === 5) alert("Settings: Notification preferences and emergency contacts configured.");
        });
    });
}

// Interactive Real-Time Search Bar
function setupSearchBar() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = mockHospitals.filter(h => 
                h.name.toLowerCase().includes(query) || 
                h.type.toLowerCase().includes(query) || 
                h.address.toLowerCase().includes(query)
            );
            renderHospitals(filtered);
        });
    }
}

// Dark Mode & Notifications
function setupThemeToggle() {
    const iconButtons = document.querySelectorAll('.icon-btn');
    
    // Notification Alert Button (First Icon)
    if (iconButtons[0]) {
        iconButtons[0].addEventListener('click', () => {
            alert("🔔 Live Alerts:\n• MGM Hospital: ICU occupancy at 85%\n• Ambulance #04 dispatched near Panvel Station");
        });
    }

    // Dark Theme Toggle Button (Second Icon)
    if (iconButtons[1]) {
        iconButtons[1].addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }
}

// Close Modals on Backdrop Click
function setupModalBackdropClose() {
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
}

// Fetch Hospitals Logic
function findHospitals() {
    const typeElem = document.getElementById('typeFilter');
    const insuranceElem = document.getElementById('insuranceFilter');

    const type = typeElem ? typeElem.value : "";
    const insurance = insuranceElem ? insuranceElem.checked : false;

    let queryParams = [`lat=${userLat}`, `lng=${userLng}`];
    if (type && type.trim() !== "") queryParams.push(`type=${encodeURIComponent(type)}`);
    if (insurance) queryParams.push(`insurance=true`);

    const url = `http://localhost:8080/api/hospitals?${queryParams.join('&')}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                renderHospitals(filterMockData(type, insurance));
            } else {
                renderHospitals(data);
            }
        })
        .catch(() => {
            renderHospitals(filterMockData(type, insurance));
        });
}

function filterMockData(type, insurance) {
    return mockHospitals.filter(h => {
        if (type && h.type !== type) return false;
        if (insurance && !h.insurance) return false;
        return true;
    });
}

function renderHospitals(hospitals) {
    const container = document.getElementById('hospitalList');
    if (!container) return;
    
    container.innerHTML = '';

    if (!hospitals || hospitals.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No hospitals found matching your selected criteria.</p>';
        return;
    }

    hospitals.forEach(h => {
        const card = document.createElement('div');
        card.className = 'hospital-card';
        card.innerHTML = `
            <span class="badge ${h.type === 'Government' ? 'badge-govt' : 'badge-pvt'}">${h.type}</span>
            <h3>${h.name}</h3>
            <p><strong>Distance:</strong> ${h.distance_km} km away</p>
            <p><strong>Address:</strong> ${h.address}</p>
            <p><strong>Contact:</strong> ${h.contact}</p>
            <p><strong>Available Beds:</strong> ${h.available_beds}</p>
            <button class="action-btn" onclick="openDetails(${h.hospital_id}, '${h.name.replace(/'/g, "\\'")}', ${h.available_beds}, ${h.insurance}, ${h.latitude}, ${h.longitude})">View Details & Doctors</button>
        `;
        container.appendChild(card);
    });
}

// SOS Ambulance Dispatch Action
function triggerSOS() {
    const status = document.getElementById('sosStatus');
    if (status) {
        status.innerHTML = `<p style="color: #108a00; font-weight: bold; margin-top: 10px;">🚨 Dispatching unit to GPS (${userLat.toFixed(4)}, ${userLng.toFixed(4)})... ETA: 6 mins.</p>`;
    }
}

// Appointment Confirmation Form Action
function confirmBooking(e) {
    e.preventDefault();
    const name = document.getElementById('patientName').value;
    const hospital = document.getElementById('bookingHospital').value;
    const date = document.getElementById('bookingDate').value;
    const confirmBox = document.getElementById('bookingConfirmation');
    
    if (confirmBox) {
        confirmBox.innerHTML = `<p style="color: #108a00; font-weight: bold; margin-top: 10px;">✅ Appointment confirmed for ${name} at ${hospital} on ${date}!</p>`;
    }
}

// Global Doctor Directory Popup
function openDoctorDirectory() {
    const docContainer = document.getElementById('globalDoctorList');
    if (docContainer) {
        docContainer.innerHTML = `
            <p>• <strong>Dr. Rajesh Patil</strong> (General Physician) - Sub District Panvel [09:00 AM - 02:00 PM]</p>
            <p>• <strong>Dr. Ananya Sharma</strong> (Cardiologist) - MGM Hospital [10:00 AM - 04:00 PM]</p>
            <p>• <strong>Dr. Suresh Mehta</strong> (Radiologist) - MGM Hospital [11:00 AM - 05:00 PM]</p>
            <p>• <strong>Dr. Priya Nair</strong> (Pediatrician) - Lifeline Hospital [04:00 PM - 08:00 PM]</p>
        `;
    }
    openModal('allDoctorsModal');
}

// Hospital Details & Doctor Schedule Modal
function openDetails(id, name, beds, insurance, hLat, hLng) {
    document.getElementById('modalHospitalName').innerText = name;
    document.getElementById('modalBeds').innerText = `Available Beds: ${beds}`;
    document.getElementById('modalInsurance').innerText = `Accepts Insurance: ${insurance ? 'Yes ✅' : 'No ❌'}`;

    const directionsBtn = document.getElementById('modalDirectionsBtn');
    if (directionsBtn) {
        directionsBtn.onclick = function() {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${hLat},${hLng}&travelmode=driving`, '_blank');
        };
    }

    // Load doctors list for selected hospital
    fetch(`http://localhost:8080/api/details?id=${id}`)
        .then(res => res.json())
        .then(data => renderDoctors(data.doctors))
        .catch(() => {
            renderDoctors(mockDoctors[id] || []);
        });

    openModal('detailsModal');
}

function renderDoctors(doctors) {
    const docList = document.getElementById('doctorList');
    if (!docList) return;
    
    docList.innerHTML = '';
    if (doctors && doctors.length > 0) {
        doctors.forEach(doc => {
            docList.innerHTML += `<p>• <strong>${doc.name}</strong> (${doc.specialty}) - ${doc.days} [${doc.hours}]</p>`;
        });
    } else {
        docList.innerHTML = '<p>No specific doctor schedule uploaded.</p>';
    }
}

// Robust Modal Management
function openModal(id) {
    const targetModal = document.getElementById(id);
    if (targetModal) {
        targetModal.style.display = 'flex';
    }
}

function closeModal(id) {
    if (id && typeof id === 'string') {
        const targetModal = document.getElementById(id);
        if (targetModal) {
            targetModal.style.display = 'none';
            return;
        }
    }
    // Fallback: Close all open modals if no explicit ID matches
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}