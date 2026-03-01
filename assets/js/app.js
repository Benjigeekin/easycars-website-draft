document.addEventListener('DOMContentLoaded', () => {
    // ---- SPA Navigation ----
    const navLinks = document.querySelectorAll('a[data-link]');
    const buttons = document.querySelectorAll('button[data-link]');
    const sections = document.querySelectorAll('.page-section');
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-links');

    function navigate(e) {
        if (e.currentTarget.tagName === 'A' && e.currentTarget.classList.contains('view-all-link')) {
            // do not prevent default if it's an actual link that needs normal processing but we shouldn't have real links here.
            e.preventDefault();
        } else if (e.currentTarget.tagName !== 'BUTTON' && !e.currentTarget.classList.contains('logo')) {
            e.preventDefault();
        }

        const targetId = e.currentTarget.getAttribute('data-link');

        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
            setTimeout(() => section.style.display = 'none', 300); // fade out effect
        });

        // Show target section
        setTimeout(() => {
            const targetEl = document.getElementById('page-' + targetId);
            if (targetEl) {
                targetEl.style.display = 'block';
                // Trigger reflow
                void targetEl.offsetWidth;
                targetEl.classList.add('active');
            }
        }, 300);

        // Update active nav link
        if (e.currentTarget.tagName === 'A' && e.currentTarget.closest('.nav-links')) {
            document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
            e.currentTarget.classList.add('active');
        } else {
            // If clicked from somewhere else, try to find the nav link
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-link') === targetId) {
                    link.classList.add('active');
                }
            });
        }

        // Close mobile menu if open
        if (navMenu.classList.contains('show')) {
            navMenu.classList.remove('show');
        }

        window.scrollTo(0, 0);
    }

    navLinks.forEach(link => link.addEventListener('click', navigate));
    buttons.forEach(btn => btn.addEventListener('click', navigate));

    // Mobile Menu Toggle
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('show');
    });

    // ---- Date Picker Initialization ----
    const dateInputs = document.querySelectorAll('input[type="date"]');
    // Convert native date inputs to text so flatpickr handles them, bypassing OS locale locks
    dateInputs.forEach(input => input.setAttribute('type', 'text'));

    flatpickr(dateInputs, {
        dateFormat: "d.m.Y",
        minDate: "today",
        locale: "en",
        disableMobile: true
    });

    // ---- Translation Logic ----
    const langBtn = document.querySelector('.lang-btn');
    const langDropdown = document.querySelector('.lang-dropdown');
    const currentLangSpan = document.getElementById('current-lang');
    const langLinks = document.querySelectorAll('[data-lang]');

    // Toggle dropdown
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = langBtn.getAttribute('aria-expanded') === 'true';
            langBtn.setAttribute('aria-expanded', !expanded);
            langDropdown.classList.toggle('show');
        });
    }

    // Handle outside click for dropdown
    document.addEventListener('click', () => {
        if (langDropdown && langDropdown.classList.contains('show')) {
            langDropdown.classList.remove('show');
            langBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Handle language change
    function setLanguage(lang) {
        if (!translations[lang]) return;

        // Update button text
        currentLangSpan.textContent = lang.toUpperCase();

        // Update document lang for date inputs (forces en-GB for DD/MM/YYYY)
        document.documentElement.lang = lang === 'en' ? 'en-GB' : lang;

        // Update Flatpickr locale
        let fpLocale = "en";
        if (lang === "ru") fpLocale = "ru";
        else if (lang === "lv") fpLocale = "lv";

        dateInputs.forEach(input => {
            if (input._flatpickr) input._flatpickr.destroy();
        });

        flatpickr(dateInputs, {
            dateFormat: "d.m.Y",
            minDate: "today",
            locale: fpLocale,
            disableMobile: true
        });

        // Update elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                if (el.tagName === 'INPUT' && el.type === 'text' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[lang][key];
                } else {
                    el.innerHTML = translations[lang][key]; // Using innerHTML to preserve icons if any
                }
            }
        });

        // Re-render components that might have changed translations internally
        if (typeof renderFleet === 'function') {
            const activeClassFilter = Array.from(document.querySelectorAll('.filter-class:checked')).map(cb => cb.value);
            const checkedTrans = Array.from(document.querySelectorAll('.filter-trans:checked')).map(cb => cb.value);
            const checkedFuel = Array.from(document.querySelectorAll('.filter-fuel:checked')).map(cb => cb.value);

            const filteredData = fleetData.filter(car => {
                const classMatch = activeClassFilter.length === 0 || activeClassFilter.includes(car.class);
                const transMatch = checkedTrans.length === 0 || checkedTrans.includes(car.transmission);
                const fuelMatch = checkedFuel.length === 0 || checkedFuel.includes(car.fuel);
                return classMatch && transMatch && fuelMatch;
            });
            renderFleet(filteredData);
        }

        // Re-render modal services if open
        if (extraServicesContainer && extraServicesContainer.innerHTML !== '') {
            renderExtraServices(lang);
        }

        // Save preference
        localStorage.setItem('easycars_lang', lang);
    }

    langLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = e.currentTarget.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    // (Initialization moved to the end of the file to ensure all render functions exist)

    // ---- Render Car Cards ----
    const featuredContainer = document.getElementById('featured-cars-container');
    const allCarsContainer = document.getElementById('all-cars-container');

    function createCarCard(car) {
        return `
            <div class="car-card" data-class="${car.class}" data-trans="${car.transmission}" data-fuel="${car.fuel}">
                <div class="car-img-wrapper">
                    <span class="car-badge">${car.class}</span>
                    <img src="${car.image}" alt="${car.brand} ${car.model}">
                </div>
                <div class="car-content">
                    <span class="car-brand">${car.brand}</span>
                    <h3>${car.model} <span style="font-size: 0.9rem; color: #666; font-weight: 400;">(${car.year})</span></h3>
                    <div class="car-features">
                        <div class="feature"><i class="fas fa-user-friends"></i> ${car.seats} Seats</div>
                        <div class="feature"><i class="fas fa-cog"></i> ${car.transmission}</div>
                        <div class="feature"><i class="fas fa-gas-pump"></i> ${car.fuel}</div>
                        <div class="feature"><i class="fas fa-check-circle"></i> A/C</div>
                    </div>
                    <div class="car-actions">
                        <button class="btn btn-outline btn-reserve" data-brand="${car.brand}" data-model="${car.model}" data-year="${car.year}">Reserve</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Populate Featured Cars
    if (featuredContainer) {
        const featuredCars = fleetData.filter(car => car.featured).slice(0, 3);
        featuredContainer.innerHTML = featuredCars.map(createCarCard).join('');
    }

    // Populate All Cars & Filtering
    let renderFleet; // Declare in outer scope
    if (allCarsContainer) {
        renderFleet = (data) => {
            if (data.length === 0) {
                allCarsContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--clr-text-light);">No cars match your filters.</p>`;
                return;
            }
            allCarsContainer.innerHTML = data.map(createCarCard).join('');
        };

        renderFleet(fleetData);

        // Filter Logic
        const filters = document.querySelectorAll('.fleet-filters input[type="checkbox"]');
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                const checkedClasses = Array.from(document.querySelectorAll('.filter-class:checked')).map(cb => cb.value);
                const checkedTrans = Array.from(document.querySelectorAll('.filter-trans:checked')).map(cb => cb.value);
                const checkedFuel = Array.from(document.querySelectorAll('.filter-fuel:checked')).map(cb => cb.value);

                const filteredData = fleetData.filter(car => {
                    const classMatch = checkedClasses.length === 0 || checkedClasses.includes(car.class);
                    const transMatch = checkedTrans.length === 0 || checkedTrans.includes(car.transmission);
                    const fuelMatch = checkedFuel.length === 0 || checkedFuel.includes(car.fuel);
                    return classMatch && transMatch && fuelMatch;
                });

                renderFleet(filteredData);
            });
        });
    }

    // ---- Sticky Header Effect ----
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            header.style.padding = '5px 0';
        } else {
            header.style.boxShadow = 'var(--shadow-sm)';
            header.style.padding = '0';
        }
    });

    // Quick Book Form
    const quickBookForm = document.getElementById('quick-book-form');
    if (quickBookForm) {
        quickBookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // In a real app, this would pass parameters to the booking engine.
            // Here, we just navigate to the fleet page.
            document.querySelector('a[data-link="fleet"]').click();
            window.scrollTo({
                top: document.getElementById('page-fleet').offsetTop - 100,
                behavior: 'smooth'
            });
        });
    }

    // ---- Booking Modal Logic ----
    const modal = document.getElementById('booking-modal');
    const modalClose = document.querySelector('.close-modal');
    const modalCloseBtn = document.querySelector('.close-btn');
    const modalCarName = document.getElementById('modal-car-name');
    const extraServicesContainer = document.getElementById('extra-services-container');
    const checkoutForm = document.getElementById('checkout-form');

    // Render Extra Services
    if (extraServicesContainer) {
        const initialVisibleCount = 4;

        let servicesHTML = extraServicesData.map((service, index) => `
            <div class="service-item ${index >= initialVisibleCount ? 'service-item-hidden' : ''}" style="${index >= initialVisibleCount ? 'display: none;' : ''}">
                <label>
                    <input type="checkbox" name="extra_service" value="${service.id}">
                    <span><i class="fas ${service.icon}" style="color: var(--clr-text-light); width: 20px; text-align: center; margin-right: 0.5rem;" aria-hidden="true"></i> ${service.name}</span>
                </label>
                <div class="price">+&euro;${service.price}/${service.unit}</div>
            </div>
        `).join('');

        if (extraServicesData.length > initialVisibleCount) {
            servicesHTML += `
                <button type="button" id="toggle-services-btn" class="btn btn-outline" style="width: 100%; margin-top: 0.5rem; padding: 0.5rem;">
                    Show More Options <i class="fas fa-chevron-down" style="margin-left: 0.5rem;"></i>
                </button>
            `;
        }

        extraServicesContainer.innerHTML = servicesHTML;

        // Toggle logic
        const toggleBtn = document.getElementById('toggle-services-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const hiddenItems = extraServicesContainer.querySelectorAll('.service-item-hidden');
                const isExpanded = toggleBtn.classList.contains('expanded');

                if (isExpanded) {
                    // Hide them
                    hiddenItems.forEach(item => item.style.display = 'none');
                    toggleBtn.classList.remove('expanded');
                    toggleBtn.innerHTML = 'Show More Options <i class="fas fa-chevron-down" style="margin-left: 0.5rem;"></i>';
                } else {
                    // Show them
                    hiddenItems.forEach(item => item.style.display = 'flex');
                    toggleBtn.classList.add('expanded');
                    toggleBtn.innerHTML = 'Show Less Options <i class="fas fa-chevron-up" style="margin-left: 0.5rem;"></i>';
                }
            });
        }
    }

    function openModal(brand, model, year) {
        modalCarName.textContent = `${brand} ${model} (${year})`;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        if (checkoutForm) checkoutForm.reset();

        // Reset services toggle
        const toggleBtn = document.getElementById('toggle-services-btn');
        if (toggleBtn && toggleBtn.classList.contains('expanded')) {
            toggleBtn.click(); // Programmatically click to reset state and hide items
        }
    }

    // Event Delegation for Reserve Buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-reserve')) {
            const brand = e.target.getAttribute('data-brand');
            const model = e.target.getAttribute('data-model');
            const year = e.target.getAttribute('data-year');
            openModal(brand, model, year);
        }
    });

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Render Extra Services logic (moved into function for translations)
    function renderExtraServices(lang = 'en') {
        if (!extraServicesContainer) return;

        const initialVisibleCount = 4;
        const currentTranslations = translations[lang] || translations['en'];

        // Map extraServicesData to use translated names based on ID if available, else fallback to name
        // (In a real app, extraServicesData might just be keys, here we mix data and i18n for simplicity)

        let servicesHTML = extraServicesData.map((service, index) => {
            // Basic naive translation matching based on ID for demo purposes.
            let translatedName = service.name;
            if (lang === 'lv') {
                if (service.id === 's1') translatedName = "Pilna apdrošināšana (0.00 EUR pašrisks)";
                if (service.id === 's2') translatedName = "Neierobežots nobraukums";
            } else if (lang === 'ru') {
                if (service.id === 's1') translatedName = "Полная страховка (риск 0,00 евро)";
                if (service.id === 's2') translatedName = "Безлимитный пробег";
            }

            return `
                <div class="service-item ${index >= initialVisibleCount ? 'service-item-hidden' : ''}" style="${index >= initialVisibleCount ? 'display: none;' : ''}">
                    <label>
                        <input type="checkbox" name="extra_service" value="${service.id}">
                        <span><i class="fas ${service.icon}" style="color: var(--clr-text-light); width: 20px; text-align: center; margin-right: 0.5rem;" aria-hidden="true"></i> ${translatedName}</span>
                    </label>
                    <div class="price">+&euro;${service.price}/${service.unit}</div>
                </div>
            `;
        }).join('');

        if (extraServicesData.length > initialVisibleCount) {
            servicesHTML += `
                <button type="button" id="toggle-services-btn" class="btn btn-outline" style="width: 100%; margin-top: 0.5rem; padding: 0.5rem;">
                    ${currentTranslations.modal_show_more} <i class="fas fa-chevron-down" style="margin-left: 0.5rem;"></i>
                </button>
            `;
        }

        extraServicesContainer.innerHTML = servicesHTML;

        // Toggle logic
        const toggleBtn = document.getElementById('toggle-services-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const hiddenItems = extraServicesContainer.querySelectorAll('.service-item-hidden');
                const isExpanded = toggleBtn.classList.contains('expanded');

                if (isExpanded) {
                    // Hide them
                    hiddenItems.forEach(item => item.style.display = 'none');
                    toggleBtn.classList.remove('expanded');
                    toggleBtn.innerHTML = `${currentTranslations.modal_show_more} <i class="fas fa-chevron-down" style="margin-left: 0.5rem;"></i>`;
                } else {
                    // Show them
                    hiddenItems.forEach(item => item.style.display = 'flex');
                    toggleBtn.classList.add('expanded');
                    toggleBtn.innerHTML = `${currentTranslations.modal_show_less} <i class="fas fa-chevron-up" style="margin-left: 0.5rem;"></i>`;
                }
            });
        }
    }

    renderExtraServices();

    // Handle checkout submission
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const lang = localStorage.getItem('easycars_lang') || 'en';
            alert(lang === 'lv' ? 'Paldies! Jūsu rezervācijas pieprasījums ir saņemts.' :
                lang === 'ru' ? 'Спасибо! Ваш запрос на бронирование получен.' :
                    'Thank you! Your reservation request has been received.');
            closeModal();
        });
    }

    // Initialize Language (After all rendering functions are defined)
    const savedLang = localStorage.getItem('easycars_lang') || 'en';
    setLanguage(savedLang);

});
